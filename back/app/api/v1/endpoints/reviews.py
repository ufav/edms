"""
API endpoints for document reviews and approvals
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from pydantic import BaseModel

class ApproveRequest(BaseModel):
    comments: Optional[str] = None

class RejectRequest(BaseModel):
    comments: Optional[str] = None

from app.core.database import get_db
from app.models.user import User
from app.models.document import Document, DocumentRevision
from app.models.project import Project, WorkflowPresetSequence
from app.models.references import WorkflowStatus, RevisionStep, RevisionDescription
from app.api.v1.endpoints.auth import get_current_user
from app.services.audit_service import log_action

router = APIRouter()

@router.get("/")
async def get_reviews(
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Временно возвращаем пустой список
    return []


@router.get("/pending-approvals")
async def get_pending_approvals(
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить документы, ожидающие внутреннего утверждения (без трансмиттала)
    """
    # Получаем статус "In Review"
    in_review_status = db.query(WorkflowStatus).filter(
        WorkflowStatus.name == "In Review"
    ).first()
    
    if not in_review_status:
        return []
    
    # Создаем подзапрос для получения последней ревизии каждого документа
    latest_revision_subquery = db.query(
        DocumentRevision.document_id,
        func.max(DocumentRevision.created_at).label('max_created_at')
    ).group_by(DocumentRevision.document_id).subquery()
    
    # Запрос с информацией о последовательности для определения доступности кнопок
    query = db.query(
        Document,
        DocumentRevision,
        Project,
        WorkflowPresetSequence
    ).outerjoin(
        latest_revision_subquery,
        Document.id == latest_revision_subquery.c.document_id
    ).outerjoin(
        DocumentRevision,
        and_(
            DocumentRevision.document_id == Document.id,
            DocumentRevision.created_at == latest_revision_subquery.c.max_created_at
        )
    ).join(
        Project,
        Project.id == Document.project_id
    ).outerjoin(
        WorkflowPresetSequence,
        and_(
            WorkflowPresetSequence.preset_id == Project.workflow_preset_id,
            WorkflowPresetSequence.revision_step_id == DocumentRevision.revision_step_id,
            WorkflowPresetSequence.revision_description_id == DocumentRevision.revision_description_id
        )
    ).filter(
        Document.is_deleted == 0,
        DocumentRevision.workflow_status_id == in_review_status.id,
        Project.id == project_id
    )
    
    # Выполняем запрос с пагинацией
    results = query.order_by(Document.updated_at.desc()).offset(skip).limit(limit).all()
    
    # Получаем все нужные ID для batch запросов
    revision_step_ids = []
    revision_description_ids = []
    
    for row in results:
        doc, revision, project, sequence = row
        if revision and revision.revision_step_id:
            revision_step_ids.append(revision.revision_step_id)
        if revision and revision.revision_description_id:
            revision_description_ids.append(revision.revision_description_id)
    
    # Загружаем все RevisionStep одним запросом
    revision_steps = {}
    if revision_step_ids:
        for rs in db.query(RevisionStep).filter(RevisionStep.id.in_(revision_step_ids)).all():
            revision_steps[rs.id] = rs
    
    # Загружаем все RevisionDescription одним запросом
    revision_descriptions = {}
    if revision_description_ids:
        for rd in db.query(RevisionDescription).filter(RevisionDescription.id.in_(revision_description_ids)).all():
            revision_descriptions[rd.id] = rd
    
    # Формируем результат
    result = []
    for row in results:
        doc, revision, project, sequence = row
        
        # Получаем информацию о шаге и описании
        step_info = None
        description_info = None
        
        if revision:
            step = revision_steps.get(revision.revision_step_id)
            description = revision_descriptions.get(revision.revision_description_id)
            
            step_info = {
                "id": step.id if step else None,
                "code": step.code if step else None,
                "description": step.description if step else None,
                "description_native": step.description_native if step else None
            } if step else None
            
            description_info = {
                "id": description.id if description else None,
                "code": description.code if description else None,
                "description": description.description if description else None,
                "description_native": description.description_native if description else None
            } if description else None
        
        result.append({
            "document_id": doc.id,
            "document_title": doc.title,
            "document_number": doc.number,
            "project_id": doc.project_id,
            "project_name": project.name if project else None,
            "revision_id": revision.id if revision else None,
            "revision_number": revision.number if revision else None,
            "file_name": revision.file_name if revision else None,
            "file_size": revision.file_size if revision else None,
            "file_type": revision.file_type if revision else None,
            "change_description": revision.change_description if revision else None,
            "created_at": revision.created_at if revision else None,
            "uploaded_by": revision.uploaded_by if revision else None,
            "current_step": step_info,
            "current_description": description_info,
            "sequence_order": sequence.sequence_order if sequence else None,
            "is_final": sequence.is_final if sequence else None,
            "requires_transmittal": sequence.requires_transmittal if sequence else None
        })
    
    return result


