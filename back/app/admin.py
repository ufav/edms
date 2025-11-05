from sqladmin import Admin, ModelView
from sqlalchemy.orm import Session

from app.core.database import engine
from app.models import (
    User,
    Project,
    Document,
    DocumentRevision,
    Transmittal,
    RevisionDescription,
    RevisionStep,
    ReviewCode,
    AuditLog,
    Language,
    Department,
    Company,
)


class UserAdmin(ModelView, model=User):
    name = "User"
    name_plural = "Users"
    column_list = ["id", "username", "email", "full_name", "role", "is_active", "created_at"]
    column_searchable_list = ["username", "email", "full_name"]


class ProjectAdmin(ModelView, model=Project):
    name = "Project"
    name_plural = "Projects"
    column_list = ["id", "name", "project_code", "status", "created_at"]
    column_searchable_list = ["name", "project_code"]


class DocumentAdmin(ModelView, model=Document):
    name = "Document"
    name_plural = "Documents"
    column_list = [
        "id", "number", "title", "project_id", "discipline_id", "document_type_id",
        "is_deleted", "created_at", "updated_at"
    ]
    column_searchable_list = ["number", "title"]


class DocumentRevisionAdmin(ModelView, model=DocumentRevision):
    name = "Document Revision"
    name_plural = "Document Revisions"
    column_list = [
        "id", "document_id", "revision_description_id", "revision_step_id",
        "workflow_status_id", "number", "created_at"
    ]


class TransmittalAdmin(ModelView, model=Transmittal):
    name = "Transmittal"
    name_plural = "Transmittals"
    column_list = [
        "id", "transmittal_number", "title", "project_id", "direction",
        "status_id", "created_by", "created_at"
    ]
    column_searchable_list = ["transmittal_number", "title"]


class RevisionDescriptionAdmin(ModelView, model=RevisionDescription):
    name = "Revision Description"
    name_plural = "Revision Descriptions"
    column_list = ["id", "code", "description"]
    column_searchable_list = ["code", "description"]


class RevisionStepAdmin(ModelView, model=RevisionStep):
    name = "Revision Step"
    name_plural = "Revision Steps"
    column_list = ["id", "code", "description"]


class ReviewCodeAdmin(ModelView, model=ReviewCode):
    name = "Review Code"
    name_plural = "Review Codes"
    column_list = ["id", "code", "name"]
    column_searchable_list = ["code", "name"]


class AuditLogAdmin(ModelView, model=AuditLog):
    name = "Audit Log"
    name_plural = "Audit Logs"
    column_list = ["id", "created_at", "user_id", "action", "entity_type", "entity_id"]


class LanguageAdmin(ModelView, model=Language):
    name = "Language"
    name_plural = "Languages"
    column_list = ["id", "name"]


class DepartmentAdmin(ModelView, model=Department):
    name = "Department"
    name_plural = "Departments"
    column_list = ["id", "name", "company_id"]


class CompanyAdmin(ModelView, model=Company):
    name = "Company"
    name_plural = "Companies"
    column_list = ["id", "name"]


def init_admin(app):
    admin = Admin(app, engine, title="Admin Panel", base_url="/admin")
    admin.add_view(UserAdmin)
    admin.add_view(ProjectAdmin)
    admin.add_view(DocumentAdmin)
    admin.add_view(DocumentRevisionAdmin)
    admin.add_view(TransmittalAdmin)
    admin.add_view(RevisionDescriptionAdmin)
    admin.add_view(RevisionStepAdmin)
    admin.add_view(ReviewCodeAdmin)
    admin.add_view(AuditLogAdmin)
    admin.add_view(LanguageAdmin)
    admin.add_view(DepartmentAdmin)
    admin.add_view(CompanyAdmin)
    try:
        # Simple log to confirm mounting
        import logging
        logging.getLogger(__name__).info("sqladmin mounted at /admin with %d views", len(admin.views))
    except Exception:
        pass
    return admin



