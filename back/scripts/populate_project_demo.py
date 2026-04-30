"""
Populate script: create demo project with documents and revisions.

Creates:
- 1 project
- N documents (default: 100)
- 1..M revisions per document with different workflow statuses
"""

from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

# Allow running script directly from repository root.
BACK_DIR = Path(__file__).resolve().parents[1]
if str(BACK_DIR) not in sys.path:
    sys.path.insert(0, str(BACK_DIR))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.project import (
    Project,
    ProjectMember,
    ProjectDisciplineDocumentType,
    ProjectRevisionDescription,
    ProjectRevisionStep,
    ProjectStatusEnum,
    WorkflowPreset,
    WorkflowPresetSequence,
)
from app.models.project_role import ProjectRole
from app.models.area import Area
from app.models.document import Document, DocumentRevision
from app.models.discipline import Discipline, DocumentType
from app.models.references import WorkflowStatus, RevisionStatus, RevisionDescription, RevisionStep


def _pick_creator(db: Session, user_id: int | None = None) -> User:
    if user_id is not None:
        user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
        if not user:
            raise RuntimeError(f"Active user with id={user_id} not found.")
        return user

    user = (
        db.query(User)
        .filter(User.is_active.is_(True))
        .order_by(User.is_admin.desc(), User.id.asc())
        .first()
    )
    if not user:
        raise RuntimeError("No active users found. Create at least one user first.")
    return user


def _pick_manager_role(db: Session) -> ProjectRole | None:
    role = db.query(ProjectRole).filter(ProjectRole.code == "manager", ProjectRole.is_active.is_(True)).first()
    if role:
        return role
    return db.query(ProjectRole).filter(ProjectRole.is_active.is_(True)).order_by(ProjectRole.id.asc()).first()


def _build_project_code(db: Session, seed: str) -> str:
    base = datetime.utcnow().strftime("%Y%m%d")
    idx = 1
    while True:
        code = f"{seed}-{base}-{idx:03d}"
        exists = db.query(Project).filter(Project.project_code == code).first()
        if not exists:
            return code
        idx += 1


def _build_preset_name(db: Session, seed: str) -> str:
    base = datetime.utcnow().strftime("%Y%m%d")
    idx = 1
    while True:
        name = f"{seed}-{base}-{idx:03d}"
        exists = db.query(WorkflowPreset).filter(WorkflowPreset.name == name).first()
        if not exists:
            return name
        idx += 1


