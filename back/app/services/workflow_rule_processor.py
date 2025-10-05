"""
Сервис для обработки правил workflow с поддержкой операторов сравнения
"""

import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.references import ReviewCode


class WorkflowRuleProcessor:
    """Процессор правил workflow с поддержкой операторов"""
    
    @staticmethod
    def evaluate_rule(rule, current_revision_description_id: int, 
                    current_revision_step_id: int, review_code_id: int, 
                    db: Session) -> bool:
        """
        Оценивает правило на соответствие текущим условиям
        
        Args:
            rule: WorkflowPresetRule объект
            current_revision_description_id: ID текущего описания ревизии
            current_revision_step_id: ID текущего шага ревизии  
            review_code_id: ID кода проверки
            db: Сессия базы данных
            
        Returns:
            bool: True если правило соответствует условиям
        """
        # Проверяем соответствие текущей ревизии
        if (rule.current_revision_description_id != current_revision_description_id or 
            rule.current_revision_step_id != current_revision_step_id):
            return False
        
        # Получаем код проверки
        review_code = db.query(ReviewCode).filter(ReviewCode.id == review_code_id).first()
        if not review_code:
            return False
        
        # Оцениваем оператор
        return WorkflowRuleProcessor._evaluate_operator(
            rule.operator, 
            rule.review_code_id, 
            rule.review_code_list, 
            review_code
        )
    
    @staticmethod
    def _evaluate_operator(operator: str, rule_review_code_id: Optional[int], 
                          review_code_list: Optional[str], 
                          current_review_code: ReviewCode) -> bool:
        """
        Оценивает оператор сравнения
        
        Args:
            operator: Тип оператора (equals, not_equals, in_list, not_in_list)
            rule_review_code_id: ID кода проверки в правиле (для equals/not_equals)
            review_code_list: JSON список кодов (для in_list/not_in_list)
            current_review_code: Текущий код проверки
            
        Returns:
            bool: Результат сравнения
        """
        if operator == "equals":
            return rule_review_code_id == current_review_code.id
            
        elif operator == "not_equals":
            return rule_review_code_id != current_review_code.id
            
        elif operator == "in_list":
            if not review_code_list:
                return False
            try:
                code_list = json.loads(review_code_list)
                return current_review_code.code in code_list
            except (json.JSONDecodeError, TypeError):
                return False
                
        elif operator == "not_in_list":
            if not review_code_list:
                return False
            try:
                code_list = json.loads(review_code_list)
                return current_review_code.code not in code_list
            except (json.JSONDecodeError, TypeError):
                return False
        
        # Неизвестный оператор
        return False
    
    @staticmethod
    def find_applicable_rule(rules, current_revision_description_id: int,
                           current_revision_step_id: int, review_code_id: int,
                           db: Session) -> Optional[Any]:
        """
        Находит применимое правило для текущих условий
        
        Args:
            rules: Список правил (отсортированных по приоритету)
            current_revision_description_id: ID текущего описания ревизии
            current_revision_step_id: ID текущего шага ревизии
            review_code_id: ID кода проверки
            db: Сессия базы данных
            
        Returns:
            WorkflowPresetRule или None
        """
        for rule in rules:
            if WorkflowRuleProcessor.evaluate_rule(
                rule, current_revision_description_id, 
                current_revision_step_id, review_code_id, db
            ):
                return rule
        return None
    
    @staticmethod
    def get_next_revision(rule, current_revision_description_id: int,
                         current_revision_step_id: int, db: Session) -> Dict[str, Any]:
        """
        Определяет следующую ревизию на основе правила
        
        Args:
            rule: WorkflowPresetRule объект
            current_revision_description_id: ID текущего описания ревизии
            current_revision_step_id: ID текущего шага ревизии
            db: Сессия базы данных
            
        Returns:
            Dict с информацией о следующей ревизии
        """
        from app.models.references import RevisionDescription, RevisionStep
        
        # Если указана конкретная следующая ревизия
        if rule.next_revision_description_id:
            next_desc = db.query(RevisionDescription).filter(
                RevisionDescription.id == rule.next_revision_description_id
            ).first()
            next_step = db.query(RevisionStep).filter(
                RevisionStep.id == rule.next_revision_step_id
            ).first() if rule.next_revision_step_id else None
            
            return {
                "action": "specific_revision",
                "revision_description_id": rule.next_revision_description_id,
                "revision_step_id": rule.next_revision_step_id,
                "revision_description": next_desc,
                "revision_step": next_step
            }
        
        # Если action_on_fail = "increment_number", увеличиваем номер
        elif rule.action_on_fail == "increment_number":
            current_step = db.query(RevisionStep).filter(
                RevisionStep.id == current_revision_step_id
            ).first()
            
            if current_step:
                # Простая логика увеличения номера (01 -> 02, 02 -> 03)
                try:
                    current_number = int(current_step.code)
                    next_number = current_number + 1
                    next_step_code = f"{next_number:02d}"
                    
                    # Ищем следующий шаг с таким кодом
                    next_step = db.query(RevisionStep).filter(
                        RevisionStep.code == next_step_code
                    ).first()
                    
                    if next_step:
                        return {
                            "action": "increment_number",
                            "revision_description_id": current_revision_description_id,
                            "revision_step_id": next_step.id,
                            "revision_description": None,  # Остается тот же
                            "revision_step": next_step
                        }
                except (ValueError, TypeError):
                    pass
        
        # Если ничего не подошло, возвращаем None
        return {
            "action": "no_action",
            "revision_description_id": None,
            "revision_step_id": None,
            "revision_description": None,
            "revision_step": None
        }
