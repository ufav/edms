"""merge heads

Revision ID: 73430d31bab0
Revises: 20251014_add_is_deleted_to_transmittals, cc2e4fe89c90
Create Date: 2025-10-14 17:32:53.395000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '73430d31bab0'
down_revision: Union[str, None] = ('20251014_add_is_deleted_to_transmittals', 'cc2e4fe89c90')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
