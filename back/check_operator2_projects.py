#!/usr/bin/env python3
"""
Проверка, что operator2 теперь видит проект ЖК Солнечный
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"

def main():
    # Логин как operator2
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        'username': 'operator2',
        'password': 'operator123'
    })
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Получение проектов
    projects_response = requests.get(f"{BASE_URL}/projects/", headers=headers)
    projects = projects_response.json()
    
    print("Projects for operator2:")
    for project in projects:
        print(f"- {project['name']}")

if __name__ == "__main__":
    main()
