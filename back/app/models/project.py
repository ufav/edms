"""
Project model for EDMS
"""

from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Numeric, Boolean, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class ProjectStatusEnum(enum.Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    project_code = Column(String(50), unique=True, index=True, nullable=False)
    status = Column(Enum(ProjectStatusEnum), default=ProjectStatusEnum.ACTIVE)
    start_date = Column(Date)
    end_date = Column(Date)
    budget = Column(Numeric(15, 2))
    created_by = Column(Integer, ForeignKey("users.id"))
    workflow_preset_id = Column(Integer, ForeignKey("workflow_presets.id"), nullable=True)
    is_deleted = Column(Integer, default=0, nullable=False)  # 0 - не удален, 1 - удален
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships (temporarily commented out)
    # creator = relationship("User", foreign_keys=[created_by])
    members = relationship("ProjectMember", back_populates="project")
    participants = relationship("ProjectParticipant", back_populates="project", cascade="all, delete-orphan")
    project_discipline_document_types = relationship("ProjectDisciplineDocumentType", back_populates="project", cascade="all, delete-orphan")
    # documents = relationship("Document", back_populates="project")  # Temporarily commented out
    # transmittals = relationship("Transmittal", back_populates="project")  # Temporarily commented out
    # workflows = relationship("Workflow", back_populates="project")  # Временно отключено из-за циклического импорта
    
    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}', code='{self.project_code}')>"

class ProjectMember(Base):
    __tablename__ = "project_members"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    project_role_id = Column(Integer, ForeignKey("project_roles.id"), nullable=True)
    permissions = Column(Text)  # JSON string
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="members")
    user = relationship("User")
    project_role = relationship("ProjectRole")
    
    def __repr__(self):
        return f"<ProjectMember(project_id={self.project_id}, user_id={self.user_id}, project_role_id={self.project_role_id})>"


class ProjectDisciplineDocumentType(Base):
    __tablename__ = "project_discipline_document_types"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    discipline_id = Column(Integer, ForeignKey("disciplines.id", ondelete="CASCADE"))
    document_type_id = Column(Integer, ForeignKey("document_types.id", ondelete="CASCADE"))
    drs = Column(String(50), nullable=True)  # DRS (Document Reference System)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships (temporarily commented out to avoid circular imports)
    project = relationship("Project", back_populates="project_discipline_document_types")
    # discipline = relationship("Discipline")
    # document_type = relationship("DocumentType")
    
    def __repr__(self):
        return f"<ProjectDisciplineDocumentType(project_id={self.project_id}, discipline_id={self.discipline_id}, document_type_id={self.document_type_id})>"


class ProjectRevisionDescription(Base):
    __tablename__ = "project_revision_descriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    revision_description_id = Column(Integer, ForeignKey("revision_descriptions.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships (temporarily commented out to avoid circular imports)
    # project = relationship("Project", back_populates="project_revision_descriptions")
    # revision_description = relationship("RevisionDescription")
    
    def __repr__(self):
        return f"<ProjectRevisionDescription(project_id={self.project_id}, revision_description_id={self.revision_description_id})>"


class ProjectRevisionStep(Base):
    __tablename__ = "project_revision_steps"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    revision_step_id = Column(Integer, ForeignKey("revision_steps.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships (temporarily commented out to avoid circular imports)
    # project = relationship("Project", back_populates="project_revision_steps")
    # revision_step = relationship("RevisionStep")
    
    def __repr__(self):
        return f"<ProjectRevisionStep(project_id={self.project_id}, revision_step_id={self.revision_step_id})>"


# Удалены модели ProjectWorkflowSequence и ProjectWorkflowRule
# Теперь используются WorkflowPresetSequence и WorkflowPresetRule через workflow_preset_id


class WorkflowPreset(Base):
    """Пресет workflow - шаблон для настройки workflow проектов"""
    __tablename__ = "workflow_presets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_global = Column(Boolean, default=True)  # True - глобальный, False - пользовательский
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<WorkflowPreset(name={self.name}, is_global={self.is_global})>"


class WorkflowPresetSequence(Base):
    """Последовательность ревизий в workflow пресете"""
    __tablename__ = "workflow_preset_sequences"
    
    id = Column(Integer, primary_key=True, index=True)
    preset_id = Column(Integer, ForeignKey("workflow_presets.id", ondelete="CASCADE"))
    document_type_id = Column(Integer, ForeignKey("document_types.id", ondelete="CASCADE"), nullable=True)
    
    sequence_order = Column(Integer, nullable=False)
    revision_description_id = Column(Integer, ForeignKey("revision_descriptions.id", ondelete="CASCADE"))
    revision_step_id = Column(Integer, ForeignKey("revision_steps.id", ondelete="CASCADE"))
    is_final = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<WorkflowPresetSequence(preset_id={self.preset_id}, order={self.sequence_order})>"


class WorkflowPresetRule(Base):
    """Правила переходов в workflow пресете"""
    __tablename__ = "workflow_preset_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    preset_id = Column(Integer, ForeignKey("workflow_presets.id", ondelete="CASCADE"))
    document_type_id = Column(Integer, ForeignKey("document_types.id", ondelete="CASCADE"), nullable=True)
    
    # Текущая ревизия
    current_revision_description_id = Column(Integer, ForeignKey("revision_descriptions.id", ondelete="CASCADE"))
    current_revision_step_id = Column(Integer, ForeignKey("revision_steps.id", ondelete="CASCADE"))
    
    # Условие перехода
    review_code_id = Column(Integer, ForeignKey("review_codes.id", ondelete="CASCADE"))
    
    # Оператор сравнения (equals, not_equals, in_list, not_in_list)
    operator = Column(String(20), default="equals")
    
    # Список кодов для списковых операторов (JSON)
    review_code_list = Column(Text, nullable=True)
    
    # Приоритет правила (для порядка обработки)
    priority = Column(Integer, default=100)
    
    # Следующая ревизия (может быть null для +1)
    next_revision_description_id = Column(Integer, ForeignKey("revision_descriptions.id", ondelete="CASCADE"), nullable=True)
    next_revision_step_id = Column(Integer, ForeignKey("revision_steps.id", ondelete="CASCADE"), nullable=True)
    
    # Действие при невыполнении условия
    action_on_fail = Column(String(50), default="increment_number")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<WorkflowPresetRule(preset_id={self.preset_id}, operator={self.operator}, review_code_id={self.review_code_id})>"
