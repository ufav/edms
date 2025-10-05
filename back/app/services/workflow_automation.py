"""
Background tasks for workflow automation and escalation
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.database import get_db
from app.models.workflow import DocumentApproval, ApprovalStatus, DocumentWorkflow, DocumentStatus
from app.models.document import Document
from app.models.user import User
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class WorkflowEscalationService:
    """Сервис для автоматической эскалации workflow"""
    
    def __init__(self):
        self.notification_service = NotificationService()
    
    async def check_escalations(self):
        """Проверяет и обрабатывает эскалации"""
        db = next(get_db())
        try:
            # Находим просроченные согласования
            overdue_approvals = db.query(DocumentApproval).filter(
                and_(
                    DocumentApproval.status == ApprovalStatus.PENDING,
                    DocumentApproval.created_at < datetime.utcnow() - timedelta(hours=72)  # По умолчанию 72 часа
                )
            ).all()
            
            for approval in overdue_approvals:
                await self._process_escalation(approval, db)
                
        except Exception as e:
            logger.error(f"Error checking escalations: {e}")
        finally:
            db.close()
    
    async def _process_escalation(self, approval: DocumentApproval, db: Session):
        """Обрабатывает эскалацию конкретного согласования"""
        try:
            # Получаем информацию о шаге
            step = approval.step
            workflow = approval.workflow
            document = workflow.document
            
            # Проверяем, есть ли эскалация в настройках шага
            if step.escalation_hours:
                hours_passed = (datetime.utcnow() - approval.created_at).total_seconds() / 3600
                if hours_passed >= step.escalation_hours:
                    await self._escalate_approval(approval, db)
                    
        except Exception as e:
            logger.error(f"Error processing escalation for approval {approval.id}: {e}")
    
    async def _escalate_approval(self, approval: DocumentApproval, db: Session):
        """Выполняет эскалацию согласования"""
        try:
            step = approval.step
            workflow = approval.workflow
            document = workflow.document
            
            # Если есть роль для эскалации, назначаем нового согласующего
            if step.approver_role:
                # Находим пользователя с нужной ролью
                escalated_user = db.query(User).filter(
                    User.role == step.approver_role
                ).first()
                
                if escalated_user:
                    # Создаем новое согласование для эскалированного пользователя
                    new_approval = DocumentApproval(
                        workflow_id=workflow.id,
                        step_id=step.id,
                        approver_id=escalated_user.id,
                        status=ApprovalStatus.PENDING,
                        comments=f"Эскалировано от пользователя {approval.approver.full_name}"
                    )
                    db.add(new_approval)
                    
                    # Отмечаем старое согласование как делегированное
                    approval.status = ApprovalStatus.DELEGATED
                    approval.comments = f"Эскалировано пользователю {escalated_user.full_name}"
                    
                    # Отправляем уведомление
                    await self.notification_service.send_escalation_notification(
                        escalated_user.id,
                        document.id,
                        document.title,
                        step.step_name
                    )
                    
                    logger.info(f"Escalated approval {approval.id} to user {escalated_user.id}")
                else:
                    # Если нет пользователя с нужной ролью, отправляем уведомление администратору
                    await self.notification_service.send_admin_escalation_notification(
                        document.id,
                        document.title,
                        step.step_name,
                        step.approver_role
                    )
                    
                    logger.warning(f"No user found with role {step.approver_role} for escalation")
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Error escalating approval {approval.id}: {e}")
            db.rollback()


class WorkflowNotificationService:
    """Сервис для отправки уведомлений о workflow"""
    
    def __init__(self):
        self.notification_service = NotificationService()
    
    async def send_approval_notification(self, approver_id: int, document_id: int, document_title: str, step_name: str):
        """Отправляет уведомление о необходимости согласования"""
        try:
            await self.notification_service.create_notification(
                user_id=approver_id,
                type='approval',
                title='Требуется согласование',
                message=f'Документ "{document_title}" ожидает вашего согласования на шаге "{step_name}"',
                document_id=document_id,
                priority='medium'
            )
        except Exception as e:
            logger.error(f"Error sending approval notification: {e}")
    
    async def send_completion_notification(self, document_id: int, document_title: str, status: str):
        """Отправляет уведомление о завершении workflow"""
        try:
            # Получаем всех участников workflow
            db = next(get_db())
            try:
                workflow = db.query(DocumentWorkflow).filter(
                    DocumentWorkflow.document_id == document_id
                ).first()
                
                if workflow:
                    # Отправляем уведомление создателю workflow
                    await self.notification_service.create_notification(
                        user_id=workflow.created_by,
                        type='completed' if status == 'approved' else 'rejected',
                        title=f'Workflow завершен - {status}',
                        message=f'Документ "{document_title}" получил статус "{status}"',
                        document_id=document_id,
                        priority='medium'
                    )
                    
                    # Отправляем уведомления всем участникам
                    approvals = db.query(DocumentApproval).filter(
                        DocumentApproval.workflow_id == workflow.id
                    ).all()
                    
                    for approval in approvals:
                        if approval.approver_id != workflow.created_by:
                            await self.notification_service.create_notification(
                                user_id=approval.approver_id,
                                type='completed' if status == 'approved' else 'rejected',
                                title=f'Workflow завершен - {status}',
                                message=f'Документ "{document_title}" получил статус "{status}"',
                                document_id=document_id,
                                priority='low'
                            )
                            
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error sending completion notification: {e}")


class WorkflowAutomationService:
    """Основной сервис автоматизации workflow"""
    
    def __init__(self):
        self.escalation_service = WorkflowEscalationService()
        self.notification_service = WorkflowNotificationService()
    
    async def start_background_tasks(self):
        """Запускает фоновые задачи"""
        logger.info("Starting workflow automation background tasks")
        
        while True:
            try:
                await self.escalation_service.check_escalations()
                await asyncio.sleep(300)  # Проверяем каждые 5 минут
            except Exception as e:
                logger.error(f"Error in background tasks: {e}")
                await asyncio.sleep(60)  # При ошибке ждем минуту


# Глобальный экземпляр сервиса
workflow_automation = WorkflowAutomationService()


async def start_workflow_automation():
    """Запускает автоматизацию workflow"""
    await workflow_automation.start_background_tasks()
