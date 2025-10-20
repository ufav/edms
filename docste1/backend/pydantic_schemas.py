from pydantic import BaseModel
from typing import List, Optional
from datetime import date


class UserCreate(BaseModel):
    username: str
    password: str
    role_id: int
    name: str
    surname: str
    email: str


class PasswordChange(BaseModel):
    user_id: int
    current_password: str
    new_password: str
    confirm_new_password: str


class FileData(BaseModel):
    uid: str
    file_id: Optional[int] = None
    file_name: str
    mime_type: str
    file_size: int
    status: str
    url: str


class DisciplineReference(BaseModel):
    project_id: int
    discipline_id: int


class RevisionDescriptionReference(BaseModel):
    project_id: int
    description_id: int


class DocTypeReference(BaseModel):
    project_id: int
    discipline_id: int
    type_id: int


class RevisionStepReference(BaseModel):
    project_id: int
    description_id: int
    step_id: int


class UserUpdate(BaseModel):
    role_id: int
    name: Optional[str] = None
    surname: Optional[str] = None
    email: Optional[str] = None


class ProjectAccess(BaseModel):
    user_id: int
    project_id: int


class RemoveProjectAccessRequest(BaseModel):
    user_id: int
    project_ids: List[int]


class UserProjectAccess(BaseModel):
    project_id: int


class Project(BaseModel):
    number: str
    name: str
    name_native: str


class RevisionCreate(BaseModel):
    document_id: int
    status_id: int
    step_id: int
    description_id: int
    user_id: int
    project_id: int
    number: str


class TransmittalCreate(BaseModel):
    transmittal_number: str
    type: str
    party_id: int
    issued: date
    due_date: Optional[date] = None
    originator_id: Optional[int] = None
    idc: Optional[date] = None
    revision_ids: List[int]
    user_id: int
    review_code_id: Optional[int] = None
    responded: Optional[date] = None
    contractor_responded: Optional[date] = None
    waiting_response_from_id: Optional[int] = None
    remarks: Optional[str] = None


class CommentCreate(BaseModel):
    document_id: int
    user_id: int
    parent_id: Optional[int] = None
    content: str


class CommentUpdate(BaseModel):
    content: str
