#!/usr/bin/env python3
"""
Простой скрипт для заполнения базовых ролей компаний
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

def seed_company_roles():
    """Заполняет таблицу ролей компаний базовыми данными"""
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # Проверяем, есть ли уже данные
            result = conn.execute(text("SELECT COUNT(*) FROM company_roles"))
            count = result.scalar()
            
            if count > 0:
                return
            
            # Базовые роли компаний
            roles = [
                ("client", "Заказчик", "Client", "Организация, которая заказывает выполнение работ", True),
                ("contractor", "Подрядчик", "Contractor", "Организация, выполняющая работы по договору", True),
                ("subcontractor", "Субподрядчик", "Subcontractor", "Организация, выполняющая часть работ по субподряду", True),
                ("executor", "Исполнитель", "Executor", "Организация, непосредственно выполняющая работы", True),
                ("consultant", "Консультант", "Consultant", "Организация, предоставляющая консультационные услуги", True),
                ("supplier", "Поставщик", "Supplier", "Организация, поставляющая материалы и оборудование", True),
                ("other", "Другое", "Other", "Прочие участники проекта", True)
            ]
            
            # Вставляем роли
            for code, name, name_en, description, is_active in roles:
                conn.execute(text("""
                    INSERT INTO company_roles (code, name, name_en, description, is_active)
                    VALUES (:code, :name, :name_en, :description, :is_active)
                """), {
                    "code": code,
                    "name": name, 
                    "name_en": name_en,
                    "description": description,
                    "is_active": is_active
                })
            
            conn.commit()
            
    except Exception as e:
        pass  # Ошибка без вывода

if __name__ == "__main__":
    seed_company_roles()
