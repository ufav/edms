"""remove_revision_from_documents_table

Revision ID: a7530e20adc5
Revises: 0f18bf7d176e
Create Date: 2025-10-01 12:10:18.850670

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7530e20adc5'
down_revision: Union[str, None] = '0f18bf7d176e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Удаляем столбец revision из таблицы documents
    op.drop_column('documents', 'revision')


def downgrade() -> None:
    # Добавляем столбец revision обратно в таблицу documents
    op.add_column('documents', sa.Column('revision', sa.String(20), nullable=True))
