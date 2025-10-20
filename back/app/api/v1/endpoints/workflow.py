"""
Workflow endpoints for document lifecycle and approval processes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from enum import Enum

from app.core.database import get_db
from app.models.user import User
from app.models.workflow import (
    WorkflowTemplate, WorkflowStep, DocumentWorkflow, DocumentApproval, DocumentHistory,
    DocumentStatus, ApprovalStatus
)
from app.models.document import Document, DocumentRevision
from app.models.document_workflow_history import DocumentWorkflowHistory
from app.models.references import WorkflowStatus
from app.services.auth import get_current_active_user

router = APIRouter()


# Pydantic models
class WorkflowTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    discipline_id: Optional[int] = None
    document_type_id: Optional[int] = None


class WorkflowStepCreate(BaseModel):
    step_order: int
    step_name: str
    approver_role: Optional[str] = None
    approver_user_id: Optional[int] = None
    is_required: bool = True
    escalation_hours: int = 72


class WorkflowTemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    discipline_id: Optional[int]
    document_type_id: Optional[int]
    is_active: bool
    created_at: datetime
    steps: List[dict]

    class Config:
        from_attributes = True


class DocumentApprovalResponse(BaseModel):
    id: int
    step_name: str
    approver_name: str
    status: ApprovalStatus
    comments: Optional[str]
    approved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class WorkflowStatusResponse(BaseModel):
    document_id: int
    status: DocumentStatus
    current_step: Optional[str]
    progress_percentage: int
    approvals: List[DocumentApprovalResponse]
    started_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# Workflow Template endpoints
@router.post("/workflow-templates/", response_model=WorkflowTemplateResponse)
async def create_workflow_template(
    template_data: WorkflowTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Создать шаблон маршрута согласования"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только администраторы могут создавать шаблоны")
    
    template = WorkflowTemplate(
        name=template_data.name,
        description=template_data.description,
        discipline_id=template_data.discipline_id,
        document_type_id=template_data.document_type_id
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return template


@router.get("/workflow-templates/", response_model=List[WorkflowTemplateResponse])
async def get_workflow_templates(
    discipline_id: Optional[int] = None,
    document_type_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получить список шаблонов маршрутов согласования"""
    query = db.query(WorkflowTemplate).filter(WorkflowTemplate.is_active == True)
    
    if discipline_id:
        query = query.filter(WorkflowTemplate.discipline_id == discipline_id)
    if document_type_id:
        query = query.filter(WorkflowTemplate.document_type_id == document_type_id)
    
    templates = query.all()
    return templates


@router.post("/workflow-templates/{template_id}/steps/")
async def add_workflow_step(
    template_id: int,
    step_data: WorkflowStepCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Добавить шаг в маршрут согласования"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только администраторы могут изменять шаблоны")
    
    template = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Шаблон не найден")
    
    step = WorkflowStep(
        template_id=template_id,
        step_order=step_data.step_order,
        step_name=step_data.step_name,
        approver_role=step_data.approver_role,
        approver_user_id=step_data.approver_user_id,
        is_required=step_data.is_required,
        escalation_hours=step_data.escalation_hours
    )
    db.add(step)
    db.commit()
    db.refresh(step)
    
    return {"message": "Шаг добавлен", "step_id": step.id}


