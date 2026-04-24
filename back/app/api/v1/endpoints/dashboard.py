"""
Dashboard API endpoints for statistics and charts
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional, List, Dict
from datetime import datetime

from app.core.database import get_db
from app.models.document import Document, DocumentRevision
from app.models.project import Project
from app.models.references import WorkflowStatus
from app.models.discipline import DocumentType
from app.services.auth import get_current_active_user
from app.models.user import User
from datetime import timedelta

router = APIRouter()


@router.get("/workflow-status-distribution")
async def get_workflow_status_distribution(
    project_id: Optional[int] = Query(None, description="ID проекта"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получить распределение документов по статусам workflow для дашборда.
    Возвращает количество документов в каждом статусе.
    
    Returns:
        List[Dict]: Список словарей с полями:
            - status: название статуса (str)
            - status_id: ID статуса (int)
            - count: количество документов (int)
    """
    # Создаем подзапрос для получения последней ревизии каждого документа
    latest_revision_subquery = db.query(
        DocumentRevision.document_id,
        func.max(DocumentRevision.created_at).label('max_created_at')
    ).filter(
        DocumentRevision.is_deleted == 0
    ).group_by(DocumentRevision.document_id).subquery()
    
    # Основной запрос: получаем последние ревизии документов с их статусами
    query = db.query(
        WorkflowStatus.name.label('status_name'),
        WorkflowStatus.id.label('status_id'),
        func.count(Document.id).label('count')
    ).join(
        latest_revision_subquery,
        Document.id == latest_revision_subquery.c.document_id
    ).join(
        DocumentRevision,
        and_(
            DocumentRevision.document_id == Document.id,
            DocumentRevision.created_at == latest_revision_subquery.c.max_created_at,
            DocumentRevision.is_deleted == 0
        )
    ).join(
        WorkflowStatus,
        WorkflowStatus.id == DocumentRevision.workflow_status_id
    ).join(
        Project,
        Project.id == Document.project_id
    ).filter(
        Document.is_deleted == 0
    )
    
    # Фильтр по проекту, если указан
    if project_id:
        query = query.filter(Project.id == project_id)
    
    # Группируем по статусам
    query = query.group_by(WorkflowStatus.id, WorkflowStatus.name)
    
    # Выполняем запрос
    results = query.all()
    
    # Формируем результат
    distribution = [
        {
            "status": row.status_name,
            "status_id": row.status_id,
            "count": row.count
        }
        for row in results
    ]
    
    # Сортируем по количеству документов (по убыванию)
    distribution.sort(key=lambda x: x["count"], reverse=True)
    
    return distribution


@router.get("/document-creation-timeline")
async def get_document_creation_timeline(
    project_id: Optional[int] = Query(None, description="ID проекта"),
    period: str = Query("30d", description="Период: 7d, 30d, 90d, all"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получить динамику создания документов по времени для дашборда.
    Возвращает количество созданных документов по дням/неделям/месяцам.
    
    Args:
        project_id: ID проекта (опционально)
        period: Период для анализа (7d, 30d, 90d, all)
    
    Returns:
        List[Dict]: Список словарей с полями:
            - date: дата (str в формате YYYY-MM-DD)
            - count: количество документов (int)
    """
    # Определяем начальную дату в зависимости от периода
    now = datetime.utcnow()
    if period == "7d":
        start_date = now - timedelta(days=7)
        date_format = "%Y-%m-%d"
        date_trunc = func.date(Document.created_at)
    elif period == "30d":
        start_date = now - timedelta(days=30)
        date_format = "%Y-%m-%d"
        date_trunc = func.date(Document.created_at)
    elif period == "90d":
        start_date = now - timedelta(days=90)
        date_format = "%Y-%m-%d"
        date_trunc = func.date(Document.created_at)
    else:  # all
        start_date = None
        date_format = "%Y-%m-%d"
        date_trunc = func.date(Document.created_at)
    
    # Базовый запрос
    query = db.query(
        date_trunc.label('date'),
        func.count(Document.id).label('count')
    ).join(
        Project,
        Project.id == Document.project_id
    ).filter(
        Document.is_deleted == 0
    )
    
    # Фильтр по проекту
    if project_id:
        query = query.filter(Project.id == project_id)
    
    # Фильтр по дате, если указан период
    if start_date:
        query = query.filter(Document.created_at >= start_date)
    
    # Группируем по дате
    query = query.group_by(date_trunc).order_by(date_trunc)
    
    # Выполняем запрос
    results = query.all()
    
    # Формируем результат
    timeline = []
    for row in results:
        if row.date:
            # Преобразуем дату в строку
            if isinstance(row.date, str):
                date_str = row.date
            else:
                date_str = row.date.strftime(date_format)
            
            timeline.append({
                "date": date_str,
                "count": row.count
            })
    
    return timeline


@router.get("/document-type-distribution")
async def get_document_type_distribution(
    project_id: Optional[int] = Query(None, description="ID проекта"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получить распределение документов по типам для дашборда.
    Возвращает количество документов каждого типа.
    
    Args:
        project_id: ID проекта (опционально)
    
    Returns:
        List[Dict]: Список словарей с полями:
            - type_id: ID типа документа (int)
            - type_name: название типа документа (str)
            - type_name_native: название типа на родном языке (str)
            - count: количество документов (int)
    """
    # Базовый запрос: получаем документы с их типами
    query = db.query(
        DocumentType.id.label('type_id'),
        DocumentType.name.label('type_name'),
        DocumentType.name_en.label('type_name_en'),
        func.count(Document.id).label('count')
    ).outerjoin(
        DocumentType,
        DocumentType.id == Document.document_type_id
    ).join(
        Project,
        Project.id == Document.project_id
    ).filter(
        Document.is_deleted == 0
    )
    
    # Фильтр по проекту
    if project_id:
        query = query.filter(Project.id == project_id)
    
    # Группируем по типам документов
    query = query.group_by(DocumentType.id, DocumentType.name, DocumentType.name_en)
    
    # Выполняем запрос
    results = query.all()
    
    # Формируем результат
    distribution = []
    for row in results:
        # Если тип документа не указан, используем "Не указан"
        type_name = row.type_name or "Не указан"
        type_name_en = row.type_name_en or type_name
        
        distribution.append({
            "type_id": row.type_id,
            "type_name": type_name,
            "type_name_en": type_name_en,
            "count": row.count
        })
    
    # Сортируем по количеству документов (по убыванию)
    distribution.sort(key=lambda x: x["count"], reverse=True)
    
    return distribution
