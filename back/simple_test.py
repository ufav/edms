#!/usr/bin/env python3
"""
Простой тест для проверки работы сервера
"""

import requests

def test_server():
    """Тестирование работы сервера"""
    print("🔍 Тестирование работы сервера...")
    
    try:
        # Проверяем корневой эндпоинт
        response = requests.get("http://localhost:8000/")
        print(f"Корневой эндпоинт: {response.status_code}")
        if response.status_code == 200:
            print(f"Ответ: {response.json()}")
        
        # Проверяем health check
        response = requests.get("http://localhost:8000/health")
        print(f"Health check: {response.status_code}")
        if response.status_code == 200:
            print(f"Ответ: {response.json()}")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    test_server()
