from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.auth import get_current_active_user
from app.models.user import User
from app.models.transmittal_import_settings import TransmittalImportSettings
from app.models.transmittal import Transmittal, TransmittalRevision
from app.models.document import Document, DocumentRevision
from app.models.references import TransmittalStatus
from app.models.project_participant import ProjectParticipant
import pandas as pd
import json
import io
from typing import Dict, Any, List
from datetime import datetime

def get_localized_message(key: str, **kwargs) -> str:
    """Возвращает локализованное сообщение"""
    messages = {
        "IMPORT_SETTINGS_NOT_FOUND": "Настройки импорта не найдены для компании: {company_name}",
        "INVALID_SETTINGS_FORMAT": "Неверный формат настроек импорта",
        "MISSING_SHEET_NAME": "Не указано имя листа в настройках",
        "MISSING_METADATA_FIELDS": "Не указаны поля метаданных в настройках",
        "WORKSHEET_NOT_FOUND": "Лист '{sheet_name}' не найден в Excel файле",
        "EXCEL_READ_ERROR": "Ошибка чтения Excel файла: {error}",
        "IMPORT_METADATA_NOT_FOUND": "Не найдены поля метаданных: {fields}",
        "MISSING_TABLE_FIELDS": "Не указаны поля таблицы в настройках",
        "IMPORT_TABLE_FIELDS_NOT_FOUND": "Поля не найдены в таблице файла: {fields}. Проверьте настройки импорта.",
        "STATUS_NOT_FOUND": "Статус 'Received' не найден в системе",
        "IMPORT_MISSING_DOCUMENTS": "Следующие документы не найдены в проекте: {documents}",
        "IMPORT_DUPLICATE": "Трансмиттал с номером '{transmittal_number}' уже существует",
        "IMPORT_GENERAL_ERROR": "Ошибка импорта: {error}"
    }
    
    message = messages.get(key, key)
    return message.format(**kwargs)

router = APIRouter()

