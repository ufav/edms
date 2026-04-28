#!/usr/bin/env python3
"""
Тест серверной пагинации для документов
"""

import requests
import json

# Базовый URL API
BASE_URL = "http://localhost:8000/api/v1"

def test_server_pagination():
    """Тестирует серверную пагинацию"""
    
    # 1. Логин для получения токена
    login_data = {
        "username": "test@edms.com",
        "password": "test123"
    }
    
    print("1. Авторизация...")
    login_response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    
    if login_response.status_code != 200:
        print(f"Ошибка авторизации: {login_response.status_code}")
        print(login_response.text)
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Авторизация успешна")
    
    # 2. Тест пагинации
    print("\n2. Тест серверной пагинации...")
    
    params = {
        "page": 1,
        "size": 13,
        "project_id": 27
    }
    
    response = requests.get(f"{BASE_URL}/documents/", params=params, headers=headers)
    
    if response.status_code != 200:
        print(f"Ошибка запроса: {response.status_code}")
        print(response.text)
        return
    
    data = response.json()
    print(f"✓ Запрос успешен")
    print(f"Страница: {data.get('page', 'N/A')}")
    print(f"Размер страницы: {data.get('size', 'N/A')}")
    print(f"Всего элементов: {data.get('total', 'N/A')}")
    print(f"Всего страниц: {data.get('pages', 'N/A')}")
    print(f"Количество элементов на странице: {len(data.get('items', []))}")
    
    # 3. Тест с фильтрами
    print("\n3. Тест с фильтрами...")
    
    params_with_filters = {
        "page": 1,
        "size": 13,
        "project_id": 27,
        "search": "test",
        "sort_by": "title",
        "sort_dir": "asc"
    }
    
    response = requests.get(f"{BASE_URL}/documents/", params=params_with_filters, headers=headers)
    
    if response.status_code != 200:
        print(f"Ошибка запроса с фильтрами: {response.status_code}")
        print(response.text)
        return
    
    data = response.json()
    print(f"✓ Запрос с фильтрами успешен")
    print(f"Найдено элементов: {len(data.get('items', []))}")
    
    # 4. Тест второй страницы
    print("\n4. Тест второй страницы...")
    
    params_page2 = {
        "page": 2,
        "size": 13,
        "project_id": 27
    }
    
    response = requests.get(f"{BASE_URL}/documents/", params=params_page2, headers=headers)
    
    if response.status_code != 200:
        print(f"Ошибка запроса второй страницы: {response.status_code}")
        print(response.text)
        return
    
    data = response.json()
    print(f"✓ Запрос второй страницы успешен")
    print(f"Страница: {data.get('page', 'N/A')}")
    print(f"Элементов на странице: {len(data.get('items', []))}")
    
    print("\n✅ Все тесты серверной пагинации прошли успешно!")

if __name__ == "__main__":
    test_server_pagination()
