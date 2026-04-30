"""
Rebalance project document/revision dates for realistic dashboard charts.

What it does:
- spreads Document.created_at over a period ending today
- recalculates DocumentRevision.created_at in chronological order per document
- for latest "In Review" revisions creates a mix of overdue / not overdue
"""

from __future__ import annotations

import argparse
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import text

BACK_DIR = Path(__file__).resolve().parents[1]
if str(BACK_DIR) not in sys.path:
    sys.path.insert(0, str(BACK_DIR))

from app.core.database import SessionLocal


def _resolve_project_row(db, project_id: int | None, project_code: str | None):
    if project_id is not None:
        row = db.execute(
            text(
                """
                select id, project_code, name, workflow_preset_id
                from projects
                where id = :pid and is_deleted = 0
                """
            ),
            {"pid": project_id},
        ).fetchone()
        if not row:
            raise RuntimeError(f"Project with id={project_id} not found.")
        return row

    if project_code:
        row = db.execute(
            text(
                """
                select id, project_code, name, workflow_preset_id
                from projects
                where project_code = :pcode and is_deleted = 0
                """
            ),
            {"pcode": project_code},
        ).fetchone()
        if not row:
            raise RuntimeError(f"Project with code={project_code} not found.")
        return row

    raise RuntimeError("Provide --project-id or --project-code.")


def run_rebalance(project_id: int | None, project_code: str | None, days_back: int, seed: int | None) -> None:
    if days_back <= 0:
        raise ValueError("days_back must be > 0")
    if seed is not None:
        random.seed(seed)

    db = SessionLocal()
    try:
        project = _resolve_project_row(db, project_id, project_code)
        now = datetime.now(timezone.utc)
        start = now - timedelta(days=days_back)

        documents = db.execute(
            text(
                """
                select id
                from documents
                where project_id = :pid and is_deleted = 0
                order by id asc
                """
            ),
            {"pid": project.id},
        ).fetchall()
        if not documents:
            raise RuntimeError("No documents found in project.")

        in_review_row = db.execute(
            text("select id from workflow_statuses where name = 'In Review' limit 1")
        ).fetchone()
        in_review_id = in_review_row.id if in_review_row else None

        sequence_by_pair: dict[tuple[int | None, int | None], int] = {}
        if project.workflow_preset_id:
            seq_rows = db.execute(
                text(
                    """
                    select revision_description_id, revision_step_id, due_days
                    from workflow_preset_sequences
                    where preset_id = :preset_id
                    """
                ),
                {"preset_id": project.workflow_preset_id},
            ).fetchall()
            for s in seq_rows:
                sequence_by_pair[(s.revision_description_id, s.revision_step_id)] = s.due_days or 7

        in_review_latest_count = 0
        forced_overdue = 0
        forced_not_overdue = 0

        for doc_row in documents:
            doc_id = doc_row.id
            # random document creation date in [start, now]
            sec_span = int((now - start).total_seconds())
            doc_created_at = start + timedelta(seconds=random.randint(0, max(1, sec_span)))
            db.execute(
                text("update documents set created_at = :created_at where id = :doc_id"),
                {"created_at": doc_created_at, "doc_id": doc_id},
            )

            revisions = db.execute(
                text(
                    """
                    select id, workflow_status_id, revision_description_id, revision_step_id
                    from document_revisions
                    where document_id = :doc_id and is_deleted = 0
                    order by created_at asc, id asc
                    """
                ),
                {"doc_id": doc_id},
            ).fetchall()
            if not revisions:
                db.execute(
                    text("update documents set updated_at = :updated_at where id = :doc_id"),
                    {"updated_at": doc_created_at, "doc_id": doc_id},
                )
                continue

            cursor = doc_created_at
            for idx, rev in enumerate(revisions):
                # 1..12 days between revisions
                if idx == 0:
                    rev_created = cursor + timedelta(hours=random.randint(1, 20))
                else:
                    rev_created = cursor + timedelta(days=random.randint(1, 12), hours=random.randint(0, 18))
                if rev_created > now:
                    rev_created = now - timedelta(hours=random.randint(1, 6))
                db.execute(
                    text("update document_revisions set created_at = :created_at where id = :rid"),
                    {"created_at": rev_created, "rid": rev.id},
                )
                cursor = rev_created

            latest = revisions[-1]
            # Ensure mixed overdue/not-overdue for in-review revisions only
            if in_review_id and latest.workflow_status_id == in_review_id:
                in_review_latest_count += 1
                due_days = sequence_by_pair.get((latest.revision_description_id, latest.revision_step_id), 7)

                make_overdue = in_review_latest_count % 2 == 0
                if make_overdue:
                    latest_created = now - timedelta(days=due_days + random.randint(1, 9))
                    forced_overdue += 1
                else:
                    safe_days = max(0, due_days - 1)
                    latest_created = now - timedelta(days=random.randint(0, safe_days))
                    forced_not_overdue += 1
                db.execute(
                    text("update document_revisions set created_at = :created_at where id = :rid"),
                    {"created_at": latest_created, "rid": latest.id},
                )

            # keep document updated_at in sync with latest revision
            latest_after = db.execute(
                text(
                    """
                    select created_at
                    from document_revisions
                    where document_id = :doc_id and is_deleted = 0
                    order by created_at desc, id desc
                    limit 1
                    """
                ),
                {"doc_id": doc_id},
            ).fetchone()
            if latest_after:
                db.execute(
                    text("update documents set updated_at = :updated_at where id = :doc_id"),
                    {"updated_at": latest_after.created_at, "doc_id": doc_id},
                )
            else:
                db.execute(
                    text("update documents set updated_at = created_at where id = :doc_id"),
                    {"doc_id": doc_id},
                )

        db.commit()
        print("Rebalance finished.")
        print(f"Project: {project.id} / {project.project_code} / {project.name}")
        print(f"Documents updated: {len(documents)}")
        print(f"In Review latest revisions: {in_review_latest_count}")
        print(f"Forced overdue: {forced_overdue}")
        print(f"Forced not overdue: {forced_not_overdue}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Rebalance project document/revision dates.")
    parser.add_argument("--project-id", type=int, default=None, help="Project ID")
    parser.add_argument("--project-code", type=str, default=None, help="Project code")
    parser.add_argument("--days-back", type=int, default=180, help="Spread dates back N days from today")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for reproducible results")
    args = parser.parse_args()

    run_rebalance(
        project_id=args.project_id,
        project_code=args.project_code,
        days_back=args.days_back,
        seed=args.seed,
    )


if __name__ == "__main__":
    main()

