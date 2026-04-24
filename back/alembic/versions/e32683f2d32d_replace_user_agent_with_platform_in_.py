"""replace_user_agent_with_platform_in_audit_logs

Revision ID: e32683f2d32d
Revises: 8c7a4e5f2d1b
Create Date: 2026-01-27 20:44:25.054437

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e32683f2d32d'
down_revision: Union[str, None] = '8c7a4e5f2d1b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Удаляем колонку user_agent
    op.drop_column('audit_logs', 'user_agent')
    
    # Добавляем колонку platform
    op.add_column('audit_logs', sa.Column('platform', sa.String(20), nullable=True))


def downgrade() -> None:
    # Удаляем колонку platform
    op.drop_column('audit_logs', 'platform')
    
    # Восстанавливаем колонку user_agent
    op.add_column('audit_logs', sa.Column('user_agent', sa.Text(), nullable=True))