# Document Workflow endpoints
@router.post("/documents/{document_id}/start-workflow/")
async def start_document_workflow(
    document_id: int,
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Запустить маршрут согласования для документа"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права доступа
    if not current_user.is_admin and document.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Нет прав доступа к документу")
    
    # Проверяем, что workflow еще не запущен
    existing_workflow = db.query(DocumentWorkflow).filter(
        DocumentWorkflow.document_id == document_id,
        DocumentWorkflow.status.in_([DocumentStatus.DRAFT, DocumentStatus.IN_REVIEW])
    ).first()
    
    if existing_workflow:
        raise HTTPException(status_code=400, detail="Маршрут согласования уже запущен")
    
    # Получаем шаблон
    template = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Шаблон не найден")
    
    # Создаем workflow
    workflow = DocumentWorkflow(
        document_id=document_id,
        template_id=template_id,
        status=DocumentStatus.IN_REVIEW,
        created_by=current_user.id
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    
    # Обновляем статус документа
    document.status = DocumentStatus.IN_REVIEW.value
    db.commit()
    
    # Создаем записи согласования для первого шага
    first_step = db.query(WorkflowStep).filter(
        WorkflowStep.template_id == template_id
    ).order_by(WorkflowStep.step_order).first()
    
    if first_step:
        workflow.current_step_id = first_step.id
        db.commit()
        
        # Создаем задачу согласования
        approval = DocumentApproval(
            workflow_id=workflow.id,
            step_id=first_step.id,
            approver_id=first_step.approver_user_id or current_user.id,  # Fallback
            status=ApprovalStatus.PENDING
        )
        db.add(approval)
        db.commit()
    
    # Записываем в историю
    history = DocumentHistory(
        document_id=document_id,
        action="workflow_started",
        new_value=f"Запущен маршрут согласования: {template.name}",
        user_id=current_user.id
    )
    db.add(history)
    db.commit()
    
    return {"message": "Маршрут согласования запущен", "workflow_id": workflow.id}


@router.get("/documents/{document_id}/workflow-status/", response_model=WorkflowStatusResponse)
async def get_document_workflow_status(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получить статус маршрута согласования документа"""
    workflow = db.query(DocumentWorkflow).filter(
        DocumentWorkflow.document_id == document_id
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Маршрут согласования не найден")
    
    # Получаем все согласования
    approvals = db.query(DocumentApproval).filter(
        DocumentApproval.workflow_id == workflow.id
    ).all()
    
    # Вычисляем прогресс
    total_steps = db.query(WorkflowStep).filter(
        WorkflowStep.template_id == workflow.template_id
    ).count()
    
    completed_approvals = len([a for a in approvals if a.status == ApprovalStatus.APPROVED])
    progress_percentage = int((completed_approvals / total_steps) * 100) if total_steps > 0 else 0
    
    # Формируем ответ
    approvals_response = []
    for approval in approvals:
        approver_name = approval.approver.full_name if approval.approver else "Не назначен"
        approvals_response.append(DocumentApprovalResponse(
            id=approval.id,
            step_name=approval.step.step_name,
            approver_name=approver_name,
            status=approval.status,
            comments=approval.comments,
            approved_at=approval.approved_at,
            created_at=approval.created_at
        ))
    
    current_step_name = workflow.current_step.step_name if workflow.current_step else None
    
    return WorkflowStatusResponse(
        document_id=document_id,
        status=workflow.status,
        current_step=current_step_name,
        progress_percentage=progress_percentage,
        approvals=approvals_response,
        started_at=workflow.started_at,
        completed_at=workflow.completed_at
    )


@router.post("/approvals/{approval_id}/approve/")
async def approve_document(
    approval_id: int,
    comments: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Согласовать документ"""
    approval = db.query(DocumentApproval).filter(DocumentApproval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Согласование не найдено")
    
    # Проверяем права
    if approval.approver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет прав на согласование")
    
    if approval.status != ApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Согласование уже обработано")
    
    # Обновляем статус
    approval.status = ApprovalStatus.APPROVED
    approval.comments = comments
    approval.approved_at = datetime.utcnow()
    
    # Создаем запись в document_workflow_history для каждого шага утверждения
    latest_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == approval.workflow.document_id,
        DocumentRevision.is_deleted == 0
    ).order_by(DocumentRevision.created_at.desc()).first()
    
    print(f"DEBUG: latest_revision found: {latest_revision is not None}")
    if latest_revision:
        # Проверяем, требует ли документ трансмиттал
        from app.models.project import WorkflowPresetSequence, Project
        from app.models.document import Document
        workflow_sequence = db.query(WorkflowPresetSequence).join(
            Project, Project.workflow_preset_id == WorkflowPresetSequence.preset_id
        ).join(
            Document, Document.project_id == Project.id
        ).filter(
            Document.id == approval.workflow.document_id,
            WorkflowPresetSequence.revision_description_id == latest_revision.revision_description_id,
            WorkflowPresetSequence.revision_step_id == latest_revision.revision_step_id
        ).first()
        
        if workflow_sequence and workflow_sequence.requires_transmittal:
            raise HTTPException(
                status_code=400, 
                detail="Документ должен быть утвержден через трансмиттал"
            )
        print(f"DEBUG: revision_id: {latest_revision.id}, workflow_status_id: {latest_revision.workflow_status_id}")
        
        # Сохраняем старый статус перед обновлением
        old_status_id = latest_revision.workflow_status_id
        
        # Получаем статус "Approved" (id = 3) для финального утверждения
        approved_status = db.query(WorkflowStatus).filter(WorkflowStatus.id == 3).first()
        print(f"DEBUG: approved_status found: {approved_status is not None}")
        if approved_status:
            # Валидируем переход статусов
            from app.utils.workflow_status_validator import WorkflowStatusValidator
            if not WorkflowStatusValidator.validate_transition(db, old_status_id, approved_status.id):
                from_status_name = latest_revision.workflow_status.name if latest_revision.workflow_status else "Draft"
                error_msg = WorkflowStatusValidator.get_transition_error_message(from_status_name, "Approved")
                raise HTTPException(status_code=400, detail=error_msg)
            print(f"DEBUG: Creating workflow_history with from_status_id={old_status_id}, to_status_id={approved_status.id}")
            # Создаем запись в document_workflow_history
            workflow_history = DocumentWorkflowHistory(
                revision_id=latest_revision.id,
                from_status_id=old_status_id,
                to_status_id=approved_status.id,
                user_id=current_user.id,
                action_type="approve",
                comments=comments or "Документ утвержден"
            )
            db.add(workflow_history)
            print(f"DEBUG: workflow_history added to session")
    
    db.commit()
    
    # Проверяем, нужно ли переходить к следующему шагу
    workflow = approval.workflow
    next_step = db.query(WorkflowStep).filter(
        WorkflowStep.template_id == workflow.template_id,
        WorkflowStep.step_order > approval.step.step_order
    ).order_by(WorkflowStep.step_order).first()
    
    if next_step:
        # Переходим к следующему шагу
        workflow.current_step_id = next_step.id
        
        # Создаем новое согласование
        new_approval = DocumentApproval(
            workflow_id=workflow.id,
            step_id=next_step.id,
            approver_id=next_step.approver_user_id or current_user.id,
            status=ApprovalStatus.PENDING
        )
        db.add(new_approval)
    else:
        # Все шаги пройдены - завершаем workflow
        workflow.status = DocumentStatus.APPROVED
        workflow.completed_at = datetime.utcnow()
        
        # Обновляем статус документа
        document = workflow.document
        document.status = DocumentStatus.APPROVED.value
        
        # Обновляем workflow_status_id в последней ревизии документа
        if latest_revision:
            latest_revision.workflow_status_id = approved_status.id
    
    db.commit()
    
    # Записываем в историю
    history = DocumentHistory(
        document_id=workflow.document_id,
        action="approved",
        new_value=f"Согласовано пользователем {current_user.full_name}",
        user_id=current_user.id,
        comment=comments
    )
    db.add(history)
    db.commit()
    
    return {"message": "Документ согласован"}


@router.post("/approvals/{approval_id}/reject/")
async def reject_document(
    approval_id: int,
    comments: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Отклонить документ"""
    approval = db.query(DocumentApproval).filter(DocumentApproval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Согласование не найдено")
    
    # Проверяем права
    if approval.approver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет прав на отклонение")
    
    if approval.status != ApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Согласование уже обработано")
    
    # Обновляем статус
    approval.status = ApprovalStatus.REJECTED
    approval.comments = comments
    approval.approved_at = datetime.utcnow()
    
    # Завершаем workflow с отклонением
    workflow = approval.workflow
    workflow.status = DocumentStatus.REJECTED
    workflow.completed_at = datetime.utcnow()
    
    # Обновляем статус документа
    document = workflow.document
    document.status = DocumentStatus.REJECTED.value
    
    # Создаем запись в document_workflow_history для отклонения
    latest_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == workflow.document_id,
        DocumentRevision.is_deleted == 0
    ).order_by(DocumentRevision.created_at.desc()).first()
    
    if latest_revision:
        # Проверяем, требует ли документ трансмиттал
        from app.models.project import WorkflowPresetSequence, Project
        from app.models.document import Document
        workflow_sequence = db.query(WorkflowPresetSequence).join(
            Project, Project.workflow_preset_id == WorkflowPresetSequence.preset_id
        ).join(
            Document, Document.project_id == Project.id
        ).filter(
            Document.id == workflow.document_id,
            WorkflowPresetSequence.revision_description_id == latest_revision.revision_description_id,
            WorkflowPresetSequence.revision_step_id == latest_revision.revision_step_id
        ).first()
        
        if workflow_sequence and workflow_sequence.requires_transmittal:
            raise HTTPException(
                status_code=400, 
                detail="Документ должен быть отклонен через трансмиттал"
            )
        # Сохраняем старый статус перед обновлением
        old_status_id = latest_revision.workflow_status_id
        
        # Получаем статус "Rejected" (id = 4)
        rejected_status = db.query(WorkflowStatus).filter(WorkflowStatus.id == 4).first()
        if rejected_status:
            # Валидируем переход статусов
            from app.utils.workflow_status_validator import WorkflowStatusValidator
            if not WorkflowStatusValidator.validate_transition(db, old_status_id, rejected_status.id):
                from_status_name = latest_revision.workflow_status.name if latest_revision.workflow_status else "Draft"
                error_msg = WorkflowStatusValidator.get_transition_error_message(from_status_name, "Rejected")
                raise HTTPException(status_code=400, detail=error_msg)
            latest_revision.workflow_status_id = rejected_status.id
            
            # Создаем запись в document_workflow_history
            workflow_history = DocumentWorkflowHistory(
                revision_id=latest_revision.id,
                from_status_id=old_status_id,  # Старый статус
                to_status_id=rejected_status.id,
                user_id=current_user.id,
                action_type="reject",
                comments=comments
            )
            db.add(workflow_history)
    
    db.commit()
    
    # Записываем в историю
    history = DocumentHistory(
        document_id=workflow.document_id,
        action="rejected",
        new_value=f"Отклонен пользователем {current_user.full_name}",
        user_id=current_user.id,
        comment=comments
    )
    db.add(history)
    db.commit()
    
    return {"message": "Документ отклонен"}


@router.get("/documents/{document_id}/history/")
async def get_document_history(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получить историю изменений документа"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права доступа
    if not current_user.is_admin and document.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Нет прав доступа к документу")
    
    history = db.query(DocumentHistory).filter(
        DocumentHistory.document_id == document_id
    ).order_by(DocumentHistory.timestamp.desc()).all()
    
    return [
        {
            "id": h.id,
            "action": h.action,
            "old_value": h.old_value,
            "new_value": h.new_value,
            "user_name": h.user.full_name,
            "timestamp": h.timestamp,
            "comment": h.comment
        }
        for h in history
    ]


@router.get("/my-approvals/")
async def get_my_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получить список документов, ожидающих моего согласования"""
    approvals = db.query(DocumentApproval).filter(
        DocumentApproval.approver_id == current_user.id,
        DocumentApproval.status == ApprovalStatus.PENDING
    ).all()
    
    result = []
    for approval in approvals:
        workflow = approval.workflow
        document = workflow.document
        result.append({
            "approval_id": approval.id,
            "document_id": document.id,
            "document_title": document.title,
            "step_name": approval.step.step_name,
            "created_at": approval.created_at,
            "escalation_hours": approval.step.escalation_hours
        })
    
    return result
