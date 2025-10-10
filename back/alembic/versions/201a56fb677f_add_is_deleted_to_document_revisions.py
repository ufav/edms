"""add_is_deleted_to_document_revisions

Revision ID: 201a56fb677f
Revises: 567f3f34640a
Create Date: 2025-10-11 02:40:21.641069

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '201a56fb677f'
down_revision: Union[str, None] = '567f3f34640a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поле is_deleted в таблицу document_revisions
    op.add_column('document_revisions', sa.Column('is_deleted', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    # Удаляем поле is_deleted из таблицы document_revisions
    op.drop_column('document_revisions', 'is_deleted')
