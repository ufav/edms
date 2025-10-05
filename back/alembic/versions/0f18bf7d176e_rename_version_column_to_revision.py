"""rename_version_column_to_revision

Revision ID: 0f18bf7d176e
Revises: e15c5856e79b
Create Date: 2025-10-01 11:46:23.687768

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0f18bf7d176e'
down_revision: Union[str, None] = 'e15c5856e79b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Переименовываем столбец version в revision в таблице document_revisions
    op.alter_column('document_revisions', 'version', new_column_name='revision')


def downgrade() -> None:
    # Переименовываем столбец revision обратно в version
    op.alter_column('document_revisions', 'revision', new_column_name='version')
