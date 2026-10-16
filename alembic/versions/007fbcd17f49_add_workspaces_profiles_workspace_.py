"""add workspaces profiles workspace_memberships foundation tables

Revision ID: 007fbcd17f49
Revises: aa8bd5c84595
Create Date: 2026-10-15 14:51:01.685072

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from app.migrations.rls import enable_rls, disable_rls

# revision identifiers, used by Alembic.
revision: str = '007fbcd17f49'
down_revision: Union[str, Sequence[str], None] = 'aa8bd5c84595'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create workspaces table
    op.create_table(
        'workspaces',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('slug', sa.Text(), nullable=False),
        sa.Column('industry', sa.Text(), nullable=True),
        sa.Column('country_code', sa.Text(), nullable=True),
        sa.Column('default_currency', sa.Text(), nullable=False, server_default='USD'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
        schema='public'
    )
    enable_rls('workspaces')

    # Create profiles table (no FK to auth.users for now)
    op.create_table(
        'profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('full_name', sa.Text(), nullable=True),
        sa.Column('role', sa.Text(), nullable=False, server_default='admin'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        schema='public'
    )
    enable_rls('profiles')

    # Create workspace_memberships table
    op.create_table(
        'workspace_memberships',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('role', sa.Text(), nullable=False, server_default='admin'),
        sa.ForeignKeyConstraint(['workspace_id'], ['public.workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workspace_id', 'profile_id', name='uq_workspace_memberships_workspace_profile'),
        schema='public'
    )
    enable_rls('workspace_memberships')

    # Add source column to new tables for demo marking
    op.add_column('workspaces', sa.Column('source', sa.Text(), nullable=True), schema='public')
    op.add_column('profiles', sa.Column('source', sa.Text(), nullable=True), schema='public')
    op.add_column('workspace_memberships', sa.Column('source', sa.Text(), nullable=True), schema='public')


def downgrade() -> None:
    """Downgrade schema."""
    disable_rls('workspace_memberships')
    op.drop_table('workspace_memberships', schema='public')
    disable_rls('profiles')
    op.drop_table('profiles', schema='public')
    disable_rls('workspaces')
    op.drop_table('workspaces', schema='public')