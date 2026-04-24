"""
API endpoints for Autodesk Platform Services integration
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.services.auth import get_current_active_user
from app.models.user import User
from app.models.document import Document, DocumentRevision, File as FileModel
from app.models.document_markup import DocumentMarkup
from app.services.autodesk_service import autodesk_service
from app.services.minio_service import minio_service
from app.core.config import settings
import os


router = APIRouter()


class ViewerTokenResponse(BaseModel):
    access_token: str
    expires_in: int


class TranslationStatusResponse(BaseModel):
    status: str
    progress: str
    urn: str


class MarkupPayload(BaseModel):
    markup_data: str


class MarkupResponse(BaseModel):
    markup_data: Optional[str] = None
    updated_at: Optional[str] = None


@router.get("/viewer/token", response_model=ViewerTokenResponse)
async def get_viewer_token(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить токен для Autodesk Viewer"""
    try:
        token = autodesk_service.get_viewer_token()
        return {
            "access_token": token,
            "expires_in": 3600  # 1 час
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка получения токена Autodesk: {str(e)}"
        )


def _get_document_with_access(
    db: Session,
    document_id: int,
    current_user: User
) -> Document:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")

    from app.models.project import ProjectMember
    project_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == document.project_id,
        ProjectMember.user_id == current_user.id
    ).first()

    if not current_user.is_admin and not project_member:
        raise HTTPException(status_code=403, detail="Нет прав доступа к документу")

    return document


@router.post("/documents/{document_id}/revisions/{revision_id}/viewer/prepare")
async def prepare_file_for_viewer(
    document_id: int,
    revision_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Подготовить файл для просмотра в Autodesk Viewer
    Загружает файл в Autodesk OSS и запускает перевод
    """
    # Проверяем существование документа и ревизии
    document = _get_document_with_access(db, document_id, current_user)
    
    revision = db.query(DocumentRevision).filter(
        DocumentRevision.id == revision_id,
        DocumentRevision.document_id == document_id,
        DocumentRevision.is_deleted == 0
    ).first()
    
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Получаем файл ревизии
    revision_file = db.query(FileModel).filter(
        FileModel.revision_id == revision.id,
        FileModel.is_deleted == 0
    ).first()
    
    if not revision_file:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    # Проверяем, что файл - это DWG или DXF
    file_ext = revision_file.file_name.lower().split('.')[-1] if '.' in revision_file.file_name else ''
    if file_ext not in ['dwg', 'dxf']:
        raise HTTPException(
            status_code=400,
            detail=f"Файл типа .{file_ext} не поддерживается для просмотра. Поддерживаются только .dwg и .dxf"
        )
    
    try:
        # Получаем содержимое файла
        if settings.USE_MINIO:
            file_content = await minio_service.download_file(revision_file.file_path)
        else:
            if not os.path.exists(revision_file.file_path):
                raise HTTPException(status_code=404, detail="Файл не найден на диске")
            with open(revision_file.file_path, 'rb') as f:
                file_content = f.read()
        
        if not file_content:
            raise HTTPException(status_code=404, detail="Не удалось загрузить файл")
        
        # Создаем уникальное имя объекта в Autodesk OSS
        object_name = f"doc_{document_id}_rev_{revision_id}_{revision_file.file_name}"
        
        # Загружаем файл в Autodesk OSS
        upload_result = autodesk_service.upload_file(file_content, object_name)
        object_id = upload_result['object_id']
        
        # Запускаем перевод файла
        urn = autodesk_service.translate_file(object_id, revision_file.file_name)
        
        return {
            "urn": urn,
            "object_id": object_id,
            "status": "translating",
            "message": "Файл загружен и перевод запущен"
        }
    
    except ValueError as e:
        if "not configured" in str(e):
            raise HTTPException(
                status_code=503,
                detail="Autodesk Platform Services не настроен. Обратитесь к администратору."
            )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка подготовки файла для просмотра: {str(e)}"
        )


@router.get("/documents/{document_id}/revisions/{revision_id}/viewer/status")
async def get_viewer_status(
    document_id: int,
    revision_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Получить статус перевода файла для просмотра"""
    # Проверяем существование документа и ревизии
    document = _get_document_with_access(db, document_id, current_user)
    
    revision = db.query(DocumentRevision).filter(
        DocumentRevision.id == revision_id,
        DocumentRevision.document_id == document_id,
        DocumentRevision.is_deleted == 0
    ).first()
    
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Получаем файл ревизии
    revision_file = db.query(FileModel).filter(
        FileModel.revision_id == revision.id,
        FileModel.is_deleted == 0
    ).first()
    
    if not revision_file:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    try:
        # Здесь нужно получить URN из предыдущего запроса prepare
        # Для упрощения, мы можем хранить URN в базе данных или кэше
        # Пока что возвращаем базовый статус
        # В реальной реализации нужно сохранять URN после prepare
        
        return {
            "status": "unknown",
            "message": "Статус перевода недоступен. Необходимо сначала подготовить файл."
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка получения статуса: {str(e)}"
        )


@router.get("/documents/{document_id}/revisions/{revision_id}/markups", response_model=MarkupResponse)
async def get_revision_markups(
    document_id: int,
    revision_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    _get_document_with_access(db, document_id, current_user)

    revision = db.query(DocumentRevision).filter(
        DocumentRevision.id == revision_id,
        DocumentRevision.document_id == document_id,
        DocumentRevision.is_deleted == 0
    ).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")

    # Маркапы общие на ревизию — один набор, виден всем участникам проекта.
    markup = db.query(DocumentMarkup).filter(
        DocumentMarkup.revision_id == revision_id
    ).first()
    if not markup:
        return {"markup_data": None, "updated_at": None}

    return {
        "markup_data": markup.markup_data,
        "updated_at": markup.updated_at.isoformat() if markup.updated_at else None
    }


@router.put("/documents/{document_id}/revisions/{revision_id}/markups", response_model=MarkupResponse)
async def save_revision_markups(
    document_id: int,
    revision_id: int,
    payload: MarkupPayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    _get_document_with_access(db, document_id, current_user)

    revision = db.query(DocumentRevision).filter(
        DocumentRevision.id == revision_id,
        DocumentRevision.document_id == document_id,
        DocumentRevision.is_deleted == 0
    ).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")

    if not payload.markup_data.strip():
        raise HTTPException(status_code=400, detail="markup_data не может быть пустым")

    # Upsert по ревизии — один общий маркап-набор на ревизию.
    markup = db.query(DocumentMarkup).filter(
        DocumentMarkup.revision_id == revision_id
    ).first()

    if markup:
        markup.markup_data = payload.markup_data
        markup.last_modified_by_id = current_user.id
    else:
        markup = DocumentMarkup(
            document_id=document_id,
            revision_id=revision_id,
            last_modified_by_id=current_user.id,
            markup_data=payload.markup_data
        )
        db.add(markup)

    db.commit()
    db.refresh(markup)
    return {
        "markup_data": markup.markup_data,
        "updated_at": markup.updated_at.isoformat() if markup.updated_at else None
    }
