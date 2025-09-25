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
    recipient_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), default="draft")
    sent_date = Column(DateTime(timezone=True))
    received_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="transmittals")
    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])
    items = relationship("TransmittalItem", back_populates="transmittal")
    
    def __repr__(self):
        return f"<Transmittal(id={self.id}, number='{self.transmittal_number}', title='{self.title}')>"

class TransmittalItem(Base):
    __tablename__ = "transmittal_items"
    
    id = Column(Integer, primary_key=True, index=True)
    transmittal_id = Column(Integer, ForeignKey("transmittals.id", ondelete="CASCADE"))
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    item_number = Column(String(50))
    description = Column(Text)
    action_required = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    transmittal = relationship("Transmittal", back_populates="items")
    document = relationship("Document", back_populates="transmittal_items")
    
    def __repr__(self):
        return f"<TransmittalItem(id={self.id}, transmittal_id={self.transmittal_id}, document_id={self.document_id})>"
