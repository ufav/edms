#!/usr/bin/env python3
"""
Обновление глобальных ролей пользователей
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.models.user import User

def update_global_roles():
    """Обновляет глобальные роли пользователей"""
    print("=== Обновление глобальных ролей пользователей ===")
    
    # Создаем подключение к БД
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        # Обновляем роли пользователей
        users = session.query(User).all()
        
        print(f"Найдено пользователей: {len(users)}")
        
        for user in users:
            if user.username == 'admin':
                user.role = 'superadmin'
                print(f"✅ {user.username} -> superadmin")
            else:
                user.role = 'user'
                print(f"✅ {user.username} -> user")
        
        # Сохраняем изменения
        session.commit()
        print("\n✅ Все глобальные роли обновлены!")
        
    except Exception as e:
        print(f"❌ Ошибка при обновлении ролей: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    update_global_roles()
