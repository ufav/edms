#!/usr/bin/env python3
"""
Тестирование системы назначения проектов пользователям
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"

def test_user_projects(username, password):
    """Тестирует, какие проекты видит пользователь"""
    print(f"\n=== Тестирование для пользователя: {username} ===")
    
    # Логин
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': username,
        'password': password
    })
    
    if login_response.status_code != 200:
        print(f"❌ Ошибка входа: {login_response.text}")
        return
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Получение проектов
    projects_response = requests.get(f"{BASE_URL}/projects/", headers=headers)
    
    if projects_response.status_code != 200:
        print(f"❌ Ошибка получения проектов: {projects_response.text}")
        return
    
    projects = projects_response.json()
    print(f"✅ Пользователь {username} видит {len(projects)} проектов:")
    
    for project in projects:
        print(f"  - {project['name']} (статус: {project['status']})")

def main():
    """Основная функция тестирования"""
    print("=== Тестирование системы назначения проектов ===")
    
    # Тестируем разных пользователей
    test_users = [
        ("admin", "admin123"),
        ("operator1", "operator123"),
        ("operator2", "operator123"),
        ("viewer1", "viewer123"),
        ("viewer2", "viewer123")
    ]
    
    for username, password in test_users:
        test_user_projects(username, password)
    
    print("\n=== Тестирование завершено ===")

if __name__ == "__main__":
    main()
