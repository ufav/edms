#!/usr/bin/env python3
"""
Исправление роли 'member' на 'viewer' в ProjectMember
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.models.project import ProjectMember

def fix_member_role():
    """Исправляет роль 'member' на 'viewer'"""
    print("=== Исправление роли 'member' на 'viewer' ===")
    
    # Создаем подключение к БД
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        # Находим всех участников с ролью 'member'
        members = session.query(ProjectMember).filter(ProjectMember.role == 'member').all()
        
        print(f"Найдено участников с ролью 'member': {len(members)}")
        
        for member in members:
            print(f"Обновляем User {member.user_id} в проекте {member.project_id}: member -> viewer")
            member.role = 'viewer'
        
        # Сохраняем изменения
        session.commit()
        print("\n✅ Все роли 'member' обновлены на 'viewer'!")
        
    except Exception as e:
        print(f"❌ Ошибка при обновлении ролей: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    fix_member_role()
