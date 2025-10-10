"""
API v1 router configuration
"""

from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, projects, documents, transmittals, reviews, disciplines, user_settings, references, workflow_presets, workflow_rule_application, project_participants, contacts, company_roles, roles, document_comments

api_router = APIRouter()

# Подключение всех эндпоинтов
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(transmittals.router, prefix="/transmittals", tags=["transmittals"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
api_router.include_router(disciplines.router, prefix="/disciplines", tags=["disciplines"])
api_router.include_router(user_settings.router, prefix="/user", tags=["user-settings"])
api_router.include_router(references.router, prefix="/references", tags=["references"])
api_router.include_router(workflow_presets.router, prefix="/workflow-presets", tags=["workflow-presets"])
api_router.include_router(workflow_rule_application.router, prefix="/workflow-rules", tags=["workflow-rules"])
api_router.include_router(project_participants.router, prefix="", tags=["project-participants"])
api_router.include_router(contacts.router, prefix="", tags=["contacts"])
api_router.include_router(company_roles.router, prefix="", tags=["company-roles"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(document_comments.router, prefix="", tags=["document-comments"])
