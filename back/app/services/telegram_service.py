"""
Telegram Bot service for support tickets integration
"""

import logging
import httpx
from typing import Optional, List
from app.core.config import settings

logger = logging.getLogger(__name__)


class TelegramService:
    """Сервис для работы с Telegram ботом"""
    
    def __init__(self):
        self.bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
        self.admin_chat_id = getattr(settings, 'TELEGRAM_ADMIN_CHAT_ID', None)
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}" if self.bot_token else None
    
    def is_configured(self) -> bool:
        """Проверяет, настроен ли Telegram бот"""
        return self.bot_token is not None and self.admin_chat_id is not None
    
    def get_persistent_keyboard(self) -> dict:
        """
        Возвращает постоянную клавиатуру с основными командами
        
        Returns:
            dict: ReplyKeyboardMarkup для постоянной клавиатуры
        """
        return {
            "keyboard": [
                [
                    {"text": "📋 Тикеты"},
                    {"text": "❓ Справка"}
                ]
            ],
            "resize_keyboard": True,
            "persistent": True
        }
    
    async def send_message(
        self,
        chat_id: str,
        text: str,
        parse_mode: str = "HTML",
        reply_markup: Optional[dict] = None
    ) -> bool:
        """
        Отправляет сообщение в Telegram
        
        Args:
            chat_id: ID чата в Telegram
            text: Текст сообщения
            parse_mode: Режим парсинга (HTML или Markdown)
            reply_markup: Клавиатура для ответа (опционально)
        
        Returns:
            True если сообщение отправлено успешно, False в противном случае
        """
        if not self.is_configured():
            logger.warning("Telegram bot is not configured")
            return False
        
        if not self.base_url:
            logger.error("Telegram bot base_url is not set. Check TELEGRAM_BOT_TOKEN in .env")
            return False
        
        try:
            url = f"{self.base_url}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": parse_mode,
            }
            
            if reply_markup:
                payload["reply_markup"] = reply_markup
            
            # В production используем verify=True, в development - verify=False
            verify_ssl = not settings.DEBUG
            async with httpx.AsyncClient(timeout=10.0, verify=verify_ssl) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Error sending Telegram message: {e}")
            return False
    
    async def send_photo(
        self,
        chat_id: str,
        photo_url: str,
        caption: Optional[str] = None
    ) -> bool:
        """
        Отправляет фото в Telegram
        
        Args:
            chat_id: ID чата в Telegram
            photo_url: URL фото
            caption: Подпись к фото (опционально)
        
        Returns:
            True если фото отправлено успешно, False в противном случае
        """
        if not self.is_configured():
            logger.warning("Telegram bot is not configured")
            return False
        
        try:
            url = f"{self.base_url}/sendPhoto"
            payload = {
                "chat_id": chat_id,
                "photo": photo_url,
            }
            
            if caption:
                payload["caption"] = caption
                payload["parse_mode"] = "HTML"
            
            # В production используем verify=True, в development - verify=False
            verify_ssl = not settings.DEBUG
            async with httpx.AsyncClient(timeout=30.0, verify=verify_ssl) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Error sending Telegram photo: {e}")
            return False
    
    async def send_photo_bytes(
        self,
        chat_id: str,
        photo_bytes: bytes,
        caption: Optional[str] = None,
        filename: Optional[str] = None
    ) -> bool:
        """
        Отправляет фото в Telegram из bytes
        
        Args:
            chat_id: ID чата в Telegram
            photo_bytes: Содержимое фото в виде bytes
            caption: Подпись к фото (опционально)
            filename: Имя файла (опционально)
        
        Returns:
            True если фото отправлено успешно, False в противном случае
        """
        if not self.is_configured():
            logger.warning("Telegram bot is not configured")
            return False
        
        try:
            url = f"{self.base_url}/sendPhoto"
            
            # Используем multipart/form-data для отправки файла
            # httpx требует кортеж (filename, content, content_type) или (filename, content)
            files = {
                'photo': (filename or 'photo.jpg', photo_bytes)
            }
            
            data = {
                "chat_id": chat_id,
            }
            
            if caption:
                data["caption"] = caption
                data["parse_mode"] = "HTML"
            
            # В production используем verify=True, в development - verify=False
            verify_ssl = not settings.DEBUG
            async with httpx.AsyncClient(timeout=30.0, verify=verify_ssl) as client:
                response = await client.post(url, data=data, files=files)
                response.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Error sending Telegram photo from bytes: {e}")
            return False
    
    async def send_ticket_notification(
        self,
        ticket_id: int,
        user_name: str,
        subject: str,
        message: str,
        has_files: bool = False,
        files: Optional[List[dict]] = None
    ) -> bool:
        """
        Отправляет уведомление о новом тикете администратору
        
        Args:
            ticket_id: ID тикета
            user_name: Имя пользователя
            subject: Тема тикета
            message: Первое сообщение
            has_files: Есть ли прикрепленные файлы
            files: Список файлов с информацией (id, file_path, mime_type, file_name)
        
        Returns:
            True если уведомление отправлено успешно
        """
        if not self.is_configured():
            return False
        
        text = f"🔔 <b>Новый тикет #{ticket_id}</b>\n\n"
        text += f"👤 <b>Пользователь:</b> {user_name}\n"
        text += f"📋 <b>Тема:</b> {subject}\n"
        if message and message.strip() and message.strip() != " ":
            text += f"💬 <b>Сообщение:</b>\n{message}\n"
        
        # Добавляем кнопки для ответа и закрытия
        reply_markup = {
            "inline_keyboard": [[
                {
                    "text": "Ответить",
                    "callback_data": f"reply_ticket_{ticket_id}"
                },
                {
                    "text": "Закрыть",
                    "callback_data": f"close_ticket_{ticket_id}"
                }
            ]]
        }
        
        # Если есть файлы-изображения, отправляем их
        if files:
            from app.services.minio_service import minio_service
            from app.core.config import settings
            
            image_files = [f for f in files if f.get('mime_type', '').startswith('image/')]
            
            if image_files:
                # Отправляем первое изображение с текстом как подпись
                first_image = image_files[0]
                try:
                    if settings.USE_MINIO:
                        # Загружаем файл из MinIO
                        file_data = await minio_service.download_file(first_image.get('file_path', ''))
                        if file_data:
                            caption = text
                            if len(image_files) > 1:
                                caption += f"\n\n📎 И еще {len(image_files) - 1} файл(ов)"
                            
                            await self.send_photo_bytes(
                                chat_id=self.admin_chat_id,
                                photo_bytes=file_data,
                                caption=caption,
                                filename=first_image.get('file_name', 'image.jpg')
                            )
                            
                            # Отправляем остальные изображения
                            for img_file in image_files[1:]:
                                try:
                                    file_data = await minio_service.download_file(img_file.get('file_path', ''))
                                    if file_data:
                                        await self.send_photo_bytes(
                                            chat_id=self.admin_chat_id,
                                            photo_bytes=file_data,
                                            filename=img_file.get('file_name', 'image.jpg')
                                        )
                                except Exception as e:
                                    logger.error(f"Error sending additional image: {e}")
                            
                            # Если есть не-изображения, отправляем текстовое сообщение
                            non_image_files = [f for f in files if not f.get('mime_type', '').startswith('image/')]
                            if non_image_files:
                                file_names = ', '.join([f.get('file_name', 'файл') for f in non_image_files])
                                await self.send_message(
                                    chat_id=self.admin_chat_id,
                                    text=f"📎 Прикреплены файлы: {file_names}",
                                    reply_markup=reply_markup
                                )
                            else:
                                # Отправляем кнопки отдельным сообщением, если все файлы - изображения
                                await self.send_message(
                                    chat_id=self.admin_chat_id,
                                    text=" ",
                                    reply_markup=reply_markup
                                )
                            return True
                except Exception as e:
                    logger.error(f"Error sending image to Telegram: {e}")
                    # Если не удалось отправить изображение, отправляем текстовое сообщение
                    text += "\n📎 Прикреплены файлы"
                    return await self.send_message(
                        chat_id=self.admin_chat_id,
                        text=text,
                        reply_markup=reply_markup
                    )
            else:
                # Если есть файлы, но не изображения
                file_names = ', '.join([f.get('file_name', 'файл') for f in files])
                text += f"\n📎 Прикреплены файлы: {file_names}"
        elif has_files:
            text += "\n📎 Прикреплены файлы"
        
        # Для уведомлений о тикетах используем только inline-клавиатуру
        # Постоянную клавиатуру устанавливаем отдельно
        return await self.send_message(
            chat_id=self.admin_chat_id,
            text=text,
            reply_markup=reply_markup
        )
    
    async def send_message_notification(
        self,
        ticket_id: int,
        user_name: str,
        message_text: str,
        sender_type: str,
        has_files: bool = False,
        files: Optional[List[dict]] = None
    ) -> bool:
        """
        Отправляет уведомление о новом сообщении в тикете
        
        Args:
            ticket_id: ID тикета
            user_name: Имя отправителя
            message_text: Текст сообщения
            sender_type: Тип отправителя ('user' или 'support')
            has_files: Есть ли прикрепленные файлы
            files: Список файлов с информацией (id, file_path, mime_type, file_name)
        
        Returns:
            True если уведомление отправлено успешно
        """
        if not self.is_configured():
            return False
        
        # Формируем текст сообщения
        if sender_type == 'user':
            text = f"💬 <b>Новое сообщение в тикете #{ticket_id}</b>\n\n"
            text += f"👤 <b>От:</b> {user_name}\n"
            if message_text and message_text.strip() and message_text.strip() != " ":
                text += f"💬 <b>Сообщение:</b>\n{message_text}\n"
        else:
            text = f"✅ <b>Ответ поддержки в тикете #{ticket_id}</b>\n\n"
            if message_text and message_text.strip() and message_text.strip() != " ":
                text += f"💬 <b>Сообщение:</b>\n{message_text}\n"
        
        # Добавляем кнопки для ответа и закрытия
        reply_markup = {
            "inline_keyboard": [[
                {
                    "text": "Ответить",
                    "callback_data": f"reply_ticket_{ticket_id}"
                },
                {
                    "text": "Закрыть",
                    "callback_data": f"close_ticket_{ticket_id}"
                }
            ]]
        }
        
        # Если есть файлы-изображения, отправляем их
        if files:
            from app.services.minio_service import minio_service
            from app.core.config import settings
            
            image_files = [f for f in files if f.get('mime_type', '').startswith('image/')]
            
            if image_files:
                # Отправляем первое изображение с текстом как подпись
                first_image = image_files[0]
                try:
                    if settings.USE_MINIO:
                        # Загружаем файл из MinIO
                        file_data = await minio_service.download_file(first_image.get('file_path', ''))
                        if file_data:
                            caption = text
                            if len(image_files) > 1:
                                caption += f"\n\n📎 И еще {len(image_files) - 1} файл(ов)"
                            
                            await self.send_photo_bytes(
                                chat_id=self.admin_chat_id,
                                photo_bytes=file_data,
                                caption=caption,
                                filename=first_image.get('file_name', 'image.jpg')
                            )
                            
                            # Отправляем остальные изображения
                            for img_file in image_files[1:]:
                                try:
                                    file_data = await minio_service.download_file(img_file.get('file_path', ''))
                                    if file_data:
                                        await self.send_photo_bytes(
                                            chat_id=self.admin_chat_id,
                                            photo_bytes=file_data,
                                            filename=img_file.get('file_name', 'image.jpg')
                                        )
                                except Exception as e:
                                    logger.error(f"Error sending additional image: {e}")
                            
                            # Если есть не-изображения, отправляем текстовое сообщение
                            non_image_files = [f for f in files if not f.get('mime_type', '').startswith('image/')]
                            if non_image_files:
                                file_names = ', '.join([f.get('file_name', 'файл') for f in non_image_files])
                                await self.send_message(
                                    chat_id=self.admin_chat_id,
                                    text=f"📎 Прикреплены файлы: {file_names}",
                                    reply_markup=reply_markup
                                )
                            else:
                                # Отправляем кнопки отдельным сообщением, если все файлы - изображения
                                await self.send_message(
                                    chat_id=self.admin_chat_id,
                                    text=" ",
                                    reply_markup=reply_markup
                                )
                            return True
                except Exception as e:
                    logger.error(f"Error sending image to Telegram: {e}")
                    # Если не удалось отправить изображение, отправляем текстовое сообщение
                    text += "\n📎 Прикреплены файлы"
                    return await self.send_message(
                        chat_id=self.admin_chat_id,
                        text=text,
                        reply_markup=reply_markup
                    )
            else:
                # Если есть файлы, но не изображения
                file_names = ', '.join([f.get('file_name', 'файл') for f in files])
                text += f"\n📎 Прикреплены файлы: {file_names}"
        
        # Для уведомлений о сообщениях используем только inline-клавиатуру
        # Постоянную клавиатуру устанавливаем отдельно
        return await self.send_message(
            chat_id=self.admin_chat_id,
            text=text,
            reply_markup=reply_markup
        )
    
    async def send_message_to_user(
        self,
        user_telegram_chat_id: str,
        ticket_id: int,
        message_text: str
    ) -> bool:
        """
        Отправляет сообщение пользователю в Telegram
        
        Args:
            user_telegram_chat_id: ID чата пользователя в Telegram
            ticket_id: ID тикета
            message_text: Текст сообщения
        
        Returns:
            True если сообщение отправлено успешно
        """
        if not self.is_configured():
            return False
        
        text = f"💬 <b>Ответ по тикету #{ticket_id}</b>\n\n"
        text += f"{message_text}"
        
        return await self.send_message(
            chat_id=user_telegram_chat_id,
            text=text
        )


# Создаем глобальный экземпляр сервиса
telegram_service = TelegramService()

