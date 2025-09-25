#!/usr/bin/env python3
"""
Скрипт для заполнения базы данных EDMS тестовыми данными
"""

import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# Добавляем путь к приложению
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.document import Document, DocumentReview
from app.models.transmittal import Transmittal
from app.models.workflow import Workflow
from app.models.notification import Notification

# Настройка хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_database_connection():
    """Создает подключение к базе данных"""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

def populate_users(session):
    """Создает тестовых пользователей"""
    print("Создание пользователей...")
    
    users_data = [
        {
            "username": "admin",
            "email": "admin@edms.com",
            "full_name": "Администратор системы",
            "password": "admin123",
            "role": "admin",
            "is_active": True
        },
        {
            "username": "operator1",
            "email": "operator1@edms.com", 
            "full_name": "Иван Петров",
            "password": "operator123",
            "role": "operator",
            "is_active": True
        },
        {
            "username": "operator2",
            "email": "operator2@edms.com",
            "full_name": "Анна Сидорова",
            "password": "operator123", 
            "role": "operator",
            "is_active": True
        },
        {
            "username": "viewer1",
            "email": "viewer1@edms.com",
            "full_name": "Михаил Козлов",
            "password": "viewer123",
            "role": "viewer", 
            "is_active": True
        },
        {
            "username": "viewer2",
            "email": "viewer2@edms.com",
            "full_name": "Елена Волкова",
            "password": "viewer123",
            "role": "viewer",
            "is_active": True
        }
    ]
    
    for user_data in users_data:
        # Проверяем, существует ли пользователь
        existing_user = session.query(User).filter(User.username == user_data["username"]).first()
        if not existing_user:
            user = User(
                username=user_data["username"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                hashed_password=get_password_hash(user_data["password"]),
                role=user_data["role"],
                is_active=user_data["is_active"]
            )
            session.add(user)
            print(f"  Создан пользователь: {user_data['username']} ({user_data['role']})")
        else:
            print(f"  Пользователь уже существует: {user_data['username']}")
    
    session.commit()

def populate_projects(session):
    """Создает тестовые проекты"""
    print("Создание проектов...")
    
    projects_data = [
        {
            "name": "ЖК \"Солнечный\"",
            "description": "Строительство жилого комплекса в центре города",
            "project_code": "SOL-2024-001",
            "status": "active",
            "start_date": datetime(2024, 1, 15),
            "end_date": datetime(2025, 12, 31),
            "budget": 2500000000,
            "client": "ООО \"Солнечный дом\"",
            "manager_id": 2  # manager1
        },
        {
            "name": "Офисный центр \"Бизнес-Плаза\"",
            "description": "Строительство многофункционального офисного центра",
            "project_code": "BP-2024-002",
            "status": "active", 
            "start_date": datetime(2024, 3, 1),
            "end_date": datetime(2026, 6, 30),
            "budget": 1800000000,
            "client": "ЗАО \"Бизнес-Плаза\"",
            "manager_id": 2  # manager1
        },
        {
            "name": "Торговый центр \"Мега\"",
            "description": "Строительство крупного торгового центра",
            "project_code": "MEGA-2024-003",
            "status": "planning",
            "start_date": datetime(2024, 6, 1),
            "end_date": datetime(2027, 3, 31),
            "budget": 3200000000,
            "client": "ООО \"Мега-строй\"",
            "manager_id": 2  # manager1
        },
        {
            "name": "Школа №15",
            "description": "Строительство новой школы на 500 учеников",
            "project_code": "SCHOOL-2023-004",
            "status": "completed",
            "start_date": datetime(2023, 9, 1),
            "end_date": datetime(2024, 8, 31),
            "budget": 450000000,
            "client": "Департамент образования",
            "manager_id": 2  # manager1
        }
    ]
    
    created_projects = []
    for project_data in projects_data:
        # Проверяем, существует ли проект
        existing_project = session.query(Project).filter(Project.name == project_data["name"]).first()
        if not existing_project:
            project = Project(**project_data)
            session.add(project)
            session.flush()  # Получаем ID
            created_projects.append(project)
            print(f"  Создан проект: {project_data['name']} (ID: {project.id})")
        else:
            created_projects.append(existing_project)
            print(f"  Проект уже существует: {project_data['name']} (ID: {existing_project.id})")
    
    session.commit()
    return created_projects

def populate_project_members(session, projects):
    """Назначает участников проектам"""
    print("Назначение участников проектов...")
    
    # Получаем всех пользователей
    users = session.query(User).all()
    if len(users) < 2:
        print("  Недостаточно пользователей для назначения участников")
        return
    
    # Назначаем участников для каждого проекта
    for i, project in enumerate(projects):
        # Каждый проект получает разных участников
        # Проект 1: admin + operator1 + viewer1
        # Проект 2: admin + operator2 + viewer2
        # Проект 3: admin + operator1 + operator2
        # Проект 4: admin + viewer1 + viewer2
        
        if i == 0:  # Проект 1
            user_ids = [1, 6, 8]  # admin, operator1, viewer1
        elif i == 1:  # Проект 2
            user_ids = [1, 7, 9]  # admin, operator2, viewer2
        elif i == 2:  # Проект 3
            user_ids = [1, 6, 7]  # admin, operator1, operator2
        else:  # Проект 4
            user_ids = [1, 8, 9]  # admin, viewer1, viewer2
        
        for j, user_id in enumerate(user_ids):
            # Проверяем, что пользователь существует
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                continue
                
            # Определяем роль
            if user_id == 1:  # admin
                role = "manager"
            elif user.username.startswith("operator"):
                role = "operator"
            elif user.username.startswith("viewer"):
                role = "viewer"
            else:
                role = "member"
            
            # Проверяем, что участник еще не назначен
            existing_member = session.query(ProjectMember).filter(
                ProjectMember.project_id == project.id,
                ProjectMember.user_id == user_id
            ).first()
            
            if not existing_member:
                project_member = ProjectMember(
                    project_id=project.id,
                    user_id=user_id,
                    role=role
                )
                session.add(project_member)
                print(f"  Назначен участник: {user.username} ({role}) в проект {project.name}")
    
    session.commit()

def populate_documents(session, projects):
    """Создает тестовые документы"""
    print("Создание документов...")
    
    # Получаем ID проектов
    project_ids = {project.name: project.id for project in projects}
    
    documents_data = [
        {
            "title": "Архитектурный план - ЖК Солнечный",
            "description": "Основной архитектурный план жилого комплекса",
            "file_name": "arch_plan_solnechny.pdf",
            "file_size": 15728640,  # 15MB
            "file_type": "application/pdf",
            "version": "1.0",
            "status": "approved",
            "project_id": project_ids.get('ЖК "Солнечный"', 1),
            "uploaded_by": 3,  # engineer1
            "file_path": "/uploads/projects/1/arch_plan_solnechny_v1.0.pdf"
        },
        {
            "title": "Строительные чертежи - Блок А",
            "description": "Детальные строительные чертежи блока А",
            "file_name": "construction_drawings_block_a.dwg",
            "file_size": 25165824,  # 24MB
            "file_type": "application/dwg",
            "version": "2.1",
            "status": "review",
            "project_id": project_ids.get('ЖК "Солнечный"', 1),
            "uploaded_by": 3,  # engineer1
            "file_path": "/uploads/projects/1/construction_drawings_block_a_v2.1.dwg"
        },
        {
            "title": "Проект офисного центра - Фасады",
            "description": "Архитектурные решения фасадов офисного центра",
            "file_name": "facades_business_plaza.pdf",
            "file_size": 20971520,  # 20MB
            "file_type": "application/pdf",
            "version": "1.3",
            "status": "draft",
            "project_id": project_ids.get('Офисный центр "Бизнес-Плаза"', 2),
            "uploaded_by": 3,  # engineer1
            "file_path": "/uploads/projects/2/facades_business_plaza_v1.3.pdf"
        },
        {
            "title": "Инженерные коммуникации - ТЦ Мега",
            "description": "Проект инженерных коммуникаций торгового центра",
            "file_name": "engineering_mega_mall.pdf",
            "file_size": 31457280,  # 30MB
            "file_type": "application/pdf",
            "version": "1.0",
            "status": "review",
            "project_id": project_ids.get('Торговый центр "Мега"', 3),
            "uploaded_by": 3,  # engineer1
            "file_path": "/uploads/projects/3/engineering_mega_mall_v1.0.pdf"
        },
        {
            "title": "Генплан школы №15",
            "description": "Генеральный план территории школы",
            "file_name": "masterplan_school_15.pdf",
            "file_size": 12582912,  # 12MB
            "file_type": "application/pdf",
            "version": "1.0",
            "status": "approved",
            "project_id": project_ids.get('Школа №15', 4),
            "uploaded_by": 3,  # engineer1
            "file_path": "/uploads/projects/4/masterplan_school_15_v1.0.pdf"
        }
    ]
    
    for doc_data in documents_data:
        # Проверяем, существует ли документ
        existing_doc = session.query(Document).filter(
            Document.title == doc_data["title"],
            Document.project_id == doc_data["project_id"]
        ).first()
        if not existing_doc:
            document = Document(**doc_data)
            session.add(document)
            print(f"  Создан документ: {doc_data['title']}")
        else:
            print(f"  Документ уже существует: {doc_data['title']}")
    
    session.commit()

def populate_reviews(session, projects):
    """Создает тестовые ревью документов"""
    print("Создание ревью документов...")
    
    # Получаем ID проектов
    project_ids = {project.name: project.id for project in projects}
    
    # Получаем документы для создания ревью
    documents = session.query(Document).all()
    
    reviews_data = [
        {
            "document_id": documents[0].id if len(documents) > 0 else 1,
            "reviewer_id": 2,  # operator1
            "status": "completed",
            "comments": "Документ соответствует требованиям. Одобрен для использования.",
            "rating": 5
        },
        {
            "document_id": documents[1].id if len(documents) > 1 else 2,
            "reviewer_id": 3,  # operator2
            "status": "pending",
            "comments": "Требуются доработки в разделе 3.2",
            "rating": 3
        },
        {
            "document_id": documents[2].id if len(documents) > 2 else 3,
            "reviewer_id": 2,  # operator1
            "status": "completed",
            "comments": "Отличная работа! Все требования выполнены.",
            "rating": 5
        },
        {
            "document_id": documents[0].id if len(documents) > 0 else 1,
            "reviewer_id": 4,  # viewer1
            "status": "in_progress",
            "comments": "Изучаю документ...",
            "rating": 0
        },
        {
            "document_id": documents[3].id if len(documents) > 3 else 4,
            "reviewer_id": 3,  # operator2
            "status": "rejected",
            "comments": "Документ не соответствует стандартам. Требуется полная переработка.",
            "rating": 1
        }
    ]
    
    for review_data in reviews_data:
        # Проверяем, существует ли ревью
        existing_review = session.query(DocumentReview).filter(
            DocumentReview.document_id == review_data["document_id"],
            DocumentReview.reviewer_id == review_data["reviewer_id"]
        ).first()
        
        if not existing_review:
            review = DocumentReview(**review_data)
            session.add(review)
            print(f"  Создано ревью для документа {review_data['document_id']} от пользователя {review_data['reviewer_id']}")
        else:
            print(f"  Ревью уже существует для документа {review_data['document_id']} от пользователя {review_data['reviewer_id']}")
    
    session.commit()

def populate_transmittals(session, projects):
    """Создает тестовые трансмитталы"""
    print("Создание трансмитталов...")
    
    # Получаем ID проектов
    project_ids = {project.name: project.id for project in projects}
    
    transmittals_data = [
        {
            "transmittal_number": "TR-2024-001",
            "title": "Передача архитектурных планов",
            "description": "Передача утвержденных архитектурных планов заказчику",
            "project_id": project_ids.get('ЖК "Солнечный"', 1),
            "sender_id": 3,  # engineer1
            "recipient_id": 5,  # contractor1
            "status": "sent",
            "sent_date": datetime.now() - timedelta(days=5),
            "received_date": datetime.now() - timedelta(days=3)
        },
        {
            "transmittal_number": "TR-2024-002", 
            "title": "Передача строительных чертежей",
            "description": "Передача чертежей блока А для согласования",
            "project_id": project_ids.get('ЖК "Солнечный"', 1),
            "sender_id": 3,  # engineer1
            "recipient_id": 4,  # reviewer1
            "status": "sent",
            "sent_date": datetime.now() - timedelta(days=2),
            "received_date": None
        },
        {
            "transmittal_number": "TR-2024-003",
            "title": "Передача проекта фасадов",
            "description": "Передача проекта фасадов офисного центра",
            "project_id": project_ids.get('Офисный центр "Бизнес-Плаза"', 2),
            "sender_id": 3,  # engineer1
            "recipient_id": 2,  # manager1
            "status": "draft",
            "sent_date": None,
            "received_date": None
        },
        {
            "transmittal_number": "TR-2024-004",
            "title": "Передача инженерных решений",
            "description": "Передача проекта инженерных коммуникаций",
            "project_id": project_ids.get('Торговый центр "Мега"', 3),
            "sender_id": 3,  # engineer1
            "recipient_id": 4,  # reviewer1
            "status": "sent",
            "sent_date": datetime.now() - timedelta(days=1),
            "received_date": None
        }
    ]
    
    for transmittal_data in transmittals_data:
        # Проверяем, существует ли трансмиттал
        existing_transmittal = session.query(Transmittal).filter(
            Transmittal.transmittal_number == transmittal_data["transmittal_number"]
        ).first()
        if not existing_transmittal:
            transmittal = Transmittal(**transmittal_data)
            session.add(transmittal)
            print(f"  Создан трансмиттал: {transmittal_data['transmittal_number']}")
        else:
            print(f"  Трансмиттал уже существует: {transmittal_data['transmittal_number']}")
    
    session.commit()

def populate_workflows(session, projects):
    """Создает тестовые workflow"""
    print("Создание workflow...")
    
    # Получаем ID проектов
    project_ids = {project.name: project.id for project in projects}
    
    workflows_data = [
        {
            "name": "Согласование архитектурных решений",
            "description": "Процесс согласования архитектурных решений с заказчиком",
            "is_active": True,
            "project_id": project_ids.get('ЖК "Солнечный"', 1),
            "created_by": 2  # manager1
        },
        {
            "name": "Контроль качества документов",
            "description": "Процесс проверки качества проектной документации",
            "is_active": True,
            "project_id": project_ids.get('Офисный центр "Бизнес-Плаза"', 2),
            "created_by": 2  # manager1
        },
        {
            "name": "Утверждение проектов",
            "description": "Процесс утверждения проектов руководством",
            "is_active": False,
            "project_id": project_ids.get('Школа №15', 4),
            "created_by": 2  # manager1
        }
    ]
    
    for workflow_data in workflows_data:
        # Проверяем, существует ли workflow
        existing_workflow = session.query(Workflow).filter(
            Workflow.name == workflow_data["name"],
            Workflow.project_id == workflow_data["project_id"]
        ).first()
        if not existing_workflow:
            workflow = Workflow(**workflow_data)
            session.add(workflow)
            print(f"  Создан workflow: {workflow_data['name']}")
        else:
            print(f"  Workflow уже существует: {workflow_data['name']}")
    
    session.commit()

def populate_notifications(session):
    """Создает тестовые уведомления"""
    print("Создание уведомлений...")
    
    notifications_data = [
        {
            "title": "Новый документ требует ревью",
            "message": "Документ 'Строительные чертежи - Блок А' ожидает вашего ревью",
            "type": "review_request",
            "user_id": 4,  # reviewer1
            "is_read": False,
            "related_entity_type": "document",
            "related_entity_id": 2
        },
        {
            "title": "Трансмиттал отправлен",
            "message": "Трансмиттал TR-2024-001 успешно отправлен заказчику",
            "type": "transmittal_sent",
            "user_id": 3,  # engineer1
            "is_read": True,
            "related_entity_type": "transmittal",
            "related_entity_id": 1
        },
        {
            "title": "Проект завершен",
            "message": "Проект 'Школа №15' успешно завершен",
            "type": "project_completed",
            "user_id": 2,  # manager1
            "is_read": False,
            "related_entity_type": "project",
            "related_entity_id": 4
        }
    ]
    
    for notification_data in notifications_data:
        notification = Notification(**notification_data)
        session.add(notification)
        print(f"  Создано уведомление: {notification_data['title']}")
    
    session.commit()

def main():
    """Основная функция"""
    print("=== Заполнение базы данных EDMS тестовыми данными ===")
    
    try:
        # Создаем подключение к БД
        session = create_database_connection()
        
        # Заполняем таблицы
        populate_users(session)
        projects = populate_projects(session)
        populate_project_members(session, projects)
        populate_documents(session, projects)
        populate_reviews(session, projects)
        populate_transmittals(session, projects)
        populate_workflows(session, projects)
        populate_notifications(session)
        
        print("\n✅ База данных успешно заполнена тестовыми данными!")
        print("\nСозданные данные:")
        print("- 5 пользователей (admin, operator1, operator2, viewer1, viewer2)")
        print("- 4 проекта (ЖК Солнечный, Бизнес-Плаза, ТЦ Мега, Школа №15)")
        print("- 5 документов")
        print("- 5 ревью документов")
        print("- 4 трансмиттала")
        print("- 3 workflow")
        print("- 3 уведомления")
        
    except Exception as e:
        print(f"❌ Ошибка при заполнении базы данных: {e}")
        return 1
    
    finally:
        session.close()
    
    return 0

if __name__ == "__main__":
    exit(main())
