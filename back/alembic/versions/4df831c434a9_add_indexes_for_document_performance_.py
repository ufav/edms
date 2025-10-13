"""Add indexes for document performance optimization

Revision ID: 4df831c434a9
Revises: 23435a5de394
Create Date: 2025-10-13 11:17:19.508505

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4df831c434a9'
down_revision: Union[str, None] = '23435a5de394'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Индекс для ускорения поиска последней ревизии документа
    op.create_index('idx_document_revisions_document_created', 'document_revisions', ['document_id', 'created_at'])
    
    # Индекс для ускорения фильтрации по статусу ревизии
    op.create_index('idx_document_revisions_status_deleted', 'document_revisions', ['revision_status_id', 'is_deleted'])
    
    # Индекс для ускорения JOIN'ов с дисциплинами и типами документов
    op.create_index('idx_documents_discipline_type', 'documents', ['discipline_id', 'document_type_id'])
    
    # Индекс для ускорения поиска по проекту и статусу удаления
    op.create_index('idx_documents_project_deleted', 'documents', ['project_id', 'is_deleted'])
    
    # Индекс для ускорения JOIN'ов в project_discipline_document_types
    op.create_index('idx_project_discipline_doc_types_lookup', 'project_discipline_document_types', 
                   ['project_id', 'discipline_id', 'document_type_id'])


def downgrade() -> None:
    # Удаляем индексы в обратном порядке
    op.drop_index('idx_project_discipline_doc_types_lookup', table_name='project_discipline_document_types')
    op.drop_index('idx_documents_project_deleted', table_name='documents')
    op.drop_index('idx_documents_discipline_type', table_name='documents')
    op.drop_index('idx_document_revisions_status_deleted', table_name='document_revisions')
    op.drop_index('idx_document_revisions_document_created', table_name='document_revisions')
