"""
Support tickets Telegram integration endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
import re
import asyncio
import logging
import httpx

from app.core.database import get_db, SessionLocal
from app.core.config import settings
from app.models.user import User
from app.models.support import SupportTicket, SupportMessage, TicketStatus
from app.models.notification import Notification
from app.services.auth import get_current_active_user
from app.services.websocket_manager import connection_manager
from app.services.telegram_service import telegram_service

router = APIRouter()
logger = logging.getLogger(__name__)

# Глобальная переменная для хранения задачи polling
_polling_task = None


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
        # Получаем последние обновления от Telegram
        url = f"{telegram_service.base_url}/getUpdates"
        # В production используем verify=True, в development - verify=False
        verify_ssl = not settings.DEBUG
        async with httpx.AsyncClient(timeout=10.0, verify=verify_ssl) as client:
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
            
            return {"message": "Нет обновлений от Telegram. Отправьте сообщение боту и попробуйте снова."}
    except Exception as e:
        logger.error(f"Error getting Telegram chat_id: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting chat_id: {str(e)}")


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
        await process_telegram_update(data, db)
        
        return {"ok": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing Telegram webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing webhook: {str(e)}")


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
        url = f"{telegram_service.base_url}/setWebhook"
        payload = {
            "url": webhook_url,
        }
        
        # Добавляем секретный токен, если он настроен
        if settings.TELEGRAM_WEBHOOK_SECRET:
            payload["secret_token"] = settings.TELEGRAM_WEBHOOK_SECRET
        
        # В production используем verify=True, в development - verify=False
        verify_ssl = not settings.DEBUG
        async with httpx.AsyncClient(timeout=10.0, verify=verify_ssl) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            
            if result.get("ok"):
                return {"message": "Webhook установлен успешно", "url": webhook_url}
            else:
                raise HTTPException(status_code=400, detail=result.get("description", "Unknown error"))
    except Exception as e:
        logger.error(f"Error setting up Telegram webhook: {e}")
        raise HTTPException(status_code=500, detail=f"Error setting up webhook: {str(e)}")


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
        # Проверяем, что base_url настроен
        if not telegram_service.base_url:
            raise HTTPException(status_code=503, detail="Telegram bot base_url is not configured. Check TELEGRAM_BOT_TOKEN in .env")
        
        # Сначала удаляем webhook, если он установлен
        delete_webhook_url = f"{telegram_service.base_url}/deleteWebhook"
        try:
            # В production используем verify=True, в development - verify=False
            verify_ssl = not settings.DEBUG
            async with httpx.AsyncClient(timeout=10.0, verify=verify_ssl) as client:
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
        logger.error(f"Error starting Telegram polling: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error starting polling: {str(e)}")


async def telegram_polling_worker():
    """
    Фоновая задача для polling обновлений от Telegram
    """
    if not telegram_service.is_configured():
        return
    
    offset = 0
    base_url = telegram_service.base_url
    
    logger.info("Starting Telegram polling worker...")
    
    while True:
        try:
            url = f"{base_url}/getUpdates"
            params = {"timeout": 30, "offset": offset}
            
            # В production используем verify=True, в development - verify=False
            verify_ssl = not settings.DEBUG
            async with httpx.AsyncClient(timeout=35.0, verify=verify_ssl) as client:
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


async def process_telegram_update(update: dict, db: Session = None):
    """
    Обрабатывает одно обновление от Telegram
    """
    if db is None:
        db = SessionLocal()
        should_close = True
    else:
        should_close = False
    
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
            elif text.startswith("/tickets") or text.startswith("/list") or "Тикеты" in text or text.strip() == "📋 Тикеты":
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
            elif text.startswith("/help") or "Справка" in text or text.strip() == "❓ Справка":
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
                if not telegram_service.base_url:
                    logger.error("Telegram bot base_url is not set. Check TELEGRAM_BOT_TOKEN in .env")
                else:
                    callback_query_id = callback_query["id"]
                    answer_url = f"{telegram_service.base_url}/answerCallbackQuery"
                    # В production используем verify=True, в development - verify=False
                    verify_ssl = not settings.DEBUG
                    async with httpx.AsyncClient(timeout=10.0, verify=verify_ssl) as client:
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
                        text=f"💬 <b>Ответ на тикет #{ticket_id}</b>",
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
    finally:
        if should_close:
            db.close()


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
    from datetime import datetime, timezone
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
        logger.error(f"Error broadcasting ticket closure via WebSocket: {e}")
    
    # Создаем уведомление для пользователя
    try:
        from app.services.notification_service import NotificationService
        notification_service = NotificationService()
        
        await notification_service.create_notification(
            user_id=ticket.user_id,
            type="ticket_closed",
            title=f"Тикет #{ticket_id} закрыт",
            message=f'Ваш тикет "{ticket.subject}" был закрыт поддержкой.',
            document_id=None,
            related_entity_type="support_ticket",
            related_entity_id=ticket_id
        )
    except Exception as e:
        logger.error(f"Error creating notification for ticket closed: {e}")


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
    from datetime import datetime, timezone
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
    from datetime import datetime, timezone
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
        logger.error(f"Error broadcasting message via WebSocket: {e}")
    
    # Создаем уведомление для пользователя
    try:
        from app.services.notification_service import NotificationService
        notification_service = NotificationService()
        
        # Обрезаем текст сообщения для уведомления (если слишком длинный)
        notification_message = message_text[:200] + "..." if len(message_text) > 200 else message_text
        
        await notification_service.create_notification(
            user_id=ticket.user_id,
            type="support_reply",
            title=f"Ответ по тикету #{ticket_id}",
            message=f"Поддержка ответила на ваш тикет \"{ticket.subject}\":\n{notification_message}",
            priority="high",
            document_id=None,
            related_entity_type="support_ticket",
            related_entity_id=ticket_id
        )
    except Exception as e:
        logger.error(f"Error creating notification for ticket reply: {e}")

