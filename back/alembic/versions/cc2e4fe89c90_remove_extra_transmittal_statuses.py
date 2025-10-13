"""remove_extra_transmittal_statuses

Revision ID: cc2e4fe89c90
Revises: 399d8a3d8512
Create Date: 2025-10-14 01:24:53.671114

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cc2e4fe89c90'
down_revision: Union[str, None] = '399d8a3d8512'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Удаляем лишние статусы трансмитталов (ID 6, 7, 8)
    op.execute("DELETE FROM transmittal_statuses WHERE id IN (6, 7, 8)")


def downgrade() -> None:
    # Восстанавливаем удаленные статусы
    op.execute("""
        INSERT INTO transmittal_statuses (id, name, name_native, description, is_active) VALUES
        (6, 'incoming', 'Входящий', 'Входящий трансмиттал', true),
        (7, 'incoming_received', 'Входящий получен', 'Входящий трансмиттал получен', true),
        (8, 'incoming_acknowledged', 'Входящий подтвержден', 'Входящий трансмиттал подтвержден', true)
    """)
