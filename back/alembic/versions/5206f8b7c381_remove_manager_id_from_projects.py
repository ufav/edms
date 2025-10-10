"""remove_manager_id_from_projects

Revision ID: 5206f8b7c381
Revises: 2fa0f62963e2
Create Date: 2025-10-08 14:27:17.614894

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5206f8b7c381'
down_revision: Union[str, None] = '2fa0f62963e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Удаляем колонку manager_id из таблицы projects
    op.drop_column('projects', 'manager_id')


def downgrade() -> None:
    # Восстанавливаем колонку manager_id (для отката)
    op.add_column('projects', sa.Column('manager_id', sa.INTEGER(), nullable=True))
