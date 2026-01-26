"""
Download endpoints for public file access via secure links
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import zipfile
import io
import os

from app.core.database import get_db
from app.core.config import settings
from app.models.download_link import DownloadLink
from app.models.transmittal import Transmittal, TransmittalRevision
from app.models.document import DocumentRevision
from app.models.user import User
from app.models.contact import Contact
from app.services.auth import get_current_active_user
from app.services.email_service import email_service

router = APIRouter()


@router.post("/generate/{transmittal_id}")
async def generate_download_link(
    transmittal_id: int,
    request: Request,
    expires_in_days: int = 7,
    max_downloads: int = 10,
    send_email: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Generate a secure download link for a transmittal
    
    Args:
        transmittal_id: ID of the transmittal
        expires_in_days: Days until link expires (default: 7)
        max_downloads: Maximum number of downloads allowed (default: 10)
        send_email: Whether to send email notification to counterparty contacts
    """
    # Get transmittal
    transmittal = db.query(Transmittal).filter(
        Transmittal.id == transmittal_id,
        Transmittal.is_deleted == 0
    ).first()
    
    if not transmittal:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")
    
    # Create download link
    download_link = DownloadLink.create_link(
        transmittal_id=transmittal_id,
        user_id=current_user.id,
        expires_in_days=expires_in_days,
        max_downloads=max_downloads
    )
    
    db.add(download_link)
    db.commit()
    db.refresh(download_link)
    
    # Build full URL
    from app.core.config import settings
    base_url = str(request.base_url).rstrip('/')
    full_link = f"{base_url}{settings.API_V1_STR}/download/{download_link.token}"
    
    result = {
        "token": download_link.token,
        "link": full_link,
        "expires_at": download_link.expires_at.isoformat(),
        "max_downloads": download_link.max_downloads,
        "email_sent": False
    }
    
    # Send email if requested
    if send_email and transmittal.direction == 'out':
        email_result = await send_transmittal_email(
            db=db,
            transmittal=transmittal,
            download_link=full_link,
            expires_in_days=expires_in_days,
            current_user=current_user
        )
        result["email_sent"] = email_result["sent"]
        result["email_recipients"] = email_result.get("recipients", [])
    
    return result


async def send_transmittal_email(
    db: Session,
    transmittal: Transmittal,
    download_link: str,
    expires_in_days: int,
    current_user: User
) -> dict:
    """Send email notification about transmittal to counterparty contacts"""
    
    if not email_service.is_configured():
        return {"sent": False, "reason": "Email не настроен"}
    
    # Get counterparty contacts with email
    contacts = db.query(Contact).filter(
        Contact.company_id == transmittal.counterparty_id,
        Contact.email.isnot(None),
        Contact.email != ''
    ).all()
    
    if not contacts:
        return {"sent": False, "reason": "Нет контактов с email"}
    
    # Get primary contact or all contacts
    primary_contacts = [c for c in contacts if c.is_primary]
    recipients = primary_contacts if primary_contacts else contacts
    
    recipient_emails = [c.email for c in recipients]
    
    # Get documents in transmittal
    transmittal_revisions = db.query(TransmittalRevision).filter(
        TransmittalRevision.transmittal_id == transmittal.id
    ).all()
    
    documents = []
    for tr in transmittal_revisions:
        revision = db.query(DocumentRevision).filter(
            DocumentRevision.id == tr.revision_id
        ).first()
        if revision and revision.document:
            documents.append({
                "number": revision.document.number,
                "title": revision.document.title
            })
    
    # Get sender info
    sender_name = current_user.full_name or current_user.username
    sender_company = "EDMS"  # TODO: Get from user's company
    
    # Get project name
    project_name = transmittal.project.name if transmittal.project else "Проект"
    
    # Send email
    success = email_service.send_transmittal_notification(
        to_emails=recipient_emails,
        transmittal_number=transmittal.transmittal_number,
        transmittal_title=transmittal.title or f"Трансмиттал {transmittal.transmittal_number}",
        project_name=project_name,
        sender_name=sender_name,
        sender_company=sender_company,
        documents=documents,
        download_link=download_link,
        expires_in_days=expires_in_days
    )
    
    return {
        "sent": success,
        "recipients": recipient_emails
    }


