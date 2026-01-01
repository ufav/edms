"""
Support tickets endpoints - CRUD operations
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, text
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.support import SupportTicket, SupportMessage, SupportTicketFile, TicketStatus
from app.services.auth import get_current_active_user
from app.services.minio_service import minio_service
from fastapi.responses import Response
from app.services.audit_service import add_log_task
from app.services.websocket_manager import connection_manager
from app.services.telegram_service import telegram_service

router = APIRouter()


class SupportTicketCreate(BaseModel):
    subject: str
    message: str


class SupportMessageCreate(BaseModel):
    message_text: str


class SupportTicketResponse(BaseModel):
    id: int
    user_id: int
    subject: str
    initial_message: str
    status: str
    created_at: datetime
    updated_at: datetime
    last_message_at: datetime
    user: Optional[dict] = None
    
    class Config:
        from_attributes = True


class SupportMessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender_type: str
    sender_id: Optional[int]
    message_text: str
    created_at: datetime
    files: List[dict] = []
    
    class Config:
        from_attributes = True


class SupportTicketDetailResponse(SupportTicketResponse):
    messages: List[SupportMessageResponse] = []
    files: List[dict] = []


@router.post("/tickets", response_model=SupportTicketResponse)
async def create_support_ticket(
    request: Request,
    background_tasks: BackgroundTasks,
    subject: str = Form(...),
    message: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Создание нового тикета поддержки
    """
    # Создаем тикет
    ticket = SupportTicket(
        user_id=current_user.id,
        subject=subject,
        initial_message=message,
        status=TicketStatus.NEW,
    )
    db.add(ticket)
    db.flush()  # Получаем ID тикета
    
    # Создаем первое сообщение от пользователя
    initial_message = SupportMessage(
        ticket_id=ticket.id,
        sender_type='user',
        sender_id=current_user.id,
        message_text=message,
    )
    db.add(initial_message)
    db.flush()
    
    # Загружаем файлы, если есть
    uploaded_files = []
    if files:
        if not settings.USE_MINIO:
            raise HTTPException(status_code=503, detail="Хранилище файлов недоступно. Сохранение файлов невозможно.")
        
        for file in files:
            try:
                # Читаем содержимое файла
                file_content = await file.read()
                
                # Валидация файла
                if len(file_content) > 5 * 1024 * 1024:  # 5MB
                    raise HTTPException(status_code=400, detail=f"Файл {file.filename} слишком большой (максимум 5MB)")
                
                # Проверка типа файла (только изображения)
                allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
                if file.content_type not in allowed_types:
                    raise HTTPException(status_code=400, detail=f"Файл {file.filename} должен быть изображением")
                
                # Генерируем уникальное имя файла
                import uuid
                file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
                unique_filename = f"{uuid.uuid4()}.{file_extension}"
                file_path = f"support/{ticket.id}/{unique_filename}"
                
                # Загружаем в MinIO
                success = await minio_service.upload_file(
                    file_content=file_content,
                    file_key=file_path,
                    content_type=file.content_type
                )
                
                if not success:
                    raise HTTPException(status_code=503, detail="Хранилище файлов недоступно. Сохранение файлов невозможно.")
                
                # Сохраняем информацию о файле в БД
                ticket_file = SupportTicketFile(
                    ticket_id=ticket.id,
                    message_id=initial_message.id,
                    file_name=file.filename,
                    file_path=file_path,
                    file_size=len(file_content),
                    mime_type=file.content_type,
                )
                db.add(ticket_file)
                db.flush()  # Получаем ID файла
                uploaded_files.append({
                    'id': ticket_file.id,
                    'file_name': ticket_file.file_name,
                    'file_path': ticket_file.file_path,
                    'file_size': ticket_file.file_size,
                    'mime_type': ticket_file.mime_type,
                })
            except HTTPException:
                db.rollback()
                raise  # Пробрасываем HTTPException как есть
            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=503, detail="Хранилище файлов недоступно. Сохранение файлов невозможно.")
    
    db.commit()
    db.refresh(ticket)
    
    # Логирование
    add_log_task(
        background_tasks,
        request,
        action="create",
        entity_type="support_ticket",
        entity_id=ticket.id,
        user_id=current_user.id,
        details=f"Создан тикет поддержки: {subject}"
    )
    
    # Отправка уведомления в Telegram администратору
    if telegram_service.is_configured():
        background_tasks.add_task(
            telegram_service.send_ticket_notification,
            ticket_id=ticket.id,
            user_name=current_user.full_name or current_user.username,
            subject=subject,
            message=message,
            has_files=len(uploaded_files) > 0,
            files=uploaded_files if uploaded_files else None
        )
    
    return SupportTicketResponse(
        id=ticket.id,
        user_id=ticket.user_id,
        subject=ticket.subject,
        initial_message=ticket.initial_message,
        status=ticket.status.value,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        last_message_at=ticket.last_message_at,
        user={
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
        } if current_user else None,
    )


