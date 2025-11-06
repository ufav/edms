"""
EDMS - Electronic Document Management System
FastAPI Application Entry Point
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
import os
from pathlib import Path

from app.core.config import settings
from fastapi_pagination import add_pagination
from app.api.v1.api import api_router
from app.admin import init_admin

# Создание директории для загрузок
upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(exist_ok=True)


class ProxyHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware для корректной обработки HTTPS за прокси"""
    async def dispatch(self, request: StarletteRequest, call_next):
        # Исправляем scheme на основе X-Forwarded-Proto
        if request.headers.get("x-forwarded-proto") == "https":
            request.scope["scheme"] = "https"
        response = await call_next(request)
        return response


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Electronic Document Management System like Aconex",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.router.redirect_slashes = False

# Добавляем middleware для обработки заголовков прокси ПЕРВЫМ
app.add_middleware(ProxyHeadersMiddleware)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение статических файлов
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Подключение API роутеров
app.include_router(api_router, prefix=settings.API_V1_STR)

# Enable pagination for the whole app
add_pagination(app)

# Admin panel (sqladmin)
init_admin(app)

# Redirect helper for trailing slash to support both /admin and /admin/
@app.get("/admin")
async def admin_no_slash():
    return RedirectResponse(url="/admin/")

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
