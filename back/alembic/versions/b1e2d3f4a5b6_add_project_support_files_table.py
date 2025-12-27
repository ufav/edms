"""add project_support_files table

Revision ID: b1e2d3f4a5b6
Revises: 7e993f56e902
Create Date: 2025-12-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1e2d3f4a5b6'
# Делаем миграцию продолжением основной цепочки после 31a071e20399
down_revision: Union[str, None] = '31a071e20399'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Создаем таблицу project_support_files для файлов support pack проектов."""
    op.create_table(
        'project_support_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('file_type', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('uploaded_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_project_support_files_id'), 'project_support_files', ['id'], unique=False)


def downgrade() -> None:
    """Удаляем таблицу project_support_files при откате миграции."""
    op.drop_index(op.f('ix_project_support_files_id'), table_name='project_support_files')
    op.drop_table('project_support_files')


