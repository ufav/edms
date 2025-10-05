"""
Company Roles endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.company_role import CompanyRole
from app.services.auth import get_current_active_user
from app.models.user import User

router = APIRouter()

class CompanyRoleResponse(BaseModel):
    id: int
    code: str
    name: str
    name_en: str = None
    description: str = None
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/company-roles", response_model=List[CompanyRoleResponse])
async def get_company_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка ролей компаний"""
    roles = db.query(CompanyRole).filter(CompanyRole.is_active == True).all()
    
    return [
        CompanyRoleResponse(
            id=role.id,
            code=role.code,
            name=role.name,
            name_en=role.name_en,
            description=role.description,
            is_active=role.is_active
        )
        for role in roles
    ]
