"""
Seed demo project with documents whose Document.created_at is spread over time.

Fixes empty «Динамика создания документов» chart: the chart filters by
Document.created_at (default period 30d), not revision dates.

Creates a new project (or reuses by --project-name) with:
- N documents
- 1..M revisions per document
- Document.created_at evenly/randomly over [--days-back] days ending today
- Revision dates chronologically after each document's created_at
"""

from __future__ import annotations

import argparse
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session

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


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


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
    base = _utc_now().strftime("%Y%m%d")
    idx = 1
    while True:
        code = f"{seed}-{base}-{idx:03d}"
        exists = db.query(Project).filter(Project.project_code == code).first()
        if not exists:
            return code
        idx += 1


def _build_preset_name(db: Session, seed: str) -> str:
    base = _utc_now().strftime("%Y%m%d")
    idx = 1
    while True:
        name = f"{seed}-{base}-{idx:03d}"
        exists = db.query(WorkflowPreset).filter(WorkflowPreset.name == name).first()
        if not exists:
            return name
        idx += 1


def _random_doc_created_at(now: datetime, days_back: int) -> datetime:
    sec_span = max(1, int(timedelta(days=days_back).total_seconds()))
    return now - timedelta(seconds=random.randint(0, sec_span))


def run_seed(
    documents_count: int,
    min_revisions: int,
    max_revisions: int,
    project_name: str,
    days_back: int,
    recreate: bool,
    creator_user_id: int | None = None,
    seed: int | None = None,
) -> None:
    if documents_count <= 0:
        raise ValueError("documents_count must be > 0")
    if days_back <= 0:
        raise ValueError("days_back must be > 0")
    if min_revisions <= 0 or max_revisions <= 0 or min_revisions > max_revisions:
        raise ValueError("Invalid revisions range")
    if seed is not None:
        random.seed(seed)

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
        approved_like_status_ids = {s.id for s in workflow_pool if s.name in approved_like_names}

        existing = (
            db.query(Project)
            .filter(Project.name == project_name, Project.is_deleted == 0)
            .order_by(Project.id.desc())
            .first()
        )

        if existing and recreate:
            print(f"Soft-deleting existing project id={existing.id} name={existing.name!r}")
            existing.is_deleted = 1
            db.flush()
            existing = None

        if existing and not recreate:
            # Only rebalance dates on an existing seeded project.
            now = _utc_now()
            docs = (
                db.query(Document)
                .filter(Document.project_id == existing.id, Document.is_deleted == 0)
                .order_by(Document.id.asc())
                .all()
            )
            if not docs:
                raise RuntimeError(
                    f"Project {existing.id} ({existing.name!r}) has no documents. "
                    "Re-run with --recreate to create a full seed."
                )

            print(f"Rebalancing dates for existing project id={existing.id} ({len(docs)} docs, {days_back}d)...")
            for document in docs:
                doc_created_at = _random_doc_created_at(now, days_back)
                document.created_at = doc_created_at
                document.creation_date = doc_created_at.date()
                document.updated_at = doc_created_at

                revisions = (
                    db.query(DocumentRevision)
                    .filter(DocumentRevision.document_id == document.id, DocumentRevision.is_deleted == 0)
                    .order_by(DocumentRevision.id.asc())
                    .all()
                )
                cursor = doc_created_at
                for idx, revision in enumerate(revisions):
                    if idx == 0:
                        rev_created = cursor + timedelta(hours=random.randint(1, 20))
                    else:
                        rev_created = cursor + timedelta(
                            days=random.randint(1, 12),
                            hours=random.randint(0, 18),
                        )
                    if rev_created > now:
                        rev_created = now - timedelta(hours=random.randint(1, 6))
                    revision.created_at = rev_created
                    cursor = rev_created

                if revisions:
                    document.updated_at = revisions[-1].created_at

            db.commit()
            print("Rebalance finished.")
            print(f"Project ID: {existing.id}")
            print(f"Project name: {existing.name}")
            print(f"Project code: {existing.project_code}")
            print(f"Documents updated: {len(docs)}")
            return

        now = _utc_now()
        project_code = _build_project_code(db, "DASH")
        preset_name = _build_preset_name(db, "DASH-PRESET")

        project = Project(
            name=project_name,
            description="Dashboard demo seed: documents with spread Document.created_at.",
            project_code=project_code,
            status=ProjectStatusEnum.ACTIVE,
            created_by=creator.id,
            start_date=now.date() - timedelta(days=days_back),
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
            description="Dashboard demo workflow preset.",
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

        for i in range(1, documents_count + 1):
            discipline = random.choice(selected_disciplines)
            doc_type = random.choice(selected_doc_types)
            area = random.choice(project.areas) if project.areas and random.random() > 0.35 else None
            doc_created_at = _random_doc_created_at(now, days_back)

            document = Document(
                title=f"Demo Document {i:03d}",
                title_native=f"Демо документ {i:03d}",
                remarks="Generated by dashboard seed script",
                number=f"{project_code}-DOC-{i:04d}",
                project_id=project.id,
                discipline_id=discipline.id,
                document_type_id=doc_type.id,
                area_id=area.id if area else None,
                created_by=creator.id,
                creation_date=doc_created_at.date(),
                created_at=doc_created_at,
                updated_at=doc_created_at,
                confidentiality="internal",
                is_deleted=0,
            )
            db.add(document)
            db.flush()

            revisions_count = random.randint(min_revisions, max_revisions)
            current_sequence_idx = 0
            current_number = 1
            cursor = doc_created_at

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

                if r == 1:
                    rev_created = cursor + timedelta(hours=random.randint(1, 20))
                else:
                    rev_created = cursor + timedelta(
                        days=random.randint(1, 7),
                        hours=random.randint(0, 18),
                    )
                if rev_created > now:
                    rev_created = now - timedelta(hours=random.randint(1, 6))

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
                    created_at=rev_created,
                )
                db.add(revision)
                cursor = rev_created

                if not is_last:
                    if (
                        workflow_status.id in approved_like_status_ids
                        and current_sequence_idx < len(sequence_pairs) - 1
                    ):
                        current_sequence_idx += 1
                        current_number = 1
                    else:
                        current_number += 1

            document.updated_at = cursor

            if i % 25 == 0:
                db.flush()
                print(f"Created {i}/{documents_count} documents...")

        db.commit()
        print("Dashboard seed finished successfully.")
        print(f"Project ID: {project.id}")
        print(f"Project name: {project.name}")
        print(f"Project code: {project.project_code}")
        print(f"Documents created: {documents_count}")
        print(f"Document.created_at spread over last {days_back} days")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed demo project with Document.created_at spread for dashboard charts."
    )
    parser.add_argument("--documents", type=int, default=100, help="Number of documents to create")
    parser.add_argument("--min-revisions", type=int, default=1, help="Min revisions per document")
    parser.add_argument("--max-revisions", type=int, default=4, help="Max revisions per document")
    parser.add_argument(
        "--project-name",
        type=str,
        default="Demo Project 1",
        help="Exact project name. If exists and --recreate is not set, only dates are rebalanced.",
    )
    parser.add_argument(
        "--days-back",
        type=int,
        default=90,
        help="Spread Document.created_at over last N days (default 90 for 30d/90d charts)",
    )
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Soft-delete existing project with same name and create a new full seed",
    )
    parser.add_argument("--creator-user-id", type=int, default=None, help="Creator user id")
    parser.add_argument("--seed", type=int, default=None, help="Random seed")
    args = parser.parse_args()

    run_seed(
        documents_count=args.documents,
        min_revisions=args.min_revisions,
        max_revisions=args.max_revisions,
        project_name=args.project_name,
        days_back=args.days_back,
        recreate=args.recreate,
        creator_user_id=args.creator_user_id,
        seed=args.seed,
    )


if __name__ == "__main__":
    main()
