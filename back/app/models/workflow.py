"""
Workflow models for document lifecycle and approval processes
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class DocumentStatus(str, enum.Enum):
    """Статусы документа в жизненном цикле"""
    DRAFT = "draft"  # Черновик
    IN_REVIEW = "in_review"  # На согласовании
    APPROVED = "approved"  # Утвержден
    REJECTED = "rejected"  # Отклонен
    ARCHIVED = "archived"  # Архив
    SUPERSEDED = "superseded"  # Заменен


class ApprovalStatus(str, enum.Enum):
    """Статусы согласования"""
    PENDING = "pending"  # Ожидает согласования
    APPROVED = "approved"  # Согласован
    REJECTED = "rejected"  # Отклонен
    DELEGATED = "delegated"  # Делегирован


class WorkflowTemplate(Base):
    """Шаблон маршрута согласования"""
    __tablename__ = "workflow_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=True)
    document_type_id = Column(Integer, ForeignKey("document_types.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    steps = relationship("WorkflowStep", back_populates="template", cascade="all, delete-orphan")
    workflows = relationship("DocumentWorkflow", back_populates="template")


class WorkflowStep(Base):
    """Шаг в маршруте согласования"""
    __tablename__ = "workflow_steps"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("workflow_templates.id"), nullable=False)
    step_order = Column(Integer, nullable=False)  # Порядок шага
    step_name = Column(String(255), nullable=False)  # Название шага
    approver_role = Column(String(100), nullable=True)  # Роль согласующего
    approver_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Конкретный пользователь
    is_required = Column(Boolean, default=True)  # Обязательное согласование
    escalation_hours = Column(Integer, default=72)  # Часы до эскалации
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    template = relationship("WorkflowTemplate", back_populates="steps")
    approver = relationship("User", foreign_keys=[approver_user_id])
    approvals = relationship("DocumentApproval", back_populates="step")


class DocumentWorkflow(Base):
    """Активный workflow для документа"""
    __tablename__ = "document_workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("workflow_templates.id"), nullable=False)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.DRAFT)
    current_step_id = Column(Integer, ForeignKey("workflow_steps.id"), nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Связи
    document = relationship("Document", back_populates="workflow")
    template = relationship("WorkflowTemplate", back_populates="workflows")
    current_step = relationship("WorkflowStep")
    creator = relationship("User", foreign_keys=[created_by])
    approvals = relationship("DocumentApproval", back_populates="workflow")


class DocumentApproval(Base):
    """Согласование документа"""
    __tablename__ = "document_workflow_approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("document_workflows.id"), nullable=False)
    step_id = Column(Integer, ForeignKey("workflow_steps.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    comments = Column(Text, nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    workflow = relationship("DocumentWorkflow", back_populates="approvals")
    step = relationship("WorkflowStep", back_populates="approvals")
    approver = relationship("User")


class DocumentHistory(Base):
    """История изменений документа"""
    __tablename__ = "document_history"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    action = Column(String(100), nullable=False)  # created, updated, status_changed, etc.
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    comment = Column(Text, nullable=True)
    
    # Связи
    document = relationship("Document")
    user = relationship("User")