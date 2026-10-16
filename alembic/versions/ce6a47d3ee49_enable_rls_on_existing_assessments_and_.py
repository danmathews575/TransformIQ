"""enable rls on existing assessments and opportunity_rankings tables

Revision ID: ce6a47d3ee49
Revises: 007fbcd17f49
Create Date: 2026-10-15 14:54:20.595090

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.migrations.rls import enable_rls, disable_rls

# revision identifiers, used by Alembic.
revision: str = 'ce6a47d3ee49'
down_revision: Union[str, Sequence[str], None] = '007fbcd17f49'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Enable RLS on existing tables
    enable_rls('assessments')
    enable_rls('opportunity_rankings')


def downgrade() -> None:
    """Downgrade schema."""
    disable_rls('opportunity_rankings')
    disable_rls('assessments')