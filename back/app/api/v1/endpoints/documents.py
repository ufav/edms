"""
Documents endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import os
import shutil
import hashlib
import uuid
from datetime import datetime, date
# import pandas as pd  # Temporarily disabled
import io

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.document import Document, DocumentRevision
from app.models.discipline import Discipline, DocumentType
from app.models.references import Language
from app.models.project import ProjectDisciplineDocumentType, ProjectMember
from app.services.auth import get_current_active_user

router = APIRouter()

class DocumentCreate(BaseModel):
    title: str
    title_native: str = None  # Переименовано из description
    remarks: Optional[str] = None  # Примечания (текстовое поле)
    number: Optional[str] = None
    project_id: int
    discipline_id: Optional[int] = None
    document_type_id: Optional[int] = None
    language_id: Optional[int] = None
    document_code: Optional[str] = None
    language_id: Optional[int] = None
    author: Optional[str] = None
    creation_date: Optional[date] = None
    revision: Optional[str] = None
    sheet_number: Optional[str] = None
    total_sheets: Optional[int] = None
    scale: Optional[str] = None
    format: Optional[str] = None
    confidentiality: str = "internal"
    drs: Optional[str] = None

class DocumentUpdate(BaseModel):
    title: str = None
    title_native: str = None  # Переименовано из description
    remarks: Optional[str] = None  # Примечания (текстовое поле)
    number: Optional[str] = None
    status: str = None
    is_deleted: Optional[int] = None
    drs: Optional[str] = None
    discipline_id: Optional[int] = None
    document_type_id: Optional[int] = None
    language_id: Optional[int] = None
    document_code: Optional[str] = None
    language_id: Optional[int] = None
    author: Optional[str] = None
    creation_date: Optional[date] = None
    revision: Optional[str] = None
    sheet_number: Optional[str] = None
    total_sheets: Optional[int] = None
    scale: Optional[str] = None
    format: Optional[str] = None
    confidentiality: Optional[str] = None

class DocumentMetadata(BaseModel):
    file_name: str
    title: str
    title_native: Optional[str] = None  # Переименовано из description
    remarks: Optional[str] = None  # Примечания (текстовое поле)
    discipline_code: Optional[str] = None
    document_type_code: Optional[str] = None
    document_code: Optional[str] = None
    language_id: Optional[int] = None
    author: Optional[str] = None
    creation_date: Optional[date] = None
    revision: Optional[str] = None
    sheet_number: Optional[str] = None
    total_sheets: Optional[int] = None
    scale: Optional[str] = None
    format: Optional[str] = None
    confidentiality: str = "internal"


def _bump_revision_string(current: Optional[str]) -> str:
    """Увеличивает номер ревизии: 01 -> 02, 02 -> 03, и т.д."""
    try:
        # Парсим текущий номер (например, "01", "02")
        current_num = int(current or "01")
        new_num = current_num + 1
        # Возвращаем в формате с ведущим нулем (01, 02, 03, ...)
        return f"{new_num:02d}"
    except Exception:
        # Если не удалось распарсить, возвращаем "02"
        return "02"


def _compute_md5(file_path: str) -> Optional[str]:
    try:
        md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                md5.update(chunk)
        return md5.hexdigest()
    except Exception:
        return None

@router.get("/", response_model=List[dict])
async def get_documents(
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка документов"""
    query = db.query(Document).filter(Document.is_deleted == 0)
    
    if project_id:
        query = query.filter(Document.project_id == project_id)
    
    documents = query.order_by(Document.updated_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for doc in documents:
        # Получаем последнюю ревизию документа
        latest_revision = db.query(DocumentRevision).filter(
            DocumentRevision.document_id == doc.id
        ).order_by(DocumentRevision.created_at.desc()).first()
        
        # Получаем данные дисциплины
        discipline = None
        if doc.discipline_id:
            discipline = db.query(Discipline).filter(Discipline.id == doc.discipline_id).first()
        
        # Получаем данные типа документа
        document_type = None
        if doc.document_type_id:
            document_type = db.query(DocumentType).filter(DocumentType.id == doc.document_type_id).first()
        
        # Получаем DRS из project_discipline_document_types
        drs = None
        if doc.project_id and doc.discipline_id and doc.document_type_id:
            project_discipline_doc_type = db.query(ProjectDisciplineDocumentType).filter(
                ProjectDisciplineDocumentType.project_id == doc.project_id,
                ProjectDisciplineDocumentType.discipline_id == doc.discipline_id,
                ProjectDisciplineDocumentType.document_type_id == doc.document_type_id
            ).first()
            if project_discipline_doc_type:
                drs = project_discipline_doc_type.drs
        
        result.append({
            "id": doc.id,
            "title": doc.title,
            "title_native": doc.title_native,  # Нативное название
            "description": doc.title_native,  # Для обратной совместимости
            "remarks": doc.remarks,  # Примечания (текстовое поле)
            "number": doc.number,
            "file_name": latest_revision.file_name if latest_revision else None,
            "file_size": latest_revision.file_size if latest_revision else None,
            "file_type": latest_revision.file_type if latest_revision else None,
            "revision": latest_revision.number if latest_revision else "01",
            "revision_description_id": latest_revision.revision_description_id if latest_revision else None,
            "revision_status_id": latest_revision.revision_status_id if latest_revision else None,
            "is_deleted": doc.is_deleted if doc.is_deleted is not None else 0,
            "drs": drs,  # DRS из project_discipline_document_types
            "project_id": doc.project_id,
            "language_id": doc.language_id,
            "discipline_id": doc.discipline_id,
            "document_type_id": doc.document_type_id,
            "discipline_name": discipline.name if discipline else None,
            "discipline_code": discipline.code if discipline else None,
            "document_type_name": document_type.name if document_type else None,
            "document_type_code": document_type.code if document_type else None,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
            "created_by": doc.created_by
        })
    
    return result

@router.post("/upload", response_model=dict)
async def upload_document(
    file: UploadFile = File(...),
    title: str = None,
    title_native: str = None,  # Переименовано из description
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Загрузка документа"""
    
    # Проверяем размер файла
    if file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой")
    
    # Проверяем тип файла
    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    if file_extension and settings.ALLOWED_FILE_TYPES:
        # settings.ALLOWED_FILE_TYPES хранится строкой с запятыми
        allowed = {ext.strip().lower() for ext in settings.ALLOWED_FILE_TYPES.split(',') if ext.strip()}
        if file_extension not in allowed:
            raise HTTPException(status_code=400, detail="Неподдерживаемый тип файла")
    
    # Генерируем уникальное имя файла
    file_uuid = str(uuid.uuid4())
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
    new_filename = f"{file_uuid}.{file_extension}"
    
    # Сохраняем файл
    file_path = os.path.join(settings.UPLOAD_DIR, new_filename)
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Создаем запись в базе данных
    db_document = Document(
        title=title or file.filename,
        title_native=title_native,  # Переименовано из description
        remarks=None,  # Примечания (можно добавить в будущем)
        project_id=project_id
    )
    
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    # Создаем первую ревизию документа
    revision_row = DocumentRevision(
        document_id=db_document.id,
        revision="1.0",
        file_path=file_path,
        file_name=file.filename,
        file_size=file.size,
        file_type=file.content_type,
        change_description="First revision - Первая ревизия",
        uploaded_by=current_user.id,
    )
    
    db.add(revision_row)
    db.commit()
    db.refresh(revision_row)
    
    return {
        "id": db_document.id,
        "title": db_document.title,
        "file_name": revision_row.file_name,
        "file_size": revision_row.file_size,
        "file_type": revision_row.file_type,
        "revision": revision_row.number,
        "revision_status_id": revision_row.revision_status_id,
        "created_at": db_document.created_at
    }


@router.post("/create-with-revision", response_model=dict)
async def create_document_with_revision(
    file: UploadFile = File(...),
    title: str = Form(...),
    title_native: str = Form(None),
    remarks: str = Form(None),
    number: str = Form(None),
    drs: str = Form(None),
    project_id: int = Form(...),
    discipline_id: int = Form(None),
    document_type_id: int = Form(None),
    language_id: int = Form(1),
    revision_description_id: int = Form(None),
    revision_step_id: int = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Создание документа с первой ревизией"""
    
    # Проверяем размер файла
    if file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой")
    
    # Проверяем тип файла
    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    if file_extension and settings.ALLOWED_FILE_TYPES:
        allowed = {ext.strip().lower() for ext in settings.ALLOWED_FILE_TYPES.split(',') if ext.strip()}
        if file_extension not in allowed:
            raise HTTPException(status_code=400, detail="Неподдерживаемый тип файла")
    
    # Генерируем уникальное имя файла
    file_uuid = str(uuid.uuid4())
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
    new_filename = f"{file_uuid}.{file_extension}"
    
    # Сохраняем файл
    file_path = os.path.join(settings.UPLOAD_DIR, new_filename)
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Создаем запись документа в базе данных
    db_document = Document(
        title=title,
        title_native=title_native,
        remarks=remarks,
        number=number,
        project_id=project_id,
        discipline_id=discipline_id,
        document_type_id=document_type_id,
        language_id=language_id,
        created_by=current_user.id
    )
    
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    # Получаем ID статуса "Active" для первой ревизии
    from app.models.references import RevisionStatus
    active_status = db.query(RevisionStatus).filter(RevisionStatus.id == 1).first()
    active_status_id = active_status.id if active_status else None
    
    # Создаем первую ревизию документа
    revision_row = DocumentRevision(
        document_id=db_document.id,
        number="01",
        file_path=file_path,
        file_name=file.filename,
        file_size=file.size,
        file_type=file.content_type,
        change_description="First revision - Первая ревизия",
        uploaded_by=current_user.id,
        revision_status_id=active_status_id,
        revision_description_id=revision_description_id,
        revision_step_id=revision_step_id
    )
    
    db.add(revision_row)
    db.commit()
    db.refresh(revision_row)
    
    return {
        "id": db_document.id,
        "title": db_document.title,
        "number": db_document.number,
        "file_name": revision_row.file_name,
        "file_size": revision_row.file_size,
        "revision": revision_row.number,
        "created_at": db_document.created_at
    }

@router.get("/{document_id}", response_model=dict)
async def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение документа по ID"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Получаем последнюю версию документа
    latest_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id
    ).order_by(DocumentRevision.created_at.desc()).first()
    
    return {
        "id": document.id,
        "title": document.title,
        "description": document.description,
        "number": document.number,
        "file_name": latest_revision.file_name if latest_revision else None,
        "file_size": latest_revision.file_size if latest_revision else None,
        "file_type": latest_revision.file_type if latest_revision else None,
        "revision": latest_revision.number if latest_revision else "01",
        "revision_status_id": latest_revision.revision_status_id if latest_revision else None,
        "is_deleted": document.is_deleted,
        "drs": None,  # DRS moved to project_discipline_document_types
        "project_id": document.project_id,
        "discipline_id": document.discipline_id,
        "document_type_id": document.document_type_id,
        "language_id": document.language_id,
        "document_code": document.document_code,
        "author": document.author,
        "creation_date": document.creation_date,
        "revision": latest_revision.number if latest_revision else "01",
        "sheet_number": document.sheet_number,
        "total_sheets": document.total_sheets,
        "scale": document.scale,
        "format": document.format,
        "confidentiality": document.confidentiality,
        "created_at": document.created_at,
        "created_by": document.created_by
    }


@router.post("/import-by-paths")
async def import_documents_by_paths(
    metadata_file: UploadFile = File(...),
    project_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Импорт документов по путям из Excel метаданных (без загрузки файлов).

    Ожидаемые колонки Excel (минимум):
    - file_path: абсолютный или относительный путь к исходному файлу
    - title: заголовок документа
    Необязательные: description, discipline_code, document_type_code, document_code, language,
      author, creation_date, revision, sheet_number, total_sheets, scale, format, confidentiality
    """

    try:
        metadata_content = await metadata_file.read()
        # df = pd.read_excel(io.BytesIO(metadata_content))  # Temporarily disabled
        # TODO: Re-enable pandas functionality
        raise HTTPException(status_code=501, detail="Excel import temporarily disabled")

        required_columns = ['file_path', 'title']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Отсутствуют обязательные колонки: {', '.join(missing_columns)}"
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка чтения файла метаданных: {str(e)}")

    disciplines = {d.code: d.id for d in db.query(Discipline).all()}
    document_types = {dt.code: dt.id for dt in db.query(DocumentType).all()}

    imported_documents = []
    errors = []

    upload_dir = os.path.join(settings.UPLOAD_DIR, f"project_{project_id}")
    os.makedirs(upload_dir, exist_ok=True)

    for _, row in df.iterrows():
        try:
            src_path_raw = row['file_path']
            # if pd.isna(src_path_raw) or not str(src_path_raw).strip():  # Temporarily disabled
            if not src_path_raw or not str(src_path_raw).strip():
                errors.append("Строка без file_path пропущена")
                continue

            src_path = str(src_path_raw).strip()

            # Проверяем существование файла
            if not os.path.isabs(src_path):
                # Разрешаем относительные пути относительно рабочего каталога процесса
                src_path = os.path.abspath(src_path)
            if not os.path.exists(src_path) or not os.path.isfile(src_path):
                errors.append(f"Файл не найден: {src_path}")
                continue

            # Имя и расширение исходного файла
            original_name = os.path.basename(src_path)
            file_extension = os.path.splitext(original_name)[1].lstrip('.').lower()

            # Проверка типа файла (по расширению)
            if file_extension and settings.ALLOWED_FILE_TYPES:
                # settings.ALLOWED_FILE_TYPES хранится строкой с запятыми
                allowed = {ext.strip().lower() for ext in settings.ALLOWED_FILE_TYPES.split(',') if ext.strip()}
                if file_extension not in allowed:
                    errors.append(f"Неподдерживаемый тип файла: .{file_extension} ({original_name})")
                    continue

            # Копируем файл в каталог загрузок проекта с уникальным именем
            unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
            dst_path = os.path.join(upload_dir, unique_filename)
            try:
                shutil.copy2(src_path, dst_path)
            except Exception as copy_err:
                errors.append(f"Ошибка копирования '{src_path}': {copy_err}")
                continue

            # Карта метаданных
            def get_str(name: str, default: str = None):
                val = row.get(name)
                # return str(val).strip() if pd.notna(val) else default  # Temporarily disabled
                return str(val).strip() if val is not None else default

            def get_int(name: str):
                val = row.get(name)
                try:
                    # return int(val) if pd.notna(val) else None  # Temporarily disabled
                    return int(val) if val is not None else None
                except Exception:
                    return None

            def get_date(name: str):
                val = row.get(name)
                try:
                    # return pd.to_datetime(val).date() if pd.notna(val) else None  # Temporarily disabled
                    # TODO: Implement proper date parsing without pandas
                    return None
                except Exception:
                    return None

            discipline_id = None
            document_type_id = None

            discipline_code = get_str('discipline_code')
            if discipline_code:
                discipline_id = disciplines.get(discipline_code)
                if not discipline_id:
                    errors.append(f"Дисциплина не найдена по коду: {discipline_code} (файл {original_name})")
                    # не прерываем — можно продолжить без дисциплины

            document_type_code = get_str('document_type_code')
            if document_type_code:
                document_type_id = document_types.get(document_type_code)
                if not document_type_id:
                    errors.append(f"Тип документа не найден по коду: {document_type_code} (файл {original_name})")

            title = get_str('title', original_name)
            description = get_str('description')

            # Получаем language_id по коду языка
            language_id = None
            language_code = get_str('language_code')
            if language_code:
                language = db.query(Language).filter(Language.code == language_code).first()
                if language:
                    language_id = language.id
                else:
                    errors.append(f"Язык не найден по коду: {language_code} (файл {original_name})")

            db_document = Document(
                title=title,
                title_native=description,  # Переименовано из description
                remarks=None,  # Примечания (можно добавить в будущем)
                number=get_str('number'),
                project_id=project_id,
                discipline_id=discipline_id,
                document_type_id=document_type_id,
                language_id=language_id,
                document_code=get_str('document_code'),
                author=get_str('author'),
                creation_date=get_date('creation_date'),
                revision=get_str('revision'),
                sheet_number=get_str('sheet_number'),
                total_sheets=get_int('total_sheets'),
                scale=get_str('scale'),
                format=get_str('format'),
                confidentiality=get_str('confidentiality', 'internal'),
                drs=None  # DRS moved to project_discipline_document_types
            )

            db.add(db_document)
            db.commit()
            db.refresh(db_document)
            
            # Создаем первую ревизию документа
            revision_row = DocumentRevision(
                document_id=db_document.id,
                revision="1.0",
                file_path=dst_path,
                file_name=original_name,
                file_size=os.path.getsize(dst_path),
                file_type=file_extension,
                change_description="Импорт по пути",
                uploaded_by=current_user.id,
            )
            
            db.add(revision_row)
            db.commit()
            db.refresh(revision_row)

            imported_documents.append({
                "id": db_document.id,
                "title": db_document.title,
                "number": db_document.number,
                "file_name": revision_row.file_name,
                "file_size": revision_row.file_size,
                "is_deleted": db_document.is_deleted,
                "drs": None,  # DRS moved to project_discipline_document_types
                "discipline_id": db_document.discipline_id,
                "document_type_id": db_document.document_type_id,
                "language_id": db_document.language_id,
                "document_code": db_document.document_code,
                "author": db_document.author,
                "revision": "01",  # Заглушка, так как поле revision больше не существует
                "confidentiality": db_document.confidentiality
            })

        except Exception as e:
            errors.append(str(e))

    return {
        "imported_documents": imported_documents,
        "total_imported": len(imported_documents),
        "total_rows": len(df.index),
        "errors": errors
    }


@router.get("/{document_id}/revisions", response_model=List[dict])
async def list_document_revisions(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")

    versions = (
        db.query(DocumentRevision)
        .filter(DocumentRevision.document_id == document_id)
        .filter(DocumentRevision.is_deleted == 0)  # Показываем только неудаленные ревизии
        .order_by(DocumentRevision.created_at.desc())
        .all()
    )
    return [
        {
            "id": v.id,
            "document_id": v.document_id,
            "number": v.number,  # Переименовано с revision на number
            "file_name": v.file_name,
            "file_size": v.file_size,
            "file_type": v.file_type,
            "change_description": v.change_description,
            "uploaded_by": v.uploaded_by,
            "is_deleted": v.is_deleted,
            "created_at": v.created_at,
            # Добавляем поля для связи со справочниками
            "revision_status_id": v.revision_status_id,
            "revision_description_id": v.revision_description_id,
            "revision_step_id": v.revision_step_id,
        }
        for v in versions
    ]


@router.post("/{document_id}/revisions", response_model=dict)
async def create_document_revision(
    document_id: int,
    file: UploadFile = File(...),
    change_description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Загрузить новый файл как новую версию документа."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")

    # Проверка типа
    file_extension = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_extension and settings.ALLOWED_FILE_TYPES:
        # settings.ALLOWED_FILE_TYPES хранится строкой с запятыми
        allowed = {ext.strip().lower() for ext in settings.ALLOWED_FILE_TYPES.split(',') if ext.strip()}
        if file_extension not in allowed:
            raise HTTPException(status_code=400, detail="Неподдерживаемый тип файла")

    # Куда сохраняем
    upload_dir = os.path.join(settings.UPLOAD_DIR, f"project_{document.project_id}")
    os.makedirs(upload_dir, exist_ok=True)

    # Сохраняем файл
    unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
    file_path = os.path.join(upload_dir, unique_filename)
    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    # Получаем ID статуса "Cancelled"
    from app.models.references import RevisionStatus
    cancelled_status = db.query(RevisionStatus).filter(RevisionStatus.name == "Cancelled").first()
    
    # Получаем текущую ревизию из последней НЕ отмененной ревизии
    latest_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id,
        DocumentRevision.is_deleted == 0  # Только не удаленные ревизии
    ).order_by(DocumentRevision.created_at.desc()).first()
    
    # Если есть отмененная ревизия с тем же номером, используем тот же номер
    if latest_revision and cancelled_status:
        # Проверяем, есть ли отмененная ревизия с тем же номером
        cancelled_revision = db.query(DocumentRevision).filter(
            DocumentRevision.document_id == document_id,
            DocumentRevision.number == latest_revision.number,
            DocumentRevision.revision_status_id == cancelled_status.id  # Отмененная ревизия
        ).first()
        
        if cancelled_revision:
            # Используем тот же номер, что и у отмененной ревизии
            new_revision = latest_revision.number
        else:
            # Генерируем новый номер
            new_revision = _bump_revision_string(latest_revision.number)
    else:
        # Если нет ревизий, начинаем с "01"
        new_revision = "01"

    # Получаем ID статусов из справочника
    from app.models.references import RevisionStatus
    active_status = db.query(RevisionStatus).filter(RevisionStatus.name == "Active").first()
    superseded_status = db.query(RevisionStatus).filter(RevisionStatus.name == "Superseded").first()
    
    # Если есть предыдущие ревизии, помечаем их как Superseded
    if latest_revision and active_status and superseded_status:
        # Обновляем все предыдущие активные ревизии на Superseded (кроме отмененных)
        db.query(DocumentRevision).filter(
            DocumentRevision.document_id == document_id,
            DocumentRevision.revision_status_id == active_status.id,
            DocumentRevision.is_deleted == 0
        ).update({"revision_status_id": superseded_status.id})

    # Создаем запись ревизии с активным статусом
    # Копируем revision_step_id и revision_description_id из предыдущей ревизии
    revision_row = DocumentRevision(
        document_id=document.id,
        number=new_revision,
        file_path=file_path,
        file_name=file.filename,
        file_size=len(content),
        file_type=file.content_type or file_extension,
        change_description=change_description,
        uploaded_by=current_user.id,
        revision_status_id=active_status.id if active_status else None,
        revision_step_id=latest_revision.revision_step_id if latest_revision else None,
        revision_description_id=latest_revision.revision_description_id if latest_revision else None,
    )
    db.add(revision_row)
    db.commit()
    db.refresh(revision_row)
    db.refresh(document)

    return {
        "message": "Новая ревизия создана",
        "document_id": document.id,
        "revision": revision_row.number,
        "file_name": revision_row.file_name,
        "file_size": revision_row.file_size,
        "created_at": revision_row.created_at,
    }


@router.get("/{document_id}/revisions/compare", response_model=dict)
async def compare_document_revisions(
    document_id: int,
    r1: str,
    r2: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Сравнение двух ревизий: базовые метрики (размер, md5)."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")

    def get_revision(revision: str) -> DocumentRevision:
        row = (
            db.query(DocumentRevision)
            .filter(DocumentRevision.document_id == document_id, DocumentRevision.number == revision)
            .first()
        )
        if not row:
            raise HTTPException(status_code=404, detail=f"Ревизия {revision} не найдена")
        return row

    a = get_revision(r1)
    b = get_revision(r2)

    a_md5 = _compute_md5(a.file_path) if a.file_path else None
    b_md5 = _compute_md5(b.file_path) if b.file_path else None

    return {
        "document_id": document_id,
        "from": {
            "revision": a.number,
            "file_name": a.file_name,
            "file_size": a.file_size,
            "md5": a_md5,
        },
        "to": {
            "revision": b.number,
            "file_name": b.file_name,
            "file_size": b.file_size,
            "md5": b_md5,
        },
        "equal": a_md5 is not None and a_md5 == b_md5,
        "size_diff": (b.file_size or 0) - (a.file_size or 0),
    }


@router.get("/{document_id}/download")
async def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Скачать документ"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Получаем последнюю версию документа
    latest_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id
    ).order_by(DocumentRevision.created_at.desc()).first()
    
    # Проверяем права доступа
    if not current_user.is_admin and (not latest_revision or latest_revision.uploaded_by != current_user.id):
        raise HTTPException(status_code=403, detail="Нет прав доступа к документу")
    
    if not latest_revision or not latest_revision.file_path:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    # Проверяем существование файла
    if not os.path.exists(latest_revision.file_path):
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    # Возвращаем файл
    return FileResponse(
        path=latest_revision.file_path,
        filename=latest_revision.file_name,
        media_type='application/octet-stream'
    )


@router.get("/{document_id}/revisions/{revision_id}/download")
async def download_document_revision(
    document_id: int,
    revision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Скачать конкретную ревизию документа"""
    # Проверяем существование документа
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем существование ревизии
    revision = db.query(DocumentRevision).filter(
        DocumentRevision.id == revision_id,
        DocumentRevision.document_id == document_id
    ).first()
    
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Проверяем права доступа (пользователь должен быть участником проекта)
    project_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == document.project_id,
        ProjectMember.user_id == current_user.id
    ).first()
    
    if not current_user.is_admin and not project_member:
        raise HTTPException(status_code=403, detail="Нет прав доступа к документу")
    
    if not revision.file_path:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    # Проверяем существование файла
    if not os.path.exists(revision.file_path):
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    # Возвращаем файл
    return FileResponse(
        path=revision.file_path,
        filename=revision.file_name,
        media_type='application/octet-stream'
    )


@router.patch("/{document_id}/soft-delete")
async def soft_delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Мягкое удаление документа (установка флага is_deleted)"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права доступа
    can_delete = False
    
    # 1. Администраторы могут удалять любые документы
    if current_user.is_admin:
        can_delete = True
    # 2. Создатель проекта может удалять все документы в своих проектах
    elif document.project_id and document.project.created_by == current_user.id:
        can_delete = True
    # 3. Участник проекта может удалять только свои документы в проекте
    elif document.created_by == current_user.id:
        # Проверяем, что пользователь является участником проекта (не читателем)
        from app.models.project import ProjectMember
        from app.models.project_role import ProjectRole
        project_member = db.query(ProjectMember).join(ProjectRole).filter(
            ProjectMember.project_id == document.project_id,
            ProjectMember.user_id == current_user.id,
            ProjectRole.code != 'viewer'  # Исключаем читателей
        ).first()
        
        if project_member:
            can_delete = True
    
    if not can_delete:
        raise HTTPException(status_code=403, detail="Нет прав для удаления документа")
    
    document.is_deleted = 1
    
    # Помечаем все ревизии документа как удаленные
    db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id
    ).update({"is_deleted": 1})
    
    db.commit()
    
    return {"message": "Документ и все его ревизии помечены как удаленные", "document_id": document_id}


