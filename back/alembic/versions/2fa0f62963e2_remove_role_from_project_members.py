"""remove_role_from_project_members

Revision ID: 2fa0f62963e2
Revises: ff2370a4e3c2
Create Date: 2025-10-08 11:49:58.975782

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2fa0f62963e2'
down_revision: Union[str, None] = 'ff2370a4e3c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Удаляем колонку role из таблицы project_members
    op.drop_column('project_members', 'role')


def downgrade() -> None:
    # Восстанавливаем колонку role (для отката)
    op.add_column('project_members', sa.Column('role', sa.VARCHAR(50), nullable=False, server_default='viewer'))
