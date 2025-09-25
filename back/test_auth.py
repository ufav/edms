#!/usr/bin/env python3
"""
Тестовый скрипт для проверки аутентификации
"""

import requests
import json

# URL API
BASE_URL = "http://localhost:8000/api/v1"

def test_login():
    """Тестирование входа в систему"""
    print("🔐 Тестирование аутентификации...")
    
    # Данные для входа
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        # Отправляем запрос на вход
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        print(f"Статус ответа: {response.status_code}")
        print(f"Заголовки: {dict(response.headers)}")
        
        if response.status_code == 200:
            token_data = response.json()
            print(f"✅ Успешный вход!")
            print(f"Токен: {token_data.get('access_token', 'Нет токена')[:50]}...")
            print(f"Тип токена: {token_data.get('token_type', 'Нет типа')}")
            
            # Тестируем получение проектов с токеном
            test_projects(token_data['access_token'])
            
        else:
            print(f"❌ Ошибка входа: {response.status_code}")
            print(f"Ответ: {response.text}")
            
    except Exception as e:
        print(f"❌ Ошибка при тестировании: {e}")

def test_projects(token):
    """Тестирование получения проектов с токеном"""
    print("\n📋 Тестирование получения проектов...")
    
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(f"{BASE_URL}/projects/", headers=headers)
        
        print(f"Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            projects = response.json()
            print(f"✅ Успешно получено {len(projects)} проектов!")
            for project in projects:
                print(f"  - {project['name']} (ID: {project['id']})")
        else:
            print(f"❌ Ошибка получения проектов: {response.status_code}")
            print(f"Ответ: {response.text}")
            
    except Exception as e:
        print(f"❌ Ошибка при получении проектов: {e}")

if __name__ == "__main__":
    test_login()
