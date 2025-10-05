import os
import sys
from sqlalchemy import create_engine, text
from app.core.config import settings

# Добавляем путь к корневой директории проекта
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

DATABASE_URL = settings.DATABASE_URL
engine = create_engine(DATABASE_URL)

# Словарь русских названий -> английских названий
discipline_translations = {
    "Телекоммуникации": "Telecommunications",
    "Архитектура": "Architecture", 
    "Строительство": "Construction",
    "Электромонтаж": "Electrical Installation",
    "Вентиляция": "Ventilation",
    "Отопление": "Heating",
    "Водоснабжение": "Water Supply",
    "Канализация": "Sewerage",
    "Газоснабжение": "Gas Supply",
    "Пожарная безопасность": "Fire Safety",
    "Слаботочные системы": "Low Current Systems",
    "Автоматизация": "Automation",
    "Информационные технологии": "Information Technology",
    "Безопасность": "Security",
    "Экология": "Ecology",
    "Геодезия": "Geodesy",
    "Геология": "Geology",
    "Транспорт": "Transport",
    "Ландшафт": "Landscape",
    "Интерьер": "Interior",
    "Мебель": "Furniture",
    "Оборудование": "Equipment"
}

def update_discipline_names():
    with engine.connect() as conn:
        for russian_name, english_name in discipline_translations.items():
            # Обновляем name_en для дисциплины
            result = conn.execute(text("""
                UPDATE disciplines 
                SET name_en = :english_name 
                WHERE name = :russian_name
            """), {"english_name": english_name, "russian_name": russian_name})
            
            pass  # Обновление без вывода
        
        conn.commit()

if __name__ == "__main__":
    update_discipline_names()
