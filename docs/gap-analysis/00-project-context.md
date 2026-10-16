Project context (this is a standing rule for ALL future work)
- Personal project on a company-managed laptop. Docker and local Postgres are NOT available or wanted. Never add `docker-compose.yml`, Dockerfiles, or instructions requiring them.
- The database is Supabase (managed Postgres). The connection is already configured in the repo-root `.env` as `DATABASE_URL`. Never read, print, echo or log `.env` contents or the connection string (including in test output, error messages and docs). Only `.env.example` may be edited, with placeholder values.
- Alembic is the only migration tool, run against Supabase. Use the session pooler (port 5432) or direct connection for Alembic; if the app is ever deployed serverless, use the transaction pooler (6543) with prepared statements disabled. `sslmode=require`.
- Never run `alembic upgrade`, `downgrade`, or any command that changes the live database unless the owner explicitly asks. For any migration, show the SQL first (`alembic upgrade head --sql`) and wait for approval.
- Every new table: `ENABLE ROW LEVEL SECURITY` with no policies, revoke grants from `anon` and `authenticated`, and `server_default=gen_random_uuid()` on UUID PKs. Alembic autogenerate is limited to the `public` schema via `include_object`.
- Database writes are protected by an explicit guard: live migration and seed commands must refuse unless `ALLOW_DB_WRITES=1` is set in the environment for that command. The owner sets it per command; do not export or hard-code it in project scripts or tests.
- Auth, when added, is Supabase Auth (`profiles` keyed to `auth.users`; FastAPI verifies the Supabase JWT). v1 has no auth.
- Seed and demo data must be idempotent and clearly marked (for example `source='demo'`), so it can be removed without touching real rows.

Testing policy (replaces any docker/local-Postgres wording)
1. Unit and contract tests: mocked DB sessions or dependency overrides. They run with no network and no `DATABASE_URL`. This is the default `pytest -q`.
2. Integration tests: marked `@pytest.mark.integration`, excluded by default (`addopts = -m "not integration"`). They run only with `pytest -m integration`, and require an explicit `TEST_DATABASE_SCHEMA` (default `test`). They create that schema, run migrations/DDL inside it, and wrap each test in a transaction that is rolled back. They must refuse to run if the target schema is `public`.
3. Tests never write to `public` and never print connection details.
