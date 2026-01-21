"""add_spn_to_projects

Revision ID: 8c7a4e5f2d1b
Revises: 2f3d12464b63
Create Date: 2026-01-21 14:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c7a4e5f2d1b'
down_revision: Union[str, None] = '2f3d12464b63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add spn (Supplier Package Number) column to projects table
    op.add_column('projects', sa.Column('spn', sa.String(100), nullable=True))


def downgrade() -> None:
    # Remove spn column from projects table
    op.drop_column('projects', 'spn')
