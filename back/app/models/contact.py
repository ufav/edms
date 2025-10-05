from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"))
    full_name = Column(String(255), nullable=False)
    position = Column(String(255), nullable=True)  # Должность
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    is_primary = Column(Boolean, default=False)  # Основной контакт в компании
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    company = relationship("Company", back_populates="contacts")

    def __repr__(self):
        return f"<Contact(company_id={self.company_id}, full_name='{self.full_name}')>"