@router.get("/{token}")
async def download_transmittal_files(
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to download transmittal files via secure token
    No authentication required - security is token-based
    """
    # Find download link
    download_link = db.query(DownloadLink).filter(
        DownloadLink.token == token
    ).first()
    
    if not download_link:
        raise HTTPException(status_code=404, detail="Ссылка не найдена")
    
    # Check if link is valid
    if not download_link.is_valid():
        if not download_link.is_active:
            raise HTTPException(status_code=410, detail="Ссылка деактивирована")
        if datetime.utcnow() > download_link.expires_at.replace(tzinfo=None):
            raise HTTPException(status_code=410, detail="Срок действия ссылки истек")
        if download_link.download_count >= download_link.max_downloads:
            raise HTTPException(status_code=410, detail="Превышено максимальное количество скачиваний")
    
    # Get transmittal
    transmittal = db.query(Transmittal).filter(
        Transmittal.id == download_link.transmittal_id
    ).first()
    
    if not transmittal:
        raise HTTPException(status_code=404, detail="Трансмиттал не найден")
    
    # Get all revisions in transmittal
    transmittal_revisions = db.query(TransmittalRevision).filter(
        TransmittalRevision.transmittal_id == transmittal.id
    ).all()
    
    if not transmittal_revisions:
        raise HTTPException(status_code=404, detail="В трансмиттале нет документов")
    
    # Create ZIP archive in memory
    zip_buffer = io.BytesIO()
    
    from app.models.document import Document, File as FileModel
    from app.services.minio_service import minio_service
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for tr in transmittal_revisions:
            revision = db.query(DocumentRevision).filter(
                DocumentRevision.id == tr.revision_id
            ).first()
            
            if not revision:
                continue
            
            # Get document for folder name
            document = db.query(Document).filter(Document.id == revision.document_id).first()
            doc_number = document.number if document else "unknown"
            
            # Get files for this revision
            files = db.query(FileModel).filter(
                FileModel.revision_id == revision.id,
                FileModel.is_deleted == 0
            ).all()
            
            for file_record in files:
                try:
                    # Download file from MinIO
                    file_content = await minio_service.download_file(file_record.file_path)
                    
                    if file_content:
                        # Add file to ZIP with document number as folder
                        arcname = f"{doc_number}/{file_record.file_name}"
                        zip_file.writestr(arcname, file_content)
                except Exception as e:
                    # Log error but continue with other files
                    import logging
                    logging.error(f"Failed to download file {file_record.file_path}: {e}")
    
    zip_buffer.seek(0)
    
    # Record download
    client_ip = request.client.host if request.client else None
    download_link.increment_download(client_ip)
    db.commit()
    
    # Return ZIP file - sanitize filename for HTTP header
    import urllib.parse
    # Remove non-ASCII characters for basic filename, encode for UTF-8 filename*
    safe_number = ''.join(c if c.isascii() and c.isalnum() or c in '-_' else '_' for c in transmittal.transmittal_number)
    filename = f"Transmittal_{safe_number}.zip"
    filename_utf8 = urllib.parse.quote(f"Transmittal_{transmittal.transmittal_number}.zip")
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{filename_utf8}",
            "Content-Type": "application/zip",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.get("/{token}/info")
async def get_download_link_info(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Get information about a download link (public, no auth)
    """
    download_link = db.query(DownloadLink).filter(
        DownloadLink.token == token
    ).first()
    
    if not download_link:
        raise HTTPException(status_code=404, detail="Ссылка не найдена")
    
    transmittal = db.query(Transmittal).filter(
        Transmittal.id == download_link.transmittal_id
    ).first()
    
    # Get documents count
    docs_count = db.query(TransmittalRevision).filter(
        TransmittalRevision.transmittal_id == download_link.transmittal_id
    ).count()
    
    return {
        "is_valid": download_link.is_valid(),
        "expires_at": download_link.expires_at.isoformat(),
        "downloads_remaining": max(0, download_link.max_downloads - download_link.download_count),
        "transmittal_number": transmittal.transmittal_number if transmittal else None,
        "transmittal_title": transmittal.title if transmittal else None,
        "documents_count": docs_count
    }


@router.delete("/{token}")
async def deactivate_download_link(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Deactivate a download link (requires authentication)"""
    
    download_link = db.query(DownloadLink).filter(
        DownloadLink.token == token
    ).first()
    
    if not download_link:
        raise HTTPException(status_code=404, detail="Ссылка не найдена")
    
    # Check permission (only creator or admin can deactivate)
    if download_link.created_by != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Нет прав для деактивации ссылки")
    
    download_link.is_active = False
    db.commit()
    
    return {"message": "Ссылка деактивирована"}
