"""
Simple script to seed reference tables
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.references import (
    RevisionStatus, RevisionDescription, RevisionStep, Originator, ReviewCode,
    Language, Department, Company, UserRole
)

def seed_data():
    db = SessionLocal()
    
    try:
        # Clear existing data
        db.query(RevisionStatus).delete()
        db.query(RevisionDescription).delete()
        db.query(RevisionStep).delete()
        db.query(Originator).delete()
        db.query(ReviewCode).delete()
        db.query(Language).delete()
        db.query(Department).delete()
        db.query(Company).delete()
        db.query(UserRole).delete()
        
        # Revision Statuses
        statuses = [
            RevisionStatus(name="Draft", name_native="Черновик", description="Черновик документа"),
            RevisionStatus(name="In Review", name_native="На согласовании", description="Документ на согласовании"),
            RevisionStatus(name="Approved", name_native="Утвержден", description="Документ утвержден"),
            RevisionStatus(name="Rejected", name_native="Отклонен", description="Документ отклонен"),
            RevisionStatus(name="Archived", name_native="Архив", description="Документ в архиве")
        ]
        
        for status in statuses:
            db.add(status)
        
        # Revision Descriptions
        descriptions = [
            RevisionDescription(code="INIT", description="Initial Issue", description_native="Первоначальный выпуск", phase="Design"),
            RevisionDescription(code="REV", description="Revision", description_native="Ревизия", phase="Design"),
            RevisionDescription(code="ASB", description="As Built", description_native="Как построено", phase="Construction"),
            RevisionDescription(code="FINAL", description="Final", description_native="Финальная версия", phase="Construction")
        ]
        
        for desc in descriptions:
            db.add(desc)
        
        # Revision Steps
        steps = [
            RevisionStep(code="PREP", description="Preparation", description_native="Подготовка", description_long="Подготовка документа к согласованию"),
            RevisionStep(code="REV", description="Review", description_native="Проверка", description_long="Проверка документа техническими специалистами"),
            RevisionStep(code="APP", description="Approval", description_native="Согласование", description_long="Согласование документа руководством"),
            RevisionStep(code="REL", description="Release", description_native="Выпуск", description_long="Выпуск документа в производство")
        ]
        
        for step in steps:
            db.add(step)
        
        # Originators
        originators = [
            Originator(name="Engineering Department", name_native="Инженерный отдел", code="ENG"),
            Originator(name="Architecture Department", name_native="Архитектурный отдел", code="ARCH"),
            Originator(name="Construction Department", name_native="Строительный отдел", code="CONST"),
            Originator(name="Client", name_native="Заказчик", code="CLIENT")
        ]
        
        for orig in originators:
            db.add(orig)
        
        # Review Codes
        codes = [
            ReviewCode(code="A", name="Approved", name_native="Утверждено", description="Документ утвержден без замечаний"),
            ReviewCode(code="A*", name="Approved with Comments", name_native="Утверждено с замечаниями", description="Документ утвержден с замечаниями"),
            ReviewCode(code="R", name="Rejected", name_native="Отклонено", description="Документ отклонен"),
            ReviewCode(code="I", name="Information", name_native="К сведению", description="Документ для информации")
        ]
        
        for code in codes:
            db.add(code)
        
        # Languages
        languages = [
            Language(name="English", name_native="Английский", code="EN"),
            Language(name="Russian", name_native="Русский", code="RU"),
            Language(name="German", name_native="Немецкий", code="DE"),
            Language(name="French", name_native="Французский", code="FR")
        ]
        
        for lang in languages:
            db.add(lang)
        
        # Companies
        companies = [
            Company(name="Main Contractor", name_native="Генеральный подрядчик", code="MAIN", role="Contractor"),
            Company(name="Client Company", name_native="Компания заказчик", code="CLIENT", role="Client"),
            Company(name="Design Company", name_native="Проектная компания", code="DESIGN", role="Designer")
        ]
        
        for comp in companies:
            db.add(comp)
        
        # Departments
        departments = [
            Department(name="Engineering", name_native="Инженерия", code="ENG"),
            Department(name="Architecture", name_native="Архитектура", code="ARCH"),
            Department(name="Construction", name_native="Строительство", code="CONST"),
            Department(name="Quality Control", name_native="Контроль качества", code="QC")
        ]
        
        for dept in departments:
            db.add(dept)
        
        # User Roles
        roles = [
            UserRole(name="Document Controller", name_native="Контролер документов", description="Управление документами", permissions="documents:read,documents:write"),
            UserRole(name="Engineer", name_native="Инженер", description="Техническая работа с документами", permissions="documents:read,documents:review"),
            UserRole(name="Manager", name_native="Менеджер", description="Управление проектами", permissions="projects:read,projects:write,documents:approve"),
            UserRole(name="Viewer", name_native="Наблюдатель", description="Просмотр документов", permissions="documents:read")
        ]
        
        for role in roles:
            db.add(role)
        
        db.commit()
        
    except Exception as e:
        db.rollback()
        pass  # Ошибка без вывода
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
