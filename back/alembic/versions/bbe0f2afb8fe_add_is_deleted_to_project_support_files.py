"""add_is_deleted_to_project_support_files

Revision ID: bbe0f2afb8fe
Revises: cf7b06f89cc0
Create Date: 2025-12-27 12:14:12.396494

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bbe0f2afb8fe'
down_revision: Union[str, None] = 'cf7b06f89cc0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поле is_deleted в таблицу project_support_files
    op.add_column('project_support_files', sa.Column('is_deleted', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    # При откате миграции удаляем поле is_deleted
    op.drop_column('project_support_files', 'is_deleted')
