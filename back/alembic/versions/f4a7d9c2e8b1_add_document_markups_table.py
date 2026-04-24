"""add_document_markups_table

Revision ID: f4a7d9c2e8b1
Revises: e32683f2d32d
Create Date: 2026-04-16 10:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4a7d9c2e8b1'
down_revision: Union[str, None] = 'e32683f2d32d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'document_markups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('revision_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('markup_data', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['revision_id'], ['document_revisions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('revision_id', 'user_id', name='uq_document_markups_revision_user')
    )
    op.create_index(op.f('ix_document_markups_id'), 'document_markups', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_document_markups_id'), table_name='document_markups')
    op.drop_table('document_markups')
