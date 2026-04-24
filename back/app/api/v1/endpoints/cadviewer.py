"""
CADViewer: URL для загрузки DWG/DXF в просмотрщик (конвертация на CADViewer Conversion Server).
"""

import os
import urllib.parse
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import FileResponse
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.document import Document, DocumentRevision, File as FileModel
from app.models.project import ProjectMember
from app.models.user import User
from app.services.auth import get_current_active_user
from app.services.minio_service import minio_service

router = APIRouter()

CADVIEWER_PREVIEW_TOKEN_MINUTES = 60


class CadviewerDwgSourceResponse(BaseModel):
    dwg_url: str
    filename_base: str


def _create_cadviewer_preview_token(file_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=CADVIEWER_PREVIEW_TOKEN_MINUTES)
    to_encode = {
        "typ": "cadviewer_preview",
        "fid": file_id,
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _decode_cadviewer_file_id(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("typ") != "cadviewer_preview":
            return None
        fid = payload.get("fid")
        return int(fid) if fid is not None else None
    except (JWTError, TypeError, ValueError):
        return None


def _ensure_revision_file_access(
    db: Session,
    current_user: User,
    document_id: int,
    revision_id: int,
) -> tuple[Document, DocumentRevision, FileModel]:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")

    revision = db.query(DocumentRevision).filter(
        DocumentRevision.id == revision_id,
        DocumentRevision.document_id == document_id,
        DocumentRevision.is_deleted == 0,
    ).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Ревизия не найдена")

    project_member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == document.project_id,
            ProjectMember.user_id == current_user.id,
        )
        .first()
    )
    if not current_user.is_admin and not project_member:
        raise HTTPException(status_code=403, detail="Нет прав доступа к документу")

    revision_file = (
        db.query(FileModel)
        .filter(FileModel.revision_id == revision.id, FileModel.is_deleted == 0)
        .first()
    )
    if not revision_file:
        raise HTTPException(status_code=404, detail="Файл не найден")

    ext = (
        revision_file.file_name.lower().rsplit(".", 1)[-1]
        if "." in revision_file.file_name
        else ""
    )
    if ext not in ("dwg", "dxf"):
        raise HTTPException(
            status_code=400,
            detail=f"Для CADViewer поддерживаются только .dwg и .dxf, получено: .{ext}",
        )

    return document, revision, revision_file


@router.get(
    "/documents/{document_id}/revisions/{revision_id}/dwg-source",
    response_model=CadviewerDwgSourceResponse,
)
async def get_cadviewer_dwg_source(
    document_id: int,
    revision_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Возвращает URL, по которому CADViewer Conversion Server может скачать DWG/DXF
    (presigned MinIO или временная ссылка на EDMS для локального файла).
    """
    _document, _revision, revision_file = _ensure_revision_file_access(
        db, current_user, document_id, revision_id
    )

    base = str(request.base_url).rstrip("/")
    api_prefix = settings.API_V1_STR.rstrip("/")

    name_no_ext = (
        revision_file.file_name.rsplit(".", 1)[0]
        if "." in revision_file.file_name
        else revision_file.file_name
    )

    token = _create_cadviewer_preview_token(revision_file.id)
    q = urllib.parse.urlencode({"token": token})
    dwg_url = f"{base}{api_prefix}/cadviewer/preview-file?{q}"
    return CadviewerDwgSourceResponse(dwg_url=dwg_url, filename_base=name_no_ext)


@router.get("/preview-file")
async def cadviewer_preview_file(
    token: str,
    db: Session = Depends(get_db),
):
    """Выдача файла ревизии по JWT (без Authorization) для CADViewer Conversion Server."""
    file_id = _decode_cadviewer_file_id(token)
    if file_id is None:
        raise HTTPException(status_code=401, detail="Недействительный токен")

    revision_file = db.query(FileModel).filter(FileModel.id == file_id).first()
    if not revision_file or revision_file.is_deleted:
        raise HTTPException(status_code=404, detail="Файл не найден")

    if settings.USE_MINIO:
        import httpx

        url = await minio_service.generate_presigned_url(
            revision_file.file_path, expiration=CADVIEWER_PREVIEW_TOKEN_MINUTES * 60
        )
        if not url:
            raise HTTPException(status_code=500, detail="Не удалось получить файл из хранилища")

        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail="Ошибка загрузки файла из хранилища")

        return Response(
            content=resp.content,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{revision_file.file_name}"'},
        )

    path = revision_file.file_path
    if not path or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Файл не найден на диске")

    return FileResponse(
        path,
        filename=revision_file.file_name,
        media_type="application/octet-stream",
    )
