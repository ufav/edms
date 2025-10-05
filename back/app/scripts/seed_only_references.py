"""
Script to seed only reference tables without importing all models
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.core.config import settings

def seed_references():
    # Create engine directly
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            # Clear existing reference data
            conn.execute(text("DELETE FROM revision_statuses"))
            conn.execute(text("DELETE FROM revision_descriptions"))
            conn.execute(text("DELETE FROM revision_steps"))
            conn.execute(text("DELETE FROM originators"))
            conn.execute(text("DELETE FROM review_codes"))
            conn.execute(text("DELETE FROM languages"))
            conn.execute(text("DELETE FROM departments"))
            conn.execute(text("DELETE FROM companies"))
            conn.execute(text("DELETE FROM user_roles"))
            
            # Insert revision statuses
            conn.execute(text("""
                INSERT INTO revision_statuses (name, name_native, description, is_active, created_at)
                VALUES 
                ('Draft', 'Черновик', 'Черновик документа', true, now()),
                ('In Review', 'На согласовании', 'Документ на согласовании', true, now()),
                ('Approved', 'Утвержден', 'Документ утвержден', true, now()),
                ('Rejected', 'Отклонен', 'Документ отклонен', true, now()),
                ('Archived', 'Архив', 'Документ в архиве', true, now())
            """))
            
            # Insert revision descriptions
            conn.execute(text("""
                INSERT INTO revision_descriptions (code, description, description_native, phase, is_active, created_at)
                VALUES 
                ('INIT', 'Initial Issue', 'Первоначальный выпуск', 'Design', true, now()),
                ('REV', 'Revision', 'Ревизия', 'Design', true, now()),
                ('ASB', 'As Built', 'Как построено', 'Construction', true, now()),
                ('FINAL', 'Final', 'Финальная версия', 'Construction', true, now())
            """))
            
            # Insert revision steps
            conn.execute(text("""
                INSERT INTO revision_steps (code, description, description_native, description_long, is_active, created_at)
                VALUES 
                ('PREP', 'Preparation', 'Подготовка', 'Подготовка документа к согласованию', true, now()),
                ('REV', 'Review', 'Проверка', 'Проверка документа техническими специалистами', true, now()),
                ('APP', 'Approval', 'Согласование', 'Согласование документа руководством', true, now()),
                ('REL', 'Release', 'Выпуск', 'Выпуск документа в производство', true, now())
            """))
            
            # Insert originators
            conn.execute(text("""
                INSERT INTO originators (name, name_native, code, is_active, created_at)
                VALUES 
                ('Engineering Department', 'Инженерный отдел', 'ENG', true, now()),
                ('Architecture Department', 'Архитектурный отдел', 'ARCH', true, now()),
                ('Construction Department', 'Строительный отдел', 'CONST', true, now()),
                ('Client', 'Заказчик', 'CLIENT', true, now())
            """))
            
            # Insert review codes
            conn.execute(text("""
                INSERT INTO review_codes (code, name, name_native, description, is_active, created_at)
                VALUES 
                ('A', 'Approved', 'Утверждено', 'Документ утвержден без замечаний', true, now()),
                ('A*', 'Approved with Comments', 'Утверждено с замечаниями', 'Документ утвержден с замечаниями', true, now()),
                ('R', 'Rejected', 'Отклонено', 'Документ отклонен', true, now()),
                ('I', 'Information', 'К сведению', 'Документ для информации', true, now())
            """))
            
            # Insert languages
            conn.execute(text("""
                INSERT INTO languages (name, name_native, code, is_active, created_at)
                VALUES 
                ('English', 'Английский', 'EN', true, now()),
                ('Russian', 'Русский', 'RU', true, now()),
                ('German', 'Немецкий', 'DE', true, now()),
                ('French', 'Французский', 'FR', true, now())
            """))
            
            # Insert companies
            conn.execute(text("""
                INSERT INTO companies (name, name_native, code, role, is_active, created_at)
                VALUES 
                ('Main Contractor', 'Генеральный подрядчик', 'MAIN', 'Contractor', true, now()),
                ('Client Company', 'Компания заказчик', 'CLIENT', 'Client', true, now()),
                ('Design Company', 'Проектная компания', 'DESIGN', 'Designer', true, now())
            """))
            
            # Insert departments
            conn.execute(text("""
                INSERT INTO departments (name, name_native, code, is_active, created_at)
                VALUES 
                ('Engineering', 'Инженерия', 'ENG', true, now()),
                ('Architecture', 'Архитектура', 'ARCH', true, now()),
                ('Construction', 'Строительство', 'CONST', true, now()),
                ('Quality Control', 'Контроль качества', 'QC', true, now())
            """))
            
            # Insert user roles
            conn.execute(text("""
                INSERT INTO user_roles (name, name_native, description, permissions, is_active, created_at)
                VALUES 
                ('Document Controller', 'Контролер документов', 'Управление документами', 'documents:read,documents:write', true, now()),
                ('Engineer', 'Инженер', 'Техническая работа с документами', 'documents:read,documents:review', true, now()),
                ('Manager', 'Менеджер', 'Управление проектами', 'projects:read,projects:write,documents:approve', true, now()),
                ('Viewer', 'Наблюдатель', 'Просмотр документов', 'documents:read', true, now())
            """))
            
            # Commit transaction
            trans.commit()
            
        except Exception as e:
            trans.rollback()
            pass  # Ошибка без вывода
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    seed_references()