@router.post("/import")
async def import_incoming_transmittal(
    file: UploadFile = File(...),
    project_id: int = Form(...),
    counterparty_id: int = Form(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Импорт входящего трансмиттала из Excel файла"""
    
    # Получаем настройки импорта для данной компании
    settings = db.query(TransmittalImportSettings).filter(
        TransmittalImportSettings.project_id == project_id,
        TransmittalImportSettings.company_id == counterparty_id,
        TransmittalImportSettings.user_id == current_user.id,
        TransmittalImportSettings.settings_key == 'field_mapping'
    ).first()
    
    if not settings:
        # Получаем название компании для более понятного сообщения
        from app.models.references import Company
        company = db.query(Company).filter(Company.id == counterparty_id).first()
        company_name = company.name if company else f"ID {counterparty_id}"
        raise HTTPException(
            status_code=400, 
            detail=get_localized_message("IMPORT_SETTINGS_NOT_FOUND", company_name=company_name)
        )
    
    try:
        # Парсим JSON настройки
        settings_data = json.loads(settings.settings_value) if isinstance(settings.settings_value, str) else settings.settings_value
        
        # Проверяем структуру настроек
        if not isinstance(settings_data, dict):
            raise HTTPException(status_code=400, detail=get_localized_message("INVALID_SETTINGS_FORMAT"))
        
        if 'sheet_name' not in settings_data or not settings_data['sheet_name'] or not settings_data['sheet_name'].strip():
            raise HTTPException(status_code=400, detail=get_localized_message("MISSING_SHEET_NAME"))
        
        if 'metadata_fields' not in settings_data:
            raise HTTPException(status_code=400, detail=get_localized_message("MISSING_METADATA_FIELDS"))
        
        
        # Читаем Excel файл
        contents = await file.read()
        try:
            excel_data = pd.read_excel(io.BytesIO(contents), sheet_name=settings_data['sheet_name'])
        except Exception as e:
            error_str = str(e)
            
            # Проверяем различные варианты ошибок листа
            if ("Worksheet named" in error_str and "not found" in error_str) or \
               ("sheet" in error_str.lower() and "not found" in error_str.lower()) or \
               ("worksheet" in error_str.lower() and "not found" in error_str.lower()):
                raise HTTPException(
                    status_code=400, 
                    detail=get_localized_message("WORKSHEET_NOT_FOUND", sheet_name=settings_data['sheet_name'])
                )
            else:
                raise HTTPException(status_code=400, detail=get_localized_message("EXCEL_READ_ERROR", error=error_str))
        
        # Извлекаем метаданные
        metadata = extract_metadata(excel_data, settings_data['metadata_fields'])
        
        # Проверяем, что найдены все необходимые метаданные
        missing_metadata = []
        for field_key, field_config in settings_data['metadata_fields'].items():
            if field_key not in metadata or not metadata[field_key]:
                missing_metadata.append(field_config['label'])
        
        if missing_metadata:
            raise HTTPException(
                status_code=400, 
                detail=get_localized_message("IMPORT_METADATA_NOT_FOUND", fields=','.join(missing_metadata))
            )
        
        # Проверяем наличие table_fields в настройках
        if 'table_fields' not in settings_data:
            raise HTTPException(status_code=400, detail=get_localized_message("MISSING_TABLE_FIELDS"))
        
        # Получаем настраиваемые поля таблицы
        table_fields = settings_data['table_fields']
        
        # Находим начало таблицы
        table_start_row, missing_fields = find_table_start(excel_data, table_fields)
        
        if table_start_row is None:
            raise HTTPException(
                status_code=400, 
                detail=get_localized_message("IMPORT_TABLE_FIELDS_NOT_FOUND", fields=','.join(missing_fields))
            )
        
        # Читаем данные таблицы
        table_data = excel_data.iloc[table_start_row:].copy()
        
        # Получаем статус "Received" (с заглавной буквы)
        received_status = db.query(TransmittalStatus).filter(
            TransmittalStatus.name == 'Received'
        ).first()
        
        if not received_status:
            raise HTTPException(status_code=500, detail=get_localized_message("STATUS_NOT_FOUND"))
        
        # Сначала проверяем все документы, не создавая трансмиттал
        table_result = process_table_data_for_transmittal_revisions(
            db, table_data, table_fields, None, project_id  # transmittal_id = None для проверки
        )
        
        missing_documents = table_result['missing_documents']
        
        # Если есть несуществующие документы, возвращаем ошибку
        if missing_documents:
            missing_docs_str = ', '.join(missing_documents)
            raise HTTPException(
                status_code=400,
                detail=get_localized_message("IMPORT_MISSING_DOCUMENTS", documents=missing_docs_str)
            )
        
        # Если все документы существуют, создаем трансмиттал
        transmittal = Transmittal(
            transmittal_number=metadata.get('transmittal_number', ''),
            project_id=project_id,
            counterparty_id=counterparty_id,
            direction='in',
            status_id=received_status.id,
            created_by=current_user.id,
            transmittal_date=datetime.now(),
            title=f"Входящий трансмиттал от {metadata.get('transmittal_number', '')}",
            description=f"Импортирован из Excel файла: {file.filename}"
        )
        
        db.add(transmittal)
        db.commit()
        db.refresh(transmittal)
        
        # Теперь создаем transmittal_revisions
        table_result = process_table_data_for_transmittal_revisions(
            db, table_data, table_fields, transmittal.id, project_id
        )
        
        created_revisions = table_result['created_revisions']
        
        return {
            "message": "Трансмиттал успешно импортирован",
            "transmittal_id": transmittal.id,
            "transmittal_number": transmittal.transmittal_number,
            "metadata": metadata,
            "table_rows_count": len(table_data),
            "created_revisions_count": len(created_revisions)
        }
        
    except HTTPException:
        # HTTPException уже правильно сформирован, просто пробрасываем его
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        
        # Обрабатываем ошибку уникальности номера трансмиттала
        if "UniqueViolation" in str(e) and "transmittal_number" in str(e):
            # Пытаемся извлечь номер трансмиттала из ошибки, если metadata недоступен
            transmittal_number = 'неизвестный'
            if 'metadata' in locals() and metadata:
                transmittal_number = metadata.get('transmittal_number', 'неизвестный')
            else:
                # Извлекаем номер из SQL ошибки
                import re
                match = re.search(r'\(transmittal_number\)=\(([^)]+)\)', str(e))
                if match:
                    transmittal_number = match.group(1)
            
            raise HTTPException(
                status_code=400, 
                detail=get_localized_message("IMPORT_DUPLICATE", transmittal_number=transmittal_number)
            )
        
        raise HTTPException(status_code=500, detail=get_localized_message("IMPORT_GENERAL_ERROR", error=str(e)))

def extract_metadata(excel_data: pd.DataFrame, metadata_fields: Dict[str, Any]) -> Dict[str, str]:
    """Извлекает метаданные из Excel файла по настройкам"""
    metadata = {}
    
    for field_key, field_config in metadata_fields.items():
        label = field_config['label']
        position = field_config['position']
        
        # Ищем ячейку с лейблом (более гибкий поиск)
        for row_idx, row in excel_data.iterrows():
            for col_idx, cell_value in enumerate(row):
                if pd.notna(cell_value):
                    cell_str = str(cell_value).strip()
                    # Проверяем точное совпадение или вхождение лейбла в ячейку
                    if cell_str == label or label in cell_str:
                        # Находим значение в указанной позиции
                        if position == 'right' and col_idx + 1 < len(row):
                            next_value = row.iloc[col_idx + 1]
                            if pd.notna(next_value):
                                metadata[field_key] = str(next_value).strip()
                        elif position == 'left' and col_idx - 1 >= 0:
                            prev_value = row.iloc[col_idx - 1]
                            if pd.notna(prev_value):
                                metadata[field_key] = str(prev_value).strip()
                        elif position == 'below' and row_idx + 1 < len(excel_data):
                            below_value = excel_data.iloc[row_idx + 1, col_idx]
                            if pd.notna(below_value):
                                metadata[field_key] = str(below_value).strip()
                        elif position == 'above' and row_idx - 1 >= 0:
                            above_value = excel_data.iloc[row_idx - 1, col_idx]
                            if pd.notna(above_value):
                                metadata[field_key] = str(above_value).strip()
                        break
            if field_key in metadata:
                break
    
    return metadata

def find_table_start(excel_data: pd.DataFrame, table_fields: Dict[str, str]) -> tuple[int, list[str]]:
    """Находит начало таблицы по заголовкам и возвращает отсутствующие поля"""
    table_field_labels = list(table_fields.values())
    missing_fields = []
    
    for row_idx, row in excel_data.iterrows():
        # Проверяем каждую ячейку в строке на точное совпадение
        found_headers = []
        for col_idx, cell_value in enumerate(row):
            if pd.notna(cell_value):
                cell_str = str(cell_value).strip()
                # Проверяем точное совпадение с каждым полем
                for field_label in table_field_labels:
                    if cell_str == field_label:
                        found_headers.append(field_label)
        
        # Если найдены ВСЕ заголовки - это начало таблицы
        if len(found_headers) == len(table_field_labels):
            return row_idx, []
    
    # Если не найдена строка со всеми заголовками, определяем отсутствующие поля
    # Проверяем каждое поле отдельно по всему файлу на точное совпадение
    for field_label in table_field_labels:
        field_found = False
        for row_idx, row in excel_data.iterrows():
            for col_idx, cell_value in enumerate(row):
                if pd.notna(cell_value):
                    cell_str = str(cell_value).strip()
                    if cell_str == field_label:
                        field_found = True
                        break
            if field_found:
                break
        
        if not field_found:
            missing_fields.append(field_label)
    
    return None, missing_fields


def process_table_data_for_transmittal_revisions(
    db: Session, 
    table_data: pd.DataFrame, 
    table_fields: Dict[str, str], 
    transmittal_id: int | None, 
    project_id: int
) -> Dict[str, Any]:
    """Обрабатывает данные таблицы и создает transmittal_revisions"""
    
    created_revisions = []
    missing_documents = []  # Список несуществующих документов
    
    # Получаем названия колонок для поиска
    document_number_label = table_fields.get('document_number_label', '')
    status_label = table_fields.get('status_label', '')
    
    # Находим индексы колонок
    document_number_col = None
    status_col = None
    
    for col_idx, col_name in enumerate(table_data.columns):
        col_name_clean = str(col_name).strip().lower()
        
        # Ищем колонку номера документа
        if document_number_label and document_number_label.strip().lower() in col_name_clean:
            document_number_col = col_idx
        # Если не нашли по названию, ищем по содержимому первой строки
        elif document_number_label and document_number_col is None:
            first_row_value = str(table_data.iloc[0, col_idx]).strip().lower()
            if document_number_label.strip().lower() in first_row_value:
                document_number_col = col_idx
        
        # Ищем колонку статуса
        if status_label and status_label.strip().lower() in col_name_clean:
            status_col = col_idx
        # Если не нашли по названию, ищем по содержимому первой строки
        elif status_label and status_col is None:
            first_row_value = str(table_data.iloc[0, col_idx]).strip().lower()
            if status_label.strip().lower() in first_row_value:
                status_col = col_idx
    
    # Находим строку с заголовком по настройкам
    header_row_idx = None
    for row_idx, row in table_data.iterrows():
        # Проверяем, содержит ли строка заголовки из настроек
        if document_number_col is not None and document_number_col < len(row):
            cell_value = str(row.iloc[document_number_col]).strip().lower()
            if document_number_label and document_number_label.strip().lower() in cell_value:
                header_row_idx = row_idx
                break
    
    if header_row_idx is None:
        raise HTTPException(
            status_code=400,
            detail=get_localized_message("IMPORT_TABLE_FIELDS_NOT_FOUND", fields=document_number_label)
        )
    
    # Сначала проверяем все документы, не создавая записи
    for row_idx, row in table_data.iterrows():
        # Пропускаем строки до заголовка и сам заголовок
        if row_idx <= header_row_idx:
            continue
        
        # Проверяем, есть ли данные в строке
        has_data = False
        for cell in row:
            if pd.notna(cell) and str(cell).strip():
                has_data = True
                break
        
        if not has_data:
            continue
            
        # Получаем номер документа
        document_number = None
        if document_number_col is not None and document_number_col < len(row):
            doc_value = row.iloc[document_number_col]
            if pd.notna(doc_value):
                document_number = str(doc_value).strip()
        
        if not document_number:
            continue  # Пропускаем строки без номера документа
        
        # Ищем документ по номеру в проекте
        document = db.query(Document).filter(
            Document.number == document_number,
            Document.project_id == project_id,
            Document.is_deleted == 0
        ).first()
        
        if not document:
            missing_documents.append(document_number)
            continue
        
        # Проверяем наличие ревизий у документа
        latest_revision = db.query(DocumentRevision).filter(
            DocumentRevision.document_id == document.id,
            DocumentRevision.is_deleted == 0
        ).order_by(DocumentRevision.created_at.desc()).first()
        
        if not latest_revision:
            missing_documents.append(f"{document_number} (нет ревизий)")
            continue
    
    # Если есть несуществующие документы, возвращаем ошибку
    if missing_documents:
        return {
            'created_revisions': [],
            'missing_documents': missing_documents
        }
    
    # Если все документы существуют и передан transmittal_id, создаем transmittal_revisions
    if transmittal_id is not None:
        for row_idx, row in table_data.iterrows():
            # Пропускаем строки до заголовка и сам заголовок
            if row_idx <= header_row_idx:
                continue
            
            # Проверяем, есть ли данные в строке
            has_data = False
            for cell in row:
                if pd.notna(cell) and str(cell).strip():
                    has_data = True
                    break
            
            if not has_data:
                continue
                
            # Получаем номер документа
            document_number = None
            if document_number_col is not None and document_number_col < len(row):
                doc_value = row.iloc[document_number_col]
                if pd.notna(doc_value):
                    document_number = str(doc_value).strip()
            
            if not document_number:
                continue
            
            
            # Получаем статус документа (если есть колонка статуса)
            document_status = None
            if status_col is not None and status_col < len(row):
                status_value = row.iloc[status_col]
                if pd.notna(status_value):
                    document_status = str(status_value).strip()
            
            # Ищем документ по номеру в проекте
            document = db.query(Document).filter(
                Document.number == document_number,
                Document.project_id == project_id,
                Document.is_deleted == 0
            ).first()
            
            # Получаем последнюю ревизию документа
            latest_revision = db.query(DocumentRevision).filter(
                DocumentRevision.document_id == document.id,
                DocumentRevision.is_deleted == 0
            ).order_by(DocumentRevision.created_at.desc()).first()
            
            # Проверяем, не добавлена ли уже эта ревизия в трансмиттал
            existing_revision = db.query(TransmittalRevision).filter(
                TransmittalRevision.transmittal_id == transmittal_id,
                TransmittalRevision.revision_id == latest_revision.id
            ).first()
            
            if existing_revision:
                continue
            
            # Создаем transmittal_revision
            transmittal_revision = TransmittalRevision(
                transmittal_id=transmittal_id,
                revision_id=latest_revision.id
            )
            
            db.add(transmittal_revision)
            created_revisions.append(transmittal_revision)
        
        # Сохраняем все изменения
        db.commit()
    
    return {
        'created_revisions': created_revisions,
        'missing_documents': missing_documents
    }
