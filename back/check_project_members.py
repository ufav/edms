#!/usr/bin/env python3
"""
Проверка участников проекта
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"

def check_project_members():
    """Проверяет участников проекта"""
    print("=== Проверка участников проекта ЖК Солнечный ===")
    
    # Логин как admin
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'admin',
        'password': 'admin123'
    })
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Получаем участников проекта
    members_response = requests.get(f"{BASE_URL}/projects/2/members/", headers=headers)
    members = members_response.json()
    
    print(f"Участников проекта: {len(members)}")
    for member in members:
        print(f"- User {member['user_id']}: {member['role']}")
    
    # Проверяем, есть ли operator1 (ID: 6) в проекте
    operator1_member = next((m for m in members if m['user_id'] == 6), None)
    if operator1_member:
        print(f"\n✅ operator1 (ID: 6) найден в проекте с ролью: {operator1_member['role']}")
    else:
        print(f"\n❌ operator1 (ID: 6) НЕ найден в проекте")

if __name__ == "__main__":
    check_project_members()
