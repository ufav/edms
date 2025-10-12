"""rename_transmittal_items_to_transmittal_revisions

Revision ID: be7802cab10d
Revises: cfc0017afea6
Create Date: 2025-10-12 21:06:27.294760

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be7802cab10d'
down_revision: Union[str, None] = 'cfc0017afea6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Переименовываем таблицу transmittal_items в transmittal_revisions
    op.rename_table('transmittal_items', 'transmittal_revisions')
    
    # Удаляем старые колонки, которые нам не нужны
    op.drop_column('transmittal_revisions', 'document_id')
    op.drop_column('transmittal_revisions', 'item_number')
    op.drop_column('transmittal_revisions', 'description')
    op.drop_column('transmittal_revisions', 'action_required')
    
    # Добавляем новую колонку revision_id
    op.add_column('transmittal_revisions', 
                  sa.Column('revision_id', sa.Integer(), nullable=False))
    
    # Добавляем внешний ключ на document_revisions
    op.create_foreign_key('fk_transmittal_revisions_revision_id', 
                         'transmittal_revisions', 'document_revisions', 
                         ['revision_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    # Удаляем внешний ключ
    op.drop_constraint('fk_transmittal_revisions_revision_id', 
                      'transmittal_revisions', type_='foreignkey')
    
    # Удаляем колонку revision_id
    op.drop_column('transmittal_revisions', 'revision_id')
    
    # Восстанавливаем старые колонки
    op.add_column('transmittal_revisions', 
                  sa.Column('document_id', sa.Integer(), nullable=True))
    op.add_column('transmittal_revisions', 
                  sa.Column('item_number', sa.String(50), nullable=True))
    op.add_column('transmittal_revisions', 
                  sa.Column('description', sa.Text(), nullable=True))
    op.add_column('transmittal_revisions', 
                  sa.Column('action_required', sa.String(100), nullable=True))
    
    # Переименовываем таблицу обратно
    op.rename_table('transmittal_revisions', 'transmittal_items')
