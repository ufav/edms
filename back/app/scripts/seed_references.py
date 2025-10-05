"""
Script to seed reference tables with basic data
"""

import asyncio
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.references import (
    RevisionStatus, RevisionDescription, RevisionStep, Originator, ReviewCode,
    Language, Department, Company, UserRole
)

def seed_reference_data():
    db = SessionLocal()
    
    try:
        # Revision Statuses
        revision_statuses = [
            {"name": "Draft", "name_native": "Черновик", "description": "Черновик документа"},
            {"name": "In Review", "name_native": "На согласовании", "description": "Документ на согласовании"},
            {"name": "Approved", "name_native": "Утвержден", "description": "Документ утвержден"},
            {"name": "Rejected", "name_native": "Отклонен", "description": "Документ отклонен"},
            {"name": "Archived", "name_native": "Архив", "description": "Документ в архиве"}
        ]
        
        for status_data in revision_statuses:
            existing = db.query(RevisionStatus).filter(RevisionStatus.name == status_data["name"]).first()
            if not existing:
                status = RevisionStatus(**status_data)
                db.add(status)
        
        # Revision Descriptions
        revision_descriptions = [
            {"code": "INIT", "description": "Initial Issue", "description_native": "Первоначальный выпуск", "phase": "Design"},
            {"code": "REV", "description": "Revision", "description_native": "Ревизия", "phase": "Design"},
            {"code": "ASB", "description": "As Built", "description_native": "Как построено", "phase": "Construction"},
            {"code": "FINAL", "description": "Final", "description_native": "Финальная версия", "phase": "Construction"}
        ]
        
        for desc_data in revision_descriptions:
            existing = db.query(RevisionDescription).filter(RevisionDescription.code == desc_data["code"]).first()
            if not existing:
                desc = RevisionDescription(**desc_data)
                db.add(desc)
        
        # Revision Steps
        revision_steps = [
            {"code": "PREP", "description": "Preparation", "description_native": "Подготовка", "description_long": "Подготовка документа к согласованию"},
            {"code": "REV", "description": "Review", "description_native": "Проверка", "description_long": "Проверка документа техническими специалистами"},
            {"code": "APP", "description": "Approval", "description_native": "Согласование", "description_long": "Согласование документа руководством"},
            {"code": "REL", "description": "Release", "description_native": "Выпуск", "description_long": "Выпуск документа в производство"}
        ]
        
        for step_data in revision_steps:
            existing = db.query(RevisionStep).filter(RevisionStep.code == step_data["code"]).first()
            if not existing:
                step = RevisionStep(**step_data)
                db.add(step)
        
        # Originators
        originators = [
            {"name": "Engineering Department", "name_native": "Инженерный отдел", "code": "ENG"},
            {"name": "Architecture Department", "name_native": "Архитектурный отдел", "code": "ARCH"},
            {"name": "Construction Department", "name_native": "Строительный отдел", "code": "CONST"},
            {"name": "Client", "name_native": "Заказчик", "code": "CLIENT"}
        ]
        
        for orig_data in originators:
            existing = db.query(Originator).filter(Originator.name == orig_data["name"]).first()
            if not existing:
                orig = Originator(**orig_data)
                db.add(orig)
        
        # Review Codes
        review_codes = [
            {"code": "A", "name": "Approved", "name_native": "Утверждено", "description": "Документ утвержден без замечаний"},
            {"code": "A*", "name": "Approved with Comments", "name_native": "Утверждено с замечаниями", "description": "Документ утвержден с замечаниями"},
            {"code": "R", "name": "Rejected", "name_native": "Отклонено", "description": "Документ отклонен"},
            {"code": "I", "name": "Information", "name_native": "К сведению", "description": "Документ для информации"}
        ]
        
        for code_data in review_codes:
            existing = db.query(ReviewCode).filter(ReviewCode.code == code_data["code"]).first()
            if not existing:
                code = ReviewCode(**code_data)
                db.add(code)
        
        # Languages
        languages = [
            {"name": "English", "name_native": "Английский", "code": "EN"},
            {"name": "Russian", "name_native": "Русский", "code": "RU"},
            {"name": "German", "name_native": "Немецкий", "code": "DE"},
            {"name": "French", "name_native": "Французский", "code": "FR"}
        ]
        
        for lang_data in languages:
            existing = db.query(Language).filter(Language.name == lang_data["name"]).first()
            if not existing:
                lang = Language(**lang_data)
                db.add(lang)
        
        # Companies
        companies = [
            {"name": "Main Contractor", "name_native": "Генеральный подрядчик", "code": "MAIN", "role": "Contractor"},
            {"name": "Client Company", "name_native": "Компания заказчик", "code": "CLIENT", "role": "Client"},
            {"name": "Design Company", "name_native": "Проектная компания", "code": "DESIGN", "role": "Designer"}
        ]
        
        for comp_data in companies:
            existing = db.query(Company).filter(Company.name == comp_data["name"]).first()
            if not existing:
                comp = Company(**comp_data)
                db.add(comp)
        
        # Departments
        departments = [
            {"name": "Engineering", "name_native": "Инженерия", "code": "ENG"},
            {"name": "Architecture", "name_native": "Архитектура", "code": "ARCH"},
            {"name": "Construction", "name_native": "Строительство", "code": "CONST"},
            {"name": "Quality Control", "name_native": "Контроль качества", "code": "QC"}
        ]
        
        for dept_data in departments:
            existing = db.query(Department).filter(Department.name == dept_data["name"]).first()
            if not existing:
                dept = Department(**dept_data)
                db.add(dept)
        
        # User Roles
        user_roles = [
            {"name": "Document Controller", "name_native": "Контролер документов", "description": "Управление документами", "permissions": "documents:read,documents:write"},
            {"name": "Engineer", "name_native": "Инженер", "description": "Техническая работа с документами", "permissions": "documents:read,documents:review"},
            {"name": "Manager", "name_native": "Менеджер", "description": "Управление проектами", "permissions": "projects:read,projects:write,documents:approve"},
            {"name": "Viewer", "name_native": "Наблюдатель", "description": "Просмотр документов", "permissions": "documents:read"}
        ]
        
        for role_data in user_roles:
            existing = db.query(UserRole).filter(UserRole.name == role_data["name"]).first()
            if not existing:
                role = UserRole(**role_data)
                db.add(role)
        
        db.commit()
        
    except Exception as e:
        db.rollback()
        pass  # Ошибка без вывода
    finally:
        db.close()

if __name__ == "__main__":
    seed_reference_data()
