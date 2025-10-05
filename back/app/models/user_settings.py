"""
User settings model for EDMS
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserSettings(Base):
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    page = Column(String(50), nullable=False)  # 'documents', 'transmittals', 'reviews', etc.
    settings_key = Column(String(100), nullable=False)  # 'column_visibility', 'sidebar_enabled', etc.
    settings_value = Column(Text)  # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<UserSettings(user_id={self.user_id}, page='{self.page}', key='{self.settings_key}')>"
