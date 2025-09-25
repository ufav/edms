"""
Workflow models for EDMS
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Workflow(Base):
    __tablename__ = "workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("Project")  # Убрали back_populates из-за циклического импорта
    creator = relationship("User", foreign_keys=[created_by])
    steps = relationship("WorkflowStep", back_populates="workflow")
    instances = relationship("WorkflowInstance", back_populates="workflow")
    
    def __repr__(self):
        return f"<Workflow(id={self.id}, name='{self.name}')>"

class WorkflowStep(Base):
    __tablename__ = "workflow_steps"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id", ondelete="CASCADE"))
    step_name = Column(String(200), nullable=False)
    step_order = Column(Integer, nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"))
    step_type = Column(String(50), nullable=False)
    is_required = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workflow = relationship("Workflow", back_populates="steps")
    assignee = relationship("User", foreign_keys=[assigned_to])
    logs = relationship("WorkflowStepLog", back_populates="step")
    
    def __repr__(self):
        return f"<WorkflowStep(id={self.id}, name='{self.step_name}', order={self.step_order})>"

class WorkflowInstance(Base):
    __tablename__ = "workflow_instances"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id", ondelete="CASCADE"))
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    current_step = Column(Integer, ForeignKey("workflow_steps.id"))
    status = Column(String(20), default="active")
    started_by = Column(Integer, ForeignKey("users.id"))
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    workflow = relationship("Workflow", back_populates="instances")
    document = relationship("Document", back_populates="workflow_instances")
    current_step_obj = relationship("WorkflowStep", foreign_keys=[current_step])
    starter = relationship("User", foreign_keys=[started_by])
    logs = relationship("WorkflowStepLog", back_populates="workflow_instance")
    
    def __repr__(self):
        return f"<WorkflowInstance(id={self.id}, workflow_id={self.workflow_id}, status='{self.status}')>"

class WorkflowStepLog(Base):
    __tablename__ = "workflow_step_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_instance_id = Column(Integer, ForeignKey("workflow_instances.id", ondelete="CASCADE"))
    step_id = Column(Integer, ForeignKey("workflow_steps.id"))
    action = Column(String(50), nullable=False)
    comments = Column(Text)
    performed_by = Column(Integer, ForeignKey("users.id"))
    performed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workflow_instance = relationship("WorkflowInstance", back_populates="logs")
    step = relationship("WorkflowStep", back_populates="logs")
    performer = relationship("User", foreign_keys=[performed_by])
    
    def __repr__(self):
        return f"<WorkflowStepLog(id={self.id}, action='{self.action}', performed_at='{self.performed_at}')>"
