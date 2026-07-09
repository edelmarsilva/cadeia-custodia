"""alter deployment_team_members - user_id nullable, add member_name and member_role.

Revision ID: c2d3e4f5a6b1
Revises: b1c2d3e4f5a6
Create Date: 2026-07-08 14:30:00.000000
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c2d3e4f5a6b1"
down_revision: Union[str, None] = "b1c2d3e4f5a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Remover a UniqueConstraint antiga (team_id, user_id)
    op.drop_constraint("uq_team_member", "deployment_team_members", type_="unique")

    # 2. Tornar user_id nullable
    op.alter_column(
        "deployment_team_members",
        "user_id",
        nullable=True,
        existing_type=sa.dialects.postgresql.UUID(as_uuid=True),
    )

    # 3. Adicionar colunas member_name e member_role
    op.add_column(
        "deployment_team_members",
        sa.Column("member_name", sa.String(300), nullable=True),
    )
    op.add_column(
        "deployment_team_members",
        sa.Column("member_role", sa.String(200), nullable=True),
    )

    # 4. Criar índice parcial de unicidade apenas para user_id (quando preenchido)
    op.create_index(
        "ix_team_member_user_unique",
        "deployment_team_members",
        ["team_id", "user_id"],
        unique=True,
        postgresql_where=sa.text("user_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_team_member_user_unique", table_name="deployment_team_members")
    op.drop_column("deployment_team_members", "member_role")
    op.drop_column("deployment_team_members", "member_name")
    op.alter_column(
        "deployment_team_members",
        "user_id",
        nullable=False,
        existing_type=sa.dialects.postgresql.UUID(as_uuid=True),
    )
    op.create_unique_constraint(
        "uq_team_member",
        "deployment_team_members",
        ["team_id", "user_id"],
    )
