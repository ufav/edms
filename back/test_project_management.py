#!/usr/bin/env python3
"""
Тестирование обновленной системы управления проектами
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"

def test_project_access():
    """Тестирует новую логику доступа к проектам"""
    print("=== Тестирование системы управления проектами ===")
    
    # Тестируем operator1
    print("\n1. Тестирование operator1:")
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'operator1',
        'password': 'operator123'
    })
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    projects_response = requests.get(f"{BASE_URL}/projects/", headers=headers)
    projects = projects_response.json()
    
    print(f"Проекты для operator1: {len(projects)}")
    for project in projects:
        print(f"  - {project['name']} (created_by: {project.get('created_by', 'N/A')})")
    
    # Тестируем admin
    print("\n2. Тестирование admin:")
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'admin',
        'password': 'admin123'
    })
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    projects_response = requests.get(f"{BASE_URL}/projects/", headers=headers)
    projects = projects_response.json()
    
    print(f"Проекты для admin: {len(projects)}")
    for project in projects:
        print(f"  - {project['name']} (created_by: {project.get('created_by', 'N/A')})")
    
    # Тестируем управление участниками
    print("\n3. Тестирование управления участниками:")
    if projects:
        project = projects[0]
        project_id = project['id']
        project_name = project['name']
        
        print(f"Тестируем проект: {project_name}")
        
        # Получаем участников
        members_response = requests.get(f"{BASE_URL}/projects/{project_id}/members/", headers=headers)
        if members_response.status_code == 200:
            members = members_response.json()
            print(f"Участников проекта: {len(members)}")
            for member in members:
                print(f"  - User ID: {member['user_id']}, Role: {member['role']}")
        else:
            print(f"Ошибка получения участников: {members_response.text}")

if __name__ == "__main__":
    test_project_access()