@router.patch("/{document_id}/restore")
async def restore_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Восстановление документа (снятие флага is_deleted)"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права доступа
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Нет прав для восстановления документа")
    
    document.is_deleted = 0
    
    # Восстанавливаем все ревизии документа
    db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id
    ).update({"is_deleted": 0})
    
    db.commit()
    
    return {"message": "Документ и все его ревизии восстановлены", "document_id": document_id}


@router.delete("/revisions/{revision_id}")
async def soft_delete_document_revision(
    revision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Мягкое удаление ревизии документа (установка флага is_deleted)"""
    revision = db.query(DocumentRevision).filter(DocumentRevision.id == revision_id).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Проверяем права доступа - только владелец документа или администратор
    document = db.query(Document).filter(Document.id == revision.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права: владелец документа, администратор проекта или суперадмин
    if (document.created_by != current_user.id and 
        current_user.role_id != 1):  # 1 = Administrator
        raise HTTPException(status_code=403, detail="Нет прав для удаления ревизии")
    
    revision.is_deleted = 1
    db.commit()
    
    return {"message": "Ревизия удалена", "revision_id": revision_id}


@router.post("/revisions/{revision_id}/restore")
async def restore_document_revision(
    revision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Восстановление ревизии документа (снятие флага is_deleted)"""
    revision = db.query(DocumentRevision).filter(DocumentRevision.id == revision_id).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Проверяем права доступа - только владелец документа или администратор
    document = db.query(Document).filter(Document.id == revision.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права: владелец документа, администратор проекта или суперадмин
    if (document.created_by != current_user.id and 
        current_user.role_id != 1):  # 1 = Administrator
        raise HTTPException(status_code=403, detail="Нет прав для восстановления ревизии")
    
    revision.is_deleted = 0
    db.commit()
    
    return {"message": "Ревизия восстановлена", "revision_id": revision_id}


@router.post("/revisions/{revision_id}/cancel")
async def cancel_document_revision(
    revision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Отменить ревизию документа"""
    
    # Получаем ревизию
    revision = db.query(DocumentRevision).filter(DocumentRevision.id == revision_id).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")
    
    # Получаем документ
    document = db.query(Document).filter(Document.id == revision.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права доступа
    # 1. Администратор может отменять любые ревизии
    # 2. Создатель документа может отменять свои ревизии
    # 3. Участник проекта (не читатель) может отменять ревизии документов в проекте
    if not current_user.is_admin and document.created_by != current_user.id:
        # Проверяем, является ли пользователь участником проекта с правами (не читателем)
        from app.models.project import ProjectMember
        project_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == document.project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role != 'viewer'  # Исключаем читателей
        ).first()
        
        if not project_member:
            raise HTTPException(status_code=403, detail="Нет прав для отмены этой ревизии")
    
    # Получаем ID статуса "Cancelled"
    from app.models.references import RevisionStatus
    cancelled_status = db.query(RevisionStatus).filter(RevisionStatus.name == "Cancelled").first()
    if not cancelled_status:
        raise HTTPException(status_code=500, detail="Статус 'Cancelled' не найден в справочнике")
    
    # Проверяем, что ревизия не уже отменена
    if revision.revision_status_id == cancelled_status.id:
        raise HTTPException(status_code=400, detail="Ревизия уже отменена")
    
    # Получаем ID статуса "Active"
    active_status = db.query(RevisionStatus).filter(RevisionStatus.name == "Active").first()
    if not active_status:
        raise HTTPException(status_code=500, detail="Статус 'Active' не найден в справочнике")
    
    # Проверяем, что отменяемая ревизия является последней активной ревизией
    latest_active_revision = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document.id,
        DocumentRevision.revision_status_id == active_status.id,
        DocumentRevision.is_deleted == 0
    ).order_by(DocumentRevision.created_at.desc()).first()
    
    if not latest_active_revision:
        raise HTTPException(status_code=400, detail="Нет активных ревизий для отмены")
    
    if latest_active_revision.id != revision_id:
        raise HTTPException(status_code=400, detail="Можно отменять только последнюю активную ревизию")
    
    # Отменяем ревизию - меняем статус на "Cancelled"
    revision.revision_status_id = cancelled_status.id
    
    db.commit()
    
    return {"message": "Ревизия отменена", "revision_id": revision_id}


@router.put("/{document_id}")
async def update_document(
    document_id: int,
    document_data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Обновить документ"""
    
    # Получаем документ
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    # Проверяем права доступа
    # 1. Администратор может редактировать любые документы
    # 2. Создатель документа может редактировать свои документы
    # 3. Создатель проекта может редактировать все документы в своем проекте
    # 4. Участник проекта может редактировать только свои документы
    if not current_user.is_admin and document.created_by != current_user.id:
        # Проверяем, является ли пользователь создателем проекта
        from app.models.project import Project
        project = db.query(Project).filter(Project.id == document.project_id).first()
        if not project or project.created_by != current_user.id:
            # Если пользователь не создатель проекта, проверяем права участника
            # Участники проекта могут редактировать только свои документы
            # (это уже проверено выше - created_by != current_user.id)
            raise HTTPException(status_code=403, detail="Нет прав для редактирования этого документа")
    
    # Обновляем поля документа
    update_data = document_data.dict(exclude_unset=True)
    
    # Проверяем, что DRS не редактируется (если передано)
    if 'drs' in update_data:
        del update_data['drs']
    
    # Обновляем документ
    for field, value in update_data.items():
        if hasattr(document, field):
            setattr(document, field, value)
    
    db.commit()
    db.refresh(document)
    
    return {"message": "Документ обновлен", "document_id": document_id}