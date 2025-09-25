# EDMS - Команды для настройки и запуска

## 🚀 Быстрый старт

### 1. Установка зависимостей Backend
```bash
cd back
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Установка зависимостей Frontend
```bash
cd front
npm install
```
*Все зависимости Material-UI и MobX уже добавлены в package.json*

### 3. Создание таблиц в базе данных
```bash
cd back
venv\Scripts\activate
python create_tables.py
```

### 4. Создание пользователя-админа
```bash
cd back
venv\Scripts\activate
python create_admin_simple.py
```
*Создаст админа: username=admin, password=admin123*

### 5. Заполнение БД тестовыми данными
```bash
cd back
venv\Scripts\activate
python populate_database.py
```
*Создаст тестовые проекты, документы, трансмитталы и пользователей*

### 6. Запуск Backend сервера
```bash
cd back
venv\Scripts\activate
python run_server.py
```
**Сервер будет доступен на:** http://localhost:8000  
**API документация:** http://localhost:8000/docs

### 7. Запуск Frontend
```bash
cd front
npm run dev
```
**Frontend будет доступен на:** http://localhost:5173

---

## 📋 Полный список команд

### Backend (FastAPI + PostgreSQL)

#### Установка зависимостей:
```bash
cd back
venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy psycopg2-binary alembic python-multipart python-jose[cryptography] passlib[bcrypt] python-dotenv pydantic[email] pydantic-settings
```

#### Или через requirements.txt:
```bash
cd back
venv\Scripts\activate
pip install -r requirements.txt
```

#### Создание таблиц:
```bash
cd back
venv\Scripts\activate
python create_tables.py
```

#### Заполнение БД тестовыми данными:
```bash
cd back
venv\Scripts\activate
python populate_database.py
```

#### Запуск сервера:
```bash
cd back
venv\Scripts\activate
python run_server.py
```

#### Альтернативный запуск:
```bash
cd back
venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (React + Vite + Material-UI + MobX)

#### Установка зависимостей:
```bash
cd front
npm install
```

Все зависимости уже добавлены в package.json:
- @mui/material - Material-UI компоненты
- @emotion/react и @emotion/styled - для стилизации
- @mui/icons-material - иконки Material-UI
- axios - для HTTP запросов
- react-router-dom - для маршрутизации
- @tanstack/react-query - для управления состоянием API
- mobx - для управления состоянием приложения
- mobx-react-lite - интеграция MobX с React

#### Запуск dev сервера:
```bash
cd front
npm run dev
```

#### Сборка для продакшена:
```bash
cd front
npm run build
```

---

## 🗄️ База данных PostgreSQL

### Требования:
- **Host:** localhost
- **Port:** 5432
- **Database:** edms
- **User:** postgres
- **Password:** 123

### Проверка подключения:
```bash
psql -h localhost -p 5432 -U postgres -d edms
```

### Создание базы данных (если не существует):
```sql
CREATE DATABASE edms;
```

---

## 🔧 Структура проекта

```
edms/
├── back/                    # Backend (FastAPI)
│   ├── app/
│   │   ├── api/v1/         # API endpoints
│   │   ├── core/           # Конфигурация и БД
│   │   ├── models/         # SQLAlchemy модели
│   │   ├── schemas/        # Pydantic схемы
│   │   ├── services/       # Бизнес-логика
│   │   └── main.py         # Точка входа
│   ├── venv/               # Виртуальное окружение
│   ├── requirements.txt    # Python зависимости
│   ├── create_tables.py    # Скрипт создания таблиц
│   ├── populate_database.py # Скрипт заполнения БД
│   └── run_server.py       # Скрипт запуска
└── front/                  # Frontend (React + Vite)
    ├── src/
    │   ├── components/     # React компоненты
    │   ├── stores/         # MobX stores
    │   ├── api/            # API клиент
    │   └── App.tsx        # Главный компонент
    ├── package.json       # Node.js зависимости
    └── vite.config.ts     # Конфигурация Vite
```

---

## 🌐 API Endpoints

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

---

## 🚨 Устранение неполадок

### Ошибка подключения к БД:
1. Убедитесь, что PostgreSQL запущен
2. Проверьте параметры подключения в `back/env_example.txt`
3. Создайте файл `.env` на основе `env_example.txt`

### Ошибки Python:
```bash
cd back
venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Ошибки Node.js:
```bash
cd front
npm cache clean --force
npm install
```

### Порт уже занят:
- Backend: измените порт в `run_server.py` (по умолчанию 8000)
- Frontend: измените порт в `vite.config.ts` (по умолчанию 5173)

---

## 📝 Следующие шаги

1. **Создайте файл `.env`** в папке `back/` на основе `env_example.txt`
2. **Настройте базу данных** PostgreSQL
3. **Создайте таблицы** в БД
4. **Заполните БД** тестовыми данными
5. **Запустите backend** сервер
6. **Запустите frontend** приложение
7. **Откройте** http://localhost:5173 в браузере
8. **Изучите API** документацию на http://localhost:8000/docs

---

## 🎯 Основные функции EDMS

- ✅ **Аутентификация** пользователей
- ✅ **Управление проектами** с выбором проекта
- ✅ **Загрузка документов** с версионированием
- ✅ **Трансмитталы** (отправка документов)
- ✅ **Workflow** процессы
- ✅ **Уведомления**
- ✅ **Аудит** действий
- ✅ **Роли и права** доступа
- ✅ **MobX** для управления состоянием
- ✅ **API интеграция** с реальными данными

---

## 📊 Тестовые данные

После выполнения `populate_database.py` в БД будут созданы:

### Пользователи:
- **admin** (admin123) - Администратор системы
- **manager1** (manager123) - Иван Петров, менеджер
- **engineer1** (engineer123) - Анна Сидорова, инженер
- **reviewer1** (reviewer123) - Михаил Козлов, рецензент
- **contractor1** (contractor123) - Елена Волкова, подрядчик

### Проекты:
- **ЖК "Солнечный"** - активный проект
- **Офисный центр "Бизнес-Плаза"** - активный проект
- **Торговый центр "Мега"** - планирование
- **Школа №15** - завершенный проект

### Документы:
- 5 документов с разными статусами
- Различные типы файлов (PDF, DWG)
- Привязка к проектам

### Трансмитталы:
- 4 трансмиттала с разными статусами
- Связи между пользователями и проектами