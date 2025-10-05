"""add_remarks_field_to_documents

Revision ID: 4abf1a7d7876
Revises: 8374d64db19a
Create Date: 2025-10-05 21:00:33.655357

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4abf1a7d7876'
down_revision: Union[str, None] = '8374d64db19a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поле remarks (текстовое) в таблицу documents
    op.add_column('documents', sa.Column('remarks', sa.Text(), nullable=True))


def downgrade() -> None:
    # Удаляем поле remarks из таблицы documents
    op.drop_column('documents', 'remarks')
