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
    Area,
    SupportTicket,
    SupportMessage,
    SupportTicketFile,
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
    ProjectSupportFile,
)
from app.models.document import DocumentApproval, File


class UserAdmin(ModelView, model=User):
    name = "User"
    name_plural = "Users"
    column_list = ["id", "email", "full_name", "role", "is_active", "created_at"]
    column_searchable_list = ["email", "full_name"]


class ProjectAdmin(ModelView, model=Project):
    name = "Project"
    name_plural = "Projects"
    column_list = ["id", "name", "project_code", "status", "created_at"]
    column_searchable_list = ["name", "project_code"]
    form_excluded_columns = ["created_at", "updated_at", "members", "participants", "project_discipline_document_types", "support_files", "areas"]


class DocumentAdmin(ModelView, model=Document):
    name = "Document"
    name_plural = "Documents"
    column_list = [
        "id", "number", "title", "project_id", "discipline_id", "document_type_id",
        "is_deleted", "created_at", "updated_at"
    ]
    column_searchable_list = ["number", "title"]
    form_excluded_columns = ["created_at", "updated_at", "project", "area", "comments"]


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
    form_excluded_columns = ["created_at", "updated_at", "document", "user", "parent_comment", "replies"]


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
    form_excluded_columns = ["created_at", "updated_at"]


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
    form_excluded_columns = ["created_at", "updated_at"]


class WorkflowPresetSequenceAdmin(ModelView, model=WorkflowPresetSequence):
    name = "Workflow Preset Sequence"
    name_plural = "Workflow Preset Sequences"
    column_list = ["id", "preset_id", "sequence_order", "revision_description_id", "revision_step_id", "is_final", "requires_transmittal", "due_days"]


class WorkflowPresetRuleAdmin(ModelView, model=WorkflowPresetRule):
    name = "Workflow Preset Rule"
    name_plural = "Workflow Preset Rules"
    column_list = ["id", "preset_id", "document_type_id", "current_revision_description_id", "current_revision_step_id", "review_code_id", "operator", "priority"]


class AreaAdmin(ModelView, model=Area):
    name = "Area"
    name_plural = "Areas"
    column_list = ["id", "code", "name", "description", "is_active", "created_at", "updated_at"]
    column_searchable_list = ["code", "name", "description"]
    form_excluded_columns = ["created_at", "updated_at", "documents"]


class SupportTicketAdmin(ModelView, model=SupportTicket):
    name = "Support Ticket"
    name_plural = "Support Tickets"
    column_list = ["id", "user_id", "subject", "status", "created_at", "updated_at", "last_message_at"]
    column_searchable_list = ["subject", "initial_message"]


class SupportMessageAdmin(ModelView, model=SupportMessage):
    name = "Support Message"
    name_plural = "Support Messages"
    column_list = ["id", "ticket_id", "sender_type", "sender_id", "message_text", "created_at"]
    column_searchable_list = ["message_text"]
    form_excluded_columns = ["created_at", "ticket", "sender", "files"]


class SupportTicketFileAdmin(ModelView, model=SupportTicketFile):
    name = "Support Ticket File"
    name_plural = "Support Ticket Files"
    column_list = ["id", "ticket_id", "message_id", "file_name", "file_path", "file_size", "mime_type", "created_at"]
    column_searchable_list = ["file_name", "file_path", "mime_type"]


class ProjectSupportFileAdmin(ModelView, model=ProjectSupportFile):
    name = "Project Support File"
    name_plural = "Project Support Files"
    column_list = ["id", "project_id", "file_name", "file_path", "file_size", "file_type", "uploaded_by", "is_deleted", "created_at"]
    column_searchable_list = ["file_name", "file_path", "file_type"]
    form_excluded_columns = ["created_at", "project"]


def init_admin(app):
    admin = Admin(app, engine, title="Admin Panel", base_url="/admin")

    # Алфавитный порядок таблиц в левом меню админки.
    # В sqladmin порядок напрямую зависит от последовательности add_view.
    view_classes = [
        UserAdmin,
        ProjectAdmin,
        ProjectMemberAdmin,
        ProjectParticipantAdmin,
        DocumentAdmin,
        DocumentRevisionAdmin,
        DocumentReviewAdmin,
        DocumentCommentAdmin,
        DocumentWorkflowHistoryAdmin,
        DocumentApprovalAdmin,
        FileAdmin,
        TransmittalAdmin,
        TransmittalRevisionAdmin,
        TransmittalImportSettingsAdmin,
        RevisionStatusAdmin,
        RevisionDescriptionAdmin,
        RevisionStepAdmin,
        ReviewCodeAdmin,
        OriginatorAdmin,
        DisciplineAdmin,
        DocumentTypeAdmin,
        CompanyAdmin,
        DepartmentAdmin,
        ContactAdmin,
        CompanyRoleAdmin,
        UserRoleAdmin,
        ProjectRoleAdmin,
        WorkflowStatusAdmin,
        TransmittalStatusAdmin,
        LanguageAdmin,
        ProjectDisciplineDocumentTypeAdmin,
        ProjectRevisionDescriptionAdmin,
        ProjectRevisionStepAdmin,
        WorkflowPresetAdmin,
        WorkflowPresetSequenceAdmin,
        WorkflowPresetRuleAdmin,
        UserSettingsAdmin,
        NotificationAdmin,
        AuditLogAdmin,
        AreaAdmin,
        SupportTicketAdmin,
        SupportMessageAdmin,
        SupportTicketFileAdmin,
        ProjectSupportFileAdmin,
    ]

    for view_class in sorted(
        view_classes,
        key=lambda vc: str(getattr(vc, "name_plural", None) or getattr(vc, "name", "")).lower()
    ):
        admin.add_view(view_class)
    
    try:
        # Simple log to confirm mounting
        import logging
        logging.getLogger(__name__).info("sqladmin mounted at /admin with %d views", len(admin.views))
    except Exception:
        pass
    return admin



