"""
Document models for EDMS
"""

from sqlalchemy import Column, Integer, String, Text, BigInteger, DateTime, ForeignKey, Date, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    title_native = Column(Text)  # Переименовано из description
    remarks = Column(Text)  # Примечания (текстовое поле)
    number = Column(String(100), nullable=True)  # Номер документа
    is_deleted = Column(Integer, default=0)  # Флаг удаления: 0 - не удален, 1 - удален
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=True)
    document_type_id = Column(Integer, ForeignKey("document_types.id"), nullable=True)
    language_id = Column(Integer, ForeignKey("languages.id"), nullable=True)
    
    # Дополнительные метаданные
    # document_code = Column(String(100))  # Код документа
    created_by = Column(Integer, ForeignKey("users.id"))  # Создатель документа
    creation_date = Column(Date)  # Дата создания документа
    sheet_number = Column(String(50))  # Номер листа
    total_sheets = Column(Integer)  # Общее количество листов
    scale = Column(String(20))  # Масштаб
    format = Column(String(20))  # Формат (A4, A3, etc.)
    confidentiality = Column(String(20), default="internal")  # Гриф секретности
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships (temporarily commented out for seeding)
    project = relationship("Project")
    # discipline = relationship("Discipline", back_populates="documents")
    # document_type = relationship("DocumentType", back_populates="documents")
    # language = relationship("Language", back_populates="documents")
    # uploader = relationship("User", foreign_keys=[uploaded_by])
    # versions = relationship("DocumentVersion", back_populates="document")
    # reviews = relationship("DocumentReview", back_populates="document")
    # approvals = relationship("DocumentApproval", back_populates="document")
    # workflow = relationship("DocumentWorkflow", back_populates="document", uselist=False)
    # history = relationship("DocumentHistory", back_populates="document")
    # transmittal_items = relationship("TransmittalItem", back_populates="document")
    # workflow_instances = relationship("WorkflowInstance", back_populates="document")
    
    # Comments relationship
    comments = relationship("DocumentComment", back_populates="document", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Document(id={self.id}, title='{self.title}', version='{self.version}')>"

class DocumentRevision(Base):
    __tablename__ = "document_revisions"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    number = Column(String(8), nullable=False)  # Номер ревизии (01, 02, 03 и т.д.)
    file_path = Column(String(500))
    file_name = Column(String(255))
    file_size = Column(BigInteger)
    file_type = Column(String(100))
    change_description = Column(Text)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    is_deleted = Column(Integer, default=0)  # Флаг удаления: 0 - не удален, 1 - удален
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Foreign keys to reference tables
    revision_status_id = Column(Integer, ForeignKey("revision_statuses.id"), nullable=True)
    revision_description_id = Column(Integer, ForeignKey("revision_descriptions.id"), nullable=True)
    revision_step_id = Column(Integer, ForeignKey("revision_steps.id"), nullable=True)
    
    # Relationships (temporarily commented out)
    # document = relationship("Document", back_populates="revisions")
    # uploader = relationship("User", foreign_keys=[uploaded_by])
    
    def __repr__(self):
        return f"<DocumentRevision(document_id={self.document_id}, revision='{self.revision}')>"

class DocumentReview(Base):
    __tablename__ = "document_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    reviewer_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), default="pending")
    comments = Column(Text)
    rating = Column(Integer)
    review_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships (temporarily commented out)
    # document = relationship("Document", back_populates="reviews")
    # reviewer = relationship("User", foreign_keys=[reviewer_id])
    
    def __repr__(self):
        return f"<DocumentReview(document_id={self.document_id}, reviewer_id={self.reviewer_id}, status='{self.status}')>"

class DocumentApproval(Base):
    __tablename__ = "document_approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    approver_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), default="pending")
    comments = Column(Text)
    approval_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships (temporarily commented out)
    # document = relationship("Document", back_populates="approvals")
    # approver = relationship("User", foreign_keys=[approver_id])
    
    def __repr__(self):
        return f"<DocumentApproval(document_id={self.document_id}, approver_id={self.approver_id}, status='{self.status}')>"
