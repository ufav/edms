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
        
        # Извлекаем метаданные (если они настроены)
        metadata = {}
        if 'metadata_fields' in settings_data and settings_data['metadata_fields']:
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
        
        # Проверяем конфликт источников номера трансмиттала ПЕРЕД поиском полей
        has_metadata_label = (settings_data and 
                             'metadata_fields' in settings_data and 
                             'transmittal_number' in settings_data['metadata_fields'] and
                             settings_data['metadata_fields']['transmittal_number'].get('label', '').strip())
        has_table_field = 'transmittal_number_label' in table_fields and table_fields['transmittal_number_label'].strip()
        
        
        if has_metadata_label and has_table_field:
            # Оба источника настроены - ошибка
            raise HTTPException(
                status_code=400,
                detail=get_localized_message("IMPORT_BOTH_SOURCES_CONFIGURED")
            )
        
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
            db, table_data, table_fields, None, project_id, table_start_row, excel_data  # transmittal_id = None для проверки
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
        # Определяем источник номера трансмиттала
        transmittal_number = ''
        
        if has_metadata_label:
            # Только метаданные
            transmittal_number = metadata.get('transmittal_number', '').strip()
        elif has_table_field:
            # Только таблица
            transmittal_number = find_transmittal_number_in_table(table_data, table_fields)
        else:
            # Ничего не настроено - ошибка
            raise HTTPException(
                status_code=400,
                detail=get_localized_message("IMPORT_NO_SOURCE_CONFIGURED")
            )
        
        # Проверяем, что номер найден
        if not transmittal_number:
            if has_metadata_label:
                raise HTTPException(
                    status_code=400,
                    detail=get_localized_message("IMPORT_TRANSMITTAL_NOT_FOUND_METADATA")
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=get_localized_message("IMPORT_TRANSMITTAL_NOT_FOUND_TABLE")
                )
        
        transmittal = Transmittal(
            transmittal_number=transmittal_number,
            project_id=project_id,
            counterparty_id=counterparty_id,
            direction='in',
            status_id=received_status.id,
            created_by=current_user.id,
            transmittal_date=datetime.now(),
            title=f"Входящий трансмиттал {transmittal_number}",
            description=f"Импортирован из Excel файла: {file.filename}"
        )
        
        db.add(transmittal)
        db.commit()
        db.refresh(transmittal)
        
        # Теперь создаем transmittal_revisions
        table_result = process_table_data_for_transmittal_revisions(
            db, table_data, table_fields, transmittal.id, project_id, table_start_row, excel_data
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
    # Фильтруем пустые поля - они не нужны для поиска заголовков
    table_field_labels = [label for label in table_fields.values() if label and label.strip()]
    missing_fields = []
    
    # Если нет полей для поиска, возвращаем ошибку
    if not table_field_labels:
        return None, ["Нет настроенных полей для поиска в таблице"]
    
    for row_idx, row in excel_data.iterrows():
        # Проверяем каждую ячейку в строке на точное совпадение
        found_headers = []
        row_cells = []
        for col_idx, cell_value in enumerate(row):
            if pd.notna(cell_value):
                cell_str = str(cell_value).strip()
                row_cells.append(cell_str)
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
    project_id: int,
    header_row_idx: int = 0,
    original_excel_data: pd.DataFrame = None
) -> Dict[str, Any]:
    """Обрабатывает данные таблицы и создает transmittal_revisions"""
    
    print(f"DEBUG: process_table_data_for_transmittal_revisions called")
    print(f"DEBUG: table_fields = {table_fields}")
    print(f"DEBUG: table_data columns = {list(table_data.columns)}")
    print(f"DEBUG: header_row_idx = {header_row_idx}")
    
    created_revisions = []
    missing_documents = []  # Список несуществующих документов
    
    # Получаем названия колонок для поиска
    document_number_label = table_fields.get('document_number_label', '')
    status_label = table_fields.get('status_label', '')
    
    print(f"DEBUG: document_number_label = '{document_number_label}'")
    print(f"DEBUG: status_label = '{status_label}'")
    
    # Находим индексы колонок в строке заголовка
    document_number_col = None
    status_col = None
    
    # Ищем колонки в строке заголовка исходного Excel файла
    if original_excel_data is not None and len(original_excel_data) > header_row_idx:
        header_row = original_excel_data.iloc[header_row_idx]  # Строка заголовка в исходном файле
        print(f"DEBUG: header_row from original Excel = {list(header_row)}")
        
        for col_idx, cell_value in enumerate(header_row):
            if pd.notna(cell_value):
                cell_str = str(cell_value).strip()
                cell_lower = cell_str.lower()
                
                # Ищем колонку номера документа
                if document_number_label and document_number_col is None:
                    document_label_clean = document_number_label.strip().lower()
                    # Точное совпадение или заканчивается на нужный текст, но НЕ содержит "load sheet"
                    if (cell_lower == document_label_clean or 
                        cell_lower.endswith(document_label_clean)) and not any(exclude_word in cell_lower for exclude_word in ['load sheet', 'transmittal']):
                        document_number_col = col_idx
                        print(f"DEBUG: Found document column at index {col_idx}: '{cell_str}'")
                
                # Ищем колонку статуса
                if status_label and status_col is None:
                    status_label_clean = status_label.strip().lower()
                    if (cell_lower == status_label_clean or 
                        cell_lower.endswith(status_label_clean) or
                        status_label_clean in cell_lower):
                        status_col = col_idx
                        print(f"DEBUG: Found status column at index {col_idx}: '{cell_str}'")
    else:
        # Fallback - ищем в первой строке table_data
        if len(table_data) > 0:
            header_row = table_data.iloc[0]
            print(f"DEBUG: header_row from table_data = {list(header_row)}")
            
            for col_idx, cell_value in enumerate(header_row):
                if pd.notna(cell_value):
                    cell_str = str(cell_value).strip()
                    cell_lower = cell_str.lower()
                    
                    # Ищем колонку номера документа
                    if document_number_label and document_number_col is None:
                        document_label_clean = document_number_label.strip().lower()
                        # Точное совпадение или заканчивается на нужный текст, но НЕ содержит "load sheet"
                        if (cell_lower == document_label_clean or 
                            cell_lower.endswith(document_label_clean)) and not any(exclude_word in cell_lower for exclude_word in ['load sheet', 'transmittal']):
                            document_number_col = col_idx
                            print(f"DEBUG: Found document column at index {col_idx}: '{cell_str}'")
                    
                    # Ищем колонку статуса
                    if status_label and status_col is None:
                        status_label_clean = status_label.strip().lower()
                        if (cell_lower == status_label_clean or 
                            cell_lower.endswith(status_label_clean) or
                            status_label_clean in cell_lower):
                            status_col = col_idx
                            print(f"DEBUG: Found status column at index {col_idx}: '{cell_str}'")
    
    # В table_data первая строка (индекс 0) - это заголовок, данные начинаются с индекса 1
    # Но индексы в table_data соответствуют исходному Excel файлу, поэтому нужно учитывать header_row_idx
    data_start_row = 1  # Относительно table_data (первая строка после заголовка)
    
    print(f"DEBUG: Using data_start_row = {data_start_row}")
    print(f"DEBUG: document_number_col = {document_number_col}")
    print(f"DEBUG: status_col = {status_col}")
    
    # Сначала проверяем все документы, не создавая записи
    for row_idx, row in table_data.iterrows():
        # Вычисляем относительный индекс в table_data (0 = заголовок, 1+ = данные)
        relative_row_idx = row_idx - header_row_idx
        print(f"DEBUG: Processing row {row_idx} (relative {relative_row_idx}): {list(row)}")
        
        # Пропускаем заголовок (относительный индекс 0), начинаем с данных (относительный индекс 1+)
        if relative_row_idx < data_start_row:
            print(f"DEBUG: Skipping header row {row_idx} (relative {relative_row_idx})")
            continue
        
        # Проверяем, есть ли данные в строке
        has_data = False
        for cell in row:
            if pd.notna(cell) and str(cell).strip():
                has_data = True
                break
        
        if not has_data:
            print(f"DEBUG: No data in row {row_idx}, skipping")
            continue
        
        print(f"DEBUG: Processing data row {row_idx}")
            
        # Получаем номер документа
        document_number = None
        if document_number_col is not None and document_number_col < len(row):
            doc_value = row.iloc[document_number_col]
            print(f"DEBUG: document_number_col={document_number_col}, doc_value='{doc_value}'")
            if pd.notna(doc_value):
                document_number = str(doc_value).strip()
                print(f"DEBUG: Found document_number='{document_number}'")
        
        if not document_number:
            print(f"DEBUG: No document_number in row {row_idx}, skipping")
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

