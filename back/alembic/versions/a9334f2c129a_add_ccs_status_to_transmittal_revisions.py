"""add_ccs_status_to_transmittal_revisions

Revision ID: a9334f2c129a
Revises: 49b97117173e
Create Date: 2026-01-20 16:20:28.816470

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9334f2c129a'
down_revision: Union[str, None] = '49b97117173e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum type
    ccsstatus = sa.Enum('OPEN', 'CLOSED', name='ccsstatus')
    ccsstatus.create(op.get_bind(), checkfirst=True)
    
    # Add column with server_default for existing rows
    op.add_column('transmittal_revisions', sa.Column('ccs_status', ccsstatus, nullable=False, server_default='OPEN'))


def downgrade() -> None:
    op.drop_column('transmittal_revisions', 'ccs_status')
    # Drop enum type
    sa.Enum(name='ccsstatus').drop(op.get_bind(), checkfirst=True)

