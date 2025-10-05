import os
import sys
from sqlalchemy import create_engine, text
from app.core.config import settings

# Добавляем путь к корневой директории проекта
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

DATABASE_URL = settings.DATABASE_URL
engine = create_engine(DATABASE_URL)

def check_disciplines():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, code, name, name_en 
            FROM disciplines 
            ORDER BY name
        """))
        
        for row in result:
            pass  # Просто проходим по результатам без вывода

if __name__ == "__main__":
    check_disciplines()
