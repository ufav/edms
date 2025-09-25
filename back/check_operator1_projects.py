#!/usr/bin/env python3
"""
Проверка API проектов для operator1
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"

def check_operator1_projects():
    """Проверяет проекты для operator1"""
    print("=== Проверка проектов для operator1 ===")
    
    # Логин как operator1
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'operator1',
        'password': 'operator123'
    })
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Получаем проекты
    projects_response = requests.get(f"{BASE_URL}/projects/", headers=headers)
    projects = projects_response.json()
    
    print(f"Проектов для operator1: {len(projects)}")
    for project in projects:
        print(f"- {project['name']}: user_role={project.get('user_role', 'N/A')}")

if __name__ == "__main__":
    check_operator1_projects()
