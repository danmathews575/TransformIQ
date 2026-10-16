# Project context (standing rules for ALL future work)

## Git workflow (solo project, main only)
- This is a solo personal project. Work ONLY on the `main` branch, in the primary repo checkout.
- Never create branches, feature branches, or git worktrees. Never run `git worktree add`, `git checkout -b`, `git switch -c`, or `git branch <name>`.
- Never ask whether to use a branch or worktree. The answer is always: work directly in `main`.
- If your tool or environment wants to isolate tasks in a worktree or new branch, disable or ignore that behavior. If you cannot, STOP and tell the owner rather than proceeding in a worktree.
- Before any task, confirm `git rev-parse --abbrev-ref HEAD` prints `main` and `git rev-parse --show-toplevel` is the primary checkout, not a path under a `.worktrees` directory. If either is false, STOP and report.
- Do not commit or push unless the owner asks. When asked, commit directly to `main`.
- Never run `git reset --hard`, `git clean`, `git push --force`, `git branch -D` or delete worktrees/branches without explicit owner approval.

## Environment
- Personal project on a company-managed laptop. Docker and local Postgres are NOT available or wanted. Never add `docker-compose.yml`, Dockerfiles, or instructions requiring them.
- The database is Supabase (managed Postgres). The connection is already configured in the repo-root `.env` as `DATABASE_URL`. Never read, print, echo or log `.env` contents or the connection string (including in test output, error messages and docs). Only `.env.example` may be edited, with placeholder values.
- Alembic is the only migration tool, run against Supabase. Use the session pooler (port 5432) or direct connection for Alembic; if the app is ever deployed serverless, use the transaction pooler (6543) with prepared statements disabled. `sslmode=require`.
- Auth, when added, is Supabase Auth (`profiles` keyed to `auth.users`; FastAPI verifies the Supabase JWT). v1 has no auth.

## Live database safety (approval gates)
- The live Supabase database is shared by dev and demo data, so treat every write as production.
- `ALLOW_DB_WRITES=1` is required for online `alembic upgrade`/`downgrade`/`stamp` and for `scripts/seed_demo.py`. **The agent never sets `ALLOW_DB_WRITES`.** The owner sets it per command.
- Never run `alembic upgrade`, `downgrade`, `stamp`, the seed script, or any INSERT/UPDATE/DELETE/DDL against the live database unless the owner has explicitly replied "approved apply" for that specific step.
- Phase A (prepare) never touches the live DB. For any migration, generate the SQL offline (`alembic upgrade head --sql`), save it under `docs/gap-analysis/migrations-preview/`, then STOP and wait for approval. Do not apply "just to verify".
- Before any approved apply, run read-only `alembic current` and record the row counts of affected tables. After applying, recheck the counts and confirm nothing unexpected changed.
- If an action is not clearly authorized, do not do it. Stop and ask.
- Report accurately. Any statement such as "no database-modifying command was run" must be true, and any live-DB command that was run must be disclosed, with when and why.

## Schema rules
- Every new table: `ENABLE ROW LEVEL SECURITY` with no policies, revoke grants from `anon` and `authenticated`, and `server_default=gen_random_uuid()` on UUID PKs. Alembic autogenerate is limited to the `public` schema via `include_object`.
- Seed and demo data must be idempotent and clearly marked (for example `source='demo'`), so it can be removed without touching real rows. Remember that a unique constraint does not dedupe NULLs, so seeds need an explicit existence check.

## Testing policy (replaces any docker/local-Postgres wording)
1. Unit and contract tests: mocked DB sessions or dependency overrides. They run with no network and no `DATABASE_URL`. This is the default `pytest -q`.
2. Integration tests: marked `@pytest.mark.integration`, excluded by default (`addopts = -m "not integration"`). They run only with `pytest -m integration`, and require an explicit `TEST_DATABASE_SCHEMA` (default `test`). They create that schema, run migrations/DDL inside it, and wrap each test in a transaction that is rolled back. They must refuse to run if the target schema is `public`.
3. Tests never write to `public` and never print connection details.
4. Tests must not depend on a hardcoded absolute path. Derive paths from `Path(__file__)`.