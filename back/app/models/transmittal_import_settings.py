"""
Transmittal import settings model for EDMS
"""

from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class TransmittalImportSettings(Base):
    __tablename__ = "transmittal_import_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    settings_key = Column(String(100), nullable=False)  # 'field_mapping', 'import_options', etc.
    settings_value = Column(Text)  # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    project = relationship("Project")
    company = relationship("Company")
    
    def __repr__(self):
        return f"<TransmittalImportSettings(user_id={self.user_id}, project_id={self.project_id}, company_id={self.company_id}, key='{self.settings_key}')>"
