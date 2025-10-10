"""remove_review_code_id_from_document_revisions

Revision ID: 2114750df58e
Revises: cd7ccebdb004
Create Date: 2025-10-09 14:48:14.190231

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2114750df58e'
down_revision: Union[str, None] = 'cd7ccebdb004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Удаляем колонку review_code_id из таблицы document_revisions
    op.drop_column('document_revisions', 'review_code_id')


def downgrade() -> None:
    # Возвращаем колонку review_code_id
    op.add_column('document_revisions', sa.Column('review_code_id', sa.Integer(), nullable=True))
