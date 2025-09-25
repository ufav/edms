#!/usr/bin/env python3
"""
Проверка полей created_by и manager_id в проектах
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"

def check_project_fields():
    """Проверяет поля created_by и manager_id в проектах"""
    print("=== Проверка полей проектов ===")
    
    # Логин как admin
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'admin',
        'password': 'admin123'
    })
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Получаем проекты
    projects_response = requests.get(f"{BASE_URL}/projects/", headers=headers)
    projects = projects_response.json()
    
    print(f"Найдено проектов: {len(projects)}")
    print()
    
    for project in projects:
        print(f"Проект: {project['name']}")
        print(f"  - created_by: {project['created_by']}")
        print(f"  - manager_id: {project['manager_id']}")
        print()

if __name__ == "__main__":
    check_project_fields()