@router.post("/approve/{document_id}")
async def approve_document(
    document_id: int,
    request: ApproveRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comments = request.comments
    """
    Утвердить документ (внутреннее утверждение)
    """
    # Получаем документ
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Получаем последнюю ревизию
    latest_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id,
        DocumentRevision.is_deleted == 0
    ).order_by(DocumentRevision.created_at.desc()).first()
    
    if not latest_revision:
        raise HTTPException(status_code=404, detail="Ревизия документа не найдена")
    
    # Проверяем, требует ли документ трансмиттал
    from app.models.project import WorkflowPresetSequence, Project
    workflow_sequence = db.query(WorkflowPresetSequence).join(
        Project, Project.workflow_preset_id == WorkflowPresetSequence.preset_id
    ).join(
        Document, Document.project_id == Project.id
    ).filter(
        Document.id == document_id,
        WorkflowPresetSequence.revision_description_id == latest_revision.revision_description_id,
        WorkflowPresetSequence.revision_step_id == latest_revision.revision_step_id
    ).first()
    
    if workflow_sequence and workflow_sequence.requires_transmittal:
        raise HTTPException(
            status_code=400, 
            detail="Документ должен быть утвержден через трансмиттал"
        )
    
    # Проверяем, не находится ли ревизия в активном трансмиттале
    from app.models.transmittal import TransmittalRevision, Transmittal
    from app.models.references import TransmittalStatus
    active_transmittal = db.query(TransmittalRevision).join(
        Transmittal, Transmittal.id == TransmittalRevision.transmittal_id
    ).join(
        TransmittalStatus, TransmittalStatus.id == Transmittal.status_id
    ).filter(
        TransmittalRevision.revision_id == latest_revision.id,
        TransmittalStatus.name.in_(["Draft", "Sent"])  # Активные статусы трансмиттала
    ).first()
    
    if active_transmittal:
        raise HTTPException(
            status_code=400,
            detail=f"Ревизия находится в активном трансмиттале #{active_transmittal.transmittal.transmittal_number}"
        )
    
    # Получаем статус "Approved"
    approved_status = db.query(WorkflowStatus).filter(
        WorkflowStatus.name == "Approved"
    ).first()
    
    if not approved_status:
        raise HTTPException(status_code=500, detail="Статус 'Approved' не найден")
    
    # Сохраняем старый статус перед обновлением
    old_status_id = latest_revision.workflow_status_id
    
    # Валидируем переход статусов
    from app.utils.workflow_status_validator import WorkflowStatusValidator
    if not WorkflowStatusValidator.validate_transition(db, old_status_id, approved_status.id):
        from_status_name = latest_revision.workflow_status.name if latest_revision.workflow_status else "Draft"
        error_msg = WorkflowStatusValidator.get_transition_error_message(from_status_name, "Approved")
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Обновляем статус ревизии
    latest_revision.workflow_status_id = approved_status.id
    
    # Создаем запись в document_workflow_history
    from app.models.document_workflow_history import DocumentWorkflowHistory
    # Используем комментарий только если он не пустой
    final_comments = comments if comments and comments.strip() else None
    workflow_history = DocumentWorkflowHistory(
        revision_id=latest_revision.id,
        from_status_id=old_status_id,
        to_status_id=approved_status.id,
        user_id=current_user.id,
        action_type="approve",
        comments=final_comments
    )
    db.add(workflow_history)
    db.commit()
    
    # Логирование действия
    old_values = {
        "id": latest_revision.id,
        "document_id": document_id,
        "workflow_status_id": old_status_id,
    }
    new_values = {
        "id": latest_revision.id,
        "document_id": document_id,
        "workflow_status_id": approved_status.id,
        "action": "approve",
    }
    log_action(
        db=db,
        user_id=current_user.id,
        action="approve",
        entity_type="document",
        entity_id=document_id,
        old_values=old_values,
        new_values=new_values,
        request=http_request,
    )
    
    return {
        "message": "Документ утвержден",
        "document_id": document_id,
        "revision_id": latest_revision.id,
        "approved_by": current_user.id
    }


