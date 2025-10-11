"""Clean duplicate project participants before adding unique constraint

Revision ID: 07e1c7cbf51b
Revises: 76b73595bed4
Create Date: 2025-10-11 13:41:36.474296

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '07e1c7cbf51b'
down_revision: Union[str, None] = '143f0286f64b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Очищаем дубликаты в project_participants
    # Оставляем только первую запись для каждой комбинации (project_id, company_id)
    connection = op.get_bind()
    
    # Находим дубликаты и удаляем все кроме первого
    connection.execute(sa.text("""
        DELETE FROM project_participants 
        WHERE id NOT IN (
            SELECT MIN(id) 
            FROM project_participants 
            GROUP BY project_id, company_id
        )
    """))


def downgrade() -> None:
    # Откат не требуется, так как мы только удаляем дубликаты
    pass
