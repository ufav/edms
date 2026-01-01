"""add_areas_table_and_area_id_to_documents

Revision ID: 70f5a2a74573
Revises: e1f2a3b4c5d6
Create Date: 2026-01-01 13:05:40.328682

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '70f5a2a74573'
down_revision: Union[str, None] = 'bd32ec943cb9'  # Последняя миграция (support tickets)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Создаем таблицу areas
    op.create_table(
        'areas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("timezone('UTC', now())"), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text("timezone('UTC', now())"), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_areas_id'), 'areas', ['id'], unique=False)
    op.create_index(op.f('ix_areas_project_id'), 'areas', ['project_id'], unique=False)
    
    # Добавляем поле area_id в таблицу documents
    op.add_column('documents', sa.Column('area_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_documents_area_id'), 'documents', ['area_id'], unique=False)
    op.create_foreign_key('fk_documents_area_id', 'documents', 'areas', ['area_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    # Удаляем поле area_id из documents
    op.drop_constraint('fk_documents_area_id', 'documents', type_='foreignkey')
    op.drop_index(op.f('ix_documents_area_id'), table_name='documents')
    op.drop_column('documents', 'area_id')
    
    # Удаляем таблицу areas
    op.drop_index(op.f('ix_areas_project_id'), table_name='areas')
    op.drop_index(op.f('ix_areas_id'), table_name='areas')
    op.drop_table('areas')
