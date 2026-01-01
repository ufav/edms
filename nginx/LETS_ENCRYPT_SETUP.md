# Пошаговая настройка Let's Encrypt SSL сертификата

## Предварительные требования

1. ✅ У вас есть домен (например, `example.com`)
2. ✅ Домен указывает на IP вашего сервера (A-запись)
3. ✅ Порт 80 открыт и доступен из интернета
4. ✅ Вы имеете доступ к серверу по SSH

---

## Шаг 1: Подготовка на сервере

### 1.1. Подключитесь к серверу по SSH

```bash
ssh user@your-server-ip
```

### 1.2. Установите certbot

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# Или CentOS/RHEL
sudo yum install certbot
```

### 1.3. Остановите nginx контейнер (временно)

```bash
cd /path/to/your/project
docker-compose stop nginx
```

**Важно:** Certbot должен использовать порт 80 для проверки домена.

---

## Шаг 2: Получение сертификата

### 2.1. Получите сертификат (standalone режим)

```bash
# Замените your-domain.com на ваш домен
sudo certbot certonly --standalone -d your-domain.com

# Если у вас есть поддомен (например, api.your-domain.com)
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

### 2.2. Во время установки certbot спросит:

- **Email** - введите ваш email (для уведомлений об истечении)
- **Согласие с условиями** - введите `A` (Agree)
- **Поделиться email** - введите `Y` или `N` (по желанию)

### 2.3. После успешного получения

Вы увидите сообщение:
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/your-domain.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/your-domain.com/privkey.pem
```

---

## Шаг 3: Обновление docker-compose.yml

### 3.1. Откройте `docker-compose.yml`

### 3.2. Обновите volumes для nginx:

**Было:**
```yaml
volumes:
  - ./nginx/conf.d/default.conf:/etc/nginx/conf.d/default.conf:ro
  - ./nginx/ssl:/etc/nginx/ssl:ro
```

**Стало:**
```yaml
volumes:
  - ./nginx/conf.d/default.conf:/etc/nginx/conf.d/default.conf:ro
  - /etc/letsencrypt:/etc/letsencrypt:ro  # Монтируем Let's Encrypt сертификаты
```

**Полный блок nginx должен выглядеть так:**
```yaml
nginx:
  build:
    context: .
    dockerfile: ./nginx/Dockerfile
  ports:
    - "80:80"
    - "443:443"
  depends_on:
    - back
  networks:
    - edms-net
  volumes:
    - ./nginx/conf.d/default.conf:/etc/nginx/conf.d/default.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro  # <--- Добавлено
```

---

## Шаг 4: Обновление nginx конфигурации

### 4.1. Откройте `nginx/conf.d/default.conf`

### 4.2. Обновите SSL сертификаты:

**Было:**
```nginx
ssl_certificate /etc/nginx/ssl/selfsigned.crt;
ssl_certificate_key /etc/nginx/ssl/selfsigned.key;
```

**Стало:**
```nginx
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

**Замените `your-domain.com` на ваш реальный домен!**

### 4.3. Обновите server_name (опционально, но рекомендуется):

**Было:**
```nginx
server_name _;
```

**Стало:**
```nginx
server_name your-domain.com www.your-domain.com;
```

### 4.4. Добавьте дополнительные SSL настройки (рекомендуется):

После строк с `ssl_certificate` добавьте:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

**Полный блок server для HTTPS должен выглядеть так:**
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    root /usr/share/nginx/html;
    index index.html;

    # Frontend SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://back:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Backend Admin (sqladmin)
    location = /admin {
        return 301 /admin/;
    }
    location /admin/ {
        proxy_pass http://back:8000/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        sub_filter 'http://$host' 'https://$host';
        sub_filter 'http://194.32.142.92' 'https://194.32.142.92';
        sub_filter_types text/html text/css text/javascript application/javascript;
        sub_filter_once off;
    }

    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
}
```

---

## Шаг 5: Запуск nginx с новым сертификатом

### 5.1. Запустите nginx контейнер

```bash
docker-compose up -d nginx
```

### 5.2. Проверьте логи

```bash
docker-compose logs nginx
```

Должны увидеть что-то вроде:
```
nginx started
```

### 5.3. Проверьте SSL сертификат

```bash
# С сервера
curl -I https://your-domain.com

# Или из браузера откройте https://your-domain.com
# Должен быть зеленый замочек 🔒
```

---

## Шаг 6: Настройка автоматического обновления

Let's Encrypt сертификаты действительны 90 дней. Certbot автоматически создает cron задачу для обновления.

### 6.1. Проверьте, что автообновление настроено

```bash
sudo certbot renew --dry-run
```

Если видите ошибки, значит автообновление не настроено.

### 6.2. Настройте автообновление вручную (если нужно)

Создайте cron задачу:

```bash
sudo crontab -e
```

Добавьте строку:
```cron
0 3 * * * certbot renew --quiet --deploy-hook "docker-compose -f /path/to/your/project/docker-compose.yml restart nginx"
```

**Замените `/path/to/your/project` на реальный путь к вашему проекту!**

Это будет обновлять сертификат каждый день в 3:00 ночи и перезапускать nginx после обновления.

---

## Шаг 7: Настройка Telegram webhook

### 7.1. Установите webhook

```bash
# Через API (после авторизации как администратор)
curl -X POST "https://your-domain.com/api/v1/support/telegram/setup-webhook?webhook_url=https://your-domain.com/api/v1/support/telegram/webhook" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7.2. Проверьте webhook

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Должно показать:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-domain.com/api/v1/support/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## Troubleshooting

### Проблема: "Failed to obtain certificate"

**Причина:** Порт 80 занят или недоступен

**Решение:**
1. Убедитесь, что nginx остановлен: `docker-compose stop nginx`
2. Проверьте, что порт 80 свободен: `sudo netstat -tulpn | grep :80`
3. Если занят другим процессом, остановите его

### Проблема: "Domain does not point to this server"

**Причина:** DNS запись не настроена или еще не обновилась

**Решение:**
1. Проверьте DNS: `dig your-domain.com` или `nslookup your-domain.com`
2. Убедитесь, что A-запись указывает на IP вашего сервера
3. Подождите несколько минут для распространения DNS

### Проблема: "nginx не может найти сертификат"

**Причина:** Неправильный путь в конфиге или volume не смонтирован

**Решение:**
1. Проверьте путь: `sudo ls -la /etc/letsencrypt/live/your-domain.com/`
2. Убедитесь, что в `docker-compose.yml` правильно указан volume
3. Перезапустите nginx: `docker-compose restart nginx`

### Проблема: "SSL certificate expired"

**Причина:** Автообновление не работает

**Решение:**
1. Обновите вручную: `sudo certbot renew`
2. Перезапустите nginx: `docker-compose restart nginx`
3. Проверьте cron задачу: `sudo crontab -l`

---

## Проверка работы

### 1. Проверьте SSL сертификат в браузере:
- Откройте `https://your-domain.com`
- Должен быть зеленый замочек 🔒
- Кликните на замочек → "Certificate" → должен быть "Let's Encrypt"

### 2. Проверьте через командную строку:
```bash
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### 3. Проверьте Telegram webhook:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

---

## Готово! ✅

Теперь у вас:
- ✅ Валидный SSL сертификат от Let's Encrypt
- ✅ Автоматическое обновление сертификата
- ✅ Работающий Telegram webhook
- ✅ Безопасное HTTPS соединение

