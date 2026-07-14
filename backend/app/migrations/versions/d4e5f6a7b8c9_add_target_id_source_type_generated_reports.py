"""add target_id and source_type to generated_reports

Revision ID: d4e5f6a7b8c9
Revises: a3f9b8c1d2e4
Create Date: 2026-07-14 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = '7b1e39702b25'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Torna device_id nullable (documentos podem ser de operação ou alvo)
    op.alter_column(
        'generated_reports',
        'device_id',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )

    # Adiciona target_id
    op.add_column(
        'generated_reports',
        sa.Column(
            'target_id',
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        'fk_generated_reports_target_id',
        'generated_reports',
        'targets',
        ['target_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index(
        'ix_generated_reports_target_id',
        'generated_reports',
        ['target_id'],
        unique=False,
    )

    # Adiciona source_type ('device' | 'operation' | 'target')
    op.add_column(
        'generated_reports',
        sa.Column('source_type', sa.String(20), nullable=True, server_default='device'),
    )

    # Preenche source_type='device' para registros existentes
    op.execute("UPDATE generated_reports SET source_type = 'device' WHERE source_type IS NULL")


def downgrade() -> None:
    op.drop_index('ix_generated_reports_target_id', table_name='generated_reports')
    op.drop_constraint('fk_generated_reports_target_id', 'generated_reports', type_='foreignkey')
    op.drop_column('generated_reports', 'target_id')
    op.drop_column('generated_reports', 'source_type')
    op.alter_column(
        'generated_reports',
        'device_id',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
