"""
Area (Участок тех. процесса) model for EDMS
Справочник участков технологического процесса (например: LCR-12, PCS, ECS, CCR, OSBL, ISBL, UTIL)
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Area(Base):
    """
    Участок тех. процесса - справочник (например: LCR-12, PCS, ECS, CCR, OSBL, ISBL, UTIL)
    """
    __tablename__ = "areas"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)  # Код участка тех. процесса (например: LCR-12, PCS, ECS)
    name = Column(String(200), nullable=False)  # Название участка тех. процесса
    description = Column(Text, nullable=True)  # Описание участка тех. процесса
    is_active = Column(Boolean, default=True, nullable=False)  # Активен ли участок тех. процесса
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    documents = relationship("Document", back_populates="area")
    # projects - связь многие-ко-многим через промежуточную таблицу project_areas
    
    def __repr__(self):
        return f"<Area(code='{self.code}', name='{self.name}')>"

