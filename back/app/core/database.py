"""
Database configuration and session management
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from urllib.parse import quote_plus

def _build_database_url() -> str:
    """Возвращает корректный DATABASE_URL. Если переменная окружения не задана,
    собирает строку подключения из компонентов с URL-экранированием логина и пароля.
    """
    if getattr(settings, 'DATABASE_URL', None):
        return settings.DATABASE_URL

    username = quote_plus(str(getattr(settings, 'DB_USER', '')))
    password = quote_plus(str(getattr(settings, 'DB_PASSWORD', '')))
    host = getattr(settings, 'DB_HOST', None) or ('localhost' if settings.DEBUG else 'localhost')
    port = getattr(settings, 'DB_PORT', 5432)
    name = getattr(settings, 'DB_NAME', None)

    auth_part = ''
    if username or password:
        auth_part = f"{username}:{password}@"

    return f"postgresql+psycopg2://{auth_part}{host}:{port}/{name}"


database_url = _build_database_url()

# Создание движка базы данных
engine = create_engine(
    database_url,
    pool_pre_ping=True,
    echo=False  # Отключаем логирование SQL-запросов
)

# Создание фабрики сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для моделей
Base = declarative_base()

def get_db():
    """Dependency для получения сессии базы данных"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
