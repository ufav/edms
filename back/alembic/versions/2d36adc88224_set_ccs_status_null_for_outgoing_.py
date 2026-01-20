"""set_ccs_status_null_for_outgoing_transmittals

Revision ID: 2d36adc88224
Revises: 67e05a293835
Create Date: 2026-01-20 16:29:08.154399

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2d36adc88224'
down_revision: Union[str, None] = '67e05a293835'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Set ccs_status to NULL for transmittal_revisions where transmittal direction is 'out'
    op.execute("""
        UPDATE transmittal_revisions 
        SET ccs_status = NULL 
        WHERE transmittal_id IN (
            SELECT id FROM transmittals WHERE direction = 'out' OR direction IS NULL
        )
    """)


def downgrade() -> None:
    # Set ccs_status back to 'OPEN' for all records that were set to NULL
    op.execute("""
        UPDATE transmittal_revisions 
        SET ccs_status = 'OPEN' 
        WHERE ccs_status IS NULL
    """)

