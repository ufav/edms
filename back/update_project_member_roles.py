#!/usr/bin/env python3
"""
Обновление ролей в ProjectMember на правильные
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.models.project import ProjectMember

def update_project_member_roles():
    """Обновляет роли в ProjectMember"""
    print("=== Обновление ролей в ProjectMember ===")
    
    # Создаем подключение к БД
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        # Обновляем роли участников проектов
        members = session.query(ProjectMember).all()
        
        print(f"Найдено участников проектов: {len(members)}")
        
        for member in members:
            if member.role == 'manager':
                member.role = 'admin'
                print(f"✅ User {member.user_id} в проекте {member.project_id}: manager -> admin")
            elif member.role == 'operator':
                print(f"✅ User {member.user_id} в проекте {member.project_id}: operator (без изменений)")
            elif member.role == 'viewer':
                print(f"✅ User {member.user_id} в проекте {member.project_id}: viewer (без изменений)")
            else:
                print(f"⚠️ User {member.user_id} в проекте {member.project_id}: {member.role} (неизвестная роль)")
        
        # Сохраняем изменения
        session.commit()
        print("\n✅ Все роли в ProjectMember обновлены!")
        
    except Exception as e:
        print(f"❌ Ошибка при обновлении ролей: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    update_project_member_roles()
