"""update_user_roles_to_admin_operator_viewer

Revision ID: f9c2249623f5
Revises: 9069736d1a75
Create Date: 2025-09-25 15:52:31.173728

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f9c2249623f5'
down_revision: Union[str, None] = '9069736d1a75'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Обновляем роли пользователей на новые значения
    op.execute("""
        UPDATE users 
        SET role = CASE 
            WHEN role = 'admin' OR is_admin = true THEN 'admin'
            WHEN role = 'manager' THEN 'operator'
            WHEN role = 'user' THEN 'viewer'
            ELSE 'viewer'
        END
    """)
    
    # Обновляем поле is_admin для соответствия новой роли
    op.execute("UPDATE users SET is_admin = (role = 'admin')")


def downgrade() -> None:
    # Возвращаем старые роли
    op.execute("""
        UPDATE users 
        SET role = CASE 
            WHEN role = 'admin' THEN 'admin'
            WHEN role = 'operator' THEN 'manager'
            WHEN role = 'viewer' THEN 'user'
            ELSE 'user'
        END
    """)
    
    # Обновляем поле is_admin
    op.execute("UPDATE users SET is_admin = (role = 'admin')")
