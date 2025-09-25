"""
Configuration settings for EDMS application
"""

import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "EDMS"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:123@localhost:5432/edms"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "edms"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "123"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10485760  # 10MB
    ALLOWED_FILE_TYPES: str = "pdf,doc,docx,xls,xlsx,ppt,pptx,txt,jpg,jpeg,png,gif"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        env_file_encoding = 'utf-8'
        extra = 'ignore'  # Игнорировать дополнительные поля

settings = Settings()