def find_transmittal_number_in_table(table_data: pd.DataFrame, table_fields: Dict[str, str]) -> str:
    """Ищет номер трансмиттала в таблице по различным возможным полям"""
    
    # Сначала проверяем настройки Table Fields
    if 'transmittal_number_label' in table_fields and table_fields['transmittal_number_label']:
        transmittal_field_label = table_fields['transmittal_number_label']
        
        # Ищем колонку с этим лейблом в заголовке (первая строка)
        header_row = table_data.iloc[0]  # Первая строка - заголовок
        for col_idx, cell_value in enumerate(header_row):
            if pd.notna(cell_value) and str(cell_value).strip() == transmittal_field_label:
                # Нашли колонку, берем первое непустое значение из данных (начиная со строки 1)
                for row_idx in range(1, len(table_data)):
                    cell_value = table_data.iloc[row_idx, col_idx]
                    if pd.notna(cell_value) and str(cell_value).strip():
                        return str(cell_value).strip()
                break
    
    # Если не нашли по настройкам, используем автопоиск
    possible_transmittal_fields = [
        'transmittal_number',
        'transmittal_no', 
        'transmittal_id',
        'transmittal',
        'number',
        'no',
        'id',
        'document_id',
        'load_sheet_document_id'
    ]
    
    # Ищем в заголовках таблицы (первая строка)
    header_row = table_data.iloc[0]  # Первая строка - заголовок
    for col_idx, cell_value in enumerate(header_row):
        if pd.notna(cell_value):
            col_str = str(cell_value).strip().lower()
            for possible_field in possible_transmittal_fields:
                if possible_field in col_str or col_str in possible_field:
                    # Нашли потенциальное поле, берем первое непустое значение из данных (начиная со строки 1)
                    for row_idx in range(1, len(table_data)):
                        cell_value = table_data.iloc[row_idx, col_idx]
                        if pd.notna(cell_value) and str(cell_value).strip():
                            return str(cell_value).strip()
    
    # Если не нашли в заголовках, ищем в самих данных (начиная со строки 1)
    for row_idx in range(1, len(table_data)):
        row = table_data.iloc[row_idx]
        for col_idx, cell_value in enumerate(row):
            if pd.notna(cell_value):
                cell_str = str(cell_value).strip()
                # Ищем значения, которые могут быть номерами трансмитталов
                if (len(cell_str) > 3 and 
                    (cell_str.isalnum() or '-' in cell_str or '_' in cell_str) and
                    not cell_str.isdigit()):  # Исключаем чисто числовые значения
                    return cell_str
    
    return ""
