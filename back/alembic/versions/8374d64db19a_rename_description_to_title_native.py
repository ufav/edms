"""rename_description_to_title_native

Revision ID: 8374d64db19a
Revises: f366adbaab14
Create Date: 2025-10-05 20:54:55.214871

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8374d64db19a'
down_revision: Union[str, None] = 'f366adbaab14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Переименовываем поле description в title_native в таблице documents
    op.alter_column('documents', 'description', new_column_name='title_native')


def downgrade() -> None:
    # Возвращаем обратно поле title_native в description
    op.alter_column('documents', 'title_native', new_column_name='description')
