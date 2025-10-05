"""
API endpoints для применения правил workflow
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.project import WorkflowPresetRule
from app.models.references import RevisionDescription, RevisionStep, ReviewCode
from app.services.workflow_rule_processor import WorkflowRuleProcessor
from app.services.auth import get_current_active_user
from app.models.user import User

router = APIRouter()


class WorkflowRuleApplicationRequest(BaseModel):
    """Запрос на применение правила workflow"""
    preset_id: int
    current_revision_description_id: int
    current_revision_step_id: int
    review_code_id: int


class WorkflowRuleApplicationResponse(BaseModel):
    """Ответ с результатом применения правила"""
    rule_matched: bool
    next_revision: Optional[Dict[str, Any]] = None
    rule_id: Optional[int] = None
    message: str


@router.post("/apply-rule", response_model=WorkflowRuleApplicationResponse)
async def apply_workflow_rule(
    request: WorkflowRuleApplicationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Применяет правило workflow для определения следующей ревизии
    
    Args:
        request: Параметры для применения правила
        db: Сессия базы данных
        current_user: Текущий пользователь
        
    Returns:
        WorkflowRuleApplicationResponse: Результат применения правила
    """
    try:
        # Получаем все правила пресета, отсортированные по приоритету
        rules = db.query(WorkflowPresetRule).filter(
            WorkflowPresetRule.preset_id == request.preset_id
        ).order_by(WorkflowPresetRule.priority.asc()).all()
        
        if not rules:
            return WorkflowRuleApplicationResponse(
                rule_matched=False,
                message="Правила для данного пресета не найдены"
            )
        
        # Ищем применимое правило
        applicable_rule = WorkflowRuleProcessor.find_applicable_rule(
            rules,
            request.current_revision_description_id,
            request.current_revision_step_id,
            request.review_code_id,
            db
        )
        
        if not applicable_rule:
            return WorkflowRuleApplicationResponse(
                rule_matched=False,
                message="Подходящее правило не найдено"
            )
        
        # Определяем следующую ревизию
        next_revision = WorkflowRuleProcessor.get_next_revision(
            applicable_rule,
            request.current_revision_description_id,
            request.current_revision_step_id,
            db
        )
        
        return WorkflowRuleApplicationResponse(
            rule_matched=True,
            next_revision=next_revision,
            rule_id=applicable_rule.id,
            message="Правило успешно применено"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при применении правила: {str(e)}")


@router.get("/presets/{preset_id}/rules", response_model=list)
async def get_preset_rules(
    preset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получает все правила пресета с подробной информацией
    
    Args:
        preset_id: ID пресета
        db: Сессия базы данных
        current_user: Текущий пользователь
        
    Returns:
        list: Список правил с подробной информацией
    """
    try:
        rules = db.query(WorkflowPresetRule).filter(
            WorkflowPresetRule.preset_id == preset_id
        ).order_by(WorkflowPresetRule.priority.asc()).all()
        
        result = []
        for rule in rules:
            # Получаем связанные данные
            current_desc = db.query(RevisionDescription).filter(
                RevisionDescription.id == rule.current_revision_description_id
            ).first()
            current_step = db.query(RevisionStep).filter(
                RevisionStep.id == rule.current_revision_step_id
            ).first()
            review_code = db.query(ReviewCode).filter(
                ReviewCode.id == rule.review_code_id
            ).first()
            next_desc = db.query(RevisionDescription).filter(
                RevisionDescription.id == rule.next_revision_description_id
            ).first() if rule.next_revision_description_id else None
            next_step = db.query(RevisionStep).filter(
                RevisionStep.id == rule.next_revision_step_id
            ).first() if rule.next_revision_step_id else None
            
            result.append({
                "id": rule.id,
                "priority": rule.priority,
                "operator": rule.operator,
                "current_revision": {
                    "description": {
                        "id": current_desc.id,
                        "code": current_desc.code,
                        "description": current_desc.description
                    } if current_desc else None,
                    "step": {
                        "id": current_step.id,
                        "code": current_step.code,
                        "description": current_step.description
                    } if current_step else None
                },
                "review_code": {
                    "id": review_code.id,
                    "code": review_code.code,
                    "name": review_code.name
                } if review_code else None,
                "review_code_list": rule.review_code_list,
                "next_revision": {
                    "description": {
                        "id": next_desc.id,
                        "code": next_desc.code,
                        "description": next_desc.description
                    } if next_desc else None,
                    "step": {
                        "id": next_step.id,
                        "code": next_step.code,
                        "description": next_step.description
                    } if next_step else None
                } if rule.next_revision_description_id else None,
                "action_on_fail": rule.action_on_fail
            })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении правил: {str(e)}")
