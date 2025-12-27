"""remove_description_from_project_support_files

Revision ID: cf7b06f89cc0
Revises: b1e2d3f4a5b6
Create Date: 2025-12-27 11:50:54.619604

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cf7b06f89cc0'
down_revision: Union[str, None] = 'b1e2d3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Удаляем поле description из таблицы project_support_files
    op.drop_column('project_support_files', 'description')


def downgrade() -> None:
    # При откате миграции восстанавливаем поле description
    op.add_column('project_support_files', sa.Column('description', sa.Text(), nullable=True))