@router.post("/reject/{document_id}")
async def reject_document(
    document_id: int,
    request: RejectRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comments = request.comments
    print(f"DEBUG: reject_document called with document_id={document_id}, comments='{comments}'")
    """
    Отклонить документ (внутреннее отклонение)
    """
    # Получаем документ
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Получаем последнюю ревизию
    latest_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id,
        DocumentRevision.is_deleted == 0
    ).order_by(DocumentRevision.created_at.desc()).first()
    
    if not latest_revision:
        raise HTTPException(status_code=404, detail="Ревизия документа не найдена")
    
    # Проверяем, требует ли документ трансмиттал
    from app.models.project import WorkflowPresetSequence, Project
    workflow_sequence = db.query(WorkflowPresetSequence).join(
        Project, Project.workflow_preset_id == WorkflowPresetSequence.preset_id
    ).join(
        Document, Document.project_id == Project.id
    ).filter(
        Document.id == document_id,
        WorkflowPresetSequence.revision_description_id == latest_revision.revision_description_id,
        WorkflowPresetSequence.revision_step_id == latest_revision.revision_step_id
    ).first()
    
    if workflow_sequence and workflow_sequence.requires_transmittal:
        raise HTTPException(
            status_code=400, 
            detail="Документ должен быть отклонен через трансмиттал"
        )
    
    # Проверяем, не находится ли ревизия в активном трансмиттале
    from app.models.transmittal import TransmittalRevision, Transmittal
    from app.models.references import TransmittalStatus
    active_transmittal = db.query(TransmittalRevision).join(
        Transmittal, Transmittal.id == TransmittalRevision.transmittal_id
    ).join(
        TransmittalStatus, TransmittalStatus.id == Transmittal.status_id
    ).filter(
        TransmittalRevision.revision_id == latest_revision.id,
        TransmittalStatus.name.in_(["Draft", "Sent"])  # Активные статусы трансмиттала
    ).first()
    
    if active_transmittal:
        raise HTTPException(
            status_code=400,
            detail=f"Ревизия находится в активном трансмиттале #{active_transmittal.transmittal.transmittal_number}"
        )
    
    # Получаем статус "Rejected"
    rejected_status = db.query(WorkflowStatus).filter(
        WorkflowStatus.name == "Rejected"
    ).first()
    
    if not rejected_status:
        raise HTTPException(status_code=500, detail="Статус 'Rejected' не найден")
    
    # Сохраняем старый статус перед обновлением
    old_status_id = latest_revision.workflow_status_id
    
    # Валидируем переход статусов
    from app.utils.workflow_status_validator import WorkflowStatusValidator
    if not WorkflowStatusValidator.validate_transition(db, old_status_id, rejected_status.id):
        from_status_name = latest_revision.workflow_status.name if latest_revision.workflow_status else "Draft"
        error_msg = WorkflowStatusValidator.get_transition_error_message(from_status_name, "Rejected")
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Обновляем статус ревизии
    latest_revision.workflow_status_id = rejected_status.id
    
    # Создаем запись в document_workflow_history
    from app.models.document_workflow_history import DocumentWorkflowHistory
    # Используем комментарий только если он не пустой
    final_comments = comments if comments and comments.strip() else None
    print(f"DEBUG: Creating reject workflow_history with comments='{final_comments}'")
    workflow_history = DocumentWorkflowHistory(
        revision_id=latest_revision.id,
        from_status_id=old_status_id,
        to_status_id=rejected_status.id,
        user_id=current_user.id,
        action_type="reject",
        comments=final_comments
    )
    db.add(workflow_history)
    db.commit()
    print(f"DEBUG: reject workflow_history created with id={workflow_history.id}")
    
    # Логирование действия
    old_values = {
        "id": latest_revision.id,
        "document_id": document_id,
        "workflow_status_id": old_status_id,
    }
    new_values = {
        "id": latest_revision.id,
        "document_id": document_id,
        "workflow_status_id": rejected_status.id,
        "action": "reject",
    }
    log_action(
        db=db,
        user_id=current_user.id,
        action="reject",
        entity_type="document",
        entity_id=document_id,
        old_values=old_values,
        new_values=new_values,
        request=http_request,
    )
    
    return {
        "message": "Документ отклонен",
        "document_id": document_id,
        "revision_id": latest_revision.id,
        "rejected_by": current_user.id,
        "comments": comments
    }