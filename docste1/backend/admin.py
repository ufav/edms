import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqladmin import Admin, ModelView
from models import (
    Company, Project, Facility, Language, Department, Discipline, DocumentType,
    UserRole, Action, DocumentPrefix, RevisionStatus, RevisionDescription,
    RevisionStep, CompanyParticipating, ProjectDisciplineDoctypeReference,
    UniqueDocument, DocumentRevision, AuditLog, UploadedFile, Transmittal,
    Originator, ReviewCode, TransmittalRevision, UserProjectAccess, Comment
)

# Загрузка переменных окружения
ENV_FILE = ".benv.prod" if os.getenv("ENV") == "prod" else ".benv.dev"
load_dotenv(ENV_FILE)

# Настройка подключения к базе данных
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)


# Определение классов ModelView для каждой модели
class CompanyAdmin(ModelView, model=Company):
    name = "Company"
    name_plural = "Companies"
    column_list = ["id", "name", "name_native", "role"]
    column_searchable_list = ["name"]


class ProjectAdmin(ModelView, model=Project):
    name = "Project"
    name_plural = "Projects"
    column_list = ["id", "name", "name_native", "role"]
    column_searchable_list = ["name"]


class FacilityAdmin(ModelView, model=Facility):
    name = "Facility"
    name_plural = "Facilities"
    column_list = ["id", "name", "name_native"]
    column_searchable_list = ["name"]


class LanguageAdmin(ModelView, model=Language):
    name = "Language"
    name_plural = "Languages"
    column_list = ["id", "name", "name_native"]
    column_searchable_list = ["name"]


class DepartmentAdmin(ModelView, model=Department):
    name = "Department"
    name_plural = "Departments"
    column_list = ["id", "name", "name_native", "company_id"]
    column_searchable_list = ["name"]


class DisciplineAdmin(ModelView, model=Discipline):
    name = "Discipline"
    name_plural = "Disciplines"
    column_list = ["id", "code", "name", "name_native", "department_id"]
    column_searchable_list = ["code", "name"]


class DocumentTypeAdmin(ModelView, model=DocumentType):
    name = "Document Type"
    name_plural = "Document Types"
    column_list = ["id", "code", "name", "name_native"]
    column_searchable_list = ["code", "name"]


class UserRoleAdmin(ModelView, model=UserRole):
    name = "User Role"
    name_plural = "User Roles"
    column_list = ["id", "name"]
    column_searchable_list = ["name"]


class ActionAdmin(ModelView, model=Action):
    name = "Action"
    name_plural = "Actions"
    column_list = ["id", "name", "name_native"]
    column_searchable_list = ["name"]


class DocumentPrefixAdmin(ModelView, model=DocumentPrefix):
    name = "Document Prefix"
    name_plural = "Document Prefixes"
    column_list = ["id", "prefix"]
    column_searchable_list = ["prefix"]


class RevisionStatusAdmin(ModelView, model=RevisionStatus):
    name = "Revision Status"
    name_plural = "Revision Statuses"
    column_list = ["id", "name", "name_native"]
    column_searchable_list = ["name"]


class RevisionDescriptionAdmin(ModelView, model=RevisionDescription):
    name = "Revision Description"
    name_plural = "Revision Descriptions"
    column_list = ["id", "code", "description", "description_native", "phase"]
    column_searchable_list = ["code", "description"]


class RevisionStepAdmin(ModelView, model=RevisionStep):
    name = "Revision Step"
    name_plural = "Revision Steps"
    column_list = ["id", "code", "description", "description_native", "description_long"]
    column_searchable_list = ["code", "description"]


class CompanyParticipatingAdmin(ModelView, model=CompanyParticipating):
    name = "Company Participating"
    name_plural = "Company Participating"
    column_list = ["id", "company_id", "project_id"]


class ProjectDisciplineDoctypeReferenceAdmin(ModelView, model=ProjectDisciplineDoctypeReference):
    name = "Project Discipline DocType Reference"
    name_plural = "Project Discipline DocType References"
    column_list = ["id", "project_id", "discipline_id", "type_id"]


class UniqueDocumentAdmin(ModelView, model=UniqueDocument):
    name = "Document"
    name_plural = "Documents"
    column_list = ["id", "number", "created", "modified", "deleted", "title", "title_native", "project_id",
                   "discipline_id", "type_id", "language_id", "drs"]
    column_searchable_list = ["number", "title"]


class DocumentRevisionAdmin(ModelView, model=DocumentRevision):
    name = "Document Revision"
    name_plural = "Document Revisions"
    column_list = ["id", "document_id", "created", "modified", "deleted", "status_id", "step_id", "description_id",
                   "number", "user_id", "remarks"]


class AuditLogAdmin(ModelView, model=AuditLog):
    name = "Audit Log"
    name_plural = "Audit Logs"
    column_list = ["id", "created", "user_id", "action_id", "description", "description_native"]


class UploadedFileAdmin(ModelView, model=UploadedFile):
    name = "Uploaded File"
    name_plural = "Uploaded Files"
    column_list = ["id", "created", "modified", "deleted", "path", "revision_id"]


class TransmittalAdmin(ModelView, model=Transmittal):
    name = "Transmittal"
    name_plural = "Transmittals"
    column_list = ["id", "created", "modified", "deleted", "user_id", "transmittal_number", "type",
                   "issued", "due_date", "party_id", "idc", "originator_id", "review_code_id", "responded",
                   "contractor_responded", "remarks", "waiting_response_from_id"]
    column_searchable_list = ["transmittal_number"]


class OriginatorAdmin(ModelView, model=Originator):
    name = "Originator"
    name_plural = "Originators"
    column_list = ["id", "name"]
    column_searchable_list = ["name"]


class ReviewCodeAdmin(ModelView, model=ReviewCode):
    name = "Review Code"
    name_plural = "Review Codes"
    column_list = ["id", "code", "name", "name_native"]
    column_searchable_list = ["code", "name"]


class TransmittalRevisionAdmin(ModelView, model=TransmittalRevision):
    name = "Transmittal Revision"
    name_plural = "Transmittal Revisions"
    column_list = ["id", "transmittal_id", "revision_id"]


class UserProjectAccessAdmin(ModelView, model=UserProjectAccess):
    name = "User Project Access"
    name_plural = "User Project Access"
    column_list = ["id", "user_id", "project_id"]


class CommentAdmin(ModelView, model=Comment):
    name = "Comment"
    name_plural = "Comments"
    column_list = ["id", "created", "modified", "deleted", "user_id", "document_id", "parent_id", "content"]
    column_searchable_list = ["content"]


# Функция для инициализации админки
def init_admin(app):
    admin = Admin(app, engine, title="Admin Panel", base_url="/admin")
    admin.add_view(CompanyAdmin)
    admin.add_view(ProjectAdmin)
    admin.add_view(FacilityAdmin)
    admin.add_view(LanguageAdmin)
    admin.add_view(DepartmentAdmin)
    admin.add_view(DisciplineAdmin)
    admin.add_view(DocumentTypeAdmin)
    admin.add_view(UserRoleAdmin)
    admin.add_view(ActionAdmin)
    admin.add_view(DocumentPrefixAdmin)
    admin.add_view(RevisionStatusAdmin)
    admin.add_view(RevisionDescriptionAdmin)
    admin.add_view(RevisionStepAdmin)
    admin.add_view(CompanyParticipatingAdmin)
    admin.add_view(ProjectDisciplineDoctypeReferenceAdmin)
    admin.add_view(UniqueDocumentAdmin)
    admin.add_view(DocumentRevisionAdmin)
    admin.add_view(AuditLogAdmin)
    admin.add_view(UploadedFileAdmin)
    admin.add_view(TransmittalAdmin)
    admin.add_view(OriginatorAdmin)
    admin.add_view(ReviewCodeAdmin)
    admin.add_view(TransmittalRevisionAdmin)
    admin.add_view(UserProjectAccessAdmin)
    admin.add_view(CommentAdmin)
    print("Admin routes registered at:", "/admin")
    return admin
