"""
WebSocket Connection Manager для управления подключениями к тикетам поддержки
"""
from typing import Dict, Set
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Менеджер для управления WebSocket подключениями к тикетам"""
    
    def __init__(self):
        # Структура: {ticket_id: {user_id: websocket}}
        self.active_connections: Dict[int, Dict[int, WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, ticket_id: int, user_id: int):
        """Подключение пользователя к тикету"""
        # Соединение уже принято в endpoint, не нужно вызывать accept() здесь
        
        if ticket_id not in self.active_connections:
            self.active_connections[ticket_id] = {}
        
        # Если у пользователя уже есть подключение к этому тикету, закрываем старое
        if user_id in self.active_connections[ticket_id]:
            try:
                await self.active_connections[ticket_id][user_id].close()
            except Exception as e:
                logger.warning(f"Error closing old connection: {e}")
        
        self.active_connections[ticket_id][user_id] = websocket
        logger.info(f"User {user_id} connected to ticket {ticket_id}")
    
    def disconnect(self, ticket_id: int, user_id: int):
        """Отключение пользователя от тикета"""
        if ticket_id in self.active_connections:
            if user_id in self.active_connections[ticket_id]:
                del self.active_connections[ticket_id][user_id]
                logger.info(f"User {user_id} disconnected from ticket {ticket_id}")
            
            # Если больше нет подключений к тикету, удаляем его
            if not self.active_connections[ticket_id]:
                del self.active_connections[ticket_id]
    
    async def send_personal_message(self, message: dict, ticket_id: int, user_id: int):
        """Отправка сообщения конкретному пользователю"""
        if ticket_id in self.active_connections:
            if user_id in self.active_connections[ticket_id]:
                try:
                    websocket = self.active_connections[ticket_id][user_id]
                    await websocket.send_json(message)
                    return True
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    self.disconnect(ticket_id, user_id)
                    return False
        return False
    
    async def broadcast_to_ticket(self, message: dict, ticket_id: int, exclude_user_id: int = None):
        """Отправка сообщения всем подключенным к тикету пользователям"""
        if ticket_id not in self.active_connections:
            return
        
        disconnected_users = []
        for user_id, websocket in self.active_connections[ticket_id].items():
            if exclude_user_id and user_id == exclude_user_id:
                continue
            
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to user {user_id}: {e}")
                disconnected_users.append(user_id)
        
        # Удаляем отключенных пользователей
        for user_id in disconnected_users:
            self.disconnect(ticket_id, user_id)
    
    def get_connected_users(self, ticket_id: int) -> Set[int]:
        """Получить список подключенных пользователей к тикету"""
        if ticket_id in self.active_connections:
            return set(self.active_connections[ticket_id].keys())
        return set()


# Глобальный экземпляр менеджера
connection_manager = ConnectionManager()

