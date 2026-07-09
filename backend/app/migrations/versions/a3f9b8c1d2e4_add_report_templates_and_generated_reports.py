"""add report_templates and generated_reports tables

Revision ID: a3f9b8c1d2e4
Revises: 152126d1b5e5
Create Date: 2026-07-02
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a3f9b8c1d2e4"
down_revision: Union[str, None] = "152126d1b5e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── report_templates ─────────────────────────────────────────
    op.create_table(
        "report_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("version", sa.String(50), nullable=False, server_default="1.0"),
        sa.Column("file_path", sa.String(1000), nullable=True),
        sa.Column("file_name", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_report_templates_name", "report_templates", ["name"])

    # ── generated_reports ─────────────────────────────────────────
    op.create_table(
        "generated_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("template_version", sa.String(50), nullable=True),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("operation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("report_number", sa.String(100), nullable=False),
        sa.Column("expert_name", sa.String(255), nullable=True),
        sa.Column("emission_date", sa.Date(), nullable=True),
        sa.Column("observations", sa.Text(), nullable=True),
        sa.Column("docx_path", sa.String(1000), nullable=True),
        sa.Column("pdf_path", sa.String(1000), nullable=True),
        sa.Column("docx_name", sa.String(500), nullable=True),
        sa.Column("pdf_name", sa.String(500), nullable=True),
        sa.Column("placeholder_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["template_id"], ["report_templates.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["operation_id"], ["operations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_generated_reports_device_id", "generated_reports", ["device_id"])
    op.create_index("ix_generated_reports_operation_id", "generated_reports", ["operation_id"])
    op.create_index("ix_generated_reports_template_id", "generated_reports", ["template_id"])
    op.create_index("ix_generated_reports_report_number", "generated_reports", ["report_number"])


def downgrade() -> None:
    op.drop_index("ix_generated_reports_report_number", table_name="generated_reports")
    op.drop_index("ix_generated_reports_template_id", table_name="generated_reports")
    op.drop_index("ix_generated_reports_operation_id", table_name="generated_reports")
    op.drop_index("ix_generated_reports_device_id", table_name="generated_reports")
    op.drop_table("generated_reports")
    op.drop_index("ix_report_templates_name", table_name="report_templates")
    op.drop_table("report_templates")
