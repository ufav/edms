#!/usr/bin/env python3
"""
Скрипт для добавления тестовых компаний в базу данных
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.references import Company

def add_test_companies():
    db = SessionLocal()
    try:
        # Проверяем, есть ли уже компании
        existing_companies = db.query(Company).count()
        if existing_companies > 0:
            return

        # Добавляем тестовые компании
        test_companies = [
            {
                "name": "ООО СтройИнвест",
                "name_native": "ООО СтройИнвест",
                "code": "SI001",
                "role": "contractor",
                "is_active": True
            },
            {
                "name": "ЗАО ПроектСервис",
                "name_native": "ЗАО ПроектСервис", 
                "code": "PS002",
                "role": "consultant",
                "is_active": True
            },
            {
                "name": "ИП Иванов И.И.",
                "name_native": "ИП Иванов И.И.",
                "code": "II003",
                "role": "supplier",
                "is_active": True
            },
            {
                "name": "ООО Заказчик",
                "name_native": "ООО Заказчик",
                "code": "ZC004", 
                "role": "client",
                "is_active": True
            },
            {
                "name": "АО СтройМатериалы",
                "name_native": "АО СтройМатериалы",
                "code": "SM005",
                "role": "supplier", 
                "is_active": True
            }
        ]

        for company_data in test_companies:
            company = Company(**company_data)
            db.add(company)
        
        db.commit()
        
    except Exception as e:
        pass  # Ошибка без вывода
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_test_companies()
