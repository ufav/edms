#!/usr/bin/env python3
"""
Тестирование обновленной системы ролей
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"

def test_updated_roles():
    """Тестирует обновленную систему ролей"""
    print("=== Тестирование обновленной системы ролей ===")
    
    # Логин как admin
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'admin',
        'password': 'admin123'
    })
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Проверяем участников проекта
    print("\n1. Участники проекта 'ЖК Солнечный':")
    members_response = requests.get(f"{BASE_URL}/projects/2/members/", headers=headers)
    members = members_response.json()
    
    roles = {}
    for member in members:
        role = member['role']
        roles[role] = roles.get(role, 0) + 1
    
    for role, count in roles.items():
        print(f"  - {role}: {count} чел.")
    
    # Проверяем, что нет роли 'member'
    if 'member' in roles:
        print("❌ ОШИБКА: Найдена роль 'member'!")
    else:
        print("✅ Роль 'member' успешно удалена!")
    
    # Тестируем добавление участника с правильной ролью
    print("\n2. Тестирование добавления участника:")
    try:
        add_response = requests.post(f"{BASE_URL}/projects/2/members/", 
                                    headers=headers,
                                    json={"user_id": 3, "role": "operator"})
        
        if add_response.status_code == 200:
            print("✅ Участник добавлен с ролью 'operator'")
        else:
            print(f"❌ Ошибка добавления: {add_response.text}")
    except Exception as e:
        print(f"❌ Ошибка: {e}")
    
    # Тестируем добавление участника с неправильной ролью
    print("\n3. Тестирование валидации ролей:")
    try:
        add_response = requests.post(f"{BASE_URL}/projects/2/members/", 
                                    headers=headers,
                                    json={"user_id": 3, "role": "member"})
        
        if add_response.status_code == 422:
            print("✅ Валидация работает: роль 'member' отклонена")
        else:
            print(f"❌ Валидация не работает: {add_response.text}")
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    test_updated_roles()
