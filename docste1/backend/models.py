from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text, func, Table, Date
from database import Base, metadata


class Company(Base):
    __tablename__ = 'companies'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(256), nullable=False)
    name_native = Column(String(256))
    role = Column(String(16))


class Project(Base):
    __tablename__ = 'projects'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    number = Column(String(128), nullable=False)
    name = Column(String(512), nullable=False)
    name_native = Column(String(512))


class Facility(Base):
    __tablename__ = 'facilities'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(512), nullable=False)
    name_native = Column(String(512))


class Language(Base):
    __tablename__ = 'languages'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(512), nullable=False)
    name_native = Column(String(512))


class Department(Base):
    __tablename__ = 'departments'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(256), nullable=False)
    name_native = Column(String(256))
    company_id = Column(Integer, index=True)


class Discipline(Base):
    __tablename__ = 'disciplines'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(16))
    name = Column(String(256), nullable=False)
    name_native = Column(String(256))
    department_id = Column(Integer)


class DocumentType(Base):
    __tablename__ = 'document_types'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(16))
    name = Column(String(256))
    name_native = Column(String(256))


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(64), nullable=False)
    password = Column(String(64), nullable=False)
    email = Column(String(64))
    role_id = Column(Integer, nullable=False)
    department_id = Column(Integer)
    active = Column(Integer, default=1)


class UserRole(Base):
    __tablename__ = 'user_roles'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(64), nullable=False)


class Action(Base):
    __tablename__ = 'actions'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(128))
    name_native = Column(String(128))


class DocumentPrefix(Base):
    __tablename__ = 'document_prefixes'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    prefix = Column(String(16))


class RevisionStatus(Base):
    __tablename__ = 'revision_statuses'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(32), nullable=False)
    name_native = Column(String(32))


class RevisionDescription(Base):
    __tablename__ = 'revision_descriptions'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(16), nullable=False)
    description = Column(String(512))
    description_native = Column(String(512))
    phase = Column(String(16))


class RevisionStep(Base):
    __tablename__ = 'revision_steps'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(16))
    description = Column(String(512))
    description_native = Column(String(512))
    description_long = Column(Text)


class CompanyParticipating(Base):
    __tablename__ = 'company_participating'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_id = Column(Integer, index=True)
    project_id = Column(Integer, index=True)


class ProjectDisciplineDoctypeReference(Base):
    __tablename__ = 'project_discipline_doctype_reference'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, index=True)
    discipline_id = Column(Integer, index=True)
    type_id = Column(Integer, index=True)


class ProjectDescriptionStepReference(Base):
    __tablename__ = 'project_description_step_reference'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, index=True)
    description_id = Column(Integer, index=True)
    step_id = Column(Integer, index=True)


class UniqueDocument(Base):
    __tablename__ = 'unique_documents'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    number = Column(String(128), nullable=False, unique=True)
    created = Column(DateTime(timezone=True), server_default='CURRENT_TIMESTAMP')
    modified = Column(DateTime(timezone=True))
    deleted = Column(Integer, default=0)
    title = Column(String(512), nullable=False)
    title_native = Column(String(512))
    project_id = Column(Integer)
    discipline_id = Column(Integer, nullable=False)
    type_id = Column(Integer, nullable=False)
    language_id = Column(Integer)
    drs = Column(String(128))
    originator_id = Column(Integer)


class DocumentRevision(Base):
    __tablename__ = 'document_revisions'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, nullable=False)
    created = Column(DateTime(timezone=True), server_default='CURRENT_TIMESTAMP')
    modified = Column(DateTime(timezone=True))
    deleted = Column(Integer, default=0)
    status_id = Column(Integer, nullable=False)
    step_id = Column(Integer, nullable=False)
    description_id = Column(Integer)
    number = Column(String(8))
    user_id = Column(Integer)
    remarks = Column(Text)


class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created = Column(DateTime(timezone=True), server_default='CURRENT_TIMESTAMP')
    user_id = Column(Integer, index=True)
    action_id = Column(Integer, index=True)
    description = Column(String(512))
    description_native = Column(String(512))


class UploadedFile(Base):
    __tablename__ = 'uploaded_files'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created = Column(DateTime(timezone=True), server_default='CURRENT_TIMESTAMP')
    modified = Column(DateTime(timezone=True))
    deleted = Column(Integer, default=0)
    path = Column(String(2048), index=True)
    revision_id = Column(Integer)


class Transmittal(Base):
    __tablename__ = 'transmittals'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created = Column(DateTime(timezone=True), server_default='CURRENT_TIMESTAMP')
    modified = Column(DateTime(timezone=True))
    deleted = Column(Integer, default=0)
    user_id = Column(Integer)
    transmittal_number = Column(String(128), nullable=False, unique=True)
    type = Column(String(10), nullable=False)
    issued = Column(Date, nullable=False)
    due_date = Column(Date)
    party_id = Column(Integer, nullable=False)
    idc = Column(Date)
    originator_id = Column(Integer)
    review_code_id = Column(Integer)
    responded = Column(Date)
    contractor_responded = Column(Date)
    waiting_response_from_id = Column(Integer)
    remarks = Column(Text)


class Originator(Base):
    __tablename__ = 'originators'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(512), nullable=False)


class ReviewCode(Base):
    __tablename__ = 'review_codes'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(16), nullable=False)
    name = Column(String(32), nullable=False)
    name_native = Column(String(32))


class TransmittalRevision(Base):
    __tablename__ = 'transmittal_revisions'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transmittal_id = Column(Integer)
    revision_id = Column(Integer, nullable=False)


class UserProjectAccess(Base):
    __tablename__ = 'user_project_access'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer)
    project_id = Column(Integer)


class Comment(Base):
    __tablename__ = 'comments'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created = Column(DateTime(timezone=True), server_default='CURRENT_TIMESTAMP')
    modified = Column(DateTime(timezone=True))
    deleted = Column(Integer, default=0)
    user_id = Column(Integer)
    document_id = Column(Integer)
    content = Column(Text)


users = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("username", String, unique=True, index=True),
    Column("password", String),
    Column("role_id", Integer, index=True),
    Column("active", Integer),
)
