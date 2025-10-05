#!/usr/bin/env python3
"""
Скрипт для заполнения примерами контактов для компаний
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

def seed_contacts():
    """Заполняет таблицу контактов примерами для компаний с ID 1-6"""
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # Проверяем, есть ли уже контакты
            result = conn.execute(text("SELECT COUNT(*) FROM contacts"))
            count = result.scalar()
            
            if count > 0:
                return
            
            # Примеры контактов для компаний
            contacts_data = [
                # Компания 1 - Main Contractor
                (1, "Иван Петров", "Главный инженер", "ivan.petrov@maincontractor.com", "+7-495-123-4567", True, "Основной контакт по проекту"),
                (1, "Мария Сидорова", "Менеджер проекта", "maria.sidorova@maincontractor.com", "+7-495-123-4568", False, "Координация работ"),
                (1, "Алексей Козлов", "Технический директор", "alexey.kozlov@maincontractor.com", "+7-495-123-4569", False, "Технические вопросы"),
                
                # Компания 2 - Client Company
                (2, "Елена Волкова", "Директор по развитию", "elena.volkova@clientcompany.com", "+7-495-234-5678", True, "Основной заказчик"),
                (2, "Дмитрий Новиков", "Главный архитектор", "dmitry.novikov@clientcompany.com", "+7-495-234-5679", False, "Архитектурные решения"),
                
                # Компания 3 - Design Company
                (3, "Анна Морозова", "Главный дизайнер", "anna.morozova@designcompany.com", "+7-495-345-6789", True, "Дизайн-проекты"),
                (3, "Сергей Лебедев", "3D-визуализатор", "sergey.lebedev@designcompany.com", "+7-495-345-6790", False, "3D моделирование"),
                
                # Компания 4 - Engineering Company
                (4, "Владимир Соколов", "Главный конструктор", "vladimir.sokolov@engineering.com", "+7-495-456-7890", True, "Конструкторские работы"),
                (4, "Ольга Кузнецова", "Инженер-проектировщик", "olga.kuznetsova@engineering.com", "+7-495-456-7891", False, "Проектирование"),
                
                # Компания 5 - Construction Company
                (5, "Михаил Попов", "Прораб", "mikhail.popov@construction.com", "+7-495-567-8901", True, "Строительные работы"),
                (5, "Татьяна Васильева", "Инженер по качеству", "tatyana.vasilyeva@construction.com", "+7-495-567-8902", False, "Контроль качества"),
                
                # Компания 6 - Consulting Company
                (6, "Андрей Смирнов", "Ведущий консультант", "andrey.smirnov@consulting.com", "+7-495-678-9012", True, "Консультационные услуги"),
                (6, "Наталья Федорова", "Аналитик", "natalya.fedorova@consulting.com", "+7-495-678-9013", False, "Аналитика и отчеты"),
            ]
            
            # Вставляем контакты
            for company_id, full_name, position, email, phone, is_primary, notes in contacts_data:
                conn.execute(text("""
                    INSERT INTO contacts (company_id, full_name, position, email, phone, is_primary, notes)
                    VALUES (:company_id, :full_name, :position, :email, :phone, :is_primary, :notes)
                """), {
                    "company_id": company_id,
                    "full_name": full_name,
                    "position": position,
                    "email": email,
                    "phone": phone,
                    "is_primary": is_primary,
                    "notes": notes
                })
            
            conn.commit()
            
            # Показываем статистику
            result = conn.execute(text("""
                SELECT c.id, c.name, COUNT(ct.id) as contacts_count
                FROM companies c
                LEFT JOIN contacts ct ON c.id = ct.company_id
                WHERE c.id BETWEEN 1 AND 6
                GROUP BY c.id, c.name
                ORDER BY c.id
            """))
            
            for row in result.fetchall():
                pass  # Статистика без вывода
            
    except Exception as e:
        pass  # Ошибка без вывода

if __name__ == "__main__":
    seed_contacts()
