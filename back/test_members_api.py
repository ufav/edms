#!/usr/bin/env python3
"""
Тестирование API управления участниками проектов
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"

def test_project_members_api():
    """Тестирует API управления участниками проектов"""
    print("=== Тестирование API управления участниками проектов ===")
    
    # Логин как admin
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'admin',
        'password': 'admin123'
    })
    
    if login_response.status_code != 200:
        print(f"❌ Ошибка входа: {login_response.text}")
        return
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Получаем проекты
    projects_response = requests.get(f"{BASE_URL}/projects/", headers=headers)
    projects = projects_response.json()
    
    if not projects:
        print("❌ Нет проектов для тестирования")
        return
    
    project = projects[0]
    project_id = project['id']
    project_name = project['name']
    
    print(f"✅ Тестируем проект: {project_name} (ID: {project_id})")
    
    # 1. Получаем участников проекта
    print("\n1. Получение участников проекта...")
    members_response = requests.get(f"{BASE_URL}/projects/{project_id}/members/", headers=headers)
    
    if members_response.status_code == 200:
        members = members_response.json()
        print(f"✅ Участников проекта: {len(members)}")
        for member in members:
            print(f"  - User ID: {member['user_id']}, Role: {member['role']}")
    else:
        print(f"❌ Ошибка получения участников: {members_response.text}")
    
    # 2. Добавляем участника (operator1)
    print("\n2. Добавление участника operator1...")
    add_member_response = requests.post(f"{BASE_URL}/projects/{project_id}/members/", 
                                      headers=headers,
                                      json={"user_id": 6, "role": "operator"})  # operator1 имеет ID 6
    
    if add_member_response.status_code == 200:
        print("✅ Участник добавлен успешно")
    elif add_member_response.status_code == 400:
        print("⚠️ Участник уже существует")
    else:
        print(f"❌ Ошибка добавления участника: {add_member_response.text}")
    
    # 3. Проверяем обновленный список участников
    print("\n3. Проверка обновленного списка участников...")
    members_response = requests.get(f"{BASE_URL}/projects/{project_id}/members/", headers=headers)
    
    if members_response.status_code == 200:
        members = members_response.json()
        print(f"✅ Участников проекта: {len(members)}")
        for member in members:
            print(f"  - User ID: {member['user_id']}, Role: {member['role']}")
    
    print("\n=== Тестирование завершено ===")

if __name__ == "__main__":
    test_project_members_api()
