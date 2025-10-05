#!/usr/bin/env python3
"""
Скрипт для заполнения базовых ролей компаний
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.company_role import CompanyRole

def seed_company_roles():
    """Заполняет таблицу ролей компаний базовыми данными"""
    db = SessionLocal()
    
    try:
        # Проверяем, есть ли уже данные
        existing_roles = db.query(CompanyRole).count()
        if existing_roles > 0:
            return
        
        # Базовые роли компаний
        roles = [
            {
                "code": "client",
                "name": "Заказчик",
                "name_en": "Client",
                "description": "Организация, которая заказывает выполнение работ",
                "is_active": True
            },
            {
                "code": "contractor",
                "name": "Подрядчик",
                "name_en": "Contractor", 
                "description": "Организация, выполняющая работы по договору",
                "is_active": True
            },
            {
                "code": "subcontractor",
                "name": "Субподрядчик",
                "name_en": "Subcontractor",
                "description": "Организация, выполняющая часть работ по субподряду",
                "is_active": True
            },
            {
                "code": "executor",
                "name": "Исполнитель",
                "name_en": "Executor",
                "description": "Организация, непосредственно выполняющая работы",
                "is_active": True
            },
            {
                "code": "consultant",
                "name": "Консультант",
                "name_en": "Consultant",
                "description": "Организация, предоставляющая консультационные услуги",
                "is_active": True
            },
            {
                "code": "supplier",
                "name": "Поставщик",
                "name_en": "Supplier",
                "description": "Организация, поставляющая материалы и оборудование",
                "is_active": True
            },
            {
                "code": "other",
                "name": "Другое",
                "name_en": "Other",
                "description": "Прочие участники проекта",
                "is_active": True
            }
        ]
        
        # Создаем роли
        for role_data in roles:
            role = CompanyRole(**role_data)
            db.add(role)
        
        db.commit()
        
    except Exception as e:
        pass  # Ошибка без вывода
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_company_roles()
