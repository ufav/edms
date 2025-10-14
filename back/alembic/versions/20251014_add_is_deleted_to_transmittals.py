"""
add is_deleted to transmittals

Revision ID: 20251014_add_is_deleted_to_transmittals
Revises: 
Create Date: 2025-10-14
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'aa1b2c3d4e5f'
down_revision = 'cc2e4fe89c90'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('transmittals', sa.Column('is_deleted', sa.Integer(), nullable=False, server_default='0'))
    op.alter_column('transmittals', 'is_deleted', server_default=None)


def downgrade() -> None:
    op.drop_column('transmittals', 'is_deleted')


