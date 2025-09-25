#!/usr/bin/env python3
"""
Скрипт для пересоздания назначений проектов
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Добавляем путь к приложению
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.models.project import ProjectMember

def create_database_connection():
    """Создает подключение к базе данных"""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

def main():
    """Основная функция"""
    print("=== Пересоздание назначений проектов ===")
    
    session = create_database_connection()
    
    try:
        # Удаляем все существующие назначения
        print("Удаление существующих назначений...")
        session.query(ProjectMember).delete()
        session.commit()
        
        # Запускаем скрипт заполнения только для назначений
        from populate_database import populate_project_members, populate_projects
        
        projects = populate_projects(session)
        populate_project_members(session, projects)
        
        print("✅ Назначения проектов пересозданы!")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    main()
