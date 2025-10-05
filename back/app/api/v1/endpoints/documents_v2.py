"""
API endpoints for new document structure (v2)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.document_v2 import UniqueDocument, DocumentRevision, UploadedFile as UploadedFileV2
from app.models.references import RevisionStatus, RevisionDescription, RevisionStep, Originator, Language
from app.schemas.documents_v2 import (
    UniqueDocumentCreate, UniqueDocumentResponse,
    DocumentRevisionCreate, DocumentRevisionResponse,
    UploadedFileResponse
)

router = APIRouter()


@router.get("/unique-documents", response_model=List[UniqueDocumentResponse])
def get_unique_documents(
    skip: int = 0, 
    limit: int = 100, 
    project_id: Optional[int] = None,
    discipline_id: Optional[int] = None,
    type_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all unique documents with optional filters"""
    query = db.query(UniqueDocument).filter(UniqueDocument.deleted == 0)
    
    if project_id:
        query = query.filter(UniqueDocument.project_id == project_id)
    if discipline_id:
        query = query.filter(UniqueDocument.discipline_id == discipline_id)
    if type_id:
        query = query.filter(UniqueDocument.type_id == type_id)
    
    return query.offset(skip).limit(limit).all()


@router.post("/unique-documents", response_model=UniqueDocumentResponse)
def create_unique_document(document: UniqueDocumentCreate, db: Session = Depends(get_db)):
    """Create new unique document"""
    db_document = UniqueDocument(**document.dict())
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document


@router.get("/unique-documents/{document_id}", response_model=UniqueDocumentResponse)
def get_unique_document(document_id: int, db: Session = Depends(get_db)):
    """Get unique document by ID"""
    document = db.query(UniqueDocument).filter(
        UniqueDocument.id == document_id,
        UniqueDocument.deleted == 0
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document


@router.get("/unique-documents/{document_id}/revisions", response_model=List[DocumentRevisionResponse])
def get_document_revisions(document_id: int, db: Session = Depends(get_db)):
    """Get all revisions for a document"""
    revisions = db.query(DocumentRevision).filter(
        DocumentRevision.document_id == document_id,
        DocumentRevision.deleted == 0
    ).order_by(DocumentRevision.created.desc()).all()
    
    return revisions


@router.post("/unique-documents/{document_id}/revisions", response_model=DocumentRevisionResponse)
def create_document_revision(
    document_id: int,
    revision: DocumentRevisionCreate,
    db: Session = Depends(get_db)
):
    """Create new revision for a document"""
    # Check if document exists
    document = db.query(UniqueDocument).filter(
        UniqueDocument.id == document_id,
        UniqueDocument.deleted == 0
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    db_revision = DocumentRevision(
        document_id=document_id,
        **revision.dict()
    )
    db.add(db_revision)
    db.commit()
    db.refresh(db_revision)
    return db_revision


@router.post("/revisions/{revision_id}/files")
def upload_file_to_revision(
    revision_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload file to a specific revision"""
    # Check if revision exists
    revision = db.query(DocumentRevision).filter(
        DocumentRevision.id == revision_id,
        DocumentRevision.deleted == 0
    ).first()
    
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
    
    # Save file logic here (similar to existing file upload)
    # For now, just return success
    return {"message": "File uploaded successfully", "revision_id": revision_id}


@router.get("/revisions/{revision_id}/files", response_model=List[UploadedFileResponse])
def get_revision_files(revision_id: int, db: Session = Depends(get_db)):
    """Get all files for a revision"""
    files = db.query(UploadedFileV2).filter(
        UploadedFileV2.revision_id == revision_id,
        UploadedFileV2.deleted == 0
    ).all()
    
    return files


@router.get("/revisions/{revision_id}/download/{file_id}")
def download_revision_file(revision_id: int, file_id: int, db: Session = Depends(get_db)):
    """Download a specific file from a revision"""
    file_record = db.query(UploadedFileV2).filter(
        UploadedFileV2.id == file_id,
        UploadedFileV2.revision_id == revision_id,
        UploadedFileV2.deleted == 0
    ).first()
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # File download logic here
    # For now, return file info
    return {
        "file_id": file_record.id,
        "filename": file_record.filename,
        "path": file_record.path,
        "file_size": file_record.file_size
    }


# Reference data endpoints for dropdowns
@router.get("/reference-data/revision-statuses")
def get_revision_statuses_for_dropdown(db: Session = Depends(get_db)):
    """Get revision statuses for dropdown"""
    return db.query(RevisionStatus).filter(RevisionStatus.is_active == True).all()


@router.get("/reference-data/revision-descriptions")
def get_revision_descriptions_for_dropdown(db: Session = Depends(get_db)):
    """Get revision descriptions for dropdown"""
    return db.query(RevisionDescription).filter(RevisionDescription.is_active == True).all()


@router.get("/reference-data/revision-steps")
def get_revision_steps_for_dropdown(db: Session = Depends(get_db)):
    """Get revision steps for dropdown"""
    return db.query(RevisionStep).filter(RevisionStep.is_active == True).all()


@router.get("/reference-data/originators")
def get_originators_for_dropdown(db: Session = Depends(get_db)):
    """Get originators for dropdown"""
    return db.query(Originator).filter(Originator.is_active == True).all()


@router.get("/reference-data/languages")
def get_languages_for_dropdown(db: Session = Depends(get_db)):
    """Get languages for dropdown"""
    return db.query(Language).filter(Language.is_active == True).all()
