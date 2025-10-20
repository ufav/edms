"""
Workflow Status Validator - валидация переходов статусов ревизий
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.references import WorkflowStatus


class WorkflowStatusValidator:
    """Валидатор переходов статусов workflow"""
    
    # Допустимые переходы статусов
    ALLOWED_TRANSITIONS = {
        "Draft": ["In Review"],
        "In Review": ["Approved", "Rejected", "Approved with Comments", "Not Reviewed"],
        # Все финальные статусы - тупиковые (нельзя изменить)
        "Approved": [],
        "Rejected": [],
        "Approved with Comments": [],
        "Not Reviewed": []
    }
    
    @classmethod
    def is_transition_allowed(cls, from_status_name: str, to_status_name: str) -> bool:
        """
        Проверяет, допустим ли переход между статусами
        
        Args:
            from_status_name: Имя исходного статуса
            to_status_name: Имя целевого статуса
            
        Returns:
            bool: True если переход допустим
        """
        if not from_status_name or not to_status_name:
            return False
            
        allowed_targets = cls.ALLOWED_TRANSITIONS.get(from_status_name, [])
        return to_status_name in allowed_targets
    
    @classmethod
    def validate_transition(cls, db: Session, from_status_id: Optional[int], to_status_id: int) -> bool:
        """
        Валидирует переход статусов по их ID
        
        Args:
            db: Сессия базы данных
            from_status_id: ID исходного статуса (может быть None для новых ревизий)
            to_status_id: ID целевого статуса
            
        Returns:
            bool: True если переход допустим
        """
        # Получаем целевой статус
        to_status = db.query(WorkflowStatus).filter(WorkflowStatus.id == to_status_id).first()
        if not to_status:
            return False
        
        # Если нет исходного статуса (новая ревизия), разрешаем только Draft
        if from_status_id is None:
            return to_status.name == "Draft"
        
        # Получаем исходный статус
        from_status = db.query(WorkflowStatus).filter(WorkflowStatus.id == from_status_id).first()
        if not from_status:
            return False
        
        # Проверяем переход
        return cls.is_transition_allowed(from_status.name, to_status.name)
    
    @classmethod
    def get_allowed_transitions(cls, from_status_name: str) -> list[str]:
        """
        Возвращает список допустимых переходов из указанного статуса
        
        Args:
            from_status_name: Имя исходного статуса
            
        Returns:
            list[str]: Список допустимых целевых статусов
        """
        return cls.ALLOWED_TRANSITIONS.get(from_status_name, [])
    
    @classmethod
    def is_final_status(cls, status_name: str) -> bool:
        """
        Проверяет, является ли статус финальным
        
        Args:
            status_name: Имя статуса
            
        Returns:
            bool: True если статус финальный
        """
        return status_name in ["Approved", "Rejected", "Approved with Comments", "Not Reviewed"]
    
    @classmethod
    def get_transition_error_message(cls, from_status_name: str, to_status_name: str) -> str:
        """
        Возвращает сообщение об ошибке для недопустимого перехода
        
        Args:
            from_status_name: Имя исходного статуса
            to_status_name: Имя целевого статуса
            
        Returns:
            str: Сообщение об ошибке
        """
        if cls.is_final_status(from_status_name):
            return f"Нельзя изменить статус ревизии из '{from_status_name}' - ревизия уже завершена"
        
        allowed = cls.get_allowed_transitions(from_status_name)
        if allowed:
            return f"Недопустимый переход из '{from_status_name}' в '{to_status_name}'. Допустимые переходы: {', '.join(allowed)}"
        else:
            return f"Неизвестный статус '{from_status_name}'"
