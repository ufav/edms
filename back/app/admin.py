from sqladmin import Admin, ModelView
from sqlalchemy.orm import Session

from app.core.database import engine
from app.models import (
    User,
    UserSettings,
    Project,
    ProjectMember,
    ProjectParticipant,
    Document,
    DocumentRevision,
    DocumentReview,
    DocumentComment,
    DocumentWorkflowHistory,
    Transmittal,
    TransmittalRevision,
    TransmittalImportSettings,
    Contact,
    CompanyRole,
    ProjectRole,
    RevisionStatus,
    RevisionDescription,
    RevisionStep,
    Originator,
    ReviewCode,
    Language,
    Department,
    Company,
    UserRole,
    Notification,
    AuditLog,
)
from app.models.discipline import Discipline, DocumentType
from app.models.references import WorkflowStatus, TransmittalStatus
from app.models.project import (
    ProjectDisciplineDocumentType,
    ProjectRevisionDescription,
    ProjectRevisionStep,
    WorkflowPreset,
    WorkflowPresetSequence,
    WorkflowPresetRule,
)
from app.models.document import DocumentApproval, File


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
    column_list = ["id", "name", "is_active", "created_at"]
    column_searchable_list = ["name", "name_native"]


class UserSettingsAdmin(ModelView, model=UserSettings):
    name = "User Settings"
    name_plural = "User Settings"
    column_list = ["id", "user_id", "page", "settings_key", "created_at", "updated_at"]
    column_searchable_list = ["page", "settings_key"]


class ProjectMemberAdmin(ModelView, model=ProjectMember):
    name = "Project Member"
    name_plural = "Project Members"
    column_list = ["id", "project_id", "user_id", "project_role_id", "joined_at"]
    column_searchable_list = []


class ProjectParticipantAdmin(ModelView, model=ProjectParticipant):
    name = "Project Participant"
    name_plural = "Project Participants"
    column_list = ["id", "project_id", "company_id", "company_role_id", "is_primary", "created_at"]
    column_searchable_list = []


class ContactAdmin(ModelView, model=Contact):
    name = "Contact"
    name_plural = "Contacts"
    column_list = ["id", "company_id", "full_name", "position", "email", "phone", "is_primary", "created_at"]
    column_searchable_list = ["full_name", "email", "phone", "position"]


class CompanyRoleAdmin(ModelView, model=CompanyRole):
    name = "Company Role"
    name_plural = "Company Roles"
    column_list = ["id", "code", "name", "name_en", "is_active"]
    column_searchable_list = ["code", "name", "name_en"]


class ProjectRoleAdmin(ModelView, model=ProjectRole):
    name = "Project Role"
    name_plural = "Project Roles"
    column_list = ["id", "code", "name", "name_en", "is_active", "created_at"]
    column_searchable_list = ["code", "name", "name_en"]


class DocumentReviewAdmin(ModelView, model=DocumentReview):
    name = "Document Review"
    name_plural = "Document Reviews"
    column_list = ["id", "document_id", "reviewer_id", "status", "rating", "review_date", "created_at"]
    column_searchable_list = ["status"]


class DocumentCommentAdmin(ModelView, model=DocumentComment):
    name = "Document Comment"
    name_plural = "Document Comments"
    column_list = ["id", "document_id", "user_id", "parent_comment_id", "is_resolved", "created_at"]
    column_searchable_list = ["content"]


class DocumentWorkflowHistoryAdmin(ModelView, model=DocumentWorkflowHistory):
    name = "Document Workflow History"
    name_plural = "Document Workflow History"
    column_list = ["id", "revision_id", "from_status_id", "to_status_id", "user_id", "action_type", "created_at"]
    column_searchable_list = ["action_type"]


class DocumentApprovalAdmin(ModelView, model=DocumentApproval):
    name = "Document Approval"
    name_plural = "Document Approvals"
    column_list = ["id", "document_id", "approver_id", "status", "approval_date", "created_at"]
    column_searchable_list = ["status"]


class FileAdmin(ModelView, model=File):
    name = "File"
    name_plural = "Files"
    column_list = ["id", "revision_id", "file_name", "file_path", "file_size", "file_type", "uploaded_by", "created_at"]
    column_searchable_list = ["file_name", "file_path", "file_type"]


class TransmittalRevisionAdmin(ModelView, model=TransmittalRevision):
    name = "Transmittal Revision"
    name_plural = "Transmittal Revisions"
    column_list = ["id", "transmittal_id", "revision_id", "created_at"]


class TransmittalImportSettingsAdmin(ModelView, model=TransmittalImportSettings):
    name = "Transmittal Import Settings"
    name_plural = "Transmittal Import Settings"
    column_list = ["id", "user_id", "project_id", "company_id", "settings_key", "created_at", "updated_at"]
    column_searchable_list = ["settings_key"]


class NotificationAdmin(ModelView, model=Notification):
    name = "Notification"
    name_plural = "Notifications"
    column_list = ["id", "user_id", "title", "type", "priority", "is_read", "created_at"]
    column_searchable_list = ["title", "type", "priority"]


class RevisionStatusAdmin(ModelView, model=RevisionStatus):
    name = "Revision Status"
    name_plural = "Revision Statuses"
    column_list = ["id", "name", "name_native", "description", "is_active", "created_at"]
    column_searchable_list = ["name", "name_native"]


class OriginatorAdmin(ModelView, model=Originator):
    name = "Originator"
    name_plural = "Originators"
    column_list = ["id", "name", "name_native", "code", "is_active", "created_at"]
    column_searchable_list = ["name", "name_native", "code"]


class UserRoleAdmin(ModelView, model=UserRole):
    name = "User Role"
    name_plural = "User Roles"
    column_list = ["id", "code", "name", "name_native", "is_active", "created_at"]
    column_searchable_list = ["code", "name", "name_native"]


class WorkflowStatusAdmin(ModelView, model=WorkflowStatus):
    name = "Workflow Status"
    name_plural = "Workflow Statuses"
    column_list = ["id", "name", "name_native", "description", "is_active", "created_at"]
    column_searchable_list = ["name", "name_native"]


class TransmittalStatusAdmin(ModelView, model=TransmittalStatus):
    name = "Transmittal Status"
    name_plural = "Transmittal Statuses"
    column_list = ["id", "name", "name_native", "description", "is_active", "created_at"]
    column_searchable_list = ["name", "name_native"]


class DisciplineAdmin(ModelView, model=Discipline):
    name = "Discipline"
    name_plural = "Disciplines"
    column_list = ["id", "code", "name", "name_en", "is_active", "created_at"]
    column_searchable_list = ["code", "name", "name_en"]


class DocumentTypeAdmin(ModelView, model=DocumentType):
    name = "Document Type"
    name_plural = "Document Types"
    column_list = ["id", "code", "name", "name_en", "is_active", "created_at"]
    column_searchable_list = ["code", "name", "name_en"]


class ProjectDisciplineDocumentTypeAdmin(ModelView, model=ProjectDisciplineDocumentType):
    name = "Project Discipline Document Type"
    name_plural = "Project Discipline Document Types"
    column_list = ["id", "project_id", "discipline_id", "document_type_id", "drs", "created_at"]


class ProjectRevisionDescriptionAdmin(ModelView, model=ProjectRevisionDescription):
    name = "Project Revision Description"
    name_plural = "Project Revision Descriptions"
    column_list = ["id", "project_id", "revision_description_id", "created_at"]


class ProjectRevisionStepAdmin(ModelView, model=ProjectRevisionStep):
    name = "Project Revision Step"
    name_plural = "Project Revision Steps"
    column_list = ["id", "project_id", "revision_step_id", "created_at"]


class WorkflowPresetAdmin(ModelView, model=WorkflowPreset):
    name = "Workflow Preset"
    name_plural = "Workflow Presets"
    column_list = ["id", "name", "description", "is_global", "created_by", "created_at", "updated_at"]
    column_searchable_list = ["name", "description"]


class WorkflowPresetSequenceAdmin(ModelView, model=WorkflowPresetSequence):
    name = "Workflow Preset Sequence"
    name_plural = "Workflow Preset Sequences"
    column_list = ["id", "preset_id", "sequence_order", "revision_description_id", "revision_step_id", "is_final", "requires_transmittal", "due_days"]


class WorkflowPresetRuleAdmin(ModelView, model=WorkflowPresetRule):
    name = "Workflow Preset Rule"
    name_plural = "Workflow Preset Rules"
    column_list = ["id", "preset_id", "document_type_id", "current_revision_description_id", "current_revision_step_id", "review_code_id", "operator", "priority"]


def init_admin(app):
    admin = Admin(app, engine, title="Admin Panel", base_url="/admin")
    
    # Основные таблицы
    admin.add_view(UserAdmin)
    admin.add_view(ProjectAdmin)
    admin.add_view(ProjectMemberAdmin)
    admin.add_view(ProjectParticipantAdmin)
    
    # Документы
    admin.add_view(DocumentAdmin)
    admin.add_view(DocumentRevisionAdmin)
    admin.add_view(DocumentReviewAdmin)
    admin.add_view(DocumentCommentAdmin)
    admin.add_view(DocumentWorkflowHistoryAdmin)
    admin.add_view(DocumentApprovalAdmin)
    admin.add_view(FileAdmin)
    
    # Трансмитталы
    admin.add_view(TransmittalAdmin)
    admin.add_view(TransmittalRevisionAdmin)
    admin.add_view(TransmittalImportSettingsAdmin)
    
    # Справочники - ревизии
    admin.add_view(RevisionStatusAdmin)
    admin.add_view(RevisionDescriptionAdmin)
    admin.add_view(RevisionStepAdmin)
    admin.add_view(ReviewCodeAdmin)
    admin.add_view(OriginatorAdmin)
    
    # Справочники - дисциплины и типы
    admin.add_view(DisciplineAdmin)
    admin.add_view(DocumentTypeAdmin)
    
    # Справочники - компании и контакты
    admin.add_view(CompanyAdmin)
    admin.add_view(DepartmentAdmin)
    admin.add_view(ContactAdmin)
    admin.add_view(CompanyRoleAdmin)
    
    # Справочники - роли
    admin.add_view(UserRoleAdmin)
    admin.add_view(ProjectRoleAdmin)
    
    # Справочники - статусы
    admin.add_view(WorkflowStatusAdmin)
    admin.add_view(TransmittalStatusAdmin)
    
    # Справочники - языки
    admin.add_view(LanguageAdmin)
    
    # Проекты - настройки
    admin.add_view(ProjectDisciplineDocumentTypeAdmin)
    admin.add_view(ProjectRevisionDescriptionAdmin)
    admin.add_view(ProjectRevisionStepAdmin)
    
    # Workflow
    admin.add_view(WorkflowPresetAdmin)
    admin.add_view(WorkflowPresetSequenceAdmin)
    admin.add_view(WorkflowPresetRuleAdmin)
    
    # Системные таблицы
    admin.add_view(UserSettingsAdmin)
    admin.add_view(NotificationAdmin)
    admin.add_view(AuditLogAdmin)
    
    try:
        # Simple log to confirm mounting
        import logging
        logging.getLogger(__name__).info("sqladmin mounted at /admin with %d views", len(admin.views))
    except Exception:
        pass
    return admin



