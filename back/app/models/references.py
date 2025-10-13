"""
Reference tables for EDMS
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class RevisionStatus(Base):
    """Статусы ревизий документов"""
    __tablename__ = "revision_statuses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(32), nullable=False)
    name_native = Column(String(32))
    description = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<RevisionStatus(id={self.id}, name='{self.name}')>"


class RevisionDescription(Base):
    """Описания ревизий"""
    __tablename__ = "revision_descriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(16), nullable=False)
    description = Column(String(512))
    description_native = Column(String(512))
    phase = Column(String(16))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<RevisionDescription(id={self.id}, code='{self.code}')>"


class RevisionStep(Base):
    """Шаги ревизий"""
    __tablename__ = "revision_steps"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(16), unique=True)
    description = Column(String(512))
    description_native = Column(String(512))
    description_long = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<RevisionStep(id={self.id}, code='{self.code}')>"


class Originator(Base):
    """Организации-инициаторы"""
    __tablename__ = "originators"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(512), nullable=False)
    name_native = Column(String(512))
    code = Column(String(32))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<Originator(id={self.id}, name='{self.name}')>"


class ReviewCode(Base):
    """Коды проверки"""
    __tablename__ = "review_codes"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(16), nullable=False, unique=True)
    name = Column(String(32), nullable=False)
    name_native = Column(String(32))
    description = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ReviewCode(id={self.id}, code='{self.code}')>"


class Language(Base):
    """Языки"""
    __tablename__ = "languages"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(512), nullable=False)
    name_native = Column(String(512))
    code = Column(String(8), unique=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships (temporarily commented out)
    # documents = relationship("Document", back_populates="language")
    
    def __repr__(self):
        return f"<Language(id={self.id}, name='{self.name}')>"


class Department(Base):
    """Департаменты"""
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(256), nullable=False)
    name_native = Column(String(256))
    code = Column(String(32))
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    company = relationship("Company")
    
    def __repr__(self):
        return f"<Department(id={self.id}, name='{self.name}')>"


class Company(Base):
    """Компании"""
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(256), nullable=False)
    name_native = Column(String(256))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    departments = relationship("Department", back_populates="company")
    contacts = relationship("Contact", back_populates="company", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Company(id={self.id}, name='{self.name}')>"


class WorkflowStatus(Base):
    """Статусы workflow документов"""
    __tablename__ = "workflow_statuses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(32), nullable=False)
    name_native = Column(String(32))
    description = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<WorkflowStatus(id={self.id}, name='{self.name}')>"


class UserRole(Base):
    """Роли пользователей (системные роли)"""
    __tablename__ = "user_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)  # admin, operator, viewer
    name = Column(String(64), nullable=False)
    name_native = Column(String(64))
    name_en = Column(String(64))  # English name
    description = Column(String(255))
    permissions = Column(Text)  # JSON с правами доступа
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<UserRole(id={self.id}, name='{self.name}')>"


class TransmittalStatus(Base):
    """Статусы трансмитталов"""
    __tablename__ = "transmittal_statuses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(32), nullable=False, unique=True)
    name_native = Column(String(32))
    description = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<TransmittalStatus(id={self.id}, name='{self.name}')>"