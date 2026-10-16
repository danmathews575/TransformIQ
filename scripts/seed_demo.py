#!/usr/bin/env python3
"""Idempotent demo seed script for TransformIQ.

Creates a demo workspace and membership marked with source='demo'.
Usage:
    python scripts/seed_demo.py --confirm
    python scripts/seed_demo.py --confirm --remove  # to remove demo data
"""

import argparse
import os
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_engine


DEMO_WORKSPACE_SLUG = "urban-threads-demo"
DEMO_WORKSPACE_NAME = "Urban Threads Demo"
DEMO_PROFILE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEMO_SOURCE = "demo"


def seed_demo_data(db: Session) -> None:
    """Insert demo workspace, profile, and membership (idempotent)."""
    workspaces_table = sa.table(
        "workspaces",
        sa.column("id", sa.Uuid),
        sa.column("name", sa.Text),
        sa.column("slug", sa.Text),
        sa.column("industry", sa.Text),
        sa.column("country_code", sa.Text),
        sa.column("default_currency", sa.Text),
        sa.column("source", sa.Text),
    )
    profiles_table = sa.table(
        "profiles",
        sa.column("id", sa.Uuid),
        sa.column("full_name", sa.Text),
        sa.column("role", sa.Text),
        sa.column("source", sa.Text),
    )
    memberships_table = sa.table(
        "workspace_memberships",
        sa.column("id", sa.Uuid),
        sa.column("workspace_id", sa.Uuid),
        sa.column("profile_id", sa.Uuid),
        sa.column("role", sa.Text),
        sa.column("source", sa.Text),
    )

    workspace_stmt = (
        pg_insert(workspaces_table)
        .values(
            name=DEMO_WORKSPACE_NAME,
            slug=DEMO_WORKSPACE_SLUG,
            industry="E-commerce",
            country_code="US",
            default_currency="USD",
            source=DEMO_SOURCE,
        )
        .on_conflict_do_update(
            index_elements=["slug"],
            set_={
                "name": DEMO_WORKSPACE_NAME,
                "industry": "E-commerce",
                "country_code": "US",
                "default_currency": "USD",
                "source": DEMO_SOURCE,
            },
        )
        .returning(workspaces_table.c.id)
    )
    workspace_result = db.execute(workspace_stmt)
    workspace_id = workspace_result.scalar_one()

    profile_stmt = (
        pg_insert(profiles_table)
        .values(
            id=DEMO_PROFILE_ID,
            full_name="Demo User",
            role="admin",
            source=DEMO_SOURCE,
        )
        .on_conflict_do_update(
            index_elements=["id"],
            set_={
                "full_name": "Demo User",
                "role": "admin",
                "source": DEMO_SOURCE,
            },
        )
    )
    db.execute(profile_stmt)

    membership_stmt = (
        pg_insert(memberships_table)
        .values(
            workspace_id=workspace_id,
            profile_id=DEMO_PROFILE_ID,
            role="admin",
            source=DEMO_SOURCE,
        )
        .on_conflict_do_update(
            index_elements=["workspace_id", "profile_id"],
            set_={
                "role": "admin",
                "source": DEMO_SOURCE,
            },
        )
    )
    db.execute(membership_stmt)
    db.commit()
    print(f"Demo data seeded: workspace '{DEMO_WORKSPACE_SLUG}' (id: {workspace_id})")


def remove_demo_data(db: Session) -> None:
    """Remove demo data (only rows marked with source='demo')."""
    # Delete in reverse order of dependencies
    db.execute(
        sa.text("DELETE FROM workspace_memberships WHERE source = :source"),
        {"source": DEMO_SOURCE}
    )
    db.execute(
        sa.text("DELETE FROM profiles WHERE source = :source"),
        {"source": DEMO_SOURCE}
    )
    db.execute(
        sa.text("DELETE FROM workspaces WHERE source = :source"),
        {"source": DEMO_SOURCE}
    )
    db.commit()
    print("Demo data removed")


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed or remove demo data")
    parser.add_argument(
        "--confirm",
        action="store_true",
        required=True,
        help="Confirm you want to run this script"
    )
    parser.add_argument(
        "--remove",
        action="store_true",
        help="Remove demo data instead of seeding"
    )
    args = parser.parse_args()

    if not args.confirm:
        print("Error: --confirm is required", file=sys.stderr)
        return 1

    if os.getenv("ALLOW_DB_WRITES") != "1":
        print("Error: ALLOW_DB_WRITES=1 is required to write to the live database.", file=sys.stderr)
        return 1

    settings = get_settings()
    if not settings.database_url:
        print("Error: DATABASE_URL is not configured", file=sys.stderr)
        return 1

    engine = get_engine()
    with Session(engine) as db:
        if args.remove:
            remove_demo_data(db)
        else:
            seed_demo_data(db)

    return 0


if __name__ == "__main__":
    import sqlalchemy as sa
    sys.exit(main())