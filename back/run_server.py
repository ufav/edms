#!/usr/bin/env python3
"""
Скрипт для запуска EDMS сервера
Запуск: python run_server.py
"""

import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
