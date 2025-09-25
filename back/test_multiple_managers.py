#!/usr/bin/env python3
"""
Скрипт для добавления нескольких менеджеров к проекту
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"

def add_multiple_managers():
    """Добавляет нескольких менеджеров к проекту"""
    print("=== Добавление нескольких менеджеров к проекту ===")
    
    # Логин как admin
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'admin',
        'password': 'admin123'
    })
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Добавляем operator1 как менеджера проекта "ЖК Солнечный" (ID: 2)
    print("Добавляем operator1 как менеджера...")
    add_response = requests.post(f"{BASE_URL}/projects/2/members/", 
                                headers=headers,
                                json={"user_id": 6, "role": "manager"})  # operator1 имеет ID 6
    
    if add_response.status_code == 200:
        print("✅ operator1 добавлен как менеджер")
    elif add_response.status_code == 400:
        print("⚠️ operator1 уже участник, обновляем роль...")
        # Нужно будет добавить API для обновления роли
    else:
        print(f"❌ Ошибка: {add_response.text}")
    
    # Добавляем operator2 как менеджера проекта "ЖК Солнечный" (ID: 2)
    print("Добавляем operator2 как менеджера...")
    add_response = requests.post(f"{BASE_URL}/projects/2/members/", 
                                headers=headers,
                                json={"user_id": 7, "role": "manager"})  # operator2 имеет ID 7
    
    if add_response.status_code == 200:
        print("✅ operator2 добавлен как менеджер")
    elif add_response.status_code == 400:
        print("⚠️ operator2 уже участник, обновляем роль...")
    else:
        print(f"❌ Ошибка: {add_response.text}")
    
    # Проверяем участников проекта
    print("\nПроверяем участников проекта...")
    members_response = requests.get(f"{BASE_URL}/projects/2/members/", headers=headers)
    if members_response.status_code == 200:
        members = members_response.json()
        print(f"Участников проекта: {len(members)}")
        for member in members:
            print(f"  - User ID: {member['user_id']}, Role: {member['role']}")
    
    # Тестируем, что operator1 может управлять участниками
    print("\nТестируем права operator1...")
    operator_login = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'operator1',
        'password': 'operator123'
    })
    
    operator_token = operator_login.json().get('access_token')
    operator_headers = {'Authorization': f'Bearer {operator_token}'}
    
    # Пытаемся добавить участника
    test_response = requests.post(f"{BASE_URL}/projects/2/members/", 
                                 headers=operator_headers,
                                 json={"user_id": 9, "role": "viewer"})
    
    print(f"Статус: {test_response.status_code}")
    if test_response.status_code == 200:
        print("✅ operator1 может управлять участниками!")
    else:
        print(f"❌ operator1 не может управлять участниками: {test_response.text}")

if __name__ == "__main__":
    add_multiple_managers()
