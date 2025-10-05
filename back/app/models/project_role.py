"""
Project Role model for EDMS - роли пользователей в проектах
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class ProjectRole(Base):
    """Роли пользователей в проектах"""
    __tablename__ = "project_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)  # owner, manager, reviewer, contributor, viewer
    name = Column(String(100), nullable=False)  # Владелец, Менеджер, Рецензент, Участник, Наблюдатель
    name_en = Column(String(100), nullable=True)  # Owner, Manager, Reviewer, Contributor, Viewer
    description = Column(Text, nullable=True)
    permissions = Column(Text)  # JSON с правами доступа в проекте
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ProjectRole(code='{self.code}', name='{self.name}')>"
