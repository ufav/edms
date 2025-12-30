from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Получаем URL базы данных из переменных окружения или настроек
def get_database_url():
    """Получает URL базы данных из переменных окружения или настроек"""
    # Сначала проверяем переменную окружения
    url = os.getenv('ALEMBIC_DB_URL') or os.getenv('DATABASE_URL')
    if url:
        return url
    
    # Если нет переменной окружения, пытаемся получить из настроек приложения
    try:
        from app.core.config import settings
        if settings.DATABASE_URL:
            return settings.DATABASE_URL
        # Собираем URL из компонентов
        return f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    except Exception:
        # Если не получилось, используем значение по умолчанию
        return "postgresql://postgres:123@localhost:5432/edms"

from app.core.database import Base
from app.models.user import User
from app.models.project import Project
from app.models.document import Document
from app.models.document_workflow_history import DocumentWorkflowHistory
from app.models.transmittal import Transmittal
from app.models.workflow import WorkflowTemplate, WorkflowStep, DocumentWorkflow, DocumentApproval, DocumentHistory
from app.models.notification import Notification
from app.models.references import (
    RevisionStatus, RevisionDescription, RevisionStep, Originator, ReviewCode,
    Language, Department, Company, UserRole
)
# from app.models.document_v2 import UniqueDocument, DocumentRevision, UploadedFile, TransmittalRevision
from app.models.discipline import Discipline, DocumentType
from app.models.user_settings import UserSettings
from app.models.support import SupportTicket, SupportMessage, SupportTicketFile

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Используем URL из настроек приложения
    database_url = get_database_url()
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = database_url
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
