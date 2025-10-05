#!/usr/bin/env python3
"""
Тестовый скрипт для демонстрации работы с API участников проекта
"""

import requests
import json

# Базовый URL API
BASE_URL = "http://localhost:8000/api/v1"

def test_participants_api():
    # Получаем список компаний
    companies_response = requests.get(f"{BASE_URL}/companies")
    if companies_response.status_code == 200:
        companies = companies_response.json()
    else:
        return

    # Предполагаем, что у нас есть проект с ID=1
    project_id = 1
    
    participants_response = requests.get(f"{BASE_URL}/projects/{project_id}/participants")
    if participants_response.status_code == 200:
        participants = participants_response.json()

    # Добавляем нового участника
    new_participant = {
        "company_id": companies[0]['id'] if companies else 1,
        "contact_person": "Иванов Иван Иванович",
        "email": "ivanov@example.com",
        "phone": "+7 (999) 123-45-67",
        "role": "client",
        "is_primary": True,
        "notes": "Основной заказчик проекта"
    }
    
    add_response = requests.post(
        f"{BASE_URL}/projects/{project_id}/participants",
        json=new_participant
    )
    
    if add_response.status_code == 200:
        participant = add_response.json()
    else:
        pass  # Ошибка без вывода

if __name__ == "__main__":
    test_participants_api()
