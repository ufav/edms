"""
Support tickets WebSocket endpoints
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
import json
import logging

from app.core.database import get_db
from app.models.user import User
from app.models.support import SupportTicket
from app.services.auth import decode_token
from app.services.websocket_manager import connection_manager

router = APIRouter()
logger = logging.getLogger(__name__)


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
                logger.error(f"WebSocket error: {e}")
            finally:
                connection_manager.disconnect(ticket_id, user.id)
        finally:
            db.close()
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass

