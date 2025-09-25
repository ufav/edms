#!/usr/bin/env python3
"""
Простой скрипт для создания пользователя-админа
Запуск: python create_admin_simple.py
"""

import psycopg2
from passlib.context import CryptContext

# Настройка для хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Параметры подключения к БД
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'edms',
    'user': 'postgres',
    'password': '123'
}

def create_admin():
    """Создание пользователя-админа с предустановленными данными"""
    
    # Данные админа
    admin_data = {
        'username': 'admin',
        'email': 'admin@edms.com',
        'full_name': 'System Administrator',
        'password': 'admin123'
    }
    
    try:
        # Подключение к базе данных
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("🔌 Подключение к базе данных установлено!")
        
        # Проверяем, существует ли пользователь
        cursor.execute("SELECT id FROM users WHERE username = %s", (admin_data['username'],))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print(f"⚠️  Пользователь '{admin_data['username']}' уже существует!")
            return
        
        # Хешируем пароль
        hashed_password = pwd_context.hash(admin_data['password'])
        
        # Создаем пользователя-админа
        cursor.execute("""
            INSERT INTO users (username, email, full_name, hashed_password, is_active, is_admin)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (admin_data['username'], admin_data['email'], admin_data['full_name'], 
              hashed_password, True, True))
        
        user_id = cursor.fetchone()[0]
        
        # Коммит изменений
        conn.commit()
        
        print(f"\n✅ Пользователь-админ успешно создан!")
        print(f"   ID: {user_id}")
        print(f"   Username: {admin_data['username']}")
        print(f"   Email: {admin_data['email']}")
        print(f"   Full Name: {admin_data['full_name']}")
        print(f"   Password: {admin_data['password']}")
        print(f"   Is Admin: True")
        print(f"   Is Active: True")
        
        print(f"\n🚀 Данные для входа:")
        print(f"   Username: {admin_data['username']}")
        print(f"   Password: {admin_data['password']}")
        
    except psycopg2.Error as e:
        print(f"❌ Ошибка при создании пользователя: {e}")
        if conn:
            conn.rollback()
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("\n🔌 Соединение с базой данных закрыто.")

if __name__ == "__main__":
    print("🔐 Создание пользователя-админа для EDMS")
    print("=" * 50)
    create_admin()
    print("=" * 50)
    print("✨ Готово!")
