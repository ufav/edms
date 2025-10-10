"""rename_author_to_created_by_in_documents

Revision ID: cd7ccebdb004
Revises: 5206f8b7c381
Create Date: 2025-10-09 12:29:22.065520

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cd7ccebdb004'
down_revision: Union[str, None] = '5206f8b7c381'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Удаляем старую колонку author
    op.drop_column('documents', 'author')
    
    # Создаем новую колонку created_by типа Integer
    op.add_column('documents', sa.Column('created_by', sa.Integer(), nullable=True))
    
    # Добавляем foreign key constraint
    op.create_foreign_key('fk_documents_created_by', 'documents', 'users', ['created_by'], ['id'])


def downgrade() -> None:
    # Убираем foreign key constraint
    op.drop_constraint('fk_documents_created_by', 'documents', type_='foreignkey')
    
    # Удаляем колонку created_by
    op.drop_column('documents', 'created_by')
    
    # Создаем колонку author с типом String
    op.add_column('documents', sa.Column('author', sa.String(200), nullable=True))
