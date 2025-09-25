#!/usr/bin/env python3
"""
Скрипт для создания таблиц базы данных EDMS
Запуск: python create_tables.py
"""

import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Параметры подключения к БД
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'edms',
    'user': 'postgres',
    'password': '123'
}

def create_tables():
    """Создание всех таблиц для EDMS системы"""
    
    # SQL скрипты для создания таблиц
    tables_sql = {
        'users': """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        
        'projects': """
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                project_code VARCHAR(50) UNIQUE NOT NULL,
                status VARCHAR(20) DEFAULT 'active',
                start_date DATE,
                end_date DATE,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        
        'project_members': """
            CREATE TABLE IF NOT EXISTS project_members (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(50) NOT NULL,
                permissions JSONB DEFAULT '{}',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, user_id)
            );
        """,
        
        'documents': """
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                title VARCHAR(300) NOT NULL,
                description TEXT,
                file_path VARCHAR(500),
                file_name VARCHAR(255),
                file_size BIGINT,
                file_type VARCHAR(100),
                version VARCHAR(20) DEFAULT '1.0',
                status VARCHAR(20) DEFAULT 'draft',
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                uploaded_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        
        'document_versions': """
            CREATE TABLE IF NOT EXISTS document_versions (
                id SERIAL PRIMARY KEY,
                document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
                version VARCHAR(20) NOT NULL,
                file_path VARCHAR(500),
                file_name VARCHAR(255),
                file_size BIGINT,
                file_type VARCHAR(100),
                change_description TEXT,
                uploaded_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(document_id, version)
            );
        """,
        
        'document_reviews': """
            CREATE TABLE IF NOT EXISTS document_reviews (
                id SERIAL PRIMARY KEY,
                document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
                reviewer_id INTEGER REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'pending',
                comments TEXT,
                review_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        
        'document_approvals': """
            CREATE TABLE IF NOT EXISTS document_approvals (
                id SERIAL PRIMARY KEY,
                document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
                approver_id INTEGER REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'pending',
                comments TEXT,
                approval_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        
        'transmittals': """
            CREATE TABLE IF NOT EXISTS transmittals (
                id SERIAL PRIMARY KEY,
                transmittal_number VARCHAR(100) UNIQUE NOT NULL,
                title VARCHAR(300) NOT NULL,
                description TEXT,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                sender_id INTEGER REFERENCES users(id),
                recipient_id INTEGER REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'draft',
                sent_date TIMESTAMP,
                received_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        
        'transmittal_items': """
            CREATE TABLE IF NOT EXISTS transmittal_items (
                id SERIAL PRIMARY KEY,
                transmittal_id INTEGER REFERENCES transmittals(id) ON DELETE CASCADE,
                document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
                item_number VARCHAR(50),
                description TEXT,
                action_required VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        
        'workflows': """
            CREATE TABLE IF NOT EXISTS workflows (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                is_active BOOLEAN DEFAULT TRUE,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        
        'workflow_steps': """
            CREATE TABLE IF NOT EXISTS workflow_steps (
                id SERIAL PRIMARY KEY,
                workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
                step_name VARCHAR(200) NOT NULL,
                step_order INTEGER NOT NULL,
                assigned_to INTEGER REFERENCES users(id),
                step_type VARCHAR(50) NOT NULL,
                is_required BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        
        'workflow_instances': """
            CREATE TABLE IF NOT EXISTS workflow_instances (
                id SERIAL PRIMARY KEY,
                workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
                document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
                current_step INTEGER REFERENCES workflow_steps(id),
                status VARCHAR(20) DEFAULT 'active',
                started_by INTEGER REFERENCES users(id),
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            );
        """,
        
        'workflow_step_logs': """
            CREATE TABLE IF NOT EXISTS workflow_step_logs (
                id SERIAL PRIMARY KEY,
                workflow_instance_id INTEGER REFERENCES workflow_instances(id) ON DELETE CASCADE,
                step_id INTEGER REFERENCES workflow_steps(id),
                action VARCHAR(50) NOT NULL,
                comments TEXT,
                performed_by INTEGER REFERENCES users(id),
                performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        
        'notifications': """
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                related_entity_type VARCHAR(50),
                related_entity_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        
        'audit_logs': """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id INTEGER NOT NULL,
                old_values JSONB,
                new_values JSONB,
                ip_address INET,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """
    }
    
    # Индексы для оптимизации
    indexes_sql = [
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
        "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);",
        "CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);",
        "CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);",
        "CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);",
        "CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON document_versions(document_id);",
        "CREATE INDEX IF NOT EXISTS idx_transmittals_project ON transmittals(project_id);",
        "CREATE INDEX IF NOT EXISTS idx_transmittals_number ON transmittals(transmittal_number);",
        "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);"
    ]
    
    try:
        # Подключение к базе данных
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("Подключение к базе данных установлено успешно!")
        
        # Создание таблиц
        print("\nСоздание таблиц...")
        for table_name, sql_script in tables_sql.items():
            print(f"Создание таблицы: {table_name}")
            cursor.execute(sql_script)
        
        # Создание индексов
        print("\nСоздание индексов...")
        for index_sql in indexes_sql:
            cursor.execute(index_sql)
        
        # Коммит изменений
        conn.commit()
        print("\n✅ Все таблицы и индексы созданы успешно!")
        
        # Вывод информации о созданных таблицах
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f"\n📋 Создано таблиц: {len(tables)}")
        for table in tables:
            print(f"  - {table[0]}")
            
    except psycopg2.Error as e:
        print(f"❌ Ошибка при создании таблиц: {e}")
        if conn:
            conn.rollback()
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("\n🔌 Соединение с базой данных закрыто.")

if __name__ == "__main__":
    print("🚀 Запуск создания таблиц для EDMS системы...")
    print("=" * 50)
    create_tables()
    print("=" * 50)
    print("✨ Готово!")
