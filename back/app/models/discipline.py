from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Discipline(Base):
    __tablename__ = "disciplines"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    name_en = Column(String(200))
    description = Column(Text)
    description_en = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships (temporarily commented out)
    # project_disciplines = relationship("ProjectDiscipline", back_populates="discipline")
    # project_document_types = relationship("ProjectDocumentType", back_populates="discipline")
    # documents = relationship("Document", back_populates="discipline")

    def __repr__(self):
        return f"<Discipline(code='{self.code}', name='{self.name}')>"


class DocumentType(Base):
    __tablename__ = "document_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    name_en = Column(String(200))
    description = Column(Text)
    description_en = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships (temporarily commented out)
    # project_document_types = relationship("ProjectDocumentType", back_populates="document_type")
    # documents = relationship("Document", back_populates="document_type")

    def __repr__(self):
        return f"<DocumentType(code='{self.code}', name='{self.name}')>"


