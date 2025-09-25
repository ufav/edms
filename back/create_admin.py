#!/usr/bin/env python3
"""
Скрипт для создания пользователя-админа
Запуск: python create_admin.py
"""

import psycopg2
from passlib.context import CryptContext
import getpass
import sys

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

def hash_password(password: str) -> str:
    """Хеширование пароля"""
    return pwd_context.hash(password)

def create_admin_user():
    """Создание пользователя-админа"""
    
    print("🔐 Создание пользователя-админа для EDMS")
    print("=" * 50)
    
    # Получение данных от пользователя
    username = input("Введите username для админа: ").strip()
    if not username:
        print("❌ Username не может быть пустым!")
        return
    
    email = input("Введите email для админа: ").strip()
    if not email:
        print("❌ Email не может быть пустым!")
        return
    
    full_name = input("Введите полное имя админа: ").strip()
    if not full_name:
        print("❌ Полное имя не может быть пустым!")
        return
    
    # Безопасный ввод пароля
    password = getpass.getpass("Введите пароль для админа: ")
    if not password:
        print("❌ Пароль не может быть пустым!")
        return
    
    password_confirm = getpass.getpass("Подтвердите пароль: ")
    if password != password_confirm:
        print("❌ Пароли не совпадают!")
        return
    
    try:
        # Подключение к базе данных
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("\n🔌 Подключение к базе данных установлено!")
        
        # Проверяем, существует ли пользователь
        cursor.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print(f"❌ Пользователь с username '{username}' или email '{email}' уже существует!")
            return
        
        # Хешируем пароль
        hashed_password = hash_password(password)
        
        # Создаем пользователя-админа
        cursor.execute("""
            INSERT INTO users (username, email, full_name, hashed_password, is_active, is_admin)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (username, email, full_name, hashed_password, True, True))
        
        user_id = cursor.fetchone()[0]
        
        # Коммит изменений
        conn.commit()
        
        print(f"\n✅ Пользователь-админ успешно создан!")
        print(f"   ID: {user_id}")
        print(f"   Username: {username}")
        print(f"   Email: {email}")
        print(f"   Full Name: {full_name}")
        print(f"   Is Admin: True")
        print(f"   Is Active: True")
        
        print(f"\n🚀 Теперь вы можете войти в систему с этими данными:")
        print(f"   URL: http://localhost:5173")
        print(f"   Username: {username}")
        print(f"   Password: [ваш пароль]")
        
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

def list_users():
    """Показать список всех пользователей"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, username, email, full_name, is_active, is_admin, created_at
            FROM users
            ORDER BY created_at DESC
        """)
        
        users = cursor.fetchall()
        
        if not users:
            print("📋 Пользователи не найдены.")
            return
        
        print("\n📋 Список пользователей:")
        print("-" * 80)
        print(f"{'ID':<5} {'Username':<15} {'Email':<25} {'Full Name':<20} {'Admin':<6} {'Active':<7}")
        print("-" * 80)
        
        for user in users:
            user_id, username, email, full_name, is_active, is_admin, created_at = user
            print(f"{user_id:<5} {username:<15} {email:<25} {full_name:<20} {'Yes' if is_admin else 'No':<6} {'Yes' if is_active else 'No':<7}")
        
    except psycopg2.Error as e:
        print(f"❌ Ошибка при получении списка пользователей: {e}")
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def main():
    """Главная функция"""
    while True:
        print("\n" + "=" * 50)
        print("🔐 Управление пользователями EDMS")
        print("=" * 50)
        print("1. Создать пользователя-админа")
        print("2. Показать список пользователей")
        print("3. Выход")
        
        choice = input("\nВыберите действие (1-3): ").strip()
        
        if choice == "1":
            create_admin_user()
        elif choice == "2":
            list_users()
        elif choice == "3":
            print("👋 До свидания!")
            break
        else:
            print("❌ Неверный выбор. Попробуйте снова.")

if __name__ == "__main__":
    main()
