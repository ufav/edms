"""
Project model for EDMS
"""

from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    project_code = Column(String(50), unique=True, index=True, nullable=False)
    status = Column(String(20), default="active")
    start_date = Column(Date)
    end_date = Column(Date)
    budget = Column(Numeric(15, 2))
    client = Column(String(200))
    manager_id = Column(Integer, ForeignKey("users.id"))
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("ProjectMember", back_populates="project")
    documents = relationship("Document", back_populates="project")
    transmittals = relationship("Transmittal", back_populates="project")
    # workflows = relationship("Workflow", back_populates="project")  # Временно отключено из-за циклического импорта
    
    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}', code='{self.project_code}')>"

class ProjectMember(Base):
    __tablename__ = "project_members"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    role = Column(String(50), nullable=False)
    permissions = Column(Text)  # JSON string
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="members")
    user = relationship("User")
    
    def __repr__(self):
        return f"<ProjectMember(project_id={self.project_id}, user_id={self.user_id}, role='{self.role}')>"
