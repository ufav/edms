from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.project import WorkflowPreset, WorkflowPresetSequence, WorkflowPresetRule
from app.models.references import RevisionDescription, RevisionStep, ReviewCode
from app.models.user import User
from app.services.auth import get_current_active_user
from app.services.audit_service import log_action, add_log_task

router = APIRouter()


def load_preset_data(preset_id: int, db: Session):
    """Загружает данные пресета с последовательностями и правилами"""
    try:
        # Загружаем последовательности с JOIN'ами для избежания N+1 запросов
        from sqlalchemy.orm import joinedload
        
        sequences = db.query(WorkflowPresetSequence).filter(
            WorkflowPresetSequence.preset_id == preset_id
        ).order_by(WorkflowPresetSequence.sequence_order).all()
        
        # Получаем все нужные ID для batch запросов
        revision_description_ids = [seq.revision_description_id for seq in sequences if seq.revision_description_id]
        revision_step_ids = [seq.revision_step_id for seq in sequences if seq.revision_step_id]
        
        # Загружаем все RevisionDescription одним запросом
        revision_descriptions = {}
        if revision_description_ids:
            for rd in db.query(RevisionDescription).filter(RevisionDescription.id.in_(revision_description_ids)).all():
                revision_descriptions[rd.id] = rd
        
        # Загружаем все RevisionStep одним запросом
        revision_steps = {}
        if revision_step_ids:
            for rs in db.query(RevisionStep).filter(RevisionStep.id.in_(revision_step_ids)).all():
                revision_steps[rs.id] = rs
        
        sequences_data = []
        for seq in sequences:
            rev_desc = revision_descriptions.get(seq.revision_description_id)
            rev_step = revision_steps.get(seq.revision_step_id)
            
            sequences_data.append({
                "id": seq.id,
                "sequence_order": seq.sequence_order,
                "revision_description_id": seq.revision_description_id,
                "revision_step_id": seq.revision_step_id,
                "revision_description": {
                    "id": rev_desc.id,
                    "code": rev_desc.code,
                    "description": rev_desc.description,
                    "description_native": rev_desc.description_native
                } if rev_desc else None,
                "revision_step": {
                    "id": rev_step.id,
                    "code": rev_step.code,
                    "description": rev_step.description,
                    "description_native": rev_step.description_native
                } if rev_step else None,
                "is_final": seq.is_final,
                "requires_transmittal": seq.requires_transmittal,
                "due_days": seq.due_days
            })
        
        # Загружаем правила
        rules = db.query(WorkflowPresetRule).filter(
            WorkflowPresetRule.preset_id == preset_id
        ).all()
        
        # Получаем все нужные ID для batch запросов
        rule_revision_description_ids = []
        rule_revision_step_ids = []
        review_code_ids = []
        
        for rule in rules:
            if rule.current_revision_description_id:
                rule_revision_description_ids.append(rule.current_revision_description_id)
            if rule.next_revision_description_id:
                rule_revision_description_ids.append(rule.next_revision_description_id)
            if rule.current_revision_step_id:
                rule_revision_step_ids.append(rule.current_revision_step_id)
            if rule.next_revision_step_id:
                rule_revision_step_ids.append(rule.next_revision_step_id)
            if rule.review_code_id:
                review_code_ids.append(rule.review_code_id)
        
        # Загружаем все RevisionDescription одним запросом
        rule_revision_descriptions = {}
        if rule_revision_description_ids:
            for rd in db.query(RevisionDescription).filter(RevisionDescription.id.in_(rule_revision_description_ids)).all():
                rule_revision_descriptions[rd.id] = rd
        
        # Загружаем все RevisionStep одним запросом
        rule_revision_steps = {}
        if rule_revision_step_ids:
            for rs in db.query(RevisionStep).filter(RevisionStep.id.in_(rule_revision_step_ids)).all():
                rule_revision_steps[rs.id] = rs
        
        # Загружаем все ReviewCode одним запросом
        review_codes = {}
        if review_code_ids:
            for rc in db.query(ReviewCode).filter(ReviewCode.id.in_(review_code_ids)).all():
                review_codes[rc.id] = rc
        
        rules_data = []
        for rule in rules:
            current_desc = rule_revision_descriptions.get(rule.current_revision_description_id)
            current_step = rule_revision_steps.get(rule.current_revision_step_id)
            next_desc = rule_revision_descriptions.get(rule.next_revision_description_id) if rule.next_revision_description_id else None
            next_step = rule_revision_steps.get(rule.next_revision_step_id) if rule.next_revision_step_id else None
            review_code = review_codes.get(rule.review_code_id)
            
            rules_data.append({
                "id": rule.id,
                "current_revision": {
                    "description": {
                        "id": current_desc.id,
                        "code": current_desc.code,
                        "description": current_desc.description,
                        "description_native": current_desc.description_native
                    } if current_desc else None,
                    "step": {
                        "id": current_step.id,
                        "code": current_step.code,
                        "description": current_step.description,
                        "description_native": current_step.description_native
                    } if current_step else None
                },
                "operator": rule.operator,
                "review_code": {
                    "id": review_code.id,
                    "code": review_code.code,
                    "description": review_code.description,
                    "description_native": review_code.name_native
                } if review_code else None,
                "review_code_list": rule.review_code_list,
                "priority": rule.priority,
                "next_revision": {
                    "description": {
                        "id": next_desc.id,
                        "code": next_desc.code,
                        "description": next_desc.description,
                        "description_native": next_desc.description_native
                    } if next_desc else None,
                    "step": {
                        "id": next_step.id,
                        "code": next_step.code,
                        "description": next_step.description,
                        "description_native": next_step.description_native
                    } if next_step else None
                } if rule.next_revision_description_id else None,
            })
        
        return sequences_data, rules_data
    except Exception as e:
        print(f"Error in load_preset_data: {e}")
        raise e


