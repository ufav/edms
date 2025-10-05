#!/usr/bin/env python3
"""
Скрипт для создания тестового удаленного проекта
"""

import os
import sys
from sqlalchemy import create_engine, text
from app.core.config import settings

# Добавляем путь к корневой директории проекта
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

DATABASE_URL = settings.DATABASE_URL
engine = create_engine(DATABASE_URL)

def create_test_deleted_project():
    with engine.connect() as conn:
        # Проверяем, есть ли уже проект с кодом TEST-DELETED
        result = conn.execute(text("""
            SELECT id, project_code, name, is_deleted 
            FROM projects 
            WHERE project_code = 'TEST-DELETED'
        """))
        
        existing = result.fetchone()
        if existing:
            print(f"Проект с кодом TEST-DELETED уже существует:")
            print(f"  - ID: {existing[0]}")
            print(f"  - Код: {existing[1]}")
            print(f"  - Название: {existing[2]}")
            print(f"  - Удален: {existing[3]}")
            
            if existing[3] == 1:
                print("Проект уже помечен как удаленный!")
                return
            else:
                print("Проект существует, но не удален. Помечаем как удаленный...")
                conn.execute(text("""
                    UPDATE projects 
                    SET is_deleted = 1 
                    WHERE project_code = 'TEST-DELETED'
                """))
                conn.commit()
                print("Проект помечен как удаленный!")
                return
        
        # Создаем новый тестовый проект
        print("Создаем новый тестовый проект...")
        conn.execute(text("""
            INSERT INTO projects (name, description, project_code, status, is_deleted, created_by)
            VALUES ('Тестовый удаленный проект', 'Проект для тестирования функциональности удаленных проектов', 'TEST-DELETED', 'active', 1, 1)
        """))
        conn.commit()
        print("Тестовый удаленный проект создан!")

if __name__ == "__main__":
    create_test_deleted_project()
