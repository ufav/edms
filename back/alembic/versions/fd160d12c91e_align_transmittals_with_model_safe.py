"""align transmittals with model (safe)

Revision ID: fd160d12c91e
Revises: 1769fbfe310d
Create Date: 2025-10-15 16:11:36.818704

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fd160d12c91e'
down_revision: Union[str, None] = '1769fbfe310d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safe alignment for transmittals table according to back/app/models/transmittal.py
    # Only adds columns/indexes if missing. No drops/renames.
    op.execute("""
    DO $$
    BEGIN
      -- direction
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='transmittals' AND column_name='direction'
      ) THEN
        ALTER TABLE transmittals ADD COLUMN direction VARCHAR(10);
      END IF;

      -- counterparty_id + FK
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='transmittals' AND column_name='counterparty_id'
      ) THEN
        ALTER TABLE transmittals ADD COLUMN counterparty_id INTEGER;
        BEGIN
          ALTER TABLE transmittals
          ADD CONSTRAINT fk_transmittals_counterparty_id_companies
          FOREIGN KEY (counterparty_id) REFERENCES companies(id);
        EXCEPTION WHEN duplicate_object THEN NULL; END;
      END IF;

      -- transmittal_date
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='transmittals' AND column_name='transmittal_date'
      ) THEN
        ALTER TABLE transmittals ADD COLUMN transmittal_date TIMESTAMPTZ;
      END IF;

      -- sender_id
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='transmittals' AND column_name='sender_id'
      ) THEN
        ALTER TABLE transmittals ADD COLUMN sender_id INTEGER;
      END IF;

      -- recipient_id (legacy compat)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='transmittals' AND column_name='recipient_id'
      ) THEN
        ALTER TABLE transmittals ADD COLUMN recipient_id INTEGER;
      END IF;

      -- created_by
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='transmittals' AND column_name='created_by'
      ) THEN
        ALTER TABLE transmittals ADD COLUMN created_by INTEGER;
      END IF;

      -- status_id
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='transmittals' AND column_name='status_id'
      ) THEN
        ALTER TABLE transmittals ADD COLUMN status_id INTEGER;
      END IF;

      -- sent_date / received_date (legacy compat)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='transmittals' AND column_name='sent_date'
      ) THEN
        ALTER TABLE transmittals ADD COLUMN sent_date TIMESTAMPTZ;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='transmittals' AND column_name='received_date'
      ) THEN
        ALTER TABLE transmittals ADD COLUMN received_date TIMESTAMPTZ;
      END IF;

      -- created_at / updated_at
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='transmittals' AND column_name='created_at'
      ) THEN
        ALTER TABLE transmittals ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='transmittals' AND column_name='updated_at'
      ) THEN
        ALTER TABLE transmittals ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
      END IF;

      -- is_deleted
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='transmittals' AND column_name='is_deleted'
      ) THEN
        ALTER TABLE transmittals ADD COLUMN is_deleted INTEGER DEFAULT 0;
      END IF;
    END$$;
    """)

    # Indexes
    op.execute("""
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'ix_transmittals_direction' AND n.nspname = 'public'
      ) THEN
        CREATE INDEX ix_transmittals_direction ON transmittals(direction);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'ix_transmittals_transmittal_date' AND n.nspname = 'public'
      ) THEN
        CREATE INDEX ix_transmittals_transmittal_date ON transmittals(transmittal_date);
      END IF;
    END$$;
    """)

    # Backfill
    op.execute("""
    UPDATE transmittals
    SET direction = COALESCE(direction, CASE WHEN sent_date IS NOT NULL THEN 'out' WHEN received_date IS NOT NULL THEN 'in' END),
        transmittal_date = COALESCE(transmittal_date, sent_date, received_date),
        counterparty_id = COALESCE(counterparty_id, recipient_id)
    """)


def downgrade() -> None:
    # no destructive downgrade to avoid data loss
    pass
