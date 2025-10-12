"""remove_action_on_fail_from_workflow_preset_rules

Revision ID: cfc0017afea6
Revises: dff542057602
Create Date: 2025-10-12 20:29:58.851113

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cfc0017afea6'
down_revision: Union[str, None] = 'dff542057602'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Удаляем поле action_on_fail из таблицы workflow_preset_rules
    op.drop_column('workflow_preset_rules', 'action_on_fail')


def downgrade() -> None:
    # Восстанавливаем поле action_on_fail
    op.add_column('workflow_preset_rules', 
                  sa.Column('action_on_fail', sa.String(50), nullable=True, server_default='increment_number'))
