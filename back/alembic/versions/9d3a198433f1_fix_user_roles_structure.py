"""fix_user_roles_structure

Revision ID: 9d3a198433f1
Revises: 178bf011730b
Create Date: 2025-10-05 19:04:38.271278

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d3a198433f1'
down_revision: Union[str, None] = '178bf011730b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поля в user_roles
    op.add_column('user_roles', sa.Column('code', sa.String(length=50), nullable=False, server_default=''))
    op.add_column('user_roles', sa.Column('name_en', sa.String(length=64), nullable=True))
    
    # Создаем уникальный индекс для code
    op.create_unique_constraint('uq_user_roles_code', 'user_roles', ['code'])
    
    # Удаляем внешний ключ system_role_id из users
    op.drop_constraint('users_system_role_id_fkey', 'users', type_='foreignkey')
    op.drop_column('users', 'system_role_id')
    
    # Добавляем новый внешний ключ user_role_id в users
    op.add_column('users', sa.Column('user_role_id', sa.Integer(), nullable=True))
    op.create_foreign_key('users_user_role_id_fkey', 'users', 'user_roles', ['user_role_id'], ['id'])
    
    # Удаляем таблицу system_roles
    op.drop_table('system_roles')


def downgrade() -> None:
    # Восстанавливаем system_roles
    op.create_table('system_roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('name_en', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('permissions', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    
    # Удаляем user_role_id из users
    op.drop_constraint('users_user_role_id_fkey', 'users', type_='foreignkey')
    op.drop_column('users', 'user_role_id')
    
    # Восстанавливаем system_role_id в users
    op.add_column('users', sa.Column('system_role_id', sa.Integer(), nullable=True))
    op.create_foreign_key('users_system_role_id_fkey', 'users', 'system_roles', ['system_role_id'], ['id'])
    
    # Удаляем поля из user_roles
    op.drop_constraint('uq_user_roles_code', 'user_roles', type_='unique')
    op.drop_column('user_roles', 'name_en')
    op.drop_column('user_roles', 'code')
