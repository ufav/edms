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
import logging
from pathlib import Path

from app.core.config import settings
from fastapi_pagination import add_pagination
from app.api.v1.api import api_router
from app.admin import init_admin
import asyncio
import threading
from contextlib import asynccontextmanager

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


def run_scheduler():
    """Запускает планировщик отправки писем в отдельном потоке"""
    import time
    from app.services.review_email_scheduler import process_scheduled_emails
    from app.core.database import SessionLocal
    
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    logger.info("Review email scheduler started")
    print("Review email scheduler started")  # Дублируем в stdout для отладки
    
    while True:
        try:
            # Создаем новую сессию БД для каждого запуска
            db = SessionLocal()
            try:
                logger.info("Running scheduled email check...")
                print("Running scheduled email check...")
                process_scheduled_emails(db)
            except Exception as e:
                logger.error(f"Error in scheduled email processing: {e}", exc_info=True)
                print(f"Error in scheduled email processing: {e}")
            finally:
                db.close()
            
            # Ждем 60 секунд перед следующей проверкой
            time.sleep(60)
        except Exception as e:
            logger.error(f"Fatal error in scheduler thread: {e}", exc_info=True)
            print(f"Fatal error in scheduler thread: {e}")
            time.sleep(60)  # Ждем перед повторной попыткой


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения"""
    # Startup
    logger = logging.getLogger(__name__)
    # Настраиваем уровень логирования для этого модуля
    logger.setLevel(logging.INFO)
    logger.info("Starting application...")
    print("Starting application...")  # Дублируем в stdout для отладки
    
    # Запускаем планировщик в отдельном потоке
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    logger.info("Review email scheduler thread started")
    print("Review email scheduler thread started")  # Дублируем в stdout для отладки
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    print("Shutting down application...")  # Дублируем в stdout для отладки


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Electronic Document Management System like Aconex",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
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

from sqlalchemy.orm import Session
from fastapi import Depends
from app.core.database import get_db
from app.models.download_link import DownloadLink

@app.get("/{token}")
async def download_short_link(
    token: str,
    db: Session = Depends(get_db)
):
    """Short link redirect"""
    if token == "favicon.ico":
        raise HTTPException(status_code=404)
        
    # Check if token exists
    link = db.query(DownloadLink).filter(DownloadLink.token == token).first()
    if link:
        return RedirectResponse(url=f"{settings.API_V1_STR}/download/{token}")
    
    # If not a link, might be 404
    raise HTTPException(status_code=404, detail="Page not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
