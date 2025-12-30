"""
Support tickets endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Request, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import json

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.support import SupportTicket, SupportMessage, SupportTicketFile, TicketStatus
from app.services.auth import get_current_active_user, decode_token
from app.services.minio_service import minio_service
from fastapi.responses import FileResponse
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
            has_files=len(uploaded_files) > 0
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
                        # Обрабатываем ping для keep-alive (может быть JSON или просто текст)
                        try:
                            ping_data = json.loads(data)
                            if ping_data.get("type") == "ping":
                                await websocket.send_text("pong")
                        except:
                            # Если не JSON, проверяем как текст
                            if data == "ping" or data.strip() == "ping":
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


@router.get("/telegram/get-chat-id")
async def get_telegram_chat_id(
    current_user: User = Depends(get_current_active_user),
):
    """
    Временный endpoint для получения chat_id из последнего сообщения в Telegram
    Используйте этот endpoint, чтобы узнать свой chat_id для настройки TELEGRAM_ADMIN_CHAT_ID
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can access this endpoint")
    
    if not telegram_service.is_configured():
        raise HTTPException(status_code=503, detail="Telegram bot is not configured")
    
    try:
        import httpx
        # Получаем последние обновления от Telegram
        url = f"{telegram_service.base_url}/getUpdates"
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            response = await client.get(url)
            response.raise_for_status()
            result = response.json()
            
            if result.get("ok") and result.get("result"):
                updates = result["result"]
                if updates:
                    # Берем последнее обновление
                    last_update = updates[-1]
                    if "message" in last_update:
                        chat_id = str(last_update["message"]["chat"]["id"])
                        user_name = last_update["message"]["from"].get("first_name", "Unknown")
                        return {
                            "chat_id": chat_id,
                            "user_name": user_name,
                            "message": f"Ваш chat_id: {chat_id}. Добавьте это значение в .env как TELEGRAM_ADMIN_CHAT_ID={chat_id}"
                        }
                    elif "callback_query" in last_update:
                        chat_id = str(last_update["callback_query"]["from"]["id"])
                        user_name = last_update["callback_query"]["from"].get("first_name", "Unknown")
                        return {
                            "chat_id": chat_id,
                            "user_name": user_name,
                            "message": f"Ваш chat_id: {chat_id}. Добавьте это значение в .env как TELEGRAM_ADMIN_CHAT_ID={chat_id}"
                        }
            
            return {
                "message": "Нет новых сообщений. Отправьте любое сообщение боту в Telegram, затем обновите эту страницу."
            }
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting Telegram chat ID: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting chat ID: {str(e)}")


