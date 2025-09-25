"""
API v1 router configuration
"""

from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, projects, documents, transmittals, reviews

api_router = APIRouter()

# Подключение всех эндпоинтов
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(transmittals.router, prefix="/transmittals", tags=["transmittals"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
