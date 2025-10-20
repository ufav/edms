"""
Document Workflow History model for EDMS
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class DocumentWorkflowHistory(Base):
    __tablename__ = "document_workflow_history"
    
    id = Column(Integer, primary_key=True, index=True)
    revision_id = Column(Integer, ForeignKey("document_revisions.id", ondelete="CASCADE"), nullable=False)
    from_status_id = Column(Integer, ForeignKey("workflow_statuses.id"), nullable=True)  # Может быть NULL для первого статуса
    to_status_id = Column(Integer, ForeignKey("workflow_statuses.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Кто выполнил действие
    action_type = Column(String(50), nullable=False)  # status_change, approval, rejection, release, etc.
    comments = Column(Text, nullable=True)  # Комментарии к действию
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    revision = relationship("DocumentRevision")
    from_status = relationship("WorkflowStatus", foreign_keys=[from_status_id])
    to_status = relationship("WorkflowStatus", foreign_keys=[to_status_id])
    user = relationship("User")
    
    def __repr__(self):
        return f"<DocumentWorkflowHistory(id={self.id}, revision_id={self.revision_id}, action={self.action_type})>"
