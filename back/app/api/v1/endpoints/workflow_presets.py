from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.project import WorkflowPreset, WorkflowPresetSequence, WorkflowPresetRule
from app.models.references import RevisionDescription, RevisionStep, ReviewCode
from app.models.user import User
from app.services.auth import get_current_active_user

router = APIRouter()


def load_preset_data(preset_id: int, db: Session):
    """Загружает данные пресета с последовательностями и правилами"""
    # Загружаем последовательности
    sequences = db.query(WorkflowPresetSequence).filter(
        WorkflowPresetSequence.preset_id == preset_id
    ).order_by(WorkflowPresetSequence.sequence_order).all()
    
    sequences_data = []
    for seq in sequences:
        rev_desc = db.query(RevisionDescription).filter(RevisionDescription.id == seq.revision_description_id).first()
        rev_step = db.query(RevisionStep).filter(RevisionStep.id == seq.revision_step_id).first()
        
        sequences_data.append({
            "id": seq.id,
            "sequence_order": seq.sequence_order,
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
            "is_final": seq.is_final
        })
    
    # Загружаем правила
    rules = db.query(WorkflowPresetRule).filter(
        WorkflowPresetRule.preset_id == preset_id
    ).all()
    
    rules_data = []
    for rule in rules:
        current_desc = db.query(RevisionDescription).filter(RevisionDescription.id == rule.current_revision_description_id).first()
        current_step = db.query(RevisionStep).filter(RevisionStep.id == rule.current_revision_step_id).first()
        next_desc = db.query(RevisionDescription).filter(RevisionDescription.id == rule.next_revision_description_id).first() if rule.next_revision_description_id else None
        next_step = db.query(RevisionStep).filter(RevisionStep.id == rule.next_revision_step_id).first() if rule.next_revision_step_id else None
        review_code = db.query(ReviewCode).filter(ReviewCode.id == rule.review_code_id).first()
        
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
            "action_on_fail": rule.action_on_fail
        })
    
    return sequences_data, rules_data


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
    action_on_fail: str = "increment_number"
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
            document_type_id=sequence_item.get('document_type_id'),
            sequence_order=i + 1,
            revision_description_id=sequence_item['revision_description_id'],
            revision_step_id=sequence_item['revision_step_id'],
            is_final=sequence_item.get('is_final', False)
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
            action_on_fail=rule_item.action_on_fail
        )
        db.add(rule)
    
    db.commit()
    
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
                document_type_id=sequence_item.get('document_type_id'),
                sequence_order=i + 1,
                revision_description_id=sequence_item['revision_description_id'],
                revision_step_id=sequence_item['revision_step_id'],
                is_final=sequence_item.get('is_final', False)
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
                action_on_fail=rule_item.action_on_fail
            )
            db.add(rule)
    
    db.commit()
    db.refresh(preset)
    
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
    
    # Удаляем связанные данные (каскадное удаление)
    db.query(WorkflowPresetSequence).filter(WorkflowPresetSequence.preset_id == preset.id).delete()
    db.query(WorkflowPresetRule).filter(WorkflowPresetRule.preset_id == preset.id).delete()
    db.delete(preset)
    db.commit()
    
    return {"message": "Workflow пресет удален"}
