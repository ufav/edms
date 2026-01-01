# Настройка бесплатного SSL сертификата для Telegram webhook

## Вариант 1: Let's Encrypt (Рекомендуется) ✅

### Требования:
- Домен должен указывать на ваш сервер (A-запись)
- Порт 80 должен быть открыт для проверки домена

### Установка certbot:

```bash
# На сервере (Ubuntu/Debian)
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Или через Docker (если certbot установлен на хосте)
```

### Получение сертификата:

```bash
# Автоматическая настройка (certbot сам обновит nginx конфиг)
sudo certbot --nginx -d your-domain.com

# Или только получение сертификата (ручная настройка)
sudo certbot certonly --standalone -d your-domain.com
```

### После получения сертификата:

Сертификаты будут в:
- `/etc/letsencrypt/live/your-domain.com/fullchain.pem`
- `/etc/letsencrypt/live/your-domain.com/privkey.pem`

### Обновление docker-compose.yml:

```yaml
volumes:
  - ./nginx/conf.d/default.conf:/etc/nginx/conf.d/default.conf:ro
  - /etc/letsencrypt:/etc/letsencrypt:ro  # Монтируем Let's Encrypt сертификаты
```

### Обновление nginx/conf.d/default.conf:

```nginx
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

### Автоматическое обновление:

Certbot автоматически настроит cron для обновления сертификата (действителен 90 дней, обновляется автоматически).

---

## Вариант 2: Cloudflare SSL (Если домен на Cloudflare) ✅

### Преимущества:
- Не требует установки certbot на сервере
- Управление через веб-интерфейс
- Автоматическое обновление

### Настройка:

1. **В панели Cloudflare:**
   - SSL/TLS → Overview → выберите "Full" или "Full (strict)"
   - SSL/TLS → Origin Server → Create Certificate
   - Скачайте сертификат и приватный ключ

2. **Сохраните файлы на сервере:**
   ```bash
   mkdir -p nginx/ssl
   # Скопируйте сертификат и ключ в nginx/ssl/
   ```

3. **Обновите nginx/conf.d/default.conf:**
   ```nginx
   ssl_certificate /etc/nginx/ssl/cloudflare.crt;
   ssl_certificate_key /etc/nginx/ssl/cloudflare.key;
   ```

4. **docker-compose.yml уже настроен:**
   ```yaml
   volumes:
     - ./nginx/ssl:/etc/nginx/ssl:ro
   ```

---

## Вариант 3: Self-signed (НЕ подходит для Telegram) ❌

Текущий self-signed сертификат **не будет работать** с Telegram webhook, так как Telegram проверяет валидность сертификата.

---

## Проверка работы SSL:

```bash
# Проверка сертификата
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Проверка через curl
curl -I https://your-domain.com/api/v1/support/telegram/webhook
```

---

## После настройки валидного SSL:

1. Установите webhook для Telegram:
   ```bash
   POST /api/v1/support/telegram/setup-webhook?webhook_url=https://your-domain.com/api/v1/support/telegram/webhook
   ```

2. Проверьте webhook:
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

---

## Troubleshooting:

### Проблема: "Certificate verify failed"
- Убедитесь, что используете валидный сертификат (не self-signed)
- Проверьте, что `DEBUG=0` в `.env` (для production)

### Проблема: "Webhook URL returns 404"
- Проверьте, что nginx правильно проксирует `/api/v1/support/telegram/webhook`
- Проверьте логи nginx: `docker logs <nginx_container>`

### Проблема: "Webhook URL is not accessible"
- Убедитесь, что порт 443 открыт в firewall
- Проверьте, что домен правильно резолвится на ваш IP

