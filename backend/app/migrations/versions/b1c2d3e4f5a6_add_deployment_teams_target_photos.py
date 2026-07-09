"""Add deployment_teams, team_members, team_targets, target_photos + target search indexes

Revision ID: b1c2d3e4f5a6
Revises: a3f9b8c1d2e4
Create Date: 2026-07-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "a3f9b8c1d2e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── deployment_teams ──────────────────────────────────────────
    op.create_table(
        "deployment_teams",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("operation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("leader_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["operation_id"], ["operations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["leader_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_deployment_teams_operation_id", "deployment_teams", ["operation_id"])
    op.create_index("ix_deployment_teams_name", "deployment_teams", ["name"])

    # ── deployment_team_members ───────────────────────────────────
    op.create_table(
        "deployment_team_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("assigned_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["team_id"], ["deployment_teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("team_id", "user_id", name="uq_team_member"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_deployment_team_members_team_id", "deployment_team_members", ["team_id"])
    op.create_index("ix_deployment_team_members_user_id", "deployment_team_members", ["user_id"])

    # ── deployment_team_targets ───────────────────────────────────
    op.create_table(
        "deployment_team_targets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("assigned_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["team_id"], ["deployment_teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_id"], ["targets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("team_id", "target_id", name="uq_team_target"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_deployment_team_targets_team_id", "deployment_team_targets", ["team_id"])
    op.create_index("ix_deployment_team_targets_target_id", "deployment_team_targets", ["target_id"])

    # ── target_photos ─────────────────────────────────────────────
    op.create_table(
        "target_photos",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_path", sa.String(1000), nullable=False),
        sa.Column("file_name", sa.String(500), nullable=False),
        sa.Column("caption", sa.String(500), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["target_id"], ["targets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_target_photos_target_id", "target_photos", ["target_id"])

    # ── additional search indexes on targets ──────────────────────
    # full_name already has an index (created in initial migration)
    op.create_index("ix_targets_nickname", "targets", ["nickname"])
    # cpf already has an index (created in initial migration)
    op.create_index("ix_targets_rg", "targets", ["rg"])


def downgrade() -> None:
    # Target search indexes
    op.drop_index("ix_targets_rg", table_name="targets")
    op.drop_index("ix_targets_nickname", table_name="targets")

    # target_photos
    op.drop_index("ix_target_photos_target_id", table_name="target_photos")
    op.drop_table("target_photos")

    # deployment_team_targets
    op.drop_index("ix_deployment_team_targets_target_id", table_name="deployment_team_targets")
    op.drop_index("ix_deployment_team_targets_team_id", table_name="deployment_team_targets")
    op.drop_table("deployment_team_targets")

    # deployment_team_members
    op.drop_index("ix_deployment_team_members_user_id", table_name="deployment_team_members")
    op.drop_index("ix_deployment_team_members_team_id", table_name="deployment_team_members")
    op.drop_table("deployment_team_members")

    # deployment_teams
    op.drop_index("ix_deployment_teams_name", table_name="deployment_teams")
    op.drop_index("ix_deployment_teams_operation_id", table_name="deployment_teams")
    op.drop_table("deployment_teams")
