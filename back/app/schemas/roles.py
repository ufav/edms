"""
Схемы для работы с ролями
"""

from pydantic import BaseModel, field_validator
from typing import Optional, Dict, Any
from datetime import datetime
import json

# Системные роли (используем существующую UserRole)
class UserRoleBase(BaseModel):
    code: str
    name: str
    name_native: Optional[str] = None
    name_en: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    is_active: bool = True

class UserRoleCreate(UserRoleBase):
    pass

class UserRoleUpdate(BaseModel):
    name: Optional[str] = None
    name_native: Optional[str] = None
    name_en: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class UserRoleResponse(UserRoleBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Проектные роли
class ProjectRoleBase(BaseModel):
    code: str
    name: str
    name_en: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    is_active: bool = True

class ProjectRoleCreate(ProjectRoleBase):
    pass

class ProjectRoleUpdate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class ProjectRoleResponse(ProjectRoleBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
    
    @field_validator('permissions', mode='before')
    @classmethod
    def parse_permissions(cls, v):
        """Parse JSON string permissions to dictionary"""
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v

# Схемы для пользователей с ролями
class UserWithUserRole(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    is_active: bool
    user_role: Optional[UserRoleResponse] = None
    
    class Config:
        from_attributes = True

# Схемы для участников проекта с ролями
class ProjectMemberWithRole(BaseModel):
    id: int
    project_id: int
    user_id: int
    role: str  # Legacy field
    project_role: Optional[ProjectRoleResponse] = None
    permissions: Optional[str] = None
    joined_at: Optional[datetime] = None
    user: Optional[UserWithUserRole] = None
    
    class Config:
        from_attributes = True
