"""remove_redundant_project_workflow_tables

Revision ID: ff2370a4e3c2
Revises: 19fd091fc3d7
Create Date: 2025-10-05 23:18:20.324665

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ff2370a4e3c2'
down_revision: Union[str, None] = '19fd091fc3d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Удаляем избыточные таблицы project_workflow_*
    # Эти данные теперь хранятся в workflow_preset_* и ссылаются через workflow_preset_id
    
    # Сначала удаляем внешние ключи
    op.drop_constraint('project_workflow_sequences_project_id_fkey', 'project_workflow_sequences', type_='foreignkey')
    op.drop_constraint('project_workflow_sequences_document_type_id_fkey', 'project_workflow_sequences', type_='foreignkey')
    op.drop_constraint('project_workflow_sequences_revision_description_id_fkey', 'project_workflow_sequences', type_='foreignkey')
    op.drop_constraint('project_workflow_sequences_revision_step_id_fkey', 'project_workflow_sequences', type_='foreignkey')
    
    op.drop_constraint('project_workflow_rules_project_id_fkey', 'project_workflow_rules', type_='foreignkey')
    op.drop_constraint('project_workflow_rules_document_type_id_fkey', 'project_workflow_rules', type_='foreignkey')
    op.drop_constraint('project_workflow_rules_current_revision_description_id_fkey', 'project_workflow_rules', type_='foreignkey')
    op.drop_constraint('project_workflow_rules_current_revision_step_id_fkey', 'project_workflow_rules', type_='foreignkey')
    op.drop_constraint('project_workflow_rules_review_code_id_fkey', 'project_workflow_rules', type_='foreignkey')
    op.drop_constraint('project_workflow_rules_next_revision_description_id_fkey', 'project_workflow_rules', type_='foreignkey')
    op.drop_constraint('project_workflow_rules_next_revision_step_id_fkey', 'project_workflow_rules', type_='foreignkey')
    
    # Удаляем таблицы
    op.drop_table('project_workflow_sequences')
    op.drop_table('project_workflow_rules')


def downgrade() -> None:
    # Восстанавливаем таблицы (для отката)
    op.create_table('project_workflow_sequences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('document_type_id', sa.Integer(), nullable=True),
        sa.Column('sequence_order', sa.Integer(), nullable=False),
        sa.Column('revision_description_id', sa.Integer(), nullable=False),
        sa.Column('revision_step_id', sa.Integer(), nullable=False),
        sa.Column('is_final', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('project_workflow_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('document_type_id', sa.Integer(), nullable=True),
        sa.Column('current_revision_description_id', sa.Integer(), nullable=False),
        sa.Column('current_revision_step_id', sa.Integer(), nullable=False),
        sa.Column('review_code_id', sa.Integer(), nullable=False),
        sa.Column('next_revision_description_id', sa.Integer(), nullable=True),
        sa.Column('next_revision_step_id', sa.Integer(), nullable=True),
        sa.Column('action_on_fail', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
