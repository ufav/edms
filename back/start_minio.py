#!/usr/bin/env python3
"""
Скрипт для запуска MinIO сервера для EDMS
"""

import subprocess
import sys
import time
import requests
import os

def check_minio_running():
    """Проверяем, запущен ли MinIO"""
    try:
        response = requests.get("http://localhost:9000/minio/health/live", timeout=5)
        return response.status_code == 200
    except:
        return False

def start_minio():
    """Запускаем MinIO сервер"""
    print("=== Запуск MinIO сервера ===")
    
    # Проверяем, не запущен ли уже MinIO
    if check_minio_running():
        print("✅ MinIO уже запущен и доступен на http://localhost:9000")
        print("🌐 Веб-интерфейс: http://localhost:9001")
        print("👤 Логин: admin")
        print("🔑 Пароль: adminpassword")
        return True
    
    print("🚀 Запускаем MinIO сервер...")
    
    # Команда для запуска MinIO
    cmd = [
        "docker", "run", "-d",
        "-p", "9000:9000",
        "-p", "9001:9001",
        "--name", "edms-minio",
        "-e", "MINIO_ROOT_USER=minioadmin",
        "-e", "MINIO_ROOT_PASSWORD=minioadmin",
        "minio/minio", "server", "/data", "--console-address", ":9001"
    ]
    
    try:
        # Запускаем MinIO
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ MinIO сервер запущен!")
            print("⏳ Ожидаем готовности сервера...")
            
            # Ждем, пока MinIO станет доступен
            for i in range(30):  # Ждем до 30 секунд
                if check_minio_running():
                    print("✅ MinIO готов к работе!")
                    print("\n📋 Информация о MinIO:")
                    print("🌐 API: http://localhost:9000")
                    print("🌐 Веб-интерфейс: http://localhost:9001")
                    print("👤 Логин: minioadmin")
                    print("🔑 Пароль: minioadmin")
                    print("📦 Bucket: docste-files")
                    
                    print("\n📝 Следующие шаги:")
                    print("1. Откройте http://localhost:9001 в браузере")
                    print("2. Войдите с учетными данными minioadmin/minioadmin")
                    print("3. Создайте bucket с именем 'docste-files'")
                    print("4. Попробуйте импорт документов снова")
                    
                    return True
                
                print(f"⏳ Ожидание... ({i+1}/30)")
                time.sleep(1)
            
            print("❌ MinIO не отвечает после 30 секунд")
            return False
            
        else:
            print(f"❌ Ошибка запуска MinIO: {result.stderr}")
            return False
            
    except FileNotFoundError:
        print("❌ Docker не найден. Убедитесь, что Docker установлен и запущен.")
        return False
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

def stop_minio():
    """Останавливаем MinIO сервер"""
    print("=== Остановка MinIO сервера ===")
    
    try:
        # Останавливаем контейнер
        subprocess.run(["docker", "stop", "edms-minio"], capture_output=True)
        # Удаляем контейнер
        subprocess.run(["docker", "rm", "edms-minio"], capture_output=True)
        print("✅ MinIO сервер остановлен и удален")
        return True
    except Exception as e:
        print(f"❌ Ошибка остановки: {e}")
        return False

def status_minio():
    """Показываем статус MinIO"""
    print("=== Статус MinIO ===")
    
    if check_minio_running():
        print("✅ MinIO запущен и доступен")
        print("🌐 API: http://localhost:9000")
        print("🌐 Веб-интерфейс: http://localhost:9001")
    else:
        print("❌ MinIO не запущен или недоступен")
        
        # Проверяем, есть ли контейнер
        try:
            result = subprocess.run(["docker", "ps", "-a", "--filter", "name=edms-minio"], 
                                 capture_output=True, text=True)
            if "edms-minio" in result.stdout:
                print("📦 Контейнер edms-minio существует, но не запущен")
            else:
                print("📦 Контейнер edms-minio не найден")
        except:
            pass

def main():
    """Главная функция"""
    if len(sys.argv) < 2:
        print("Использование:")
        print("  python start_minio.py start   - Запустить MinIO")
        print("  python start_minio.py stop    - Остановить MinIO")
        print("  python start_minio.py status  - Показать статус")
        print("  python start_minio.py restart - Перезапустить MinIO")
        return
    
    command = sys.argv[1].lower()
    
    if command == "start":
        start_minio()
    elif command == "stop":
        stop_minio()
    elif command == "status":
        status_minio()
    elif command == "restart":
        stop_minio()
        time.sleep(2)
        start_minio()
    else:
        print(f"❌ Неизвестная команда: {command}")
        print("Доступные команды: start, stop, status, restart")

if __name__ == "__main__":
    main()
