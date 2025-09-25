"""
EDMS - Electronic Document Management System
FastAPI Application Entry Point
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

from app.core.config import settings
from app.api.v1.api import api_router

# Создание директории для загрузок
upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(exist_ok=True)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Electronic Document Management System like Aconex",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение статических файлов
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Подключение API роутеров
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "message": "EDMS API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Проверка здоровья приложения"""
    return {"status": "healthy", "version": settings.APP_VERSION}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
