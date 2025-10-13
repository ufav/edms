"""
Transmittal models for EDMS
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Transmittal(Base):
    __tablename__ = "transmittals"
    
    id = Column(Integer, primary_key=True, index=True)
    transmittal_number = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    recipient_id = Column(Integer, ForeignKey("companies.id"))
    status = Column(String(20), default="draft")
    sent_date = Column(DateTime(timezone=True))
    received_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships (temporarily commented out)
    # project = relationship("Project", back_populates="transmittals")
    # sender = relationship("User", foreign_keys=[sender_id])
    # recipient = relationship("User", foreign_keys=[recipient_id])
    revisions = relationship("TransmittalRevision", back_populates="transmittal")
    
    def __repr__(self):
        return f"<Transmittal(id={self.id}, number='{self.transmittal_number}', title='{self.title}')>"

class TransmittalRevision(Base):
    """Ревизии в трансмитталах"""
    __tablename__ = "transmittal_revisions"
    
    id = Column(Integer, primary_key=True, index=True)
    transmittal_id = Column(Integer, ForeignKey("transmittals.id", ondelete="CASCADE"))
    revision_id = Column(Integer, ForeignKey("document_revisions.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    transmittal = relationship("Transmittal", back_populates="revisions")
    revision = relationship("DocumentRevision")
    
    def __repr__(self):
        return f"<TransmittalRevision(id={self.id}, transmittal_id={self.transmittal_id}, revision_id={self.revision_id})>"
