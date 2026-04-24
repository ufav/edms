"""document_markups: shared per-revision (drop user_id, add last_modified_by_id)

Revision ID: a1b2c3d4e5f6
Revises: f4a7d9c2e8b1
Create Date: 2026-04-17 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f4a7d9c2e8b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Схлопываем дубликаты: оставляем по одной записи на revision_id
    #    (самую свежую по updated_at).
    op.execute("""
        DELETE FROM document_markups
        WHERE id NOT IN (
            SELECT DISTINCT ON (revision_id) id
            FROM document_markups
            ORDER BY revision_id, updated_at DESC, id DESC
        )
    """)

    # 2. Снимаем старое ограничение и FK на users.id с CASCADE
    op.drop_constraint('uq_document_markups_revision_user', 'document_markups', type_='unique')

    # 3. Переименовываем user_id -> last_modified_by_id, делаем nullable
    op.alter_column(
        'document_markups', 'user_id',
        new_column_name='last_modified_by_id',
        existing_type=sa.Integer(),
        nullable=True,
    )

    # 4. Перенастраиваем FK: ondelete SET NULL (не каскадим аудит-поле)
    # Находим имя старого FK и дропаем, создаём новый
    op.execute("""
        DO $$
        DECLARE
            fk_name text;
        BEGIN
            SELECT conname INTO fk_name
            FROM pg_constraint
            WHERE conrelid = 'document_markups'::regclass
              AND contype = 'f'
              AND pg_get_constraintdef(oid) ILIKE '%REFERENCES users%';
            IF fk_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE document_markups DROP CONSTRAINT ' || quote_ident(fk_name);
            END IF;
        END $$;
    """)
    op.create_foreign_key(
        'fk_document_markups_last_modified_by',
        'document_markups', 'users',
        ['last_modified_by_id'], ['id'],
        ondelete='SET NULL'
    )

    # 5. Новое уникальное ограничение — один маркап на ревизию
    op.create_unique_constraint(
        'uq_document_markups_revision',
        'document_markups',
        ['revision_id']
    )


def downgrade() -> None:
    op.drop_constraint('uq_document_markups_revision', 'document_markups', type_='unique')
    op.drop_constraint('fk_document_markups_last_modified_by', 'document_markups', type_='foreignkey')

    # При откате нельзя надёжно восстановить исходный user_id у записей,
    # где он стал NULL. Ставим 0 — администратору предстоит очистить руками.
    op.execute("UPDATE document_markups SET last_modified_by_id = 0 WHERE last_modified_by_id IS NULL")

    op.alter_column(
        'document_markups', 'last_modified_by_id',
        new_column_name='user_id',
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.create_foreign_key(
        None,
        'document_markups', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_unique_constraint(
        'uq_document_markups_revision_user',
        'document_markups',
        ['revision_id', 'user_id']
    )
