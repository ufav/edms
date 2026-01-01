# Инструкция по развертыванию Telegram бота на удаленном сервере

## 1. Переменные окружения

Добавьте в `.env` файл на удаленном сервере:

```env
# Telegram Bot Settings
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ADMIN_CHAT_ID=your_admin_chat_id_here
TELEGRAM_WEBHOOK_SECRET=your_secret_token_here  # Опционально, для безопасности

# Важно для production!
DEBUG=0  # Установите 0 для production (автоматически включит verify=True для SSL)
```

### Как получить значения:

1. **TELEGRAM_BOT_TOKEN**: 
   - Создайте бота через [@BotFather](https://t.me/botfather) в Telegram
   - Отправьте команду `/newbot` и следуйте инструкциям
   - Скопируйте полученный токен

2. **TELEGRAM_ADMIN_CHAT_ID**:
   - Напишите боту любое сообщение
   - Используйте endpoint `/api/v1/support/telegram/get-chat-id` (требует авторизации администратора)
   - Или используйте бота [@userinfobot](https://t.me/userinfobot) - он покажет ваш chat_id

3. **TELEGRAM_WEBHOOK_SECRET** (опционально):
   - Сгенерируйте случайную строку (например, через `openssl rand -hex 32`)
   - Используется для защиты webhook от несанкционированного доступа

## 2. Миграции базы данных

**Важно**: Перед развертыванием на production необходимо применить миграцию для таблицы `notifications`:

```bash
cd back
alembic upgrade head
```

Миграция `create_notifications_table.py` создаст:
- Таблицу `notifications` для хранения уведомлений пользователей
- Таблицу `audit_logs` для аудита действий (если еще не создана)

Если миграция уже применена локально, она автоматически применится и на production при выполнении `alembic upgrade head`.

## 3. Настройка Webhook (для production)

**Важно**: На удаленном сервере нужно использовать **webhook**, а не polling!

### Требования для webhook:
- ✅ Сервер должен быть доступен по **HTTPS** (Telegram требует SSL)
- ✅ Домен должен быть валидным (не localhost)
- ✅ URL должен быть публично доступен (Telegram должен иметь возможность отправить POST запрос)

### Установка webhook:

**После развертывания на сервере:**

1. **Через API** (рекомендуется):
   ```bash
   # После авторизации как администратор в веб-интерфейсе
   # Используйте браузер или curl:
   curl -X POST "https://your-domain.com/api/v1/support/telegram/setup-webhook?webhook_url=https://your-domain.com/api/v1/support/telegram/webhook" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

2. **Вручную через Telegram API** (если нет доступа к веб-интерфейсу):
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://your-domain.com/api/v1/support/telegram/webhook",
       "secret_token": "your_webhook_secret"
     }'
   ```

### Проверка webhook:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## 4. SSL сертификат

Telegram требует HTTPS для webhook. Убедитесь, что:
- ✅ У вас есть валидный SSL сертификат (Let's Encrypt, Cloudflare, и т.д.)
- ✅ Сервер настроен на HTTPS
- ✅ Nginx/другой reverse proxy правильно проксирует запросы на FastAPI
- ✅ Порт 443 открыт в firewall

### Пример конфигурации Nginx:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/v1/support/telegram/webhook {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 5. Проверка работы

1. **Проверьте, что бот отвечает**:
   - Напишите боту `/start` или `/help`
   - Должен прийти ответ

2. **Проверьте создание тикета**:
   - Создайте тикет через веб-интерфейс
   - В Telegram боте должно появиться уведомление

3. **Проверьте ответ на тикет**:
   - Ответьте на тикет через бота
   - В веб-интерфейсе должно появиться сообщение и уведомление

## 6. Отличия от локальной разработки

| Локально | Production |
|----------|-----------|
| Polling (через кнопку в UI) | Webhook (автоматически) |
| `verify=False` в httpx (для обхода SSL ошибок) | `verify=True` (автоматически, если `DEBUG=False`) |
| HTTP (localhost) | HTTPS (обязательно) |
| Можно использовать ngrok для тестирования | Публичный домен с SSL |

### Автоматическое переключение:

Код автоматически определяет окружение:
- Если `DEBUG=True` в `.env` → используется `verify=False` (для локальной разработки)
- Если `DEBUG=False` в `.env` → используется `verify=True` (для production)

**Убедитесь, что на production сервере установлено:**
```env
DEBUG=0
```

## 7. Troubleshooting

### Бот не отвечает:
- ✅ Проверьте, что webhook установлен: 
  ```bash
  curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
  ```
- ✅ Проверьте логи сервера на наличие ошибок
- ✅ Убедитесь, что `TELEGRAM_BOT_TOKEN` и `TELEGRAM_ADMIN_CHAT_ID` установлены в `.env`
- ✅ Проверьте, что переменные окружения загружены (перезапустите сервер после изменения `.env`)

### Webhook не работает:
- ✅ Проверьте, что сервер доступен по HTTPS извне:
  ```bash
  curl -I https://your-domain.com/api/v1/support/telegram/webhook
  ```
- ✅ Проверьте, что URL webhook правильный и доступен извне
- ✅ Проверьте логи Nginx/сервера на наличие ошибок 404/500
- ✅ Убедитесь, что reverse proxy правильно проксирует запросы
- ✅ Проверьте firewall - порт 443 должен быть открыт

### Уведомления не приходят:
- ✅ Проверьте, что таблица `notifications` существует в БД:
  ```sql
  SELECT * FROM notifications LIMIT 1;
  ```
- ✅ Проверьте логи на наличие ошибок при создании уведомлений
- ✅ Убедитесь, что миграции применены: `alembic upgrade head`
- ✅ Проверьте, что `related_entity_type` и `related_entity_id` правильно устанавливаются

### Ошибки SSL:
- ✅ Если видите `CERTIFICATE_VERIFY_FAILED` - проверьте, что `DEBUG=0` в `.env`
- ✅ Убедитесь, что SSL сертификат валидный и не истек

## 8. Безопасность

- ✅ **Никогда не коммитьте** `.env` файл с токенами в Git
- ✅ Используйте `TELEGRAM_WEBHOOK_SECRET` для защиты webhook от несанкционированного доступа
- ✅ Ограничьте доступ к endpoint `/api/v1/support/telegram/webhook` только для Telegram IP (опционально, но рекомендуется)
- ✅ Регулярно обновляйте зависимости: `pip install -r requirements.txt --upgrade`
- ✅ Используйте сильные пароли для `TELEGRAM_WEBHOOK_SECRET`

### IP адреса Telegram для whitelist (опционально):
Telegram использует следующие IP диапазоны (могут изменяться):
- 149.154.160.0/20
- 91.108.4.0/22

Можно настроить в Nginx:
```nginx
location /api/v1/support/telegram/webhook {
    allow 149.154.160.0/20;
    allow 91.108.4.0/22;
    deny all;
    # ... остальная конфигурация
}
```

## 9. Мониторинг

Рекомендуется настроить мониторинг:
- 📊 Логи ошибок Telegram API (проверяйте регулярно)
- 📊 Количество обработанных сообщений
- 📊 Статус webhook (периодически проверять через API)
- 📊 Количество уведомлений, созданных за день
- 📊 Время ответа на тикеты

## 10. Чек-лист перед развертыванием

- [ ] Переменные окружения установлены в `.env` на сервере
- [ ] Миграции применены: `alembic upgrade head`
- [ ] SSL сертификат настроен и валиден
- [ ] Webhook установлен и работает
- [ ] `DEBUG=0` в `.env` на production
- [ ] Бот отвечает на команды `/start` и `/help`
- [ ] Создание тикета работает (проверено через веб-интерфейс)
- [ ] Ответ на тикет через бота работает
- [ ] Уведомления приходят пользователям
- [ ] Логи не содержат критических ошибок
