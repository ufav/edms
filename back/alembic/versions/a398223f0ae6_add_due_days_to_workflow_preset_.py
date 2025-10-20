"""add_due_days_to_workflow_preset_sequences

Revision ID: a398223f0ae6
Revises: da1c18593cc6
Create Date: 2025-10-19 15:09:41.162407

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a398223f0ae6'
down_revision: Union[str, None] = 'da1c18593cc6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поле due_days в таблицу workflow_preset_sequences
    op.add_column('workflow_preset_sequences', sa.Column('due_days', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Удаляем поле due_days из таблицы workflow_preset_sequences
    op.drop_column('workflow_preset_sequences', 'due_days')
