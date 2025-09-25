"""
Documents endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import os
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.document import Document
from app.services.auth import get_current_active_user

router = APIRouter()

class DocumentCreate(BaseModel):
    title: str
    description: str = None
    project_id: int

class DocumentUpdate(BaseModel):
    title: str = None
    description: str = None
    status: str = None

@router.get("/", response_model=List[dict])
async def get_documents(
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка документов"""
    query = db.query(Document)
    
    if project_id:
        query = query.filter(Document.project_id == project_id)
    
    documents = query.offset(skip).limit(limit).all()
    
    return [
        {
            "id": doc.id,
            "title": doc.title,
            "description": doc.description,
            "file_name": doc.file_name,
            "file_size": doc.file_size,
            "file_type": doc.file_type,
            "version": doc.version,
            "status": doc.status,
            "project_id": doc.project_id,
            "created_at": doc.created_at
        }
        for doc in documents
    ]

@router.post("/upload", response_model=dict)
async def upload_document(
    file: UploadFile = File(...),
    title: str = None,
    description: str = None,
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Загрузка документа"""
    
    # Проверяем размер файла
    if file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой")
    
    # Проверяем тип файла
    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    if file_extension not in settings.ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=400, detail="Неподдерживаемый тип файла")
    
    # Генерируем уникальное имя файла
    file_uuid = str(uuid.uuid4())
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
    new_filename = f"{file_uuid}.{file_extension}"
    
    # Сохраняем файл
    file_path = os.path.join(settings.UPLOAD_DIR, new_filename)
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Создаем запись в базе данных
    db_document = Document(
        title=title or file.filename,
        description=description,
        file_path=file_path,
        file_name=file.filename,
        file_size=file.size,
        file_type=file.content_type,
        project_id=project_id,
        uploaded_by=current_user.id
    )
    
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    return {
        "id": db_document.id,
        "title": db_document.title,
        "file_name": db_document.file_name,
        "file_size": db_document.file_size,
        "file_type": db_document.file_type,
        "version": db_document.version,
        "status": db_document.status,
        "created_at": db_document.created_at
    }

@router.get("/{document_id}", response_model=dict)
async def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение документа по ID"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    return {
        "id": document.id,
        "title": document.title,
        "description": document.description,
        "file_name": document.file_name,
        "file_size": document.file_size,
        "file_type": document.file_type,
        "version": document.version,
        "status": document.status,
        "project_id": document.project_id,
        "created_at": document.created_at
    }
