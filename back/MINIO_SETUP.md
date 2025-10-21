# Настройка MinIO для EDMS

## Обзор

MinIO интегрирован в EDMS для хранения файлов документов. Система поддерживает как локальное хранение, так и MinIO, с возможностью переключения через переменную окружения `USE_MINIO`.

## Установка зависимостей

```bash
pip install -r requirements.txt
```

## Настройка MinIO

### 1. Установка MinIO сервера

#### Docker (рекомендуется)
```bash
docker run -p 9000:9000 -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

#### Локальная установка
Скачайте MinIO с https://min.io/download

### 2. Создание bucket

После запуска MinIO:
1. Откройте http://localhost:9001
2. Войдите с учетными данными (по умолчанию: minioadmin/minioadmin)
3. Создайте bucket с именем `edms-files`

### 3. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# MinIO настройки
USE_MINIO=true
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=edms-files

# Остальные настройки...
DATABASE_URL=postgresql://user:password@localhost/edms
SECRET_KEY=your-secret-key
```

## Структура хранения файлов

Файлы хранятся в MinIO по следующей структуре:

```
{project_code}/{document_number}/{revision_code}{revision_number}_{revision_description_id}_{revision_id}/{filename}
```

**Пример:**
```
X-000-057-16/DOC-0001/A01_1_123/document.pdf
```

Где:
- `X-000-057-16` - код проекта
- `DOC-0001` - номер документа
- `A01_1_123` - код ревизии + номер + ID описания + ID ревизии
- `document.pdf` - имя файла

## Миграция существующих файлов

### 1. Миграция в MinIO

```bash
cd back
python migrate_to_minio.py migrate
```

### 2. Проверка миграции

```bash
python migrate_to_minio.py verify
```

### 3. Откат миграции (если нужно)

```bash
python migrate_to_minio.py rollback
```

## Тестирование

### 1. Запуск сервера

```bash
cd back
python run_server.py
```

### 2. Тестирование загрузки файла

```bash
curl -X POST "http://localhost:8000/api/v1/documents/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf" \
  -F "title=Test Document" \
  -F "project_id=1"
```

### 3. Тестирование скачивания файла

```bash
curl -X GET "http://localhost:8000/api/v1/documents/1/download" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output downloaded_file.pdf
```

## API Endpoints

### Загрузка документа
- **POST** `/api/v1/documents/upload`
- Поддерживает как локальное хранение, так и MinIO
- Автоматически определяет способ хранения по настройке `USE_MINIO`

### Скачивание документа
- **GET** `/api/v1/documents/{document_id}/download`
- **GET** `/api/v1/documents/{document_id}/revisions/{revision_id}/download`
- Поддерживает как локальное хранение, так и MinIO

## Конфигурация

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `USE_MINIO` | Включить MinIO | `false` |
| `MINIO_ENDPOINT` | URL MinIO сервера | `http://localhost:9000` |
| `MINIO_ACCESS_KEY` | Ключ доступа | `minioadmin` |
| `MINIO_SECRET_KEY` | Секретный ключ | `minioadmin` |
| `MINIO_BUCKET` | Имя bucket | `edms-files` |

### Переключение между режимами

Для переключения между локальным хранением и MinIO измените переменную `USE_MINIO`:

```env
# Локальное хранение
USE_MINIO=false

# MinIO хранение
USE_MINIO=true
```

## Мониторинг

### Логи
Все операции с MinIO логируются. Проверьте логи приложения для диагностики проблем.

### Проверка состояния MinIO
```bash
# Проверка доступности MinIO
curl http://localhost:9000/minio/health/live

# Проверка bucket
curl -X GET "http://localhost:9000/edms-files/" \
  -H "Authorization: AWS4-HMAC-SHA256 ..."
```

## Устранение неполадок

### 1. MinIO недоступен
- Проверьте, что MinIO сервер запущен
- Проверьте настройки подключения в `.env`
- Проверьте сетевую доступность

### 2. Ошибки аутентификации
- Проверьте `MINIO_ACCESS_KEY` и `MINIO_SECRET_KEY`
- Убедитесь, что bucket существует

### 3. Ошибки загрузки файлов
- Проверьте права доступа к bucket
- Проверьте размер файла (лимиты MinIO)
- Проверьте логи приложения

### 4. Проблемы с миграцией
- Убедитесь, что все локальные файлы существуют
- Проверьте права доступа к файлам
- Запустите проверку миграции: `python migrate_to_minio.py verify`

## Производительность

### Рекомендации
- Используйте SSD для MinIO данных
- Настройте репликацию для высокой доступности
- Мониторьте использование дискового пространства
- Настройте политики жизненного цикла для старых файлов

### Масштабирование
- MinIO поддерживает кластеризацию
- Можно настроить несколько MinIO серверов
- Используйте CDN для ускорения доступа к файлам
