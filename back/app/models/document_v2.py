"""
Document models v2 - based on the new reference model
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Date, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class UniqueDocument(Base):
    """Уникальные документы (основная таблица)"""
    __tablename__ = "unique_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(128), nullable=False, unique=True)
    created = Column(DateTime(timezone=True), server_default=func.now())
    modified = Column(DateTime(timezone=True), onupdate=func.now())
    deleted = Column(Integer, default=0)
    title = Column(String(512), nullable=False)
    title_native = Column(String(512))
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)
    type_id = Column(Integer, ForeignKey("document_types.id"), nullable=False)
    language_id = Column(Integer, ForeignKey("languages.id"), nullable=True)
    drs = Column(String(128))  # Document Reference System
    originator_id = Column(Integer, ForeignKey("originators.id"), nullable=True)
    
    # Relationships
    project = relationship("Project", back_populates="documents")
    discipline = relationship("Discipline", back_populates="documents")
    document_type = relationship("DocumentType", back_populates="documents")
    language = relationship("Language")
    originator = relationship("Originator")
    revisions = relationship("DocumentRevision", back_populates="document", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<UniqueDocument(id={self.id}, number='{self.number}', title='{self.title}')>"


class DocumentRevision(Base):
    """Ревизии документов (версии)"""
    __tablename__ = "document_revisions"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("unique_documents.id"), nullable=False)
    created = Column(DateTime(timezone=True), server_default=func.now())
    modified = Column(DateTime(timezone=True), onupdate=func.now())
    deleted = Column(Integer, default=0)
    status_id = Column(Integer, ForeignKey("revision_statuses.id"), nullable=False)
    step_id = Column(Integer, ForeignKey("revision_steps.id"), nullable=False)
    description_id = Column(Integer, ForeignKey("revision_descriptions.id"), nullable=True)
    number = Column(String(8))  # Номер ревизии (A, B, C, 1, 2, 3)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    remarks = Column(Text)
    
    # Relationships
    document = relationship("UniqueDocument", back_populates="revisions")
    status = relationship("RevisionStatus")
    step = relationship("RevisionStep")
    description = relationship("RevisionDescription")
    user = relationship("User")
    files = relationship("UploadedFile", back_populates="revision", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<DocumentRevision(id={self.id}, document_id={self.document_id}, number='{self.number}')>"


class UploadedFile(Base):
    """Загруженные файлы"""
    __tablename__ = "uploaded_files"
    
    id = Column(Integer, primary_key=True, index=True)
    created = Column(DateTime(timezone=True), server_default=func.now())
    modified = Column(DateTime(timezone=True), onupdate=func.now())
    deleted = Column(Integer, default=0)
    path = Column(String(2048), index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    file_size = Column(BigInteger)
    file_type = Column(String(100))
    revision_id = Column(Integer, ForeignKey("document_revisions.id"), nullable=False)
    
    # Relationships
    revision = relationship("DocumentRevision", back_populates="files")
    
    def __repr__(self):
        return f"<UploadedFile(id={self.id}, filename='{self.filename}', path='{self.path}')>"


