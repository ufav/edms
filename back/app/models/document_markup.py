"""
Stored Autodesk markups for document revisions.

Маркапы общие для всех пользователей проекта: один набор на ревизию.
Поле last_modified_by_id хранится для аудита (кто последним сохранил).
"""

from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.core.database import Base


class DocumentMarkup(Base):
    __tablename__ = "document_markups"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    revision_id = Column(Integer, ForeignKey("document_revisions.id", ondelete="CASCADE"), nullable=False)
    last_modified_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    markup_data = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("revision_id", name="uq_document_markups_revision"),
    )
