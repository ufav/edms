#!/usr/bin/env python3
"""
Проверка пользователей в системе
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"

def check_users():
    """Проверяет пользователей в системе"""
    print("=== Пользователи в системе ===")
    
    # Логин как admin
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'admin',
        'password': 'admin123'
    })
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Получаем пользователей
    users_response = requests.get(f"{BASE_URL}/users/", headers=headers)
    users = users_response.json()
    
    print(f"Найдено пользователей: {len(users)}")
    print()
    
    for user in users:
        print(f"ID: {user['id']}, Username: {user['username']}, Role: {user.get('role', 'N/A')}")
    
    print()
    print("Менеджер проектов (ID: 2):")
    manager = next((u for u in users if u['id'] == 2), None)
    if manager:
        print(f"  - {manager['username']} ({manager.get('role', 'N/A')})")
    else:
        print("  - Пользователь с ID: 2 не найден!")

if __name__ == "__main__":
    check_users()
