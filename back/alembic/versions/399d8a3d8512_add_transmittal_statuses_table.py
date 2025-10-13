"""add_transmittal_statuses_table

Revision ID: 399d8a3d8512
Revises: 3c173db680b8
Create Date: 2025-10-14 01:09:22.590308

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '399d8a3d8512'
down_revision: Union[str, None] = '3c173db680b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Создаем таблицу статусов трансмитталов
    op.create_table('transmittal_statuses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=32), nullable=False),
        sa.Column('name_native', sa.String(length=32), nullable=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_transmittal_statuses_id'), 'transmittal_statuses', ['id'], unique=False)
    
    # Добавляем статусы трансмитталов
    op.execute("""
        INSERT INTO transmittal_statuses (id, name, name_native, description, is_active) VALUES
        (1, 'draft', 'Черновик', 'Трансмиттал в черновике', true),
        (2, 'sent', 'Отправлен', 'Трансмиттал отправлен получателю', true),
        (3, 'received', 'Получен', 'Трансмиттал получен получателем', true),
        (4, 'acknowledged', 'Подтвержден', 'Трансмиттал подтвержден получателем', true),
        (5, 'rejected', 'Отклонен', 'Трансмиттал отклонен получателем', true)
    """)
    
    # Добавляем колонку status_id в таблицу transmittals
    op.add_column('transmittals', sa.Column('status_id', sa.Integer(), nullable=True))
    
    # Создаем внешний ключ
    op.create_foreign_key('fk_transmittals_status_id', 'transmittals', 'transmittal_statuses', ['status_id'], ['id'])
    
    # Обновляем существующие записи - устанавливаем status_id = 1 (draft) для всех существующих трансмитталов
    op.execute("UPDATE transmittals SET status_id = 1 WHERE status_id IS NULL")
    
    # Делаем колонку status_id обязательной
    op.alter_column('transmittals', 'status_id', nullable=False)
    
    # Удаляем старую колонку status
    op.drop_column('transmittals', 'status')


def downgrade() -> None:
    # Добавляем обратно колонку status
    op.add_column('transmittals', sa.Column('status', sa.String(length=20), nullable=True))
    
    # Обновляем данные - устанавливаем status = 'draft' для всех записей
    op.execute("UPDATE transmittals SET status = 'draft'")
    
    # Делаем колонку status обязательной
    op.alter_column('transmittals', 'status', nullable=False)
    
    # Удаляем внешний ключ
    op.drop_constraint('fk_transmittals_status_id', 'transmittals', type_='foreignkey')
    
    # Удаляем колонку status_id
    op.drop_column('transmittals', 'status_id')
    
    # Удаляем таблицу статусов трансмитталов
    op.drop_index(op.f('ix_transmittal_statuses_id'), table_name='transmittal_statuses')
    op.drop_table('transmittal_statuses')
