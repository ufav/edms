"""remove_old_transmittal_fields

Revision ID: dc6a6719d0e1
Revises: fd160d12c91e
Create Date: 2025-10-15 18:52:41.339249

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dc6a6719d0e1'
down_revision: Union[str, None] = 'fd160d12c91e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Удаляем старые поля из таблицы transmittals
    # Проверяем и удаляем foreign key constraints если они существуют
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    constraints = inspector.get_foreign_keys('transmittals')
    
    # Ищем constraint для recipient_id
    for constraint in constraints:
        if 'recipient_id' in constraint['constrained_columns']:
            op.drop_constraint(constraint['name'], 'transmittals', type_='foreignkey')
            break
    
    # Удаляем колонки если они существуют
    columns = [col['name'] for col in inspector.get_columns('transmittals')]
    
    if 'recipient_id' in columns:
        op.drop_column('transmittals', 'recipient_id')
    if 'sent_date' in columns:
        op.drop_column('transmittals', 'sent_date')
    if 'received_date' in columns:
        op.drop_column('transmittals', 'received_date')


def downgrade() -> None:
    # Восстанавливаем старые поля для отката
    op.add_column('transmittals', sa.Column('recipient_id', sa.Integer(), nullable=True))
    op.add_column('transmittals', sa.Column('sent_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('transmittals', sa.Column('received_date', sa.DateTime(timezone=True), nullable=True))
    
    # Восстанавливаем foreign key constraint
    op.create_foreign_key('fk_transmittals_recipient_id_companies', 'transmittals', 'companies', ['recipient_id'], ['id'])
