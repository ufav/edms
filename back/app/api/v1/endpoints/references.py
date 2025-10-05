"""
API endpoints for reference tables
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.references import (
    RevisionStatus, RevisionDescription, RevisionStep, Originator, ReviewCode,
    Language, Department, Company, UserRole
)
from app.schemas.references import (
    RevisionStatusCreate, RevisionStatusResponse,
    RevisionDescriptionCreate, RevisionDescriptionResponse,
    RevisionStepCreate, RevisionStepResponse,
    OriginatorCreate, OriginatorResponse,
    ReviewCodeCreate, ReviewCodeResponse,
    LanguageCreate, LanguageResponse,
    DepartmentCreate, DepartmentResponse,
    CompanyCreate, CompanyResponse,
    UserRoleCreate, UserRoleResponse
)

router = APIRouter()


# Revision Status endpoints
@router.get("/revision-statuses", response_model=List[RevisionStatusResponse])
def get_revision_statuses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all revision statuses"""
    return db.query(RevisionStatus).filter(RevisionStatus.is_active == True).offset(skip).limit(limit).all()


@router.post("/revision-statuses", response_model=RevisionStatusResponse)
def create_revision_status(status: RevisionStatusCreate, db: Session = Depends(get_db)):
    """Create new revision status"""
    db_status = RevisionStatus(**status.dict())
    db.add(db_status)
    db.commit()
    db.refresh(db_status)
    return db_status


# Revision Description endpoints
@router.get("/revision-descriptions", response_model=List[RevisionDescriptionResponse])
def get_revision_descriptions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all revision descriptions"""
    return db.query(RevisionDescription).filter(RevisionDescription.is_active == True).offset(skip).limit(limit).all()


@router.post("/revision-descriptions", response_model=RevisionDescriptionResponse)
def create_revision_description(description: RevisionDescriptionCreate, db: Session = Depends(get_db)):
    """Create new revision description"""
    db_description = RevisionDescription(**description.dict())
    db.add(db_description)
    db.commit()
    db.refresh(db_description)
    return db_description


# Revision Step endpoints
@router.get("/revision-steps", response_model=List[RevisionStepResponse])
def get_revision_steps(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all revision steps"""
    return db.query(RevisionStep).filter(RevisionStep.is_active == True).offset(skip).limit(limit).all()


@router.post("/revision-steps", response_model=RevisionStepResponse)
def create_revision_step(step: RevisionStepCreate, db: Session = Depends(get_db)):
    """Create new revision step"""
    db_step = RevisionStep(**step.dict())
    db.add(db_step)
    db.commit()
    db.refresh(db_step)
    return db_step


# Originator endpoints
@router.get("/originators", response_model=List[OriginatorResponse])
def get_originators(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all originators"""
    return db.query(Originator).filter(Originator.is_active == True).offset(skip).limit(limit).all()


@router.post("/originators", response_model=OriginatorResponse)
def create_originator(originator: OriginatorCreate, db: Session = Depends(get_db)):
    """Create new originator"""
    db_originator = Originator(**originator.dict())
    db.add(db_originator)
    db.commit()
    db.refresh(db_originator)
    return db_originator


# Review Code endpoints
@router.get("/review-codes", response_model=List[ReviewCodeResponse])
def get_review_codes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all review codes"""
    return db.query(ReviewCode).filter(ReviewCode.is_active == True).offset(skip).limit(limit).all()


@router.post("/review-codes", response_model=ReviewCodeResponse)
def create_review_code(code: ReviewCodeCreate, db: Session = Depends(get_db)):
    """Create new review code"""
    db_code = ReviewCode(**code.dict())
    db.add(db_code)
    db.commit()
    db.refresh(db_code)
    return db_code


# Language endpoints
@router.get("/languages", response_model=List[LanguageResponse])
def get_languages(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all languages"""
    return db.query(Language).filter(Language.is_active == True).offset(skip).limit(limit).all()


@router.post("/languages", response_model=LanguageResponse)
def create_language(language: LanguageCreate, db: Session = Depends(get_db)):
    """Create new language"""
    db_language = Language(**language.dict())
    db.add(db_language)
    db.commit()
    db.refresh(db_language)
    return db_language


# Department endpoints
@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all departments"""
    return db.query(Department).filter(Department.is_active == True).offset(skip).limit(limit).all()


@router.post("/departments", response_model=DepartmentResponse)
def create_department(department: DepartmentCreate, db: Session = Depends(get_db)):
    """Create new department"""
    db_department = Department(**department.dict())
    db.add(db_department)
    db.commit()
    db.refresh(db_department)
    return db_department


# Company endpoints
@router.get("/companies", response_model=List[CompanyResponse])
def get_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all companies"""
    return db.query(Company).filter(Company.is_active == True).offset(skip).limit(limit).all()


@router.post("/companies", response_model=CompanyResponse)
def create_company(company: CompanyCreate, db: Session = Depends(get_db)):
    """Create new company"""
    db_company = Company(**company.dict())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


# User Role endpoints
@router.get("/user-roles", response_model=List[UserRoleResponse])
def get_user_roles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all user roles"""
    return db.query(UserRole).filter(UserRole.is_active == True).offset(skip).limit(limit).all()


@router.post("/user-roles", response_model=UserRoleResponse)
def create_user_role(role: UserRoleCreate, db: Session = Depends(get_db)):
    """Create new user role"""
    db_role = UserRole(**role.dict())
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role
