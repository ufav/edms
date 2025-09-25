"""
Document models for EDMS
"""

from sqlalchemy import Column, Integer, String, Text, BigInteger, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    file_path = Column(String(500))
    file_name = Column(String(255))
    file_size = Column(BigInteger)
    file_type = Column(String(100))
    version = Column(String(20), default="1.0")
    status = Column(String(20), default="draft")
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by])
    versions = relationship("DocumentVersion", back_populates="document")
    reviews = relationship("DocumentReview", back_populates="document")
    approvals = relationship("DocumentApproval", back_populates="document")
    transmittal_items = relationship("TransmittalItem", back_populates="document")
    workflow_instances = relationship("WorkflowInstance", back_populates="document")
    
    def __repr__(self):
        return f"<Document(id={self.id}, title='{self.title}', version='{self.version}')>"

class DocumentVersion(Base):
    __tablename__ = "document_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    version = Column(String(20), nullable=False)
    file_path = Column(String(500))
    file_name = Column(String(255))
    file_size = Column(BigInteger)
    file_type = Column(String(100))
    change_description = Column(Text)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="versions")
    uploader = relationship("User", foreign_keys=[uploaded_by])
    
    def __repr__(self):
        return f"<DocumentVersion(document_id={self.document_id}, version='{self.version}')>"

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
    
    # Relationships
    document = relationship("Document", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    
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
    
    # Relationships
    document = relationship("Document", back_populates="approvals")
    approver = relationship("User", foreign_keys=[approver_id])
    
    def __repr__(self):
        return f"<DocumentApproval(document_id={self.document_id}, approver_id={self.approver_id}, status='{self.status}')>"
