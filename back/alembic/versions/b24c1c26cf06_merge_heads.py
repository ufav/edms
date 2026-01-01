"""merge heads

Revision ID: b24c1c26cf06
Revises: 70f5a2a74573, e1f2a3b4c5d6
Create Date: 2026-01-01 13:22:59.791266

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b24c1c26cf06'
down_revision: Union[str, None] = ('70f5a2a74573', 'e1f2a3b4c5d6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
