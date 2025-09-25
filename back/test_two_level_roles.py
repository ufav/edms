#!/usr/bin/env python3
"""
Тестирование двухуровневой системы ролей
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"

def test_two_level_roles():
    """Тестирует двухуровневую систему ролей"""
    print("=== Тестирование двухуровневой системы ролей ===")
    
    # 1. Тестируем суперадмина
    print("\n1. Тестирование суперадмина (admin):")
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'admin',
        'password': 'admin123'
    })
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Получаем информацию о пользователе
    user_response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    user_info = user_response.json()
    print(f"Глобальная роль: {user_info.get('role', 'N/A')}")
    
    # Получаем проекты
    projects_response = requests.get(f"{BASE_URL}/projects/", headers=headers)
    projects = projects_response.json()
    print(f"Проектов видит: {len(projects)}")
    for project in projects:
        print(f"  - {project['name']} (роль в проекте: {project.get('user_role', 'N/A')})")
    
    # 2. Тестируем обычного пользователя
    print("\n2. Тестирование обычного пользователя (operator1):")
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'operator1',
        'password': 'operator123'
    })
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Получаем информацию о пользователе
    user_response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    user_info = user_response.json()
    print(f"Глобальная роль: {user_info.get('role', 'N/A')}")
    
    # Получаем проекты
    projects_response = requests.get(f"{BASE_URL}/projects/", headers=headers)
    projects = projects_response.json()
    print(f"Проектов видит: {len(projects)}")
    for project in projects:
        print(f"  - {project['name']} (роль в проекте: {project.get('user_role', 'N/A')})")
    
    # 3. Тестируем права управления
    print("\n3. Тестирование прав управления:")
    
    # operator1 пытается управлять участниками проекта "ЖК Солнечный" (ID: 2)
    if projects:
        project = projects[0]
        project_id = project['id']
        project_name = project['name']
        user_role = project.get('user_role', 'N/A')
        
        print(f"Проект: {project_name}")
        print(f"Роль в проекте: {user_role}")
        
        if user_role == 'admin':
            print("✅ Может управлять участниками")
        else:
            print("❌ Не может управлять участниками")

if __name__ == "__main__":
    test_two_level_roles()
