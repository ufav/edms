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
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [origin.strip() for origin in os.getenv(
        'BACKEND_CORS_ORIGINS',
        'http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,http://194.32.142.92:5173'
    ).split(',') if origin.strip()]
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        env_file_encoding = 'utf-8'
        extra = 'ignore'  # Игнорировать дополнительные поля

settings = Settings()
