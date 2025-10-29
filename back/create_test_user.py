#!/usr/bin/env python3
"""
Создание тестового пользователя
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.models.user import User
from sqlalchemy.orm import Session
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_test_user():
    """Создает тестового пользователя"""
    
    db = next(get_db())
    
    try:
        # Проверяем, существует ли пользователь
        existing_user = db.query(User).filter(User.email == "test@edms.com").first()
        
        if existing_user:
            print("Пользователь test@edms.com уже существует")
            return
        
        # Создаем нового пользователя
        hashed_password = pwd_context.hash("test123")
        
        new_user = User(
            username="test",
            email="test@edms.com",
            full_name="Test User",
            hashed_password=hashed_password,
            is_active=True,
            role="Administrator"
        )
        
        db.add(new_user)
        db.commit()
        
        print("✅ Тестовый пользователь создан:")
        print("Email: test@edms.com")
        print("Пароль: test123")
        
    except Exception as e:
        print(f"Ошибка: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()
