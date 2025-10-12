"""add_requires_transmittal_to_workflow_preset_sequences

Revision ID: dff542057602
Revises: 7bff7460a86b
Create Date: 2025-10-12 15:21:22.015723

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dff542057602'
down_revision: Union[str, None] = '7bff7460a86b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поле requires_transmittal в таблицу workflow_preset_sequences
    op.add_column('workflow_preset_sequences', 
                  sa.Column('requires_transmittal', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Удаляем поле requires_transmittal из таблицы workflow_preset_sequences
    op.drop_column('workflow_preset_sequences', 'requires_transmittal')
