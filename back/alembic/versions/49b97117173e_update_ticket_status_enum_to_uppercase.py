"""update_ticket_status_enum_to_uppercase

Revision ID: 49b97117173e
Revises: 4bdaf7bf2142
Create Date: 2026-01-01 18:41:27.884177

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '49b97117173e'
down_revision: Union[str, None] = '4bdaf7bf2142'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Получаем соединение с БД
    connection = op.get_bind()
    
    # Шаг 0: Удаляем значение по умолчанию перед изменением типа
    op.alter_column('support_tickets', 'status',
               existing_type=sa.Enum('new', 'in_progress', 'resolved', 'closed', name='ticketstatus'),
               server_default=None,
               existing_nullable=False)
    
    # Шаг 1: Преобразуем колонку status в VARCHAR для возможности изменения значений
    op.alter_column('support_tickets', 'status',
               existing_type=sa.Enum('new', 'in_progress', 'resolved', 'closed', name='ticketstatus'),
               type_=sa.VARCHAR(length=20),
               postgresql_using='status::text',
               existing_nullable=False)
    
    # Шаг 2: Обновляем значения в таблице на верхний регистр
    connection.execute(sa.text("""
        UPDATE support_tickets 
        SET status = CASE 
            WHEN LOWER(status) = 'new' THEN 'NEW'
            WHEN LOWER(status) = 'in_progress' THEN 'IN_PROGRESS'
            WHEN LOWER(status) = 'resolved' THEN 'RESOLVED'
            WHEN LOWER(status) = 'closed' THEN 'CLOSED'
            ELSE UPPER(status)
        END
    """))
    
    # Шаг 3: Удаляем старый enum тип
    ticketstatus_enum_old = sa.Enum(name='ticketstatus')
    ticketstatus_enum_old.drop(connection, checkfirst=True)
    
    # Шаг 4: Создаем новый enum тип с верхним регистром
    ticketstatus_enum_new = sa.Enum('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', name='ticketstatus')
    ticketstatus_enum_new.create(connection, checkfirst=True)
    
    # Шаг 5: Преобразуем колонку обратно в enum
    op.alter_column('support_tickets', 'status',
               existing_type=sa.VARCHAR(length=20),
               type_=ticketstatus_enum_new,
               postgresql_using='status::ticketstatus',
               existing_nullable=False)
    
    # Шаг 6: Устанавливаем значение по умолчанию
    op.alter_column('support_tickets', 'status',
               existing_type=ticketstatus_enum_new,
               server_default=sa.text("'NEW'::ticketstatus"),
               existing_nullable=False)


def downgrade() -> None:
    # Получаем соединение с БД
    connection = op.get_bind()
    
    # Шаг 0: Удаляем значение по умолчанию перед изменением типа
    op.alter_column('support_tickets', 'status',
               existing_type=sa.Enum('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', name='ticketstatus'),
               server_default=None,
               existing_nullable=False)
    
    # Шаг 1: Преобразуем колонку status в VARCHAR
    op.alter_column('support_tickets', 'status',
               existing_type=sa.Enum('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', name='ticketstatus'),
               type_=sa.VARCHAR(length=20),
               postgresql_using='status::text',
               existing_nullable=False)
    
    # Шаг 2: Обновляем значения в таблице на нижний регистр
    connection.execute(sa.text("""
        UPDATE support_tickets 
        SET status = CASE 
            WHEN UPPER(status) = 'NEW' THEN 'new'
            WHEN UPPER(status) = 'IN_PROGRESS' THEN 'in_progress'
            WHEN UPPER(status) = 'RESOLVED' THEN 'resolved'
            WHEN UPPER(status) = 'CLOSED' THEN 'closed'
            ELSE LOWER(status)
        END
    """))
    
    # Шаг 3: Удаляем новый enum тип
    ticketstatus_enum_new = sa.Enum(name='ticketstatus')
    ticketstatus_enum_new.drop(connection, checkfirst=True)
    
    # Шаг 4: Создаем старый enum тип с нижним регистром
    ticketstatus_enum_old = sa.Enum('new', 'in_progress', 'resolved', 'closed', name='ticketstatus')
    ticketstatus_enum_old.create(connection, checkfirst=True)
    
    # Шаг 5: Преобразуем колонку обратно в enum
    op.alter_column('support_tickets', 'status',
               existing_type=sa.VARCHAR(length=20),
               type_=ticketstatus_enum_old,
               postgresql_using='status::ticketstatus',
               existing_nullable=False)
    
    # Шаг 6: Устанавливаем значение по умолчанию
    op.alter_column('support_tickets', 'status',
               existing_type=ticketstatus_enum_old,
               server_default=sa.text("'new'::ticketstatus"),
               existing_nullable=False)
