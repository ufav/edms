#!/usr/bin/env python3
"""
Обновление поля created_by для существующих проектов
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.models.project import Project

def update_project_creators():
    """Обновляет поле created_by для всех проектов"""
    print("=== Обновление создателей проектов ===")
    
    # Создаем подключение к БД
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        # Получаем все проекты
        projects = session.query(Project).all()
        
        print(f"Найдено проектов: {len(projects)}")
        
        # Обновляем created_by для каждого проекта
        for i, project in enumerate(projects):
            # Устанавливаем created_by = 1 (admin) для всех проектов
            project.created_by = 1
            print(f"Обновлен проект: {project.name} (ID: {project.id}) - created_by: {project.created_by}")
        
        # Сохраняем изменения
        session.commit()
        print("✅ Все проекты обновлены!")
        
    except Exception as e:
        print(f"❌ Ошибка при обновлении проектов: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    update_project_creators()
