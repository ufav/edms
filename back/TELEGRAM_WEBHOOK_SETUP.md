# Пошаговая настройка Telegram webhook

## Предварительные требования

✅ SSL сертификат установлен и работает (`https://docste.kz`)  
✅ Домен доступен по HTTPS  
✅ Бот создан через @BotFather  

---

## Шаг 1: Получение токена бота

### 1.1. Создайте бота (если еще не создан)

1. Откройте Telegram и найдите [@BotFather](https://t.me/botfather)
2. Отправьте команду `/newbot`
3. Следуйте инструкциям:
   - Введите имя бота (например, "EDMS Support Bot")
   - Введите username бота (должен заканчиваться на `bot`, например, `edms_support_bot`)
4. **Скопируйте токен** - он будет выглядеть как: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

---

## Шаг 2: Получение chat_id администратора

### 2.1. Напишите боту любое сообщение

1. Найдите вашего бота в Telegram (по username, который вы указали)
2. Напишите ему любое сообщение (например, `/start`)

### 2.2. Получите chat_id через API

**Вариант 1: Через веб-интерфейс (если вы администратор)**

1. Войдите в веб-интерфейс как администратор
2. Откройте профиль (правый верхний угол)
3. Найдите пункт "Start Telegram Polling" или используйте API:
   ```
   GET /api/v1/support/telegram/get-chat-id
   ```
4. Скопируйте `chat_id` из ответа

**Вариант 2: Через бота @userinfobot**

1. Найдите [@userinfobot](https://t.me/userinfobot) в Telegram
2. Напишите ему `/start`
3. Он покажет ваш `chat_id` (число, например, `123456789`)

---

## Шаг 3: Настройка переменных окружения

### 3.1. Откройте файл `.env` на сервере

```bash
cd /home/ubuntu/edms/back
nano .env
# или
vi .env
```

### 3.2. Добавьте следующие переменные:

```env
# ===========================
# Telegram Bot Settings
# ===========================
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_ADMIN_CHAT_ID=123456789
TELEGRAM_WEBHOOK_SECRET=your_random_secret_here
```

**Где:**
- `TELEGRAM_BOT_TOKEN` - токен бота от BotFather
- `TELEGRAM_ADMIN_CHAT_ID` - ваш chat_id (число)
- `TELEGRAM_WEBHOOK_SECRET` - случайная строка для безопасности (опционально, но рекомендуется)

### 3.3. Сгенерируйте секретный ключ (опционально)

```bash
openssl rand -hex 32
```

Скопируйте результат в `TELEGRAM_WEBHOOK_SECRET`.

### 3.4. Сохраните файл

- В nano: `Ctrl+O`, затем `Enter`, затем `Ctrl+X`
- В vi: `:wq`, затем `Enter`

---

## Шаг 4: Перезапуск backend

### 4.1. Перезапустите backend контейнер

```bash
cd /home/ubuntu/edms
docker-compose restart back
```

### 4.2. Проверьте логи

```bash
docker-compose logs back | tail -20
```

Убедитесь, что нет ошибок при запуске.

---

## Шаг 5: Установка webhook

### 5.1. Войдите в веб-интерфейс как администратор

1. Откройте `https://docste.kz`
2. Войдите как администратор

### 5.2. Установите webhook через API

**Вариант 1: Через веб-интерфейс (если есть кнопка)**

1. Откройте профиль (правый верхний угол)
2. Найдите пункт для настройки Telegram webhook
3. Введите URL: `https://docste.kz/api/v1/support/telegram/webhook`
4. Нажмите "Установить"

**Вариант 2: Через curl (с токеном авторизации)**

```bash
# Сначала получите токен авторизации (войдите в веб-интерфейс и откройте DevTools → Network)
# Найдите запрос с Authorization header и скопируйте токен

curl -X POST "https://docste.kz/api/v1/support/telegram/setup-webhook?webhook_url=https://docste.kz/api/v1/support/telegram/webhook" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Вариант 3: Вручную через Telegram API**

```bash
# Замените YOUR_BOT_TOKEN на токен вашего бота
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://docste.kz/api/v1/support/telegram/webhook",
    "secret_token": "your_webhook_secret_here"
  }'
```

**Замените:**
- `YOUR_BOT_TOKEN` - токен бота
- `your_webhook_secret_here` - значение из `TELEGRAM_WEBHOOK_SECRET` (если установлен)

---

## Шаг 6: Проверка webhook

### 6.1. Проверьте статус webhook

```bash
# Замените YOUR_BOT_TOKEN на токен вашего бота
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

Должно показать:
```json
{
  "ok": true,
  "result": {
    "url": "https://docste.kz/api/v1/support/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "last_error_date": 0,
    "last_error_message": "",
    "max_connections": 40
  }
}
```

### 6.2. Проверьте работу бота

1. Откройте вашего бота в Telegram
2. Отправьте команду `/start`
3. Бот должен ответить приветственным сообщением

### 6.3. Проверьте логи backend

```bash
docker-compose logs back | grep -i telegram | tail -20
```

Должны увидеть логи обработки сообщений от Telegram.

---

## Шаг 7: Тестирование функционала

### 7.1. Создайте тикет через веб-интерфейс

1. Откройте `https://docste.kz`
2. Создайте новый тикет поддержки
3. В Telegram боте должно появиться уведомление о новом тикете

### 7.2. Ответьте на тикет через бота

1. В Telegram боте нажмите "📋 Тикеты" (или отправьте `/tickets`)
2. Выберите тикет
3. Нажмите "Ответить" (или "Reply")
4. Введите ответ
5. В веб-интерфейсе должно появиться ваше сообщение

### 7.3. Проверьте уведомления

1. Создайте тикет от обычного пользователя
2. Ответьте на тикет через бота
3. Пользователь должен получить уведомление в веб-интерфейсе

---

## Troubleshooting

### Проблема: "Webhook URL returns 404"

**Решение:**
1. Проверьте, что URL правильный: `https://docste.kz/api/v1/support/telegram/webhook`
2. Проверьте логи nginx: `docker-compose logs nginx | tail -20`
3. Убедитесь, что backend запущен: `docker-compose ps`

### Проблема: "Webhook URL is not accessible"

**Решение:**
1. Проверьте, что домен доступен: `curl -I https://docste.kz`
2. Проверьте firewall - порт 443 должен быть открыт
3. Проверьте SSL сертификат: `openssl s_client -connect docste.kz:443`

### Проблема: "Invalid webhook secret"

**Решение:**
1. Проверьте, что `TELEGRAM_WEBHOOK_SECRET` в `.env` совпадает с тем, что вы отправили в webhook
2. Перезапустите backend: `docker-compose restart back`

### Проблема: Бот не отвечает

**Решение:**
1. Проверьте логи backend: `docker-compose logs back | grep -i telegram`
2. Проверьте, что переменные окружения установлены: `docker-compose exec back env | grep TELEGRAM`
3. Проверьте статус webhook: `curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"`

### Проблема: "Telegram bot is not configured"

**Решение:**
1. Проверьте, что все переменные в `.env` установлены:
   ```bash
   docker-compose exec back env | grep TELEGRAM
   ```
2. Перезапустите backend: `docker-compose restart back`

---

## Чек-лист

- [ ] Бот создан через @BotFather
- [ ] Токен бота скопирован
- [ ] Chat ID администратора получен
- [ ] Переменные окружения добавлены в `.env`
- [ ] Backend перезапущен
- [ ] Webhook установлен
- [ ] Webhook проверен через API
- [ ] Бот отвечает на команды
- [ ] Создание тикета работает
- [ ] Ответ на тикет работает
- [ ] Уведомления приходят пользователям

---

## Готово! ✅

Теперь у вас настроен Telegram бот для поддержки:
- ✅ Пользователи создают тикеты через веб-интерфейс
- ✅ Администраторы получают уведомления в Telegram
- ✅ Администраторы могут отвечать на тикеты через бота
- ✅ Пользователи получают уведомления в веб-интерфейсе

