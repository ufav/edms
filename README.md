# EDMS - Electronic Document Management System

Система управления электронными документами, аналогичная Aconex, построенная на FastAPI, React и PostgreSQL.

## Структура проекта

```
edms/
├── back/                    # Backend (FastAPI)
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Конфигурация и база данных
│   │   ├── models/         # SQLAlchemy модели
│   │   ├── schemas/        # Pydantic схемы
│   │   ├── services/       # Бизнес-логика
│   │   └── main.py         # Точка входа
│   ├── venv/               # Виртуальное окружение
│   ├── requirements.txt    # Зависимости Python
│   ├── create_tables.py    # Скрипт создания таблиц
│   └── run_server.py       # Скрипт запуска сервера
└── front/                  # Frontend (React + Vite)
    ├── src/
    ├── package.json
    └── vite.config.ts
```

## Установка и запуск

### 1. Настройка базы данных PostgreSQL

Убедитесь, что PostgreSQL запущен на localhost:5432 с базой данных `edms` и пользователем `postgres` (пароль: `123`).

### 2. Настройка Backend

```bash
# Переход в папку backend
cd back

# Активация виртуального окружения
venv\Scripts\activate

# Установка зависимостей
pip install -r requirements.txt

# Создание таблиц в базе данных
python create_tables.py

# Запуск сервера
python run_server.py
```

Сервер будет доступен по адресу: http://localhost:8000
API документация: http://localhost:8000/docs

### 3. Настройка Frontend

```bash
# Переход в папку frontend
cd front

# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev
```

Frontend будет доступен по адресу: http://localhost:5173

## Основные функции

### Backend API включает:

- **Аутентификация**: Регистрация, вход, JWT токены
- **Пользователи**: Управление пользователями системы
- **Проекты**: Создание и управление проектами
- **Документы**: Загрузка, версионирование, статусы
- **Трансмитталы**: Отправка документов между участниками
- **Workflow**: Процессы утверждения документов
- **Уведомления**: Система уведомлений
- **Аудит**: Логирование действий пользователей

### База данных включает таблицы:

- `users` - Пользователи системы
- `projects` - Проекты
- `project_members` - Участники проектов
- `documents` - Документы
- `document_versions` - Версии документов
- `document_reviews` - Рецензии документов
- `document_approvals` - Утверждения документов
- `transmittals` - Трансмитталы
- `transmittal_items` - Элементы трансмитталов
- `workflows` - Процессы
- `workflow_steps` - Шаги процессов
- `workflow_instances` - Экземпляры процессов
- `workflow_step_logs` - Логи шагов процессов
- `notifications` - Уведомления
- `audit_logs` - Аудит действий

## API Endpoints

### Аутентификация
- `POST /api/v1/auth/register` - Регистрация
- `POST /api/v1/auth/login` - Вход
- `GET /api/v1/auth/me` - Текущий пользователь

### Пользователи
- `GET /api/v1/users/` - Список пользователей
- `GET /api/v1/users/{user_id}` - Пользователь по ID

### Проекты
- `GET /api/v1/projects/` - Список проектов
- `POST /api/v1/projects/` - Создание проекта
- `GET /api/v1/projects/{project_id}` - Проект по ID

### Документы
- `GET /api/v1/documents/` - Список документов
- `POST /api/v1/documents/upload` - Загрузка документа
- `GET /api/v1/documents/{document_id}` - Документ по ID

### Трансмитталы
- `GET /api/v1/transmittals/` - Список трансмитталов
- `POST /api/v1/transmittals/` - Создание трансмиттала
- `GET /api/v1/transmittals/{transmittal_id}` - Трансмиттал по ID

## Конфигурация

Создайте файл `.env` в папке `back/` на основе `env_example.txt`:

```env
DATABASE_URL=postgresql://postgres:123@localhost:5432/edms
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=True
```

## Разработка

### Добавление новых эндпоинтов:

1. Создайте модель в `app/models/`
2. Создайте схему в `app/schemas/`
3. Создайте эндпоинт в `app/api/v1/endpoints/`
4. Подключите роутер в `app/api/v1/api.py`

### Миграции базы данных:

Для изменения структуры БД используйте Alembic:

```bash
# Создание миграции
alembic revision --autogenerate -m "Description"

# Применение миграций
alembic upgrade head
```

## Технологии

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, JWT
- **Frontend**: React, TypeScript, Vite, Material-UI
- **База данных**: PostgreSQL
- **Аутентификация**: JWT токены
- **Файлы**: Локальное хранение с поддержкой различных форматов
