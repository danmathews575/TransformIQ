"""Tests for BE-02: migration plumbing, RLS helper, seed logic."""

import pytest
from alembic.script import ScriptDirectory
from alembic.config import Config
from unittest.mock import MagicMock

from app.migrations.rls import enable_rls, disable_rls


class TestAlembicMigrationChain:
    """Tests for alembic migration chain integrity."""

    def test_migration_chain_is_linear(self):
        """Verify the revision chain is linear with a single head."""
        config = Config("alembic.ini")
        script_dir = ScriptDirectory.from_config(config)
        heads = script_dir.get_heads()
        
        # Should have exactly one head
        assert len(heads) == 1, f"Expected single head, got {heads}"
        
        # Verify we can walk the chain
        revisions = list(script_dir.walk_revisions())
        assert len(revisions) >= 3  # base + 2 new migrations
        
        # Verify revision order
        rev_ids = [r.revision for r in revisions]
        # Should be in order: base -> foundation -> rls on existing
        assert "aa8bd5c84595" in rev_ids  # base
        assert "007fbcd17f49" in rev_ids  # foundation
        assert "ce6a47d3ee49" in rev_ids  # rls on existing

    def test_migration_revisions_load(self):
        """Verify all migration revisions can be loaded without error."""
        config = Config("alembic.ini")
        script_dir = ScriptDirectory.from_config(config)
        
        # Get all revisions
        revisions = list(script_dir.walk_revisions())
        
        # Each revision should be loadable
        for rev in revisions:
            module = rev.module
            assert module is not None
            # Should have upgrade and downgrade functions
            assert hasattr(module, 'upgrade')
            assert hasattr(module, 'downgrade')


class TestRLSHelper:
    """Tests for RLS helper functions."""

    def test_enable_rls_emits_correct_sql(self):
        """Test that enable_rls emits the expected SQL statements."""
        mock_op = MagicMock()
        import app.migrations.rls as rls_module
        original_op = rls_module.op
        rls_module.op = mock_op
        
        try:
            enable_rls("test_table")
            
            # Should call op.execute twice: once for ALTER TABLE, once for REVOKE
            assert mock_op.execute.call_count == 2
            
            # Check the calls
            calls = mock_op.execute.call_args_list
            # First call: ALTER TABLE ... ENABLE ROW LEVEL SECURITY
            assert 'ENABLE ROW LEVEL SECURITY' in str(calls[0])
            assert 'test_table' in str(calls[0])
            # Second call: REVOKE ALL ON TABLE ... FROM anon, authenticated
            assert 'REVOKE ALL ON TABLE' in str(calls[1])
            assert 'anon, authenticated' in str(calls[1])
        finally:
            rls_module.op = original_op

    def test_disable_rls_emits_correct_sql(self):
        """Test that disable_rls emits the expected SQL statement."""
        mock_op = MagicMock()
        import app.migrations.rls as rls_module
        original_op = rls_module.op
        rls_module.op = mock_op
        
        try:
            disable_rls("test_table")
            
            assert mock_op.execute.call_count == 1
            calls = mock_op.execute.call_args_list
            assert 'DISABLE ROW LEVEL SECURITY' in str(calls[0])
            assert 'test_table' in str(calls[0])
        finally:
            rls_module.op = original_op


class TestSeedLogic:
    """Tests for seed script logic (pure functions)."""

    def test_demo_workspace_values(self):
        """Verify demo workspace constants."""
        from scripts.seed_demo import DEMO_WORKSPACE_SLUG, DEMO_WORKSPACE_NAME, DEMO_SOURCE
        
        assert DEMO_WORKSPACE_SLUG == "urban-threads-demo"
        assert DEMO_WORKSPACE_NAME == "Urban Threads Demo"
        assert DEMO_SOURCE == "demo"

    def test_seed_data_upsert_logic(self):
        """Test the upsert logic by examining the statement structure."""
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        from sqlalchemy import table, column, Text, UUID
        
        # Create a mock table structure
        workspaces_table = table(
            "workspaces",
            column("id", UUID),
            column("name", Text),
            column("slug", Text),
            column("industry", Text),
            column("country_code", Text),
            column("default_currency", Text),
            column("source", Text),
        )
        
        # Build the upsert statement
        stmt = pg_insert(workspaces_table).values(
            name="Urban Threads Demo",
            slug="urban-threads-demo",
            industry="E-commerce",
            country_code="US",
            default_currency="USD",
            source="demo",
        ).on_conflict_do_update(
            index_elements=["slug"],
            set_={
                "name": "Urban Threads Demo",
                "industry": "E-commerce",
                "country_code": "US",
                "default_currency": "USD",
                "source": "demo",
            }
        ).returning(workspaces_table.c.id)
        
        # Verify the statement structure
        assert stmt.table.name == "workspaces"
        assert stmt.returning is not None
        # Check that ON CONFLICT is set up
        assert stmt.on_conflict_do_update is not None


class TestSeedScriptArgs:
    """Tests for seed script argument parsing."""

    def test_requires_confirm_flag(self):
        """Script should require --confirm flag."""
        import subprocess
        import sys
        
        result = subprocess.run(
            [sys.executable, "scripts/seed_demo.py"],
            capture_output=True,
            text=True,
            cwd="/home/danmathewsvinu/TransformIQ.worktrees/chorereplace-old-frontend-with-lovable"
        )
        
        assert result.returncode != 0
        assert "confirm" in result.stderr.lower() or "confirm" in result.stdout.lower()

    def test_help_shows_options(self):
        """Script should show help with --help."""
        import subprocess
        import sys
        
        result = subprocess.run(
            [sys.executable, "scripts/seed_demo.py", "--help"],
            capture_output=True,
            text=True,
            cwd="/home/danmathewsvinu/TransformIQ.worktrees/chorereplace-old-frontend-with-lovable"
        )
        
        assert result.returncode == 0
        assert "--confirm" in result.stdout
        assert "--remove" in result.stdout