@router.get("/tickets", response_model=List[SupportTicketResponse])
async def get_support_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Получение списка тикетов текущего пользователя
    """
    # Используем raw SQL для чтения статуса как строки, чтобы избежать проблем с enum
    from sqlalchemy import text
    tickets_data = db.execute(
        text("""
            SELECT id, user_id, subject, initial_message, status::text as status, 
                   created_at, updated_at, last_message_at
            FROM support_tickets
            WHERE user_id = :user_id
            ORDER BY last_message_at DESC
        """),
        {"user_id": current_user.id}
    ).fetchall()
    
    result = []
    for row in tickets_data:
        # Преобразуем строку статуса в enum
        try:
            status_enum = TicketStatus(row.status)
        except ValueError:
            # Если статус не соответствует enum, используем NEW по умолчанию
            status_enum = TicketStatus.NEW
        
        user = db.query(User).filter(User.id == row.user_id).first()
        result.append(SupportTicketResponse(
            id=row.id,
            user_id=row.user_id,
            subject=row.subject,
            initial_message=row.initial_message,
            status=status_enum.value,
            created_at=row.created_at,
            updated_at=row.updated_at,
            last_message_at=row.last_message_at,
            user={
                'id': user.id,
                'username': user.username,
                'email': user.email,
            } if user else None,
        ))
    
    return result


@router.get("/tickets/{ticket_id}", response_model=SupportTicketDetailResponse)
async def get_support_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Получение тикета с сообщениями
    """
    # Используем raw SQL для чтения статуса как строки, чтобы избежать проблем с enum
    ticket_data = db.execute(
        text("""
            SELECT id, user_id, subject, initial_message, status::text as status, 
                   created_at, updated_at, last_message_at
            FROM support_tickets
            WHERE id = :ticket_id AND user_id = :user_id
        """),
        {"ticket_id": ticket_id, "user_id": current_user.id}
    ).fetchone()
    
    if not ticket_data:
        raise HTTPException(status_code=404, detail="Тикет не найден")
    
    # Преобразуем строку статуса в enum
    try:
        status_enum = TicketStatus(ticket_data.status)
    except ValueError:
        status_enum = TicketStatus.NEW
    
    # Получаем сообщения
    messages = db.query(SupportMessage).filter(
        SupportMessage.ticket_id == ticket_id
    ).order_by(SupportMessage.created_at).all()
    
    # Получаем файлы тикета
    ticket_files = db.query(SupportTicketFile).filter(
        SupportTicketFile.ticket_id == ticket_id
    ).all()
    
    # Формируем ответ
    user = db.query(User).filter(User.id == ticket_data.user_id).first()
    messages_response = []
    for msg in messages:
        msg_files = [f for f in ticket_files if f.message_id == msg.id]
        messages_response.append(SupportMessageResponse(
            id=msg.id,
            ticket_id=msg.ticket_id,
            sender_type=msg.sender_type,
            sender_id=msg.sender_id,
            message_text=msg.message_text,
            created_at=msg.created_at,
            files=[{
                'id': f.id,
                'file_name': f.file_name,
                'file_path': f.file_path,
                'file_size': f.file_size,
                'mime_type': f.mime_type,
            } for f in msg_files],
        ))
    
    return SupportTicketDetailResponse(
        id=ticket_data.id,
        user_id=ticket_data.user_id,
        subject=ticket_data.subject,
        initial_message=ticket_data.initial_message,
        status=status_enum.value,
        created_at=ticket_data.created_at,
        updated_at=ticket_data.updated_at,
        last_message_at=ticket_data.last_message_at,
        user={
            'id': user.id,
            'username': user.username,
            'email': user.email,
        } if user else None,
        messages=messages_response,
        files=[{
            'id': f.id,
            'file_name': f.file_name,
            'file_path': f.file_path,
            'file_size': f.file_size,
            'mime_type': f.mime_type,
        } for f in ticket_files],
    )


