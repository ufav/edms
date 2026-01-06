# Настройка Autodesk Platform Services для просмотра DWG файлов

## Обзор

Система интегрирована с Autodesk Platform Services (APS, ранее Forge) для просмотра DWG и DXF файлов через Autodesk Viewer прямо в браузере.

## Шаг 1: Регистрация в Autodesk Platform Services

1. Перейдите на https://aps.autodesk.com/
2. Войдите или создайте учетную запись Autodesk
3. Перейдите в раздел "My Apps" (https://aps.autodesk.com/myapps)
4. Нажмите "Create App"
5. Заполните форму:
   - **App Name**: EDMS Viewer (или любое другое имя)
   - **API**: выберите "Data Management API" и "Model Derivative API"
   - **Callback URL**: можно оставить пустым или указать URL вашего приложения
6. Сохраните **Client ID** и **Client Secret**

## Шаг 2: Настройка переменных окружения

Добавьте следующие переменные в файл `.env` в директории `back/`:

```env
# Autodesk Platform Services
AUTODESK_CLIENT_ID=your_client_id_here
AUTODESK_CLIENT_SECRET=your_client_secret_here
AUTODESK_BUCKET_KEY=edms-bucket
```

**Где:**
- `AUTODESK_CLIENT_ID` - Client ID из шага 1
- `AUTODESK_CLIENT_SECRET` - Client Secret из шага 1
- `AUTODESK_BUCKET_KEY` - имя bucket в Autodesk OSS (можно оставить `edms-bucket` или изменить)

## Шаг 3: Установка зависимостей

Убедитесь, что установлена библиотека `requests`:

```bash
cd back
pip install -r requirements.txt
```

## Шаг 4: Перезапуск backend

После добавления переменных окружения перезапустите backend:

```bash
# Если используете Docker
docker-compose restart back

# Или если запускаете локально
# Остановите и запустите сервер заново
```

## Использование

1. Откройте документ с DWG или DXF файлом
2. В таблице ревизий найдите файл с расширением `.dwg` или `.dxf`
3. Нажмите на кнопку с иконкой глаза (👁️) рядом с кнопкой скачивания
4. Файл будет автоматически загружен в Autodesk OSS и переведен для просмотра
5. После завершения перевода файл откроется в Autodesk Viewer

## Примечания

- Первая загрузка файла может занять некоторое время (зависит от размера файла)
- Перевод файла происходит автоматически в фоновом режиме
- Файлы хранятся во временном bucket в Autodesk OSS (policy: temporary)
- Для постоянного хранения измените `policyKey` на `'persistent'` в файле `back/app/services/autodesk_service.py`

## Устранение неполадок

### Ошибка "Autodesk Platform Services не настроен"
- Проверьте, что переменные окружения `AUTODESK_CLIENT_ID` и `AUTODESK_CLIENT_SECRET` установлены
- Убедитесь, что backend перезапущен после добавления переменных

### Ошибка "Ошибка получения токена Autodesk"
- Проверьте правильность Client ID и Client Secret
- Убедитесь, что в приложении Autodesk включены необходимые API (Data Management API, Model Derivative API)

### Файл не загружается или не переводится
- Проверьте размер файла (большие файлы могут требовать больше времени)
- Проверьте логи backend для детальной информации об ошибке
- Убедитесь, что файл имеет расширение `.dwg` или `.dxf`

## Дополнительная информация

- Документация Autodesk Platform Services: https://aps.autodesk.com/developer/documentation
- API Reference: https://aps.autodesk.com/en/docs/data/v2/developers_guide/overview/
