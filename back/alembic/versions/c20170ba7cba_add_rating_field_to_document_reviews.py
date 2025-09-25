"""add_rating_field_to_document_reviews

Revision ID: c20170ba7cba
Revises: f9c2249623f5
Create Date: 2025-09-25 16:01:00.628095

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c20170ba7cba'
down_revision: Union[str, None] = 'f9c2249623f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поле rating в таблицу document_reviews
    op.add_column('document_reviews', sa.Column('rating', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Удаляем поле rating из таблицы document_reviews
    op.drop_column('document_reviews', 'rating')
