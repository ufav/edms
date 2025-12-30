"""
Support tickets endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Request, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.support import SupportTicket, SupportMessage, SupportTicketFile, TicketStatus
from app.services.auth import get_current_active_user, decode_token
from app.services.minio_service import minio_service
from fastapi.responses import FileResponse
from app.services.audit_service import add_log_task
from app.services.websocket_manager import connection_manager

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
    
    # TODO: Отправка уведомления в Telegram (будет реализовано позже)
    
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
    tickets = db.query(SupportTicket).filter(
        SupportTicket.user_id == current_user.id
    ).order_by(desc(SupportTicket.last_message_at)).all()
    
    result = []
    for ticket in tickets:
        user = db.query(User).filter(User.id == ticket.user_id).first()
        result.append(SupportTicketResponse(
            id=ticket.id,
            user_id=ticket.user_id,
            subject=ticket.subject,
            initial_message=ticket.initial_message,
            status=ticket.status.value,
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
            last_message_at=ticket.last_message_at,
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
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.user_id == current_user.id
    ).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Тикет не найден")
    
    # Получаем сообщения
    messages = db.query(SupportMessage).filter(
        SupportMessage.ticket_id == ticket_id
    ).order_by(SupportMessage.created_at).all()
    
    # Получаем файлы тикета
    ticket_files = db.query(SupportTicketFile).filter(
        SupportTicketFile.ticket_id == ticket_id
    ).all()
    
    # Формируем ответ
    user = db.query(User).filter(User.id == ticket.user_id).first()
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
        id=ticket.id,
        user_id=ticket.user_id,
        subject=ticket.subject,
        initial_message=ticket.initial_message,
        status=ticket.status.value,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        last_message_at=ticket.last_message_at,
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
    
    # TODO: Отправка уведомления в Telegram (будет реализовано позже)
    
    return message_response


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
        
        from fastapi.responses import Response
        return Response(
            content=file_data,
            media_type=file.mime_type,
            headers={
                "Content-Disposition": f'attachment; filename="{file.file_name}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки файла: {str(e)}")


@router.websocket("/ws/tickets/{ticket_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    ticket_id: int,
):
    """
    WebSocket endpoint для real-time обновлений тикета поддержки
    """
    # Сначала принимаем соединение (иначе FastAPI вернет 403)
    await websocket.accept()
    
    try:
        # Получаем токен из query параметров
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=1008, reason="Token required")
            return
        
        # Декодируем токен
        payload = decode_token(token)
        if not payload:
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        username = payload.get("sub")
        if not username:
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        # Получаем пользователя из БД (WebSocket не поддерживает Depends, используем get_db напрямую)
        db = next(get_db())
        try:
            user = db.query(User).filter(User.username == username).first()
            if not user or not user.is_active:
                await websocket.close(code=1008, reason="User not found or inactive")
                return
            
            # Проверяем, что тикет существует и принадлежит пользователю
            ticket = db.query(SupportTicket).filter(
                SupportTicket.id == ticket_id,
                SupportTicket.user_id == user.id
            ).first()
            
            if not ticket:
                await websocket.close(code=1008, reason="Ticket not found")
                return
            
            # Подключаемся к менеджеру соединений
            await connection_manager.connect(websocket, ticket_id, user.id)
            
            try:
                # Отправляем подтверждение подключения
                await websocket.send_json({
                    "type": "connected",
                    "ticket_id": ticket_id,
                    "user_id": user.id
                })
                
                # Ожидаем сообщения от клиента (ping/pong для keep-alive)
                while True:
                    try:
                        data = await websocket.receive_text()
                        # Обрабатываем ping для keep-alive
                        if data == "ping":
                            await websocket.send_text("pong")
                    except WebSocketDisconnect:
                        break
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"WebSocket error: {e}")
            finally:
                connection_manager.disconnect(ticket_id, user.id)
        finally:
            db.close()
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"WebSocket connection error: {e}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass

