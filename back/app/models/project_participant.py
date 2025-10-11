"""
Project Participant model for EDMS
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class ProjectParticipant(Base):
    __tablename__ = "project_participants"
    __table_args__ = (
        UniqueConstraint('project_id', 'company_id', name='uq_project_participants_project_company'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    company_role_id = Column(Integer, ForeignKey("company_roles.id", ondelete="RESTRICT"))
    is_primary = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="participants")
    company = relationship("Company")
    contact = relationship("Contact")
    company_role = relationship("CompanyRole")
    
    def __repr__(self):
        return f"<ProjectParticipant(id={self.id}, project_id={self.project_id}, company_id={self.company_id}, role_id={self.company_role_id})>"

