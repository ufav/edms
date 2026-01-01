# Настройка SSL без домена (только IP адрес)

## ⚠️ Проблема

**Let's Encrypt НЕ выдает сертификаты для IP адресов**, только для доменов.

**Telegram webhook требует валидный SSL сертификат**, который нельзя получить для IP адреса через Let's Encrypt.

## ✅ Решения

### Вариант 1: Получить бесплатный домен (Рекомендуется)

#### 1.1. Бесплатные доменные сервисы:

**DuckDNS** (самый простой):
- Сайт: https://www.duckdns.org
- Бесплатно
- Поддомены вида: `yourname.duckdns.org`
- Поддерживает Let's Encrypt

**No-IP**:
- Сайт: https://www.noip.com
- Бесплатно (с ограничениями)
- Поддомены вида: `yourname.ddns.net`
- Требует подтверждение каждые 30 дней

**Freenom** (бесплатные домены .tk, .ml, .ga):
- Сайт: https://www.freenom.com
- Полностью бесплатные домены
- Могут быть заблокированы некоторыми сервисами

#### 1.2. Настройка DuckDNS (пример):

1. **Зарегистрируйтесь на DuckDNS:**
   - Перейдите на https://www.duckdns.org
   - Войдите через Google/GitHub
   - Создайте поддомен (например, `edms.duckdns.org`)

2. **Настройте DNS:**
   - В панели DuckDNS добавьте ваш IP адрес
   - Подождите несколько минут для обновления DNS

3. **Получите Let's Encrypt сертификат:**
   ```bash
   sudo certbot certonly --standalone -d edms.duckdns.org
   ```

4. **Обновите nginx конфиг:**
   ```nginx
   server_name edms.duckdns.org;
   ssl_certificate /etc/letsencrypt/live/edms.duckdns.org/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/edms.duckdns.org/privkey.pem;
   ```

5. **Настройте Telegram webhook:**
   ```bash
   POST /api/v1/support/telegram/setup-webhook?webhook_url=https://edms.duckdns.org/api/v1/support/telegram/webhook
   ```

---

### Вариант 2: Cloudflare Tunnel (без домена, но сложнее)

Cloudflare Tunnel позволяет создать туннель без домена, но требует настройки Cloudflare аккаунта.

**Не рекомендуется** для новичков, так как требует:
- Регистрацию в Cloudflare
- Установку cloudflared на сервере
- Настройку туннеля

---

### Вариант 3: Self-signed сертификат (НЕ работает с Telegram)

Self-signed сертификат **не будет работать** с Telegram webhook, так как Telegram проверяет валидность сертификата.

**Этот вариант можно использовать только для:**
- Локальной разработки
- Внутренних сервисов
- Тестирования (но не для Telegram)

---

### Вариант 4: Использовать ngrok для тестирования (временное решение)

**Только для тестирования!** Не для production.

1. **Установите ngrok:**
   ```bash
   # Скачайте с https://ngrok.com
   # Или через пакетный менеджер
   ```

2. **Создайте туннель:**
   ```bash
   ngrok http 80
   ```

3. **Используйте ngrok URL для webhook:**
   ```
   https://xxxxx.ngrok.io/api/v1/support/telegram/webhook
   ```

**Проблемы:**
- URL меняется при каждом запуске (если бесплатный план)
- Не подходит для production
- Может быть медленным

---

## 🎯 Рекомендация

**Используйте DuckDNS** - это самый простой и быстрый способ:

1. ✅ Бесплатно
2. ✅ Работает с Let's Encrypt
3. ✅ Настройка за 5 минут
4. ✅ Подходит для Telegram webhook
5. ✅ Стабильный URL

### Быстрая настройка DuckDNS:

```bash
# 1. Зарегистрируйтесь на https://www.duckdns.org
# 2. Создайте поддомен (например, edms.duckdns.org)
# 3. Добавьте ваш IP в панели DuckDNS

# 4. На сервере установите certbot
sudo apt install certbot

# 5. Остановите nginx
docker-compose stop nginx

# 6. Получите сертификат
sudo certbot certonly --standalone -d edms.duckdns.org

# 7. Обновите docker-compose.yml (см. LETS_ENCRYPT_SETUP.md)

# 8. Обновите nginx/conf.d/default.conf:
#    - server_name edms.duckdns.org;
#    - ssl_certificate /etc/letsencrypt/live/edms.duckdns.org/fullchain.pem;
#    - ssl_certificate_key /etc/letsencrypt/live/edms.duckdns.org/privkey.pem;

# 9. Запустите nginx
docker-compose up -d nginx

# 10. Настройте Telegram webhook
# POST /api/v1/support/telegram/setup-webhook?webhook_url=https://edms.duckdns.org/api/v1/support/telegram/webhook
```

---

## 📝 Итог

**Для работы Telegram webhook нужен домен с валидным SSL.**

**Лучший вариант:** Получить бесплатный домен через DuckDNS (5 минут) и использовать Let's Encrypt.

**Альтернатива:** Использовать ngrok для тестирования, но это не для production.

