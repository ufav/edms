"""
Document comments endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.document_comments import DocumentComment
from app.models.document import Document
from app.models.user import User
from app.services.auth import get_current_active_user

router = APIRouter()

# Pydantic models
class CommentCreate(BaseModel):
    content: str
    parent_comment_id: Optional[int] = None

class CommentUpdate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: int
    document_id: int
    parent_comment_id: Optional[int]
    user_id: int
    user_name: str
    content: str
    is_resolved: bool
    created_at: datetime
    updated_at: datetime
    replies: List['CommentResponse'] = []

    class Config:
        from_attributes = True

# Make CommentResponse forward reference work
CommentResponse.model_rebuild()

@router.get("/documents/{document_id}/comments", response_model=List[CommentResponse])
async def get_document_comments(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получить все комментарии к документу"""
    
    # Проверяем, что документ существует
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Получаем все комментарии документа (только корневые, без ответов)
    comments = db.query(DocumentComment).options(
        joinedload(DocumentComment.user)
    ).filter(
        DocumentComment.document_id == document_id,
        DocumentComment.parent_comment_id.is_(None)
    ).order_by(DocumentComment.created_at.asc()).all()
    
    def build_comment_tree(comment: DocumentComment) -> CommentResponse:
        # Получаем ответы на комментарий
        replies = db.query(DocumentComment).options(
            joinedload(DocumentComment.user)
        ).filter(
            DocumentComment.parent_comment_id == comment.id
        ).order_by(DocumentComment.created_at.asc()).all()
        
        # Рекурсивно строим дерево ответов (включая ответы на ответы)
        reply_responses = [build_comment_tree(reply) for reply in replies]
        
        return CommentResponse(
            id=comment.id,
            document_id=comment.document_id,
            parent_comment_id=comment.parent_comment_id,
            user_id=comment.user_id,
            user_name=comment.user.full_name if comment.user else "Неизвестный пользователь",
            content=comment.content,
            is_resolved=comment.is_resolved,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            replies=reply_responses
        )
    
    return [build_comment_tree(comment) for comment in comments]

@router.post("/documents/{document_id}/comments", response_model=CommentResponse)
async def create_comment(
    document_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Создать новый комментарий к документу"""
    
    # Проверяем, что документ существует
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Если это ответ на комментарий, проверяем что родительский комментарий существует
    if comment_data.parent_comment_id:
        parent_comment = db.query(DocumentComment).filter(
            DocumentComment.id == comment_data.parent_comment_id,
            DocumentComment.document_id == document_id
        ).first()
        if not parent_comment:
            raise HTTPException(status_code=404, detail="Родительский комментарий не найден")
    
    # Создаем новый комментарий
    comment = DocumentComment(
        document_id=document_id,
        parent_comment_id=comment_data.parent_comment_id,
        user_id=current_user.id,
        content=comment_data.content
    )
    
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    return CommentResponse(
        id=comment.id,
        document_id=comment.document_id,
        parent_comment_id=comment.parent_comment_id,
        user_id=comment.user_id,
        user_name=comment.user.full_name if comment.user else "Неизвестный пользователь",
        content=comment.content,
        is_resolved=comment.is_resolved,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        replies=[]
    )

@router.put("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Обновить комментарий"""
    
    comment = db.query(DocumentComment).filter(DocumentComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Комментарий не найден")
    
    # Проверяем, что пользователь может редактировать комментарий
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет прав для редактирования этого комментария")
    
    comment.content = comment_data.content
    db.commit()
    db.refresh(comment)
    
    return CommentResponse(
        id=comment.id,
        document_id=comment.document_id,
        parent_comment_id=comment.parent_comment_id,
        user_id=comment.user_id,
        user_name=comment.user.full_name if comment.user else "Неизвестный пользователь",
        content=comment.content,
        is_resolved=comment.is_resolved,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        replies=[]
    )

@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Удалить комментарий"""
    
    comment = db.query(DocumentComment).filter(DocumentComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Комментарий не найден")
    
    # Проверяем, что пользователь может удалить комментарий
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет прав для удаления этого комментария")
    
    db.delete(comment)
    db.commit()
    
    return {"message": "Комментарий удален"}

@router.patch("/comments/{comment_id}/resolve")
async def toggle_comment_resolve(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Переключить статус "решено" для комментария"""
    
    comment = db.query(DocumentComment).filter(DocumentComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Комментарий не найден")
    
    # Проверяем, что пользователь может изменить статус комментария
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет прав для изменения статуса этого комментария")
    
    comment.is_resolved = not comment.is_resolved
    db.commit()
    db.refresh(comment)
    
    return {"message": f"Комментарий {'помечен как решенный' if comment.is_resolved else 'помечен как нерешенный'}"}
