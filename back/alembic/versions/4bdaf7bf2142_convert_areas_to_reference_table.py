"""convert_areas_to_reference_table

Revision ID: 4bdaf7bf2142
Revises: efe95db06479
Create Date: 2026-01-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '4bdaf7bf2142'
down_revision: Union[str, None] = 'efe95db06479'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Создаем промежуточную таблицу project_areas для связи многие-ко-многим
    op.create_table(
        'project_areas',
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('area_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['area_id'], ['areas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('project_id', 'area_id')
    )
    
    # Удаляем внешний ключ project_id из areas
    op.drop_constraint('areas_project_id_fkey', 'areas', type_='foreignkey')
    
    # Удаляем внешний ключ created_by из areas (если существует)
    try:
        op.drop_constraint('areas_created_by_fkey', 'areas', type_='foreignkey')
    except:
        pass  # Может не существовать
    
    # Удаляем индекс по project_id
    op.drop_index('ix_areas_project_id', table_name='areas')
    
    # Удаляем колонку project_id
    op.drop_column('areas', 'project_id')
    
    # Удаляем колонку created_by
    op.drop_column('areas', 'created_by')
    
    # Делаем code обязательным и уникальным
    # Сначала удаляем NULL значения (если есть), устанавливая пустую строку
    op.execute("UPDATE areas SET code = '' WHERE code IS NULL")
    
    # Делаем code NOT NULL
    op.alter_column('areas', 'code',
                    existing_type=sa.String(length=50),
                    nullable=False)
    
    # Добавляем уникальный индекс на code
    op.create_index('ix_areas_code', 'areas', ['code'], unique=True)


def downgrade() -> None:
    # Удаляем уникальный индекс на code
    op.drop_index('ix_areas_code', table_name='areas')
    
    # Возвращаем code обратно в nullable
    op.alter_column('areas', 'code',
                    existing_type=sa.String(length=50),
                    nullable=True)
    
    # Добавляем колонку created_by обратно
    op.add_column('areas', sa.Column('created_by', sa.Integer(), nullable=True))
    op.create_foreign_key('areas_created_by_fkey', 'areas', 'users', ['created_by'], ['id'])
    
    # Добавляем колонку project_id обратно
    op.add_column('areas', sa.Column('project_id', sa.Integer(), nullable=True))
    op.create_foreign_key('areas_project_id_fkey', 'areas', 'projects', ['project_id'], ['id'], ondelete='CASCADE')
    op.create_index('ix_areas_project_id', 'areas', ['project_id'], unique=False)
    
    # Удаляем промежуточную таблицу project_areas
    op.drop_table('project_areas')
