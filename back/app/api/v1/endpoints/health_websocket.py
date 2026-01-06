"""
Health check WebSocket endpoint
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import json
import logging

from app.core.database import get_db
from app.models.user import User
from app.services.auth import decode_token

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/health")
async def health_websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint для проверки соединения с сервером
    Использует ping/pong механизм для keep-alive
    """
    await websocket.accept()
    
    try:
        # Получаем токен из query параметров (опционально, для аутентифицированных пользователей)
        token = websocket.query_params.get("token")
        user_id = None
        
        if token:
            try:
                payload = decode_token(token)
                if payload:
                    username = payload.get("sub")
                    if username:
                        db = next(get_db())
                        try:
                            user = db.query(User).filter(User.username == username).first()
                            if user and user.is_active:
                                user_id = user.id
                        finally:
                            db.close()
            except Exception:
                # Если токен невалидный, продолжаем без аутентификации
                pass
        
        # Отправляем подтверждение подключения
        await websocket.send_json({
            "type": "connected",
            "status": "healthy",
            "user_id": user_id
        })
        
        # Ожидаем ping сообщения от клиента
        while True:
            try:
                data = await websocket.receive_text()
                
                # Обрабатываем ping для keep-alive
                try:
                    ping_data = json.loads(data)
                    if ping_data.get("type") == "ping":
                        await websocket.send_json({
                            "type": "pong",
                            "status": "healthy"
                        })
                        continue
                except:
                    # Если не JSON, проверяем как текст
                    if data == "ping" or data.strip() == "ping":
                        await websocket.send_json({
                            "type": "pong",
                            "status": "healthy"
                        })
                        continue
                
                # Для других сообщений просто отвечаем pong
                await websocket.send_json({
                    "type": "pong",
                    "status": "healthy"
                })
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in health websocket: {e}")
                break
                
    except Exception as e:
        logger.error(f"Error in health websocket endpoint: {e}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass
