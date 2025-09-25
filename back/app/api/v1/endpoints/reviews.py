"""
Reviews endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.models.document import DocumentReview
from app.services.auth import get_current_active_user

router = APIRouter()

class ReviewCreate(BaseModel):
    document_id: int
    reviewer_id: int
    comments: str = None
    rating: int = None

class ReviewUpdate(BaseModel):
    status: str = None
    comments: str = None
    rating: int = None

@router.get("/", response_model=List[dict])
async def get_reviews(
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка ревью"""
    query = db.query(DocumentReview)
    
    if project_id:
        # Фильтруем по проекту через документы
        query = query.join(DocumentReview.document).filter(DocumentReview.document.has(project_id=project_id))
    
    reviews = query.offset(skip).limit(limit).all()
    
    return [
        {
            "id": review.id,
            "document_id": review.document_id,
            "document_title": review.document.title if review.document else "Неизвестный документ",
            "reviewer_id": review.reviewer_id,
            "reviewer_name": f"User {review.reviewer_id}",  # TODO: Получить имя из таблицы пользователей
            "status": review.status,
            "comments": review.comments,
            "rating": review.rating,
            "created_at": review.created_at.isoformat() if review.created_at else None
        }
        for review in reviews
    ]

@router.get("/{review_id}", response_model=dict)
async def get_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение ревью по ID"""
    review = db.query(DocumentReview).filter(DocumentReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {
        "id": review.id,
        "document_id": review.document_id,
        "document_title": review.document.title if review.document else "Неизвестный документ",
        "reviewer_id": review.reviewer_id,
        "reviewer_name": f"User {review.reviewer_id}",
        "status": review.status,
        "comments": review.comments,
        "rating": review.rating,
        "created_at": review.created_at.isoformat() if review.created_at else None,
    }

@router.post("/", response_model=dict)
async def create_review(
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Создание нового ревью"""
    # Проверяем, существует ли документ
    from app.models.document import Document
    document = db.query(Document).filter(Document.id == review_data.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    review = DocumentReview(
        document_id=review_data.document_id,
        reviewer_id=review_data.reviewer_id,
        status="pending",
        comments=review_data.comments,
        rating=review_data.rating
    )
    
    db.add(review)
    db.commit()
    db.refresh(review)
    
    return {
        "id": review.id,
        "document_id": review.document_id,
        "document_title": document.title,
        "reviewer_id": review.reviewer_id,
        "reviewer_name": f"User {review.reviewer_id}",
        "status": review.status,
        "comments": review.comments,
        "rating": review.rating,
        "created_at": review.created_at.isoformat() if review.created_at else None,
    }

@router.put("/{review_id}", response_model=dict)
async def update_review(
    review_id: int,
    review_data: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Обновление ревью"""
    review = db.query(DocumentReview).filter(DocumentReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Обновляем только переданные поля
    if review_data.status is not None:
        review.status = review_data.status
    if review_data.comments is not None:
        review.comments = review_data.comments
    if review_data.rating is not None:
        review.rating = review_data.rating
    
    db.commit()
    db.refresh(review)
    
    return {
        "id": review.id,
        "document_id": review.document_id,
        "document_title": review.document.title if review.document else "Неизвестный документ",
        "reviewer_id": review.reviewer_id,
        "reviewer_name": f"User {review.reviewer_id}",
        "status": review.status,
        "comments": review.comments,
        "rating": review.rating,
        "created_at": review.created_at.isoformat() if review.created_at else None,
    }

@router.delete("/{review_id}")
async def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Удаление ревью"""
    review = db.query(DocumentReview).filter(DocumentReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    db.delete(review)
    db.commit()
    
    return {"message": "Review deleted successfully"}
