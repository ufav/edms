#!/usr/bin/env python3
"""
Проверка пользователей в базе данных
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"

def main():
    # Логин как admin
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'admin',
        'password': 'admin123'
    })
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Получение пользователей
    users_response = requests.get(f"{BASE_URL}/users/", headers=headers)
    users = users_response.json()
    
    print("Пользователи в базе данных:")
    for user in users:
        print(f"ID: {user['id']}, Username: {user['username']}, Role: {user.get('role', 'N/A')}")

if __name__ == "__main__":
    main()