# Pydantic schemas
class WorkflowPresetRuleCreate(BaseModel):
    document_type_id: Optional[int] = None
    current_revision_description_id: int
    current_revision_step_id: int
    operator: str = "equals"  # "equals", "not_equals", "in_list", "not_in_list"
    review_code_id: Optional[int] = None  # для equals/not_equals
    review_code_list: Optional[str] = None  # JSON для in_list/not_in_list
    next_revision_description_id: Optional[int] = None
    next_revision_step_id: Optional[int] = None
    priority: int = 100


class WorkflowPresetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_global: bool = True
    sequences: List[dict] = []
    rules: List[WorkflowPresetRuleCreate] = []


class WorkflowPresetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_global: Optional[bool] = None
    sequences: Optional[List[dict]] = None
    rules: Optional[List[WorkflowPresetRuleCreate]] = None


class WorkflowPresetResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_global: bool
    created_by: Optional[int]
    created_at: str
    updated_at: str
    sequences: List[dict] = []
    rules: List[dict] = []


@router.get("/", response_model=List[WorkflowPresetResponse])
async def get_workflow_presets(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка workflow пресетов"""
    # Показываем глобальные пресеты и пресеты пользователя
    presets = db.query(WorkflowPreset).filter(
        (WorkflowPreset.is_global == True) | 
        (WorkflowPreset.created_by == current_user.id)
    ).offset(skip).limit(limit).all()
    
    result = []
    for preset in presets:
        # Загружаем данные пресета
        sequences_data, rules_data = load_preset_data(preset.id, db)
        
        result.append(WorkflowPresetResponse(
            id=preset.id,
            name=preset.name,
            description=preset.description,
            is_global=preset.is_global,
            created_by=preset.created_by,
            created_at=preset.created_at.isoformat() if preset.created_at else "",
            updated_at=preset.updated_at.isoformat() if preset.updated_at else "",
            sequences=sequences_data,
            rules=rules_data
        ))
    
    return result


@router.get("/{preset_id}", response_model=WorkflowPresetResponse)
async def get_workflow_preset(
    preset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение конкретного workflow пресета"""
    preset = db.query(WorkflowPreset).filter(WorkflowPreset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Workflow пресет не найден")
    
    # Проверяем права доступа
    if not preset.is_global and preset.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому пресету")
    
    # Загружаем данные пресета
    sequences_data, rules_data = load_preset_data(preset.id, db)
    
    # Преобразуем даты в строки для корректного ответа
    return WorkflowPresetResponse(
        id=preset.id,
        name=preset.name,
        description=preset.description,
        is_global=preset.is_global,
        created_by=preset.created_by,
        created_at=preset.created_at.isoformat() if preset.created_at else "",
        updated_at=preset.updated_at.isoformat() if preset.updated_at else "",
        sequences=sequences_data,
        rules=rules_data
    )


@router.post("/", response_model=WorkflowPresetResponse)
async def create_workflow_preset(
    preset_data: WorkflowPresetCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Создание нового workflow пресета"""
    
    # Проверяем, не существует ли уже пресет с таким именем
    existing_preset = db.query(WorkflowPreset).filter(
        WorkflowPreset.name == preset_data.name,
        WorkflowPreset.is_global == preset_data.is_global
    ).first()
    
    if existing_preset:
        raise HTTPException(
            status_code=400, 
            detail=f"Пресет с именем '{preset_data.name}' уже существует"
        )
    
    # Создаем пресет
    preset = WorkflowPreset(
        name=preset_data.name,
        description=preset_data.description,
        is_global=preset_data.is_global,
        created_by=current_user.id if not preset_data.is_global else None
    )
    
    db.add(preset)
    db.commit()
    db.refresh(preset)
    
    # Добавляем последовательности
    for i, sequence_item in enumerate(preset_data.sequences):
        sequence = WorkflowPresetSequence(
            preset_id=preset.id,
            sequence_order=i + 1,
            revision_description_id=sequence_item['revision_description_id'],
            revision_step_id=sequence_item['revision_step_id'],
            is_final=sequence_item.get('is_final', False),
            requires_transmittal=sequence_item.get('requires_transmittal', False),
            due_days=sequence_item.get('due_days')
        )
        db.add(sequence)
    
    # Добавляем правила
    for rule_item in preset_data.rules:
        rule = WorkflowPresetRule(
            preset_id=preset.id,
            document_type_id=rule_item.document_type_id,
            current_revision_description_id=rule_item.current_revision_description_id,
            current_revision_step_id=rule_item.current_revision_step_id,
            review_code_id=rule_item.review_code_id,
            operator=rule_item.operator,
            review_code_list=rule_item.review_code_list,
            priority=rule_item.priority,
            next_revision_description_id=rule_item.next_revision_description_id,
            next_revision_step_id=rule_item.next_revision_step_id,
        )
        db.add(rule)
    
    db.commit()
    
    # Логирование действия
    new_values = {
        "id": preset.id,
        "name": preset.name,
        "description": preset.description,
        "is_global": preset.is_global,
        "created_by": preset.created_by,
    }
    add_log_task(
        background_tasks=background_tasks,
        request=request,
        user_id=current_user.id,
        action="create",
        entity_type="workflow_preset",
        entity_id=preset.id,
        old_values=None,
        new_values=new_values,
    )
    
    # Загружаем данные пресета
    sequences_data, rules_data = load_preset_data(preset.id, db)
    
    # Преобразуем даты в строки для корректного ответа
    return WorkflowPresetResponse(
        id=preset.id,
        name=preset.name,
        description=preset.description,
        is_global=preset.is_global,
        created_by=preset.created_by,
        created_at=preset.created_at.isoformat() if preset.created_at else "",
        updated_at=preset.updated_at.isoformat() if preset.updated_at else "",
        sequences=sequences_data,
        rules=rules_data
    )


@router.put("/{preset_id}", response_model=WorkflowPresetResponse)
async def update_workflow_preset(
    preset_id: int,
    preset_data: WorkflowPresetUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Обновление workflow пресета"""
    preset = db.query(WorkflowPreset).filter(WorkflowPreset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Workflow пресет не найден")
    
    # Проверяем права доступа
    if not preset.is_global and preset.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому пресету")
    
    # Сохраняем старые значения для лога
    old_values = {
        "id": preset.id,
        "name": preset.name,
        "description": preset.description,
        "is_global": preset.is_global,
        "created_by": preset.created_by,
    }
    
    # Обновляем основные поля
    if preset_data.name is not None:
        preset.name = preset_data.name
    if preset_data.description is not None:
        preset.description = preset_data.description
    if preset_data.is_global is not None:
        preset.is_global = preset_data.is_global
    
    # Если обновляются последовательности или правила, удаляем старые и добавляем новые
    if preset_data.sequences is not None:
        # Удаляем старые последовательности
        db.query(WorkflowPresetSequence).filter(WorkflowPresetSequence.preset_id == preset.id).delete()
        
        # Добавляем новые
        for i, sequence_item in enumerate(preset_data.sequences):
            sequence = WorkflowPresetSequence(
                preset_id=preset.id,
                sequence_order=i + 1,
                revision_description_id=sequence_item['revision_description_id'],
                revision_step_id=sequence_item['revision_step_id'],
                is_final=sequence_item.get('is_final', False),
                requires_transmittal=sequence_item.get('requires_transmittal', False),
                due_days=sequence_item.get('due_days')
            )
            db.add(sequence)
    
    if preset_data.rules is not None:
        # Удаляем старые правила
        db.query(WorkflowPresetRule).filter(WorkflowPresetRule.preset_id == preset.id).delete()
        
        # Добавляем новые
        for rule_item in preset_data.rules:
            rule = WorkflowPresetRule(
                preset_id=preset.id,
                document_type_id=rule_item.document_type_id,
                current_revision_description_id=rule_item.current_revision_description_id,
                current_revision_step_id=rule_item.current_revision_step_id,
                review_code_id=rule_item.review_code_id,
                operator=rule_item.operator,
                review_code_list=rule_item.review_code_list,
                priority=rule_item.priority,
                next_revision_description_id=rule_item.next_revision_description_id,
                next_revision_step_id=rule_item.next_revision_step_id,
            )
            db.add(rule)
    
    db.commit()
    db.refresh(preset)
    
    # Логирование действия
    new_values = {
        "id": preset.id,
        "name": preset.name,
        "description": preset.description,
        "is_global": preset.is_global,
        "created_by": preset.created_by,
    }
    add_log_task(
        background_tasks=background_tasks,
        request=request,
        user_id=current_user.id,
        action="update",
        entity_type="workflow_preset",
        entity_id=preset_id,
        old_values=old_values,
        new_values=new_values,
    )
    
    # Загружаем данные пресета
    sequences_data, rules_data = load_preset_data(preset.id, db)
    
    # Преобразуем даты в строки для корректного ответа
    return WorkflowPresetResponse(
        id=preset.id,
        name=preset.name,
        description=preset.description,
        is_global=preset.is_global,
        created_by=preset.created_by,
        created_at=preset.created_at.isoformat() if preset.created_at else "",
        updated_at=preset.updated_at.isoformat() if preset.updated_at else "",
        sequences=sequences_data,
        rules=rules_data
    )


@router.delete("/{preset_id}")
async def delete_workflow_preset(
    preset_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Удаление workflow пресета"""
    preset = db.query(WorkflowPreset).filter(WorkflowPreset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Workflow пресет не найден")
    
    # Проверяем права доступа
    if not preset.is_global and preset.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому пресету")
    
    # Сохраняем старые значения для лога
    old_values = {
        "id": preset.id,
        "name": preset.name,
        "description": preset.description,
        "is_global": preset.is_global,
        "created_by": preset.created_by,
    }
    
    # Удаляем связанные данные (каскадное удаление)
    db.query(WorkflowPresetSequence).filter(WorkflowPresetSequence.preset_id == preset.id).delete()
    db.query(WorkflowPresetRule).filter(WorkflowPresetRule.preset_id == preset.id).delete()
    db.delete(preset)
    db.commit()
    
    # Логирование действия
    add_log_task(
        background_tasks=background_tasks,
        request=request,
        user_id=current_user.id,
        action="delete",
        entity_type="workflow_preset",
        entity_id=preset_id,
        old_values=old_values,
        new_values=None,
    )
    
    return {"message": "Workflow пресет удален"}
