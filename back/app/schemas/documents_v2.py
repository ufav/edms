"""
Pydantic schemas for new document structure (v2)
"""

from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime


# Unique Document schemas
class UniqueDocumentBase(BaseModel):
    number: str
    title: str
    title_native: Optional[str] = None
    project_id: int
    discipline_id: int
    type_id: int
    language_id: Optional[int] = None
    drs: Optional[str] = None
    originator_id: Optional[int] = None


class UniqueDocumentCreate(UniqueDocumentBase):
    pass


class UniqueDocumentResponse(UniqueDocumentBase):
    id: int
    created: datetime
    modified: Optional[datetime] = None
    deleted: int
    
    class Config:
        from_attributes = True


# Document Revision schemas
class DocumentRevisionBase(BaseModel):
    status_id: int
    step_id: int
    description_id: Optional[int] = None
    number: Optional[str] = None
    user_id: Optional[int] = None
    remarks: Optional[str] = None
    workflow_status_id: Optional[int] = None


class DocumentRevisionCreate(DocumentRevisionBase):
    pass


class DocumentRevisionResponse(DocumentRevisionBase):
    id: int
    document_id: int
    created: datetime
    modified: Optional[datetime] = None
    deleted: int
    
    class Config:
        from_attributes = True


# Uploaded File schemas
class UploadedFileResponse(BaseModel):
    id: int
    created: datetime
    modified: Optional[datetime] = None
    deleted: int
    path: str
    filename: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    revision_id: int
    
    class Config:
        from_attributes = True


# Combined response schemas for frontend
class DocumentWithRevisions(UniqueDocumentResponse):
    revisions: List[DocumentRevisionResponse] = []


class RevisionWithFiles(DocumentRevisionResponse):
    files: List[UploadedFileResponse] = []
    status_name: Optional[str] = None
    step_name: Optional[str] = None
    description_name: Optional[str] = None
    user_name: Optional[str] = None


class FullDocumentResponse(UniqueDocumentResponse):
    revisions: List[RevisionWithFiles] = []
    project_name: Optional[str] = None
    discipline_name: Optional[str] = None
    document_type_name: Optional[str] = None
    language_name: Optional[str] = None
    originator_name: Optional[str] = None