@router.post("/tickets/{ticket_id}/messages", response_model=SupportMessageResponse)
async def create_support_message(
    ticket_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    message_text: str = Form(default=""),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Отправка сообщения в тикет
    """
    # Нормализуем message_text (может быть None или пустой строкой)
    message_text_clean = (message_text or "").strip()
    
    # Проверяем, что есть либо текст, либо файлы
    if not message_text_clean and not files:
        raise HTTPException(status_code=400, detail="Сообщение не может быть пустым")
    
    # Проверяем, что тикет существует и принадлежит пользователю
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.user_id == current_user.id
    ).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Тикет не найден")
    
    # Проверяем, что тикет не закрыт (пользователь не может писать в закрытый тикет)
    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(
            status_code=403, 
            detail="Тикет закрыт. Для продолжения обсуждения обратитесь к поддержке."
        )
    
    # Создаем сообщение (используем пробел, если нет текста, но есть файлы)
    # В БД message_text не может быть NULL, поэтому используем пробел как минимальное значение
    final_message_text = message_text_clean if message_text_clean else " "
    message = SupportMessage(
        ticket_id=ticket_id,
        sender_type='user',
        sender_id=current_user.id,
        message_text=final_message_text,
    )
    db.add(message)
    db.flush()
    
    # Обновляем last_message_at тикета
    ticket.last_message_at = datetime.now(timezone.utc)
    ticket.updated_at = datetime.now(timezone.utc)
    
    # Загружаем файлы, если есть
    uploaded_files = []
    if files:
        if not settings.USE_MINIO:
            raise HTTPException(status_code=503, detail="Хранилище файлов недоступно. Сохранение файлов невозможно.")
        
        for file in files:
            try:
                # Проверяем, что файл валиден
                if not file.filename:
                    continue  # Пропускаем файлы без имени
                
                # Читаем содержимое файла
                file_content = await file.read()
                
                # Валидация файла
                if len(file_content) > 5 * 1024 * 1024:  # 5MB
                    raise HTTPException(status_code=400, detail=f"Файл {file.filename} слишком большой (максимум 5MB)")
                
                # Проверка типа файла (только изображения)
                allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
                if not file.content_type or file.content_type not in allowed_types:
                    raise HTTPException(status_code=400, detail=f"Файл {file.filename} должен быть изображением")
                
                # Генерируем уникальное имя файла
                import uuid
                file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
                unique_filename = f"{uuid.uuid4()}.{file_extension}"
                file_path = f"support/{ticket_id}/{unique_filename}"
                
                # Загружаем в MinIO
                success = await minio_service.upload_file(
                    file_content=file_content,
                    file_key=file_path,
                    content_type=file.content_type
                )
                
                if not success:
                    raise HTTPException(status_code=503, detail="Хранилище файлов недоступно. Сохранение файлов невозможно.")
                
                # Сохраняем информацию о файле в БД
                ticket_file = SupportTicketFile(
                    ticket_id=ticket_id,
                    message_id=message.id,
                    file_name=file.filename,
                    file_path=file_path,
                    file_size=len(file_content),
                    mime_type=file.content_type,
                )
                db.add(ticket_file)
                db.flush()  # Получаем ID файла
                uploaded_files.append({
                    'id': ticket_file.id,
                    'file_name': ticket_file.file_name,
                    'file_path': ticket_file.file_path,
                    'file_size': ticket_file.file_size,
                    'mime_type': ticket_file.mime_type,
                })
            except HTTPException:
                db.rollback()
                raise  # Пробрасываем HTTPException как есть
            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=503, detail="Хранилище файлов недоступно. Сохранение файлов невозможно.")
    
    db.commit()
    db.refresh(message)
    
    # Логирование
    add_log_task(
        background_tasks,
        request,
        action="create",
        entity_type="support_message",
        entity_id=message.id,
        user_id=current_user.id,
        details=f"Отправлено сообщение в тикет #{ticket_id}"
    )
    
    # Формируем ответ с сообщением
    message_response = SupportMessageResponse(
        id=message.id,
        ticket_id=message.ticket_id,
        sender_type=message.sender_type,
        sender_id=message.sender_id,
        message_text=message.message_text,
        created_at=message.created_at,
        files=uploaded_files,
    )
    
    # Отправка сообщения через WebSocket всем подключенным к тикету (кроме отправителя)
    try:
        # Pydantic v2 использует model_dump()
        message_dict = message_response.model_dump()
        await connection_manager.broadcast_to_ticket(
            {
                "type": "new_message",
                "message": message_dict
            },
            ticket_id=ticket_id,
            exclude_user_id=current_user.id
        )
    except Exception as e:
        # Логируем ошибку, но не прерываем выполнение
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error broadcasting message via WebSocket: {e}")
    
    # Отправка уведомления в Telegram
    if telegram_service.is_configured():
        # Получаем информацию о пользователе для уведомления
        user_name = current_user.full_name or current_user.username
        background_tasks.add_task(
            telegram_service.send_message_notification,
            ticket_id=ticket_id,
            user_name=user_name,
            message_text=final_message_text,
            sender_type=message.sender_type,
            has_files=len(uploaded_files) > 0,
            files=uploaded_files if uploaded_files else None
        )
    
    return message_response


@router.post("/tickets/{ticket_id}/reopen")
async def reopen_ticket(
    ticket_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Возвращает закрытый тикет в статус IN_PROGRESS (доступно пользователю)
    """
    # Проверяем, что тикет существует и принадлежит пользователю
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.user_id == current_user.id
    ).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Тикет не найден")
    
    # Проверяем, что тикет закрыт
    if ticket.status != TicketStatus.CLOSED:
        raise HTTPException(
            status_code=400,
            detail=f"Тикет не закрыт (текущий статус: {ticket.status.value})"
        )
    
    # Возвращаем тикет в работу
    ticket.status = TicketStatus.IN_PROGRESS
    ticket.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(ticket)
    
    # Отправляем уведомление через WebSocket
    try:
        await connection_manager.broadcast_to_ticket(
            {
                "type": "ticket_reopened",
                "ticket_id": ticket_id
            },
            ticket_id=ticket_id,
            exclude_user_id=None
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error broadcasting ticket reopening via WebSocket: {e}")
    
    # Отправка уведомления в Telegram администратору
    if telegram_service.is_configured():
        user_name = current_user.full_name or current_user.username
        background_tasks.add_task(
            telegram_service.send_message,
            chat_id=telegram_service.admin_chat_id,
            text=f"🔄 <b>Тикет #{ticket_id} возвращен в работу</b>\n\n"
                 f"👤 <b>Пользователь:</b> {user_name}\n"
                 f"📋 <b>Тема:</b> {ticket.subject}",
            reply_markup={
                "inline_keyboard": [[
                    {
                        "text": "Просмотреть",
                        "callback_data": f"view_ticket_{ticket_id}"
                    }
                ]]
            }
        )
    
    return {
        "id": ticket.id,
        "status": ticket.status.value,
        "message": "Тикет возвращен в работу"
    }


@router.get("/tickets/{ticket_id}/files/{file_id}/download")
async def download_support_file(
    ticket_id: int,
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Скачивание файла из тикета
    """
    # Проверяем, что тикет существует и принадлежит пользователю
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.user_id == current_user.id
    ).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Тикет не найден")
    
    # Получаем файл
    file = db.query(SupportTicketFile).filter(
        SupportTicketFile.id == file_id,
        SupportTicketFile.ticket_id == ticket_id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    if not settings.USE_MINIO:
        raise HTTPException(status_code=503, detail="Хранилище файлов недоступно")
    
    try:
        # Скачиваем файл из MinIO
        file_data = await minio_service.download_file(file.file_path)
        
        if file_data is None:
            raise HTTPException(status_code=404, detail="Файл не найден в хранилище")
        
        return Response(
            content=file_data,
            media_type=file.mime_type,
            headers={
                "Content-Disposition": f'attachment; filename="{file.file_name}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки файла: {str(e)}")
