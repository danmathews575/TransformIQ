"""BE-03 align assessments with wizard schema

Revision ID: 439d7f0a68ad
Revises: ce6a47d3ee49
Create Date: 2026-10-16 10:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "439d7f0a68ad"
down_revision: Union[str, Sequence[str], None] = "ce6a47d3ee49"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add wizard-compatible assessment fields while preserving legacy rows."""
    op.add_column("assessments", sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("assessments", sa.Column("name", sa.Text(), nullable=True))
    op.add_column("assessments", sa.Column("status", sa.Text(), nullable=True, server_default="Draft"))
    op.add_column("assessments", sa.Column("wizard_input", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("assessments", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("NOW()")))
    op.add_column("assessments", sa.Column("source", sa.Text(), nullable=True, server_default="wizard"))
    op.add_column("assessments", sa.Column("currency", sa.Text(), nullable=True, server_default="USD"))

    op.create_foreign_key(
        "fk_assessments_workspace_id_workspaces",
        "assessments",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.execute("ALTER TABLE assessments ALTER COLUMN input_data DROP NOT NULL")
    op.execute("ALTER TABLE assessments ALTER COLUMN roi_results DROP NOT NULL")
    op.execute("ALTER TABLE assessments ALTER COLUMN scoring_engine_version SET DEFAULT 'wizard-v1-unscored'")

    op.execute("ALTER TABLE assessments ADD CONSTRAINT assessments_status_check CHECK (status IN ('Draft', 'In progress', 'Completed', 'Archived'))")
    op.execute("ALTER TABLE assessments ADD CONSTRAINT assessments_currency_check CHECK (currency = 'USD')")
    op.execute("CREATE INDEX ix_assessments_workspace_id_created_at ON assessments (workspace_id, created_at DESC)")


def downgrade() -> None:
    """Remove wizard fields added by BE-03."""
    op.execute("DROP INDEX IF EXISTS ix_assessments_workspace_id_created_at")
    op.execute("ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_currency_check")
    op.execute("ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_status_check")
    op.drop_constraint("fk_assessments_workspace_id_workspaces", "assessments", type_="foreignkey")
    op.drop_column("assessments", "currency")
    op.drop_column("assessments", "source")
    op.drop_column("assessments", "updated_at")
    op.drop_column("assessments", "wizard_input")
    op.drop_column("assessments", "status")
    op.drop_column("assessments", "name")
    op.drop_column("assessments", "workspace_id")
