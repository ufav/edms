"""rename_document_versions_to_document_revisions

Revision ID: e15c5856e79b
Revises: 08693bcbb517
Create Date: 2025-10-01 11:21:19.080635

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e15c5856e79b'
down_revision: Union[str, None] = '08693bcbb517'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Сначала удаляем таблицу document_revisions, если она существует
    op.execute("DROP TABLE IF EXISTS document_revisions CASCADE")
    
    # Переименовываем document_versions в document_revisions
    op.rename_table('document_versions', 'document_revisions')
    
    # Переименовываем индексы
    op.execute("ALTER INDEX IF EXISTS ix_document_versions_id RENAME TO ix_document_revisions_id")
    op.execute("ALTER INDEX IF EXISTS ix_document_versions_document_id RENAME TO ix_document_revisions_document_id")


def downgrade() -> None:
    # Переименовываем обратно document_revisions в document_versions
    op.rename_table('document_revisions', 'document_versions')
    
    # Переименовываем индексы обратно
    op.execute("ALTER INDEX IF EXISTS ix_document_revisions_id RENAME TO ix_document_versions_id")
    op.execute("ALTER INDEX IF EXISTS ix_document_revisions_document_id RENAME TO ix_document_versions_document_id")
