#!/usr/bin/env python3
"""
Проверка пользователей в базе данных
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.models.user import User
from sqlalchemy.orm import Session

def check_users():
    """Проверяет пользователей в базе данных"""
    
    db = next(get_db())
    
    try:
        # Получаем всех пользователей
        users = db.query(User).all()
        
        print(f"Найдено пользователей: {len(users)}")
        
        for user in users:
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Активен: {user.is_active}")
            print(f"Роль: {getattr(user, 'role', 'N/A')}")
            print("---")
            
    except Exception as e:
        print(f"Ошибка: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
