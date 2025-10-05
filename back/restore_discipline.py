import os
import sys
from sqlalchemy import create_engine, text
from app.core.config import settings

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

DATABASE_URL = settings.DATABASE_URL
engine = create_engine(DATABASE_URL)

def restore_discipline():
    with engine.connect() as conn:
        # Проверяем текущее состояние
        result = conn.execute(text("""
            SELECT id, code, name, name_en 
            FROM disciplines 
            WHERE name = 'Телекоммуникации'
        """))
        
        row = result.fetchone()
        if row:
            # Восстанавливаем правильное название (как было в оригинале)
            conn.execute(text("""
                UPDATE disciplines 
                SET name_en = 'SAFETY AND ENVIRONMENTAL' 
                WHERE name = 'Телекоммуникации'
            """))
            conn.commit()

if __name__ == "__main__":
    restore_discipline()