def run_populate(
    documents_count: int,
    min_revisions: int,
    max_revisions: int,
    project_name_prefix: str,
    creator_user_id: int | None = None,
) -> None:
    if documents_count <= 0:
        raise ValueError("documents_count must be > 0")
    if min_revisions <= 0 or max_revisions <= 0 or min_revisions > max_revisions:
        raise ValueError("Invalid revisions range")

    db = SessionLocal()
    try:
        creator = _pick_creator(db, creator_user_id)
        manager_role = _pick_manager_role(db)

        disciplines = db.query(Discipline).filter(Discipline.is_active.is_(True)).all()
        document_types = db.query(DocumentType).filter(DocumentType.is_active.is_(True)).all()
        revision_descriptions = db.query(RevisionDescription).filter(RevisionDescription.is_active.is_(True)).all()
        revision_steps = db.query(RevisionStep).filter(RevisionStep.is_active.is_(True)).all()
        workflow_statuses = db.query(WorkflowStatus).filter(WorkflowStatus.is_active.is_(True)).all()
        revision_statuses = db.query(RevisionStatus).filter(RevisionStatus.is_active.is_(True)).all()
        areas = db.query(Area).filter(Area.is_active.is_(True)).all()

        if not disciplines:
            raise RuntimeError("No active disciplines found.")
        if not document_types:
            raise RuntimeError("No active document types found.")
        if not revision_descriptions:
            raise RuntimeError("No active revision descriptions found.")
        if not revision_steps:
            raise RuntimeError("No active revision steps found.")
        if not workflow_statuses:
            raise RuntimeError("No active workflow statuses found.")

        active_rev_status = next((s for s in revision_statuses if s.name == "Active"), None)
        superseded_rev_status = next((s for s in revision_statuses if s.name == "Superseded"), None)
        cancelled_rev_status = next((s for s in revision_statuses if s.name == "Cancelled"), None)

        preferred_workflow_names = [
            "Draft",
            "In Review",
            "Approved",
            "Approved with Comments",
            "Rejected",
            "Not Reviewed",
        ]
        preferred_workflow = [s for s in workflow_statuses if s.name in preferred_workflow_names]
        workflow_pool = preferred_workflow if preferred_workflow else workflow_statuses
        workflow_by_name = {s.name: s for s in workflow_pool}
        approved_like_names = {"Approved", "Approved with Comments", "Not Reviewed"}
        approved_like_status_ids = {
            s.id for s in workflow_pool if s.name in approved_like_names
        }

        project_code = _build_project_code(db, "POP")
        project_name = f"{project_name_prefix} {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
        preset_name = _build_preset_name(db, "POP-PRESET")

        project = Project(
            name=project_name,
            description="Auto-generated demo project for dashboard/testing.",
            project_code=project_code,
            status=ProjectStatusEnum.ACTIVE,
            created_by=creator.id,
            start_date=datetime.utcnow().date(),
            is_deleted=0,
        )
        db.add(project)
        db.flush()

        db.add(
            ProjectMember(
                project_id=project.id,
                user_id=creator.id,
                project_role_id=manager_role.id if manager_role else None,
            )
        )

        selected_disciplines = random.sample(disciplines, k=min(3, len(disciplines)))
        selected_doc_types = random.sample(document_types, k=min(5, len(document_types)))
        selected_rev_desc = random.sample(revision_descriptions, k=min(4, len(revision_descriptions)))
        selected_rev_steps = random.sample(revision_steps, k=min(4, len(revision_steps)))

        workflow_preset = WorkflowPreset(
            name=preset_name,
            description="Auto-generated workflow preset for populate scenario.",
            is_global=False,
            created_by=creator.id,
        )
        db.add(workflow_preset)
        db.flush()
        project.workflow_preset_id = workflow_preset.id

        sequence_len = min(len(selected_rev_desc), len(selected_rev_steps), 4)
        if sequence_len == 0:
            raise RuntimeError("Cannot build workflow preset sequence from references.")

        sequence_pairs: list[tuple[int, int]] = []
        for seq_order in range(1, sequence_len + 1):
            desc = selected_rev_desc[seq_order - 1]
            step = selected_rev_steps[seq_order - 1]
            sequence_pairs.append((desc.id, step.id))
            db.add(
                WorkflowPresetSequence(
                    preset_id=workflow_preset.id,
                    sequence_order=seq_order,
                    revision_description_id=desc.id,
                    revision_step_id=step.id,
                    is_final=(seq_order == sequence_len),
                    requires_transmittal=(seq_order >= 2 and random.random() < 0.45),
                    due_days=7 + seq_order * 3,
                )
            )

        for d in selected_disciplines:
            for dt in random.sample(selected_doc_types, k=min(2, len(selected_doc_types))):
                db.add(
                    ProjectDisciplineDocumentType(
                        project_id=project.id,
                        discipline_id=d.id,
                        document_type_id=dt.id,
                        drs=f"DRS-{d.code}-{dt.code}",
                    )
                )

        for rd in selected_rev_desc:
            db.add(ProjectRevisionDescription(project_id=project.id, revision_description_id=rd.id))
        for rs in selected_rev_steps:
            db.add(ProjectRevisionStep(project_id=project.id, revision_step_id=rs.id))

        if areas:
            project.areas = random.sample(areas, k=min(3, len(areas)))

        db.flush()

        now = datetime.utcnow()
        for i in range(1, documents_count + 1):
            discipline = random.choice(selected_disciplines)
            doc_type = random.choice(selected_doc_types)
            area = random.choice(project.areas) if project.areas and random.random() > 0.35 else None

            document = Document(
                title=f"Demo Document {i:03d}",
                title_native=f"Демо документ {i:03d}",
                remarks="Generated by populate script",
                number=f"{project_code}-DOC-{i:04d}",
                project_id=project.id,
                discipline_id=discipline.id,
                document_type_id=doc_type.id,
                area_id=area.id if area else None,
                created_by=creator.id,
                creation_date=now.date(),
                confidentiality="internal",
                is_deleted=0,
            )
            db.add(document)
            db.flush()

            revisions_count = random.randint(min_revisions, max_revisions)
            base_created_at = now - timedelta(days=random.randint(0, 180))
            current_sequence_idx = 0
            current_number = 1

            for r in range(1, revisions_count + 1):
                is_last = r == revisions_count

                seq_desc_id, seq_step_id = sequence_pairs[current_sequence_idx]
                number_to_use = current_number

                if is_last:
                    rev_status_id = active_rev_status.id if active_rev_status else None
                    last_status_candidates = [
                        workflow_by_name.get("Draft"),
                        workflow_by_name.get("In Review"),
                        workflow_by_name.get("Approved"),
                        workflow_by_name.get("Approved with Comments"),
                        workflow_by_name.get("Rejected"),
                        workflow_by_name.get("Not Reviewed"),
                    ]
                    workflow_status = random.choice([s for s in last_status_candidates if s is not None])
                else:
                    if superseded_rev_status:
                        rev_status_id = superseded_rev_status.id
                    elif cancelled_rev_status and random.random() < 0.15:
                        rev_status_id = cancelled_rev_status.id
                    else:
                        rev_status_id = active_rev_status.id if active_rev_status else None

                    mid_status_candidates = [
                        workflow_by_name.get("Approved"),
                        workflow_by_name.get("Approved with Comments"),
                        workflow_by_name.get("Not Reviewed"),
                        workflow_by_name.get("Rejected"),
                        workflow_by_name.get("In Review"),
                    ]
                    workflow_status = random.choice([s for s in mid_status_candidates if s is not None])

                revision = DocumentRevision(
                    document_id=document.id,
                    number=f"{number_to_use:02d}",
                    change_description=f"Auto revision {r:02d} for {document.number}",
                    uploaded_by=creator.id,
                    is_deleted=0,
                    revision_status_id=rev_status_id,
                    revision_description_id=seq_desc_id,
                    revision_step_id=seq_step_id,
                    workflow_status_id=workflow_status.id,
                    created_at=base_created_at + timedelta(days=r),
                )
                db.add(revision)

                if not is_last:
                    if (
                        workflow_status.id in approved_like_status_ids
                        and current_sequence_idx < len(sequence_pairs) - 1
                    ):
                        current_sequence_idx += 1
                        current_number = 1
                    else:
                        current_number += 1

            if i % 25 == 0:
                db.flush()
                print(f"Created {i}/{documents_count} documents...")

        # Safety: ensure creator can see the project in UI (membership-based visibility).
        creator_membership = (
            db.query(ProjectMember)
            .filter(ProjectMember.project_id == project.id, ProjectMember.user_id == creator.id)
            .first()
        )
        if not creator_membership:
            db.add(
                ProjectMember(
                    project_id=project.id,
                    user_id=creator.id,
                    project_role_id=manager_role.id if manager_role else None,
                )
            )

        db.commit()
        print("Populate finished successfully.")
        print(f"Project ID: {project.id}")
        print(f"Project name: {project.name}")
        print(f"Project code: {project.project_code}")
        print(f"Workflow preset ID: {workflow_preset.id}")
        print(f"Workflow preset name: {workflow_preset.name}")
        print(f"Documents created: {documents_count}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Populate EDMS with demo project/documents/revisions.")
    parser.add_argument("--documents", type=int, default=100, help="Number of documents to create")
    parser.add_argument("--min-revisions", type=int, default=1, help="Min revisions per document")
    parser.add_argument("--max-revisions", type=int, default=4, help="Max revisions per document")
    parser.add_argument(
        "--project-name-prefix",
        type=str,
        default="Populate Demo Project",
        help="Prefix for project name",
    )
    parser.add_argument(
        "--creator-user-id",
        type=int,
        default=None,
        help="Create project/documents on behalf of this user id",
    )
    args = parser.parse_args()

    run_populate(
        documents_count=args.documents,
        min_revisions=args.min_revisions,
        max_revisions=args.max_revisions,
        project_name_prefix=args.project_name_prefix,
        creator_user_id=args.creator_user_id,
    )


if __name__ == "__main__":
    main()

