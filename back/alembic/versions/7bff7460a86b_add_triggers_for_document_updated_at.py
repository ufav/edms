"""add_triggers_for_document_updated_at

Revision ID: 7bff7460a86b
Revises: 07b1d37e9b40
Create Date: 2025-10-12 13:56:08.168550

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7bff7460a86b'
down_revision: Union[str, None] = '07b1d37e9b40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Создаем функцию для обновления updated_at
    op.execute("""
        CREATE OR REPLACE FUNCTION update_document_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Обновляем updated_at в таблице documents при изменении document_revisions
            UPDATE documents 
            SET updated_at = NOW() 
            WHERE id = NEW.document_id;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    # Создаем триггер для обновления updated_at при изменении document_revisions
    op.execute("""
        CREATE TRIGGER trigger_update_document_on_revision_change
        AFTER INSERT OR UPDATE OR DELETE ON document_revisions
        FOR EACH ROW
        EXECUTE FUNCTION update_document_updated_at();
    """)
    
    # Создаем функцию для обновления updated_at самого документа
    op.execute("""
        CREATE OR REPLACE FUNCTION update_document_self_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Обновляем updated_at при изменении самого документа
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    # Создаем триггер для обновления updated_at при изменении documents
    op.execute("""
        CREATE TRIGGER trigger_update_document_self_updated_at
        BEFORE UPDATE ON documents
        FOR EACH ROW
        EXECUTE FUNCTION update_document_self_updated_at();
    """)


def downgrade() -> None:
    # Удаляем триггеры
    op.execute("DROP TRIGGER IF EXISTS trigger_update_document_on_revision_change ON document_revisions;")
    op.execute("DROP TRIGGER IF EXISTS trigger_update_document_self_updated_at ON documents;")
    
    # Удаляем функции
    op.execute("DROP FUNCTION IF EXISTS update_document_updated_at();")
    op.execute("DROP FUNCTION IF EXISTS update_document_self_updated_at();")
