from sqlalchemy import Column, Integer, String, Text, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class CompanyRole(Base):
    __tablename__ = "company_roles"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)  # client, contractor, etc.
    name = Column(String(100), nullable=False)  # Заказчик, Подрядчик
    name_en = Column(String(100), nullable=True)  # Client, Contractor
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<CompanyRole(code='{self.code}', name='{self.name}')>"