@router.post("/telegram/webhook")
async def telegram_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Webhook для получения обновлений от Telegram бота
    """
    if not telegram_service.is_configured():
        raise HTTPException(status_code=503, detail="Telegram bot is not configured")
    
    try:
        data = await request.json()
        
        # Проверяем секретный ключ, если он настроен
        if settings.TELEGRAM_WEBHOOK_SECRET:
            secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
            if secret != settings.TELEGRAM_WEBHOOK_SECRET:
                raise HTTPException(status_code=403, detail="Invalid webhook secret")
        
        # Обрабатываем обновление от Telegram
        if "message" in data:
            message = data["message"]
            chat_id = str(message["chat"]["id"])
            text = message.get("text", "")
            reply_to_message = message.get("reply_to_message")
            
            # Проверяем, является ли это ответом на сообщение бота (ForceReply)
            if reply_to_message and reply_to_message.get("from", {}).get("is_bot"):
                # Извлекаем ticket_id из текста исходного сообщения
                original_text = reply_to_message.get("text", "")
                import re
                match = re.search(r'тикет #(\d+)', original_text)
                if match:
                    ticket_id = int(match.group(1))
                    # Отправляем ответ в тикет
                    await create_support_reply_from_telegram(
                        ticket_id=ticket_id,
                        message_text=text,
                        telegram_chat_id=chat_id,
                        db=db
                    )
                    return {"ok": True}
            
            # Проверяем, является ли это ответом на тикет (формат: /reply_ticket_123 текст ответа)
            if text.startswith("/reply_ticket_") or text.startswith("reply_ticket_"):
                # Извлекаем ID тикета и текст ответа
                parts = text.split(" ", 1)
                ticket_id_str = parts[0].replace("/reply_ticket_", "").replace("reply_ticket_", "")
                reply_text = parts[1] if len(parts) > 1 else ""
                
                try:
                    ticket_id = int(ticket_id_str)
                    # Создаем сообщение от поддержки
                    await create_support_reply_from_telegram(
                        ticket_id=ticket_id,
                        message_text=reply_text,
                        telegram_chat_id=chat_id,
                        db=db
                    )
                except ValueError:
                    await telegram_service.send_message(
                        chat_id=chat_id,
                        text="❌ Неверный формат команды. Используйте: /reply_ticket_<ID> <текст ответа>"
                    )
            elif text.startswith("/close_ticket_") or text.startswith("close_ticket_"):
                ticket_id_str = text.replace("/close_ticket_", "").replace("close_ticket_", "").strip()
                try:
                    ticket_id = int(ticket_id_str)
                    await close_ticket_from_telegram(
                        ticket_id=ticket_id,
                        telegram_chat_id=chat_id,
                        db=db
                    )
                except ValueError:
                    await telegram_service.send_message(
                        chat_id=chat_id,
                        text="❌ Неверный формат команды. Используйте: /close_ticket_<ID>"
                    )
            elif text.startswith("/tickets") or text.startswith("/list"):
                try:
                    # Показываем список активных тикетов
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.info(f"Processing /tickets or /list command from chat_id: {chat_id}")
                    tickets = await get_active_tickets_for_telegram(chat_id, db)
                    logger.info(f"Found {len(tickets)} active tickets")
                    
                    if not tickets:
                        await telegram_service.send_message(
                            chat_id=chat_id,
                            text="✅ Нет активных тикетов"
                        )
                    else:
                        # Формируем inline-клавиатуру со списком тикетов
                        keyboard = []
                        for ticket in tickets[:10]:  # Максимум 10 тикетов
                            user = db.query(User).filter(User.id == ticket.user_id).first()
                            user_name = user.username if user else "Неизвестно"
                            status_emoji = "🆕" if ticket.status == TicketStatus.NEW else "🔄"
                            button_text = f"{status_emoji} #{ticket.id}: {ticket.subject[:30]}"
                            if len(ticket.subject) > 30:
                                button_text += "..."
                            keyboard.append([{
                                "text": button_text,
                                "callback_data": f"view_ticket_{ticket.id}"
                            }])
                        
                        # Добавляем кнопку обновления списка
                        keyboard.append([{
                            "text": "🔄 Обновить список",
                            "callback_data": "list_tickets"
                        }])
                        
                        # Для списка тикетов используем только inline-клавиатуру
                        # (нельзя одновременно использовать inline_keyboard и keyboard)
                        reply_markup = {"inline_keyboard": keyboard}
                        
                        result = await telegram_service.send_message(
                            chat_id=chat_id,
                            text=f"📋 <b>Активные тикеты ({len(tickets)}):</b>\n\nВыберите тикет для просмотра:",
                            reply_markup=reply_markup
                        )
                        if not result:
                            logger.error(f"Failed to send message to chat_id: {chat_id}")
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error processing /tickets command: {e}", exc_info=True)
                    await telegram_service.send_message(
                        chat_id=chat_id,
                        text=f"❌ Ошибка при получении списка тикетов: {str(e)}"
                    )
            else:
                # Это может быть новое сообщение или команда
                if text.startswith("/start"):
                    await telegram_service.send_message(
                        chat_id=chat_id,
                        text="👋 Добро пожаловать! Я бот поддержки EDMS.\n\n"
                             "<b>Доступные команды:</b>\n"
                             "/tickets - Список активных тикетов\n"
                             "/reply_ticket_&lt;ID&gt; &lt;текст&gt; - Ответить на тикет\n"
                             "/close_ticket_&lt;ID&gt; - Закрыть тикет\n"
                             "/help - Справка",
                        reply_markup=telegram_service.get_persistent_keyboard()
                    )
                elif text.startswith("/help"):
                    await telegram_service.send_message(
                        chat_id=chat_id,
                        text="📋 <b>Доступные команды:</b>\n\n"
                             "/tickets - Список активных тикетов\n"
                             "/reply_ticket_&lt;ID&gt; &lt;текст&gt; - Ответить на тикет\n"
                             "/close_ticket_&lt;ID&gt; - Закрыть тикет\n"
                             "/help - Показать эту справку",
                        reply_markup=telegram_service.get_persistent_keyboard()
                    )
        
        elif "callback_query" in data:
            # Обрабатываем нажатие на inline кнопку
            callback_query = data["callback_query"]
            chat_id = str(callback_query["from"]["id"])
            callback_data = callback_query.get("data", "")
            
            # Отвечаем на callback query
            try:
                import httpx
                callback_query_id = callback_query["id"]
                answer_url = f"{telegram_service.base_url}/answerCallbackQuery"
                async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
                    await client.post(answer_url, json={
                        "callback_query_id": callback_query_id
                    })
            except Exception as e:
                logger.error(f"Error answering callback query: {e}")
            
            if callback_data.startswith("reply_ticket_"):
                ticket_id_str = callback_data.replace("reply_ticket_", "")
                try:
                    ticket_id = int(ticket_id_str)
                    # Отправляем сообщение с ForceReply для удобства ответа
                    reply_markup = {
                        "force_reply": True,
                        "input_field_placeholder": f"Введите ваш ответ на тикет #{ticket_id}..."
                    }
                    await telegram_service.send_message(
                        chat_id=chat_id,
                        text=f"💬 <b>Ответ на тикет #{ticket_id}</b>\n\n"
                             f"Введите ваш ответ ниже. Или используйте команду:\n"
                             f"<code>/reply_ticket_{ticket_id} ваш ответ</code>",
                        reply_markup=reply_markup
                    )
                except ValueError:
                    pass
            elif callback_data.startswith("close_ticket_"):
                ticket_id_str = callback_data.replace("close_ticket_", "")
                try:
                    ticket_id = int(ticket_id_str)
                    await close_ticket_from_telegram(
                        ticket_id=ticket_id,
                        telegram_chat_id=chat_id,
                        db=db
                    )
                except ValueError:
                    pass
            elif callback_data.startswith("reopen_ticket_"):
                ticket_id_str = callback_data.replace("reopen_ticket_", "")
                try:
                    ticket_id = int(ticket_id_str)
                    await reopen_ticket_from_telegram(
                        ticket_id=ticket_id,
                        telegram_chat_id=chat_id,
                        db=db
                    )
                except ValueError:
                    pass
            elif callback_data.startswith("view_ticket_"):
                ticket_id_str = callback_data.replace("view_ticket_", "")
                try:
                    ticket_id = int(ticket_id_str)
                    await show_ticket_details_in_telegram(
                        ticket_id=ticket_id,
                        telegram_chat_id=chat_id,
                        db=db
                    )
                except ValueError:
                    pass
            elif callback_data == "list_tickets":
                # Показываем список активных тикетов
                tickets = await get_active_tickets_for_telegram(chat_id, db)
                
                if not tickets:
                    await telegram_service.send_message(
                        chat_id=chat_id,
                        text="✅ Нет активных тикетов"
                    )
                else:
                    # Формируем inline-клавиатуру со списком тикетов
                    keyboard = []
                    for ticket in tickets[:10]:  # Максимум 10 тикетов
                        user = db.query(User).filter(User.id == ticket.user_id).first()
                        user_name = user.username if user else "Неизвестно"
                        status_emoji = "🆕" if ticket.status == TicketStatus.NEW else "🔄"
                        button_text = f"{status_emoji} #{ticket.id}: {ticket.subject[:30]}"
                        if len(ticket.subject) > 30:
                            button_text += "..."
                        keyboard.append([{
                            "text": button_text,
                            "callback_data": f"view_ticket_{ticket.id}"
                        }])
                    
                    # Добавляем кнопку обновления списка
                    keyboard.append([{
                        "text": "🔄 Обновить список",
                        "callback_data": "list_tickets"
                    }])
                    
                    reply_markup = {"inline_keyboard": keyboard}
                    
                    await telegram_service.send_message(
                        chat_id=chat_id,
                        text=f"📋 <b>Активные тикеты ({len(tickets)}):</b>\n\nВыберите тикет для просмотра:",
                        reply_markup=reply_markup
                    )
        
        return {"ok": True}
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error processing Telegram webhook: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing webhook: {str(e)}")


async def get_active_tickets_for_telegram(
    telegram_chat_id: str,
    db: Session
) -> List[SupportTicket]:
    """
    Получает список активных тикетов (NEW и IN_PROGRESS) для Telegram
    
    Args:
        telegram_chat_id: ID чата в Telegram (для идентификации администратора)
        db: Сессия базы данных
    
    Returns:
        Список активных тикетов
    """
    # Проверяем, что запрос от администратора
    if telegram_chat_id != settings.TELEGRAM_ADMIN_CHAT_ID:
        return []
    
    # Получаем активные тикеты (NEW и IN_PROGRESS)
    tickets = db.query(SupportTicket).filter(
        SupportTicket.status.in_([TicketStatus.NEW, TicketStatus.IN_PROGRESS])
    ).order_by(desc(SupportTicket.last_message_at)).limit(20).all()
    
    return tickets


async def show_ticket_details_in_telegram(
    ticket_id: int,
    telegram_chat_id: str,
    db: Session
):
    """
    Показывает детали тикета в Telegram с кнопками для действий
    
    Args:
        ticket_id: ID тикета
        telegram_chat_id: ID чата в Telegram
        db: Сессия базы данных
    """
    # Проверяем, что запрос от администратора
    if telegram_chat_id != settings.TELEGRAM_ADMIN_CHAT_ID:
        await telegram_service.send_message(
            chat_id=telegram_chat_id,
            text="❌ Ошибка: у вас нет прав для просмотра тикетов."
        )
        return
    
    # Получаем тикет
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        await telegram_service.send_message(
            chat_id=telegram_chat_id,
            text=f"❌ Тикет #{ticket_id} не найден"
        )
        return
    
    # Получаем пользователя
    user = db.query(User).filter(User.id == ticket.user_id).first()
    user_name = user.username if user else "Неизвестно"
    
    # Получаем последние сообщения
    messages = db.query(SupportMessage).filter(
        SupportMessage.ticket_id == ticket_id
    ).order_by(desc(SupportMessage.created_at)).limit(5).all()
    
    # Формируем текст
    status_emoji = {
        TicketStatus.NEW: "🆕",
        TicketStatus.IN_PROGRESS: "🔄",
        TicketStatus.RESOLVED: "✅",
        TicketStatus.CLOSED: "🔒"
    }
    status_text = {
        TicketStatus.NEW: "Новый",
        TicketStatus.IN_PROGRESS: "В работе",
        TicketStatus.RESOLVED: "Решен",
        TicketStatus.CLOSED: "Закрыт"
    }
    
    text = f"{status_emoji.get(ticket.status, '📋')} <b>Тикет #{ticket_id}</b>\n\n"
    text += f"👤 <b>Пользователь:</b> {user_name}\n"
    text += f"📋 <b>Тема:</b> {ticket.subject}\n"
    text += f"📊 <b>Статус:</b> {status_text.get(ticket.status, ticket.status.value)}\n"
    text += f"🕐 <b>Создан:</b> {ticket.created_at.strftime('%d.%m.%Y %H:%M')}\n"
    text += f"💬 <b>Последнее сообщение:</b> {ticket.last_message_at.strftime('%d.%m.%Y %H:%M')}\n\n"
    text += f"<b>Первое сообщение:</b>\n{ticket.initial_message[:200]}{'...' if len(ticket.initial_message) > 200 else ''}\n"
    
    if messages:
        text += f"\n<b>Последние сообщения ({len(messages)}):</b>\n"
        for msg in reversed(messages):  # Показываем последние 5 в обратном порядке (от старых к новым)
            sender = "👤 Вы" if msg.sender_type == 'support' else f"👤 {user_name}"
            msg_date = msg.created_at.strftime('%d.%m.%Y %H:%M')
            text += f"\n{sender} ({msg_date}):\n{msg.message_text}\n"
    
    # Кнопки для действий
    keyboard = [
        [
            {
                "text": "Ответить",
                "callback_data": f"reply_ticket_{ticket_id}"
            },
            {
                "text": "Закрыть",
                "callback_data": f"close_ticket_{ticket_id}"
            }
        ],
        [
            {
                "text": "📋 Список тикетов",
                "callback_data": "list_tickets"
            }
        ]
    ]
    
    # Если тикет закрыт, добавляем кнопку для возврата в работу
    if ticket.status == TicketStatus.CLOSED:
        keyboard.insert(1, [
            {
                "text": "🔄 Вернуть в работу",
                "callback_data": f"reopen_ticket_{ticket_id}"
            }
        ])
    
    reply_markup = {
        "inline_keyboard": keyboard
    }
    
    # Для деталей тикета используем только inline-клавиатуру
    # (нельзя одновременно использовать inline_keyboard и keyboard)
    await telegram_service.send_message(
        chat_id=telegram_chat_id,
        text=text,
        reply_markup=reply_markup
    )


async def close_ticket_from_telegram(
    ticket_id: int,
    telegram_chat_id: str,
    db: Session
):
    """
    Закрывает тикет из Telegram
    
    Args:
        ticket_id: ID тикета
        telegram_chat_id: ID чата в Telegram (для идентификации администратора)
        db: Сессия базы данных
    """
    # Проверяем, что сообщение пришло от администратора
    if telegram_chat_id != settings.TELEGRAM_ADMIN_CHAT_ID:
        await telegram_service.send_message(
            chat_id=telegram_chat_id,
            text="❌ Ошибка: у вас нет прав для закрытия тикетов."
        )
        return
    
    # Проверяем, что тикет существует
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        await telegram_service.send_message(
            chat_id=telegram_chat_id,
            text=f"❌ Тикет #{ticket_id} не найден"
        )
        return
    
    # Проверяем, что тикет еще не закрыт
    if ticket.status == TicketStatus.CLOSED:
        await telegram_service.send_message(
            chat_id=telegram_chat_id,
            text=f"ℹ️ Тикет #{ticket_id} уже закрыт"
        )
        return
    
    # Закрываем тикет
    ticket.status = TicketStatus.CLOSED
    ticket.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    
    # Отправляем подтверждение в Telegram
    await telegram_service.send_message(
        chat_id=telegram_chat_id,
        text=f"✅ Тикет #{ticket_id} закрыт"
    )
    
    # Отправляем уведомление через WebSocket
    try:
        await connection_manager.broadcast_to_ticket(
            {
                "type": "ticket_closed",
                "ticket_id": ticket_id
            },
            ticket_id=ticket_id,
            exclude_user_id=None
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error broadcasting ticket closure via WebSocket: {e}")


async def reopen_ticket_from_telegram(
    ticket_id: int,
    telegram_chat_id: str,
    db: Session
):
    """
    Возвращает закрытый тикет в статус IN_PROGRESS
    
    Args:
        ticket_id: ID тикета
        telegram_chat_id: ID чата в Telegram (для идентификации администратора)
        db: Сессия базы данных
    """
    # Проверяем, что сообщение пришло от администратора
    if telegram_chat_id != settings.TELEGRAM_ADMIN_CHAT_ID:
        await telegram_service.send_message(
            chat_id=telegram_chat_id,
            text="❌ Ошибка: у вас нет прав для возврата тикетов в работу."
        )
        return
    
    # Проверяем, что тикет существует
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        await telegram_service.send_message(
            chat_id=telegram_chat_id,
            text=f"❌ Тикет #{ticket_id} не найден"
        )
        return
    
    # Проверяем, что тикет закрыт
    if ticket.status != TicketStatus.CLOSED:
        await telegram_service.send_message(
            chat_id=telegram_chat_id,
            text=f"ℹ️ Тикет #{ticket_id} не закрыт (текущий статус: {ticket.status.value})"
        )
        return
    
    # Возвращаем тикет в работу
    ticket.status = TicketStatus.IN_PROGRESS
    ticket.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    
    # Отправляем подтверждение в Telegram
    await telegram_service.send_message(
        chat_id=telegram_chat_id,
        text=f"✅ Тикет #{ticket_id} возвращен в работу"
    )
    
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
        logger.error(f"Error broadcasting ticket_reopened via WebSocket: {e}")


async def create_support_reply_from_telegram(
    ticket_id: int,
    message_text: str,
    telegram_chat_id: str,
    db: Session
):
    """
    Создает ответ поддержки в тикете из Telegram
    
    Args:
        ticket_id: ID тикета
        message_text: Текст ответа
        telegram_chat_id: ID чата в Telegram (для идентификации администратора)
        db: Сессия базы данных
    """
    # Проверяем, что сообщение пришло от администратора (сравниваем с TELEGRAM_ADMIN_CHAT_ID)
    if telegram_chat_id != settings.TELEGRAM_ADMIN_CHAT_ID:
        await telegram_service.send_message(
            chat_id=telegram_chat_id,
            text="❌ Ошибка: у вас нет прав для ответа на тикеты."
        )
        return
    
    # Находим первого администратора для сохранения ответа
    admin_user = db.query(User).filter(User.is_admin == True).first()
    
    if not admin_user:
        await telegram_service.send_message(
            chat_id=telegram_chat_id,
            text="❌ Ошибка: администратор не найден в системе."
        )
        return
    
    # Проверяем, что тикет существует
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        await telegram_service.send_message(
            chat_id=telegram_chat_id,
            text=f"❌ Тикет #{ticket_id} не найден"
        )
        return
    
    # Создаем сообщение от поддержки
    message = SupportMessage(
        ticket_id=ticket_id,
        sender_type='support',
        sender_id=admin_user.id,
        message_text=message_text,
    )
    db.add(message)
    
    # Обновляем статус тикета и время последнего сообщения
    if ticket.status == TicketStatus.NEW:
        ticket.status = TicketStatus.IN_PROGRESS
    ticket.last_message_at = datetime.now(timezone.utc)
    ticket.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(message)
    
    # Отправляем подтверждение в Telegram
    await telegram_service.send_message(
        chat_id=telegram_chat_id,
        text=f"✅ Ответ отправлен в тикет #{ticket_id}"
    )
    
    # Отправляем сообщение пользователю в Telegram (если у него настроен telegram_chat_id в будущем)
    # Пока оставляем закомментированным, так как поле telegram_chat_id удалено из модели
    # ticket_user = db.query(User).filter(User.id == ticket.user_id).first()
    # if ticket_user and ticket_user.telegram_chat_id:
    #     await telegram_service.send_message_to_user(
    #         user_telegram_chat_id=ticket_user.telegram_chat_id,
    #         ticket_id=ticket_id,
    #         message_text=message_text
    #     )
    
    # Отправляем через WebSocket
    try:
        message_dict = {
            "id": message.id,
            "ticket_id": message.ticket_id,
            "sender_type": message.sender_type,
            "sender_id": message.sender_id,
            "message_text": message.message_text,
            "created_at": message.created_at.isoformat(),
            "files": [],
        }
        await connection_manager.broadcast_to_ticket(
            {
                "type": "new_message",
                "message": message_dict
            },
            ticket_id=ticket_id,
            exclude_user_id=None
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error broadcasting message via WebSocket: {e}")


@router.post("/telegram/setup-webhook")
async def setup_telegram_webhook(
    webhook_url: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Устанавливает webhook для Telegram бота
    Доступно только администраторам
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can setup webhook")
    
    if not telegram_service.is_configured():
        raise HTTPException(status_code=503, detail="Telegram bot is not configured")
    
    try:
        import httpx
        url = f"{telegram_service.base_url}/setWebhook"
        payload = {
            "url": webhook_url,
        }
        
        # Добавляем секретный токен, если он настроен
        if settings.TELEGRAM_WEBHOOK_SECRET:
            payload["secret_token"] = settings.TELEGRAM_WEBHOOK_SECRET
        
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            
            if result.get("ok"):
                return {"message": "Webhook установлен успешно", "url": webhook_url}
            else:
                raise HTTPException(status_code=400, detail=result.get("description", "Unknown error"))
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error setting up Telegram webhook: {e}")
        raise HTTPException(status_code=500, detail=f"Error setting up webhook: {str(e)}")


# Глобальная переменная для хранения задачи polling
_polling_task = None

@router.post("/telegram/start-polling")
async def start_telegram_polling(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
):
    """
    Запускает polling для получения обновлений от Telegram (для локальной разработки)
    Доступно только администраторам
    """
    global _polling_task
    
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can start polling")
    
    if not telegram_service.is_configured():
        raise HTTPException(status_code=503, detail="Telegram bot is not configured")
    
    # Проверяем, не запущен ли уже polling
    if _polling_task and not _polling_task.done():
        return {"message": "Polling уже запущен"}
    
    try:
        import httpx
        import asyncio
        import logging
        logger = logging.getLogger(__name__)
        
        # Проверяем, что base_url настроен
        if not telegram_service.base_url:
            raise HTTPException(status_code=503, detail="Telegram bot base_url is not configured. Check TELEGRAM_BOT_TOKEN in .env")
        
        # Сначала удаляем webhook, если он установлен
        delete_webhook_url = f"{telegram_service.base_url}/deleteWebhook"
        try:
            async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
                await client.post(delete_webhook_url, json={"drop_pending_updates": True})
        except Exception as e:
            # Игнорируем ошибки при удалении webhook
            logger.warning(f"Could not delete webhook: {e}")
        
        # Запускаем фоновую задачу для polling
        # В FastAPI уже есть running event loop, используем его
        loop = asyncio.get_running_loop()
        _polling_task = loop.create_task(telegram_polling_worker())
        logger.info("Telegram polling task created successfully")
        
        return {
            "message": "Polling запущен. Обновления будут обрабатываться в фоне.",
            "note": "Для остановки перезапустите сервер или установите webhook"
        }
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error starting Telegram polling: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error starting polling: {str(e)}")


async def telegram_polling_worker():
    """
    Фоновая задача для polling обновлений от Telegram
    """
    if not telegram_service.is_configured():
        return
    
    import httpx
    import asyncio
    import logging
    logger = logging.getLogger(__name__)
    
    offset = 0
    base_url = telegram_service.base_url
    
    logger.info("Starting Telegram polling worker...")
    
    while True:
        try:
            url = f"{base_url}/getUpdates"
            params = {"timeout": 30, "offset": offset}
            
            async with httpx.AsyncClient(timeout=35.0, verify=False) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                result = response.json()
                
                if result.get("ok") and result.get("result"):
                    updates = result["result"]
                    
                    for update in updates:
                        offset = update["update_id"] + 1
                        
                        # Обрабатываем обновление
                        await process_telegram_update(update)
                
                # Небольшая задержка перед следующим запросом
                await asyncio.sleep(1)
                
        except asyncio.CancelledError:
            logger.info("Telegram polling worker cancelled")
            break
        except Exception as e:
            logger.error(f"Error in Telegram polling worker: {e}")
            await asyncio.sleep(5)  # Ждем перед повтором при ошибке


async def process_telegram_update(update: dict):
    """
    Обрабатывает одно обновление от Telegram
    """
    from app.core.database import SessionLocal
    import logging
    logger = logging.getLogger(__name__)
    
    db = SessionLocal()
    try:
        # Обрабатываем сообщение
        if "message" in update:
            message = update["message"]
            chat_id = str(message["chat"]["id"])
            text = message.get("text", "")
            reply_to_message = message.get("reply_to_message")
            
            # Проверяем, является ли это ответом на сообщение бота (ForceReply)
            if reply_to_message and reply_to_message.get("from", {}).get("is_bot"):
                # Извлекаем ticket_id из текста исходного сообщения
                original_text = reply_to_message.get("text", "")
                import re
                match = re.search(r'тикет #(\d+)', original_text)
                if match:
                    ticket_id = int(match.group(1))
                    # Отправляем ответ в тикет
                    await create_support_reply_from_telegram(
                        ticket_id=ticket_id,
                        message_text=text,
                        telegram_chat_id=chat_id,
                        db=db
                    )
                    return
            
            # Проверяем, является ли это ответом на тикет (команда)
            if text.startswith("/reply_ticket_") or text.startswith("reply_ticket_"):
                parts = text.split(" ", 1)
                ticket_id_str = parts[0].replace("/reply_ticket_", "").replace("reply_ticket_", "")
                reply_text = parts[1] if len(parts) > 1 else ""
                
                try:
                    ticket_id = int(ticket_id_str)
                    await create_support_reply_from_telegram(
                        ticket_id=ticket_id,
                        message_text=reply_text,
                        telegram_chat_id=chat_id,
                        db=db
                    )
                except ValueError:
                    await telegram_service.send_message(
                        chat_id=chat_id,
                        text="❌ Неверный формат команды. Используйте: /reply_ticket_<ID> <текст ответа>"
                    )
            elif text.startswith("/close_ticket_") or text.startswith("close_ticket_"):
                ticket_id_str = text.replace("/close_ticket_", "").replace("close_ticket_", "").strip()
                try:
                    ticket_id = int(ticket_id_str)
                    await close_ticket_from_telegram(
                        ticket_id=ticket_id,
                        telegram_chat_id=chat_id,
                        db=db
                    )
                except ValueError:
                    await telegram_service.send_message(
                        chat_id=chat_id,
                        text="❌ Неверный формат команды. Используйте: /close_ticket_<ID>"
                    )
            elif text.startswith("/tickets") or text.startswith("/list"):
                try:
                    # Показываем список активных тикетов
                    logger.info(f"Processing /tickets or /list command from chat_id: {chat_id}")
                    tickets = await get_active_tickets_for_telegram(chat_id, db)
                    logger.info(f"Found {len(tickets)} active tickets")
                    
                    if not tickets:
                        await telegram_service.send_message(
                            chat_id=chat_id,
                            text="✅ Нет активных тикетов"
                        )
                    else:
                        # Формируем inline-клавиатуру со списком тикетов
                        keyboard = []
                        for ticket in tickets[:10]:  # Максимум 10 тикетов
                            user = db.query(User).filter(User.id == ticket.user_id).first()
                            user_name = user.username if user else "Неизвестно"
                            status_emoji = "🆕" if ticket.status == TicketStatus.NEW else "🔄"
                            button_text = f"{status_emoji} #{ticket.id}: {ticket.subject[:30]}"
                            if len(ticket.subject) > 30:
                                button_text += "..."
                            keyboard.append([{
                                "text": button_text,
                                "callback_data": f"view_ticket_{ticket.id}"
                            }])
                        
                        # Добавляем кнопку обновления списка
                        keyboard.append([{
                            "text": "🔄 Обновить список",
                            "callback_data": "list_tickets"
                        }])
                        
                        # Для списка тикетов используем только inline-клавиатуру
                        # (нельзя одновременно использовать inline_keyboard и keyboard)
                        reply_markup = {"inline_keyboard": keyboard}
                        
                        result = await telegram_service.send_message(
                            chat_id=chat_id,
                            text=f"📋 <b>Активные тикеты ({len(tickets)}):</b>\n\nВыберите тикет для просмотра:",
                            reply_markup=reply_markup
                        )
                        if not result:
                            logger.error(f"Failed to send message to chat_id: {chat_id}")
                except Exception as e:
                    logger.error(f"Error processing /tickets command: {e}", exc_info=True)
                    await telegram_service.send_message(
                        chat_id=chat_id,
                        text=f"❌ Ошибка при получении списка тикетов: {str(e)}"
                    )
            elif text.startswith("/start"):
                await telegram_service.send_message(
                    chat_id=chat_id,
                    text="👋 Добро пожаловать! Я бот поддержки EDMS.\n\n"
                         "<b>Доступные команды:</b>\n"
                         "/tickets - Список активных тикетов\n"
                         "/reply_ticket_&lt;ID&gt; &lt;текст&gt; - Ответить на тикет\n"
                         "/close_ticket_&lt;ID&gt; - Закрыть тикет\n"
                         "/help - Справка",
                    reply_markup=telegram_service.get_persistent_keyboard()
                )
            elif text.startswith("/help"):
                await telegram_service.send_message(
                    chat_id=chat_id,
                    text="📋 <b>Доступные команды:</b>\n\n"
                         "/tickets - Список активных тикетов\n"
                         "/reply_ticket_&lt;ID&gt; &lt;текст&gt; - Ответить на тикет\n"
                         "/close_ticket_&lt;ID&gt; - Закрыть тикет\n"
                         "/help - Показать эту справку",
                    reply_markup=telegram_service.get_persistent_keyboard()
                )
        
        # Обрабатываем callback query
        elif "callback_query" in update:
            callback_query = update["callback_query"]
            chat_id = str(callback_query["from"]["id"])
            callback_data = callback_query.get("data", "")
            
            # Отвечаем на callback query
            try:
                import httpx
                callback_query_id = callback_query["id"]
                answer_url = f"{telegram_service.base_url}/answerCallbackQuery"
                async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
                    await client.post(answer_url, json={
                        "callback_query_id": callback_query_id
                    })
            except Exception as e:
                logger.error(f"Error answering callback query: {e}")
            
            if callback_data.startswith("reply_ticket_"):
                ticket_id_str = callback_data.replace("reply_ticket_", "")
                try:
                    ticket_id = int(ticket_id_str)
                    # Отправляем сообщение с ForceReply для удобства ответа
                    reply_markup = {
                        "force_reply": True,
                        "input_field_placeholder": f"Введите ваш ответ на тикет #{ticket_id}..."
                    }
                    await telegram_service.send_message(
                        chat_id=chat_id,
                        text=f"💬 <b>Ответ на тикет #{ticket_id}</b>\n\n"
                             f"Введите ваш ответ ниже. Или используйте команду:\n"
                             f"<code>/reply_ticket_{ticket_id} ваш ответ</code>",
                        reply_markup=reply_markup
                    )
                except ValueError:
                    pass
            elif callback_data.startswith("close_ticket_"):
                ticket_id_str = callback_data.replace("close_ticket_", "")
                try:
                    ticket_id = int(ticket_id_str)
                    await close_ticket_from_telegram(
                        ticket_id=ticket_id,
                        telegram_chat_id=chat_id,
                        db=db
                    )
                except ValueError:
                    pass
            elif callback_data.startswith("reopen_ticket_"):
                ticket_id_str = callback_data.replace("reopen_ticket_", "")
                try:
                    ticket_id = int(ticket_id_str)
                    await reopen_ticket_from_telegram(
                        ticket_id=ticket_id,
                        telegram_chat_id=chat_id,
                        db=db
                    )
                except ValueError:
                    pass
            elif callback_data.startswith("view_ticket_"):
                ticket_id_str = callback_data.replace("view_ticket_", "")
                try:
                    ticket_id = int(ticket_id_str)
                    await show_ticket_details_in_telegram(
                        ticket_id=ticket_id,
                        telegram_chat_id=chat_id,
                        db=db
                    )
                except ValueError:
                    pass
            elif callback_data == "list_tickets":
                # Показываем список активных тикетов
                tickets = await get_active_tickets_for_telegram(chat_id, db)
                
                if not tickets:
                    await telegram_service.send_message(
                        chat_id=chat_id,
                        text="✅ Нет активных тикетов"
                    )
                else:
                    # Формируем inline-клавиатуру со списком тикетов
                    keyboard = []
                    for ticket in tickets[:10]:  # Максимум 10 тикетов
                        user = db.query(User).filter(User.id == ticket.user_id).first()
                        user_name = user.username if user else "Неизвестно"
                        status_emoji = "🆕" if ticket.status == TicketStatus.NEW else "🔄"
                        button_text = f"{status_emoji} #{ticket.id}: {ticket.subject[:30]}"
                        if len(ticket.subject) > 30:
                            button_text += "..."
                        keyboard.append([{
                            "text": button_text,
                            "callback_data": f"view_ticket_{ticket.id}"
                        }])
                    
                    # Добавляем кнопку обновления списка
                    keyboard.append([{
                        "text": "🔄 Обновить список",
                        "callback_data": "list_tickets"
                    }])
                    
                    reply_markup = {"inline_keyboard": keyboard}
                    
                    await telegram_service.send_message(
                        chat_id=chat_id,
                        text=f"📋 <b>Активные тикеты ({len(tickets)}):</b>\n\nВыберите тикет для просмотра:",
                        reply_markup=reply_markup
                    )
    except Exception as e:
        logger.error(f"Error processing Telegram update: {e}")
    finally:
        db.close()

