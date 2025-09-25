#!/usr/bin/env python3
"""
Проверка всех ролей в проектах
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"

def check_all_project_roles():
    """Проверяет роли во всех проектах"""
    print("=== Проверка ролей во всех проектах ===")
    
    # Логин как admin
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'admin',
        'password': 'admin123'
    })
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Проверяем все проекты
    projects = [2, 3, 4, 5]
    project_names = {
        2: "ЖК Солнечный",
        3: "Офисный центр Бизнес-Плаза", 
        4: "Торговый центр Мега",
        5: "Школа №15"
    }
    
    for project_id in projects:
        print(f"\n{project_names[project_id]} (ID: {project_id}):")
        members_response = requests.get(f"{BASE_URL}/projects/{project_id}/members/", headers=headers)
        members = members_response.json()
        
        roles = {}
        for member in members:
            role = member['role']
            roles[role] = roles.get(role, 0) + 1
        
        for role, count in roles.items():
            print(f"  - {role}: {count} чел.")
        
        # Проверяем, что нет роли 'member'
        if 'member' in roles:
            print("  ❌ ОШИБКА: Найдена роль 'member'!")
        else:
            print("  ✅ Только правильные роли")

if __name__ == "__main__":
    check_all_project_roles()
