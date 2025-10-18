"""
Pydantic schemas for reference tables
"""

from typing import Optional
from pydantic import BaseModel
from datetime import datetime


# Revision Status schemas
class RevisionStatusBase(BaseModel):
    name: str
    name_native: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True


class RevisionStatusCreate(RevisionStatusBase):
    pass


class RevisionStatusResponse(RevisionStatusBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Revision Description schemas
class RevisionDescriptionBase(BaseModel):
    code: str
    description: Optional[str] = None
    description_native: Optional[str] = None
    phase: Optional[str] = None
    is_active: bool = True


class RevisionDescriptionCreate(RevisionDescriptionBase):
    pass


class RevisionDescriptionResponse(RevisionDescriptionBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Revision Step schemas
class RevisionStepBase(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    description_native: Optional[str] = None
    description_long: Optional[str] = None
    is_active: bool = True


class RevisionStepCreate(RevisionStepBase):
    pass


class RevisionStepResponse(RevisionStepBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Originator schemas
class OriginatorBase(BaseModel):
    name: str
    name_native: Optional[str] = None
    code: Optional[str] = None
    is_active: bool = True


class OriginatorCreate(OriginatorBase):
    pass


class OriginatorResponse(OriginatorBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Review Code schemas
class ReviewCodeBase(BaseModel):
    code: str
    name: str
    name_native: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True


class ReviewCodeCreate(ReviewCodeBase):
    pass


class ReviewCodeResponse(ReviewCodeBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Language schemas
class LanguageBase(BaseModel):
    name: str
    name_native: Optional[str] = None
    code: Optional[str] = None
    is_active: bool = True


class LanguageCreate(LanguageBase):
    pass


class LanguageResponse(LanguageBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Department schemas
class DepartmentBase(BaseModel):
    name: str
    name_native: Optional[str] = None
    code: Optional[str] = None
    company_id: Optional[int] = None
    is_active: bool = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Company schemas
class CompanyBase(BaseModel):
    name: str
    name_native: Optional[str] = None
    code: Optional[str] = None
    role: Optional[str] = None
    is_active: bool = True


class CompanyCreate(CompanyBase):
    pass


class CompanyResponse(CompanyBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# User Role schemas
class UserRoleBase(BaseModel):
    name: str
    name_native: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[str] = None
    is_active: bool = True


class UserRoleCreate(UserRoleBase):
    pass


class UserRoleResponse(UserRoleBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Workflow Status schemas
class WorkflowStatusBase(BaseModel):
    name: str
    name_native: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True


class WorkflowStatusCreate(WorkflowStatusBase):
    pass


class WorkflowStatusResponse(WorkflowStatusBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True