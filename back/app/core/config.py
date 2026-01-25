"""
Configuration settings for EDMS application
"""

import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

# Определяем путь к .env файлу относительно файла config.py
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # back/
ENV_FILE = BASE_DIR / ".env"

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "EDMS"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = bool(int(os.getenv('DEBUG', '1')))
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv('DATABASE_URL', '')
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = os.getenv('ALGORITHM', "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '30'))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv('REFRESH_TOKEN_EXPIRE_DAYS', '14'))
    
    # File Upload
    UPLOAD_DIR: str = os.getenv('UPLOAD_DIR', "uploads")
    MAX_FILE_SIZE: int = int(os.getenv('MAX_FILE_SIZE', str(50 * 1024 * 1024)))  # 50MB
    ALLOWED_FILE_TYPES: str = os.getenv('ALLOWED_FILE_TYPES', "pdf,doc,docx,xls,xlsx,ppt,pptx,txt,jpg,jpeg,png,gif,dwg,dxf,step,stp,iges,igs,stl,obj,3ds,fbx,skp")
    
    # MinIO/S3 Storage
    MINIO_ENDPOINT: str = os.getenv('MINIO_ENDPOINT', '')
    MINIO_ACCESS_KEY: str = os.getenv('MINIO_ACCESS_KEY', '')
    MINIO_SECRET_KEY: str = os.getenv('MINIO_SECRET_KEY', '')
    MINIO_BUCKET: str = os.getenv('MINIO_BUCKET', '')
    USE_MINIO: bool = os.getenv('USE_MINIO', 'false').lower() == 'true'
    
    # Telegram Bot
    TELEGRAM_BOT_TOKEN: str = os.getenv('TELEGRAM_BOT_TOKEN', '')
    TELEGRAM_ADMIN_CHAT_ID: str = os.getenv('TELEGRAM_ADMIN_CHAT_ID', '')
    TELEGRAM_WEBHOOK_SECRET: str = os.getenv('TELEGRAM_WEBHOOK_SECRET', '')
    
    # Autodesk Platform Services (APS)
    AUTODESK_CLIENT_ID: str = os.getenv('AUTODESK_CLIENT_ID', '')
    AUTODESK_CLIENT_SECRET: str = os.getenv('AUTODESK_CLIENT_SECRET', '')
    AUTODESK_BUCKET_KEY: str = os.getenv('AUTODESK_BUCKET_KEY', 'edms-bucket')
    
    # Email/SMTP Settings
    SMTP_HOST: str = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    SMTP_PORT: int = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USER: str = os.getenv('SMTP_USER', '')
    SMTP_PASSWORD: str = os.getenv('SMTP_PASSWORD', '')
    SMTP_FROM_EMAIL: str = os.getenv('SMTP_FROM_EMAIL', '')
    SMTP_FROM_NAME: str = os.getenv('SMTP_FROM_NAME', 'Docste')
    SMTP_USE_TLS: bool = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [origin.strip() for origin in os.getenv(
        'BACKEND_CORS_ORIGINS',
        'http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,http://194.32.142.92:5173'
    ).split(',') if origin.strip()]
    
    class Config:
        env_file = str(ENV_FILE) if ENV_FILE.exists() else ".env"
        case_sensitive = True
        env_file_encoding = 'utf-8'
        extra = 'ignore'  # Игнорировать дополнительные поля

settings = Settings()
