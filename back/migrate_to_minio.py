"""
Скрипт миграции существующих файлов в MinIO
"""

import os
import asyncio
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.services.minio_service import minio_service
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Загружаем переменные окружения
load_dotenv()

# Создаем подключение к базе данных
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        db.close()

async def migrate_files():
    """Миграция файлов из локального хранилища в MinIO"""
    
    if not settings.USE_MINIO:
        logger.error("MinIO не включен в настройках. Установите USE_MINIO=true")
        return
    
    db = get_db()
    
    try:
        # Получаем все ревизии документов с файлами
        query = """
            SELECT dr.id, dr.file_path, dr.file_name, dr.document_id, d.project_id, p.project_code, d.number as doc_number
            FROM document_revisions dr
            JOIN documents d ON dr.document_id = d.id
            JOIN projects p ON d.project_id = p.id
            WHERE dr.file_path IS NOT NULL 
            AND dr.file_path != ''
            AND dr.is_deleted = 0
        """
        
        result = db.execute(text(query))
        revisions = result.fetchall()
        
        logger.info(f"Найдено {len(revisions)} файлов для миграции")
        
        migrated_count = 0
        error_count = 0
        
        for revision in revisions:
            try:
                revision_id = revision.id
                old_file_path = revision.file_path
                file_name = revision.file_name
                document_id = revision.document_id
                project_id = revision.project_id
                project_code = revision.project_code
                doc_number = revision.doc_number or f"DOC-{document_id:04d}"
                
                # Проверяем существование локального файла
                if not os.path.exists(old_file_path):
                    logger.warning(f"Локальный файл не найден: {old_file_path}")
                    error_count += 1
                    continue
                
                # Генерируем новый ключ для MinIO
                minio_key = minio_service.generate_file_key(
                    project_number=project_code,
                    document_number=doc_number,
                    revision_code="A",  # По умолчанию
                    revision_number="01",  # По умолчанию
                    revision_description_id=1,  # По умолчанию
                    revision_id=revision_id,
                    filename=file_name
                )
                
                # Читаем содержимое файла
                with open(old_file_path, 'rb') as f:
                    file_content = f.read()
                
                # Загружаем файл в MinIO
                success = await minio_service.upload_file(
                    file_content=file_content,
                    file_key=minio_key,
                    content_type='application/octet-stream'
                )
                
                if success:
                    # Обновляем путь в базе данных
                    update_query = """
                        UPDATE document_revisions 
                        SET file_path = :new_path 
                        WHERE id = :revision_id
                    """
                    db.execute(text(update_query), {
                        "new_path": minio_key,
                        "revision_id": revision_id
                    })
                    db.commit()
                    
                    logger.info(f"Мигрирован файл: {old_file_path} -> {minio_key}")
                    migrated_count += 1
                    
                    # Опционально: удаляем локальный файл после успешной миграции
                    # os.remove(old_file_path)
                    # logger.info(f"Удален локальный файл: {old_file_path}")
                    
                else:
                    logger.error(f"Ошибка загрузки файла в MinIO: {old_file_path}")
                    error_count += 1
                    
            except Exception as e:
                logger.error(f"Ошибка при миграции файла {revision.file_path}: {str(e)}")
                error_count += 1
        
        logger.info(f"Миграция завершена. Успешно: {migrated_count}, Ошибок: {error_count}")
        
    except Exception as e:
        logger.error(f"Ошибка при миграции: {str(e)}")
    finally:
        db.close()

async def verify_migration():
    """Проверка успешности миграции"""
    
    if not settings.USE_MINIO:
        logger.error("MinIO не включен в настройках")
        return
    
    db = get_db()
    
    try:
        # Получаем все ревизии с MinIO ключами
        query = """
            SELECT dr.id, dr.file_path, dr.file_name
            FROM document_revisions dr
            WHERE dr.file_path IS NOT NULL 
            AND dr.file_path != ''
            AND dr.is_deleted = 0
        """
        
        result = db.execute(text(query))
        revisions = result.fetchall()
        
        logger.info(f"Проверка {len(revisions)} файлов в MinIO")
        
        verified_count = 0
        error_count = 0
        
        for revision in revisions:
            try:
                file_key = revision.file_path
                
                # Проверяем существование файла в MinIO
                exists = await minio_service.file_exists(file_key)
                
                if exists:
                    verified_count += 1
                    logger.info(f"✓ Файл найден в MinIO: {file_key}")
                else:
                    error_count += 1
                    logger.error(f"✗ Файл не найден в MinIO: {file_key}")
                    
            except Exception as e:
                logger.error(f"Ошибка при проверке файла {revision.file_path}: {str(e)}")
                error_count += 1
        
        logger.info(f"Проверка завершена. Найдено: {verified_count}, Не найдено: {error_count}")
        
    except Exception as e:
        logger.error(f"Ошибка при проверке: {str(e)}")
    finally:
        db.close()

async def rollback_migration():
    """Откат миграции - возврат к локальному хранению"""
    
    logger.warning("ВНИМАНИЕ: Эта операция откатит миграцию к MinIO!")
    logger.warning("Все файлы будут возвращены к локальному хранению")
    
    # Здесь можно добавить логику отката, если потребуется
    logger.info("Откат миграции не реализован")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Использование:")
        print("  python migrate_to_minio.py migrate    - Миграция файлов в MinIO")
        print("  python migrate_to_minio.py verify    - Проверка миграции")
        print("  python migrate_to_minio.py rollback   - Откат миграции")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "migrate":
        asyncio.run(migrate_files())
    elif command == "verify":
        asyncio.run(verify_migration())
    elif command == "rollback":
        asyncio.run(rollback_migration())
    else:
        print(f"Неизвестная команда: {command}")
        sys.exit(1)
