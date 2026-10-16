"""Helper functions for Row Level Security (RLS) in migrations."""

from alembic import op


def enable_rls(table_name: str, schema: str = "public") -> None:
    """Enable Row Level Security on a table and revoke all privileges from anon and authenticated roles."""
    op.execute(f'ALTER TABLE {schema}."{table_name}" ENABLE ROW LEVEL SECURITY')
    op.execute(f'REVOKE ALL ON TABLE {schema}."{table_name}" FROM anon, authenticated')


def disable_rls(table_name: str, schema: str = "public") -> None:
    """Disable Row Level Security on a table (for downgrade)."""
    op.execute(f'ALTER TABLE {schema}."{table_name}" DISABLE ROW LEVEL SECURITY')


def enable_rls_on_tables(table_names: list[str], schema: str = "public") -> None:
    """Enable RLS on multiple tables."""
    for table_name in table_names:
        enable_rls(table_name, schema)


def disable_rls_on_tables(table_names: list[str], schema: str = "public") -> None:
    """Disable RLS on multiple tables."""
    for table_name in table_names:
        disable_rls(table_name, schema)