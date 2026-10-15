All work follows `00-project-context.md`.

# 05. Sequenced backend backlog

This backlog is ordered by dependency and grouped into phases. Each item is designed to be independently shippable and aligned to a specific frontend screen or capability.

## Phase 0 — Foundations

### BE-01 — Establish runtime config and API contract basics
- Goal: Create a stable backend configuration layer, error envelope, health checks, and CORS support for the frontend while allowing a no-DB demo mode.
- Why it matters: Unblocks all screens that fetch API data and fixes the current mismatch between the Vite frontend and FastAPI backend.
- Depends on: none
- Files: `app/config.py` (new), `app/main.py` (update), `app/api.py` (update)
- Endpoint(s)/schema(s): `GET /health`, `GET /health/db`, root docs, standard error envelope
- DB changes: none
- Acceptance criteria:
  - Backend boots without a `DATABASE_URL` in demo mode and still serves `/health` and `/docs`.
  - `/health/db` returns `200` against the configured Supabase project when the DB is reachable.
  - The smoke test is run twice: once with `DATABASE_URL` unset and once with the repo `.env` value; `/health/db` stays healthy in the real environment.
  - DB-backed routes return a standard `503` error envelope `{code, message, details}` if the DB is unconfigured or unreachable, including a paused Supabase project.
  - No SQLite fallback is used; the app keeps a Postgres-only path.
  - CORS allows `http://localhost:5173` and `http://127.0.0.1:5173`.
- Test plan: unit tests for env defaults, CORS headers, error envelope serialization, 503 handling for DB outage, and the dual smoke-test flow with/without `DATABASE_URL`.
- Effort: M
- Frontend change needed afterward: update fetch code to use consistent API base URL and handle error envelope.
- Prompt: "Set up a FastAPI app config module for environment variables, CORS, a shared error envelope, and health/docs boot behavior without a database. Keep it additive and compatible with existing app/api.py. Guardrails for the agent: Follow `docs/gap-analysis/00-project-context.md`: Supabase only, no Docker, never read or print `.env`, never apply migrations without approval."

### BE-02 — Add database connection, migrations, and demo seed data
- Goal: Make the Supabase-backed Postgres connection and migration path reliable, with an idempotent demo seed for a sandbox workspace and assessment.
- Why it matters: All real screens eventually need persistent workspace and assessment state; the current backend has only a basic ORM and a single migration.
- Depends on: BE-01
- Files: `app/database.py` (update), `alembic/env.py` (update), `alembic/versions/*.py` (new), `tests/seed_demo_data.py` (new)
- Endpoint(s)/schema(s): no public endpoints yet; DB init and migration commands
- DB changes: additive seed tables for workspace, demo assessment, and a migration plan preserving existing tables
- Acceptance criteria:
  - Alembic runs against the configured Supabase project in `.env` via the session pooler or direct connection with `sslmode=require`.
  - Seed script creates at least one workspace, one assessment, and a sample opportunity catalog row, and marks those rows `source='demo'` so they can be removed cleanly.
  - Existing `assessments` and `opportunity_rankings` tables remain untouched.
  - Every new table gets `ENABLE ROW LEVEL SECURITY` with no policies and all privileges revoked from `anon` and `authenticated`.
  - Migration SQL is reviewed via `alembic upgrade head --sql`; any apply is postponed until explicit owner approval.
  - Regression test ensures the current double-subtraction bug in `app/roi_engine.py` fails before the fix and is updated when `scoring_engine_version` is bumped.
  - No secrets are printed in logs or test output.
- Test plan: migration smoke tests; seed script idempotence; database initialization test; regression test for `annual_net_benefit` subtraction bug; no-network mocked tests by default.
- Effort: M
- Frontend change needed afterward: none until seeded data is exposed via API.
- Prompt: "Create a Supabase-ready Alembic migration plan and idempotent seed script for a sample workspace and assessment, using the project config in `.env` and the session pooler/direct connection. Preserve current tables, add RLS on all new tables, and include a regression test for the double-subtraction ROI bug before the scoring logic is corrected. Guardrails for the agent: Follow `docs/gap-analysis/00-project-context.md`: Supabase only, no Docker, never read or print `.env`, never apply migrations without approval."

## Phase 1 — Assessment workflow and wizard data

### BE-03 — Align assessment API to the frontend wizard schema
- Goal: Replace the current generic ROI-only input model with a wizard-compatible assessment schema matching the prototype.
- Why it matters: This unblocks the new assessment flow and makes the API coherent with the six-step form.
- Depends on: BE-01, BE-02
- Files: `app/api.py` (update), `app/models.py` (update or new), `tests/test_api.py` (update)
- Endpoint(s)/schema(s): `POST /api/v1/assessments`, `PATCH /api/v1/assessments/{id}`, `GET /api/v1/assessments`, `GET /api/v1/assessments/{id}`
- DB changes: extend `assessments` with `workspace_id`, `status`, `wizard_input`, `updated_at`, `source`, `currency`; no `assessment_runs` table
- Acceptance criteria:
  - `POST /api/v1/assessments` accepts only the wizard fields and rejects the legacy ROI payload.
  - `PATCH /api/v1/assessments/{id}` saves draft progress and updates `updated_at`.
  - Response payload includes `id`, `status`, `currency`, and the stored wizard input, not just ROI numbers.
  - Validation errors are field-specific and stable.
  - Migration SQL is reviewed via `alembic upgrade head --sql`; any apply is postponed until explicit owner approval.
  - RLS is enabled for all new tables and no secrets are printed in logs.
- Test plan: contract tests for wizard payload, patch payload, and list/get response objects.
- Effort: L
- Frontend change needed afterward: frontend can wire the six-step form to real API calls and save draft progress between steps.
- Prompt: "Update the assessment API to accept the 6-step wizard payload used by the frontend and add a patch endpoint for saving draft progress. Keep the legacy ROI-only model in a separate `/api/v1/roi/quick` endpoint, not the assessment create route. Guardrails for the agent: Follow `docs/gap-analysis/00-project-context.md`: Supabase only, no Docker, never read or print `.env`, never apply migrations without approval."

### BE-04 — Persist assessment answers, statuses, and summary data for history screens
- Goal: Store each assessment’s step answers and summary rows so the history screen can display status, top opportunity, and value potential.
- Why it matters: The Assessments history table expects status and summary metrics, and current backend only stores a generic ROI payload.
- Depends on: BE-03
- Files: `app/models.py` (update), `alembic/versions/*.py` (new), `app/api.py` (update), `tests/test_api.py` (update)
- Endpoint(s)/schema(s): `GET /api/v1/assessments`, `GET /api/v1/assessments/{id}`
- DB changes: extend the existing `assessments` table; no `assessment_answers` or `assessment_runs` tables
- Acceptance criteria:
  - History endpoint returns status, date, opportunity count, value potential, and top opportunity.
  - Full assessment details include the wizard payload and the current one-page summary.
  - In-progress and completed states are persisted and queryable.
  - The API keeps legacy `input_data` and `roi_results` columns intact for older rows.
  - Migration SQL is reviewed via `alembic upgrade head --sql`; any apply is postponed until explicit owner approval.
  - RLS is enabled for all new tables and no secrets are printed in logs.
- Test plan: seed a completed and in-progress assessment; verify list filtering and summary metrics.
- Effort: M
- Frontend change needed afterward: history screen can sort and search by server-backed fields instead of mock data.
- Prompt: "Add persisted status and draft wizard storage for business assessments. Return a summary object for the assessments list and full details for single-assessment fetches without introducing a second assessment table model. Guardrails for the agent: Follow `docs/gap-analysis/00-project-context.md`: Supabase only, no Docker, never read or print `.env`, never apply migrations without approval."

## Phase 2 — Opportunity scoring and results output

### BE-05 — Build a real opportunity catalog and scoring service
- Goal: Replace hardcoded opportunity ranking logic with a scored catalog derived from assessment answers and business profile.
- Why it matters: Overview, opportunities list, and detail pages all rely on real opportunity objects and priority scores.
- Depends on: BE-03
- Files: `app/opportunity_engine.py` (rewrite), `app/models.py` (new tables as needed), `app/api.py` (update), `tests/test_opportunity_engine.py` (update)
- Endpoint(s)/schema(s): `GET /api/v1/assessments/{assessment_id}/opportunities`, `GET /api/v1/opportunities/{id}`
- DB changes: `opportunity_catalog`, `assessment_opportunities`, `scoring_policy_version` on scored rows
- Acceptance criteria:
  - Engine produces at least the 5 frontend opportunity types or a superset that includes them.
  - Each opportunity includes function, impact, feasibility, effort, priority score, and estimated benefits.
  - Scores and ranking are deterministic and testable from given inputs.
  - Catalog entries may be global (`workspace_id` null) or workspace-specific.
  - Migration SQL is reviewed via `alembic upgrade head --sql`; any apply is postponed until explicit owner approval.
  - RLS is enabled for all new tables and no secrets are printed in logs.
- Test plan: score threshold tests, ranking order tests, and serialization tests for API payloads.
- Effort: L
- Frontend change needed afterward: results screen can render dynamic data and filter by function/effort.
- Prompt: "Create a reusable opportunity catalog and scoring engine that maps assessment answers to scored opportunities with fields matching the UI: function, impact, feasibility, effort, investment, recurring cost, benefit, and payback. Keep weights explicit and versioned. Guardrails for the agent: Follow `docs/gap-analysis/00-project-context.md`: Supabase only, no Docker, never read or print `.env`, never apply migrations without approval."

### BE-06 — Add opportunity detail narrative content and source metadata
- Goal: Expose the narrative objects behind the opportunity detail page: problem, solution, fit, outcomes, data, risks, metrics, sources, next steps.
- Why it matters: Opportunity detail page is a major product feature and currently only uses static mock data.
- Depends on: BE-05
- Files: `app/models.py` (new), `app/api.py` (new endpoints), `tests/test_api.py` (new)
- Endpoint(s)/schema(s): `GET /api/v1/opportunities/{id}` detailed response
- DB changes: `opportunity_catalog.narrative_template` and/or assessment-opportunity narrative records; `source_reference` metadata as JSONB or explicit tables
- Acceptance criteria:
  - Detail endpoint returns text fields and source references for a valid opportunity.
  - Each narrative item is versioned or sourced from a catalog template.
  - Not-found path is clean 404 with standard error format.
  - Migration SQL is reviewed via `alembic upgrade head --sql`; any apply is postponed until explicit owner approval.
  - RLS is enabled for all new tables and no secrets are printed in logs.
- Test plan: fixture-driven narrative tests for one opportunity and one missing id.
- Effort: M
- Frontend change needed afterward: wire the opportunity detail page to backend narrative content instead of mock JSON.
- Prompt: "Create an opportunity detail API with problem, solution, fit, outcomes, data needed, risks, metrics, sources, and next steps. Keep narrative content versioned and support later LLM-generated text without breaking the API. Guardrails for the agent: Follow `docs/gap-analysis/00-project-context.md`: Supabase only, no Docker, never read or print `.env`, never apply migrations without approval."

## Phase 3 — ROI, scenarios, sensitivity, and cumulative series

### BE-07 — Rebuild ROI logic to support per-opportunity business cases and scenario inputs
- Goal: Replace the current single-scenario ROI function with a domain model that supports multiple scenario multipliers, assumptions, and explicit USD currency metadata.
- Why it matters: ROI & Business Cases needs scenarios, sensitivity, assumptions, and net/gross benefit calculations beyond the current aggregate ROI function.
- Depends on: BE-05
- Files: `app/roi_engine.py` (rewrite), `app/api.py` (add ROI endpoints), `tests/test_roi_engine.py` (update)
- Endpoint(s)/schema(s): `GET /api/v1/opportunities/{id}/roi`, `GET /api/v1/opportunities/{id}/business-cases`
- DB changes: `roi_scenarios`, `roi` scenario results linked to `assessment_opportunities`
- Acceptance criteria:
  - Supports a base case and at least two alternate scenarios.
  - Returns investment, recurring cost, gross and net benefit, payback, 3-year ROI, and 36-month cumulative benefit.
  - Uses the canonical formulas documented in doc 04 and keeps `currency = "USD"` in v1.
  - `net_annual_benefit = gross_annual_benefit - annual_recurring_cost` and `payback_months = investment / (net_annual_benefit / 12)`.
  - Migration SQL is reviewed via `alembic upgrade head --sql`; any apply is postponed until explicit owner approval.
  - RLS is enabled for all new tables and no secrets are printed in logs.
- Test plan: totals for base case; scenario variance; zero-savings and invalid-multiplier validation; regression test for double subtraction.
- Effort: L
- Frontend change needed afterward: wire ROI screen controls for scenario selection, assumption editing, and sensitivity sliders.
- Prompt: "Create a scenario-based ROI engine that accepts varying automation rate, labor cost, adoption, and recurring cost assumptions, then calculates payback, 3-year ROI, and 36-month cumulative benefit. Keep the formula single-source-of-truth and the currency explicit. Guardrails for the agent: Follow `docs/gap-analysis/00-project-context.md`: Supabase only, no Docker, never read or print `.env`, never apply migrations without approval."

## Phase 4 — Dashboard KPIs and aggregates

### BE-08 — Add KPI rollups for overview and opportunity boards
- Goal: Build the aggregate metrics used by Overview and opportunity list screens.
- Why it matters: The UI expects dashboard cards and summary numbers such as total assessments, estimated annual value, high-priority count, average payback, overall readiness, and top opportunity.
- Depends on: BE-04, BE-05, BE-07
- Files: `app/api.py` (new summary endpoints), `app/models.py` (query helpers), `tests/test_api.py` (new)
- Endpoint(s)/schema(s): `GET /api/v1/dashboard/summary`, `GET /api/v1/opportunities/summary`
- DB changes: no new schema required beyond existing queries over `assessments` and `assessment_opportunities`
- Acceptance criteria:
  - Summary endpoint returns expected counts and estimated values.
  - Values are computed from persisted records, not hardcoded mock data.
  - API supports business function grouping and readiness summary.
- Test plan: create sample data with multiple assessments and opportunity records; verify totals and averages.
- Effort: M
- Frontend change needed afterward: replace mock KPI cards and chart values with server-driven data.
- Prompt: "Add dashboard summary endpoints that aggregate assessment and opportunity metrics by function and readiness. Return high-priority count, estimated annual value, average payback, and top opportunity without hardcoded values. Guardrails for the agent: Follow `docs/gap-analysis/00-project-context.md`: Supabase only, no Docker, never read or print `.env`, never apply migrations without approval."

## Phase 5 — Roadmap generation and persistence

### BE-09 — Implement roadmap generation and persistence
- Goal: Persist roadmap items and produce implementation plans from the scored opportunity catalog.
- Why it matters: Roadmap screen is a core product page and is currently a placeholder.
- Depends on: BE-05, BE-07
- Files: `app/api.py`, `app/models.py`, `alembic/versions/*.py`, `tests/test_api.py`
- Endpoint(s)/schema(s): `GET /api/v1/roadmaps`, `POST /api/v1/roadmaps`, `GET /api/v1/roadmaps/{id}/items`
- DB changes: `roadmaps`, `roadmap_items` linked to `assessment_opportunities`
- Acceptance criteria:
  - Roadmap can be created from a workspace or assessment.
  - Each roadmap item includes title, phase, target month, status, and dependencies.
  - `assessment_opportunity_id` is used instead of a direct catalog ID.
  - Migration SQL is reviewed via `alembic upgrade head --sql`; any apply is postponed until explicit owner approval.
  - RLS is enabled for all new tables and no secrets are printed in logs.
- Test plan: create roadmap with three phases and verify dependencies serialize correctly.
- Effort: M
- Frontend change needed afterward: roadmap list and add/remove action can route to API-backed data.
- Prompt: "Implement roadmap storage and APIs for phase-based implementation planning. Each roadmap item should link to an assessment opportunity and display a phase, status, target month, and dependencies. Guardrails for the agent: Follow `docs/gap-analysis/00-project-context.md`: Supabase only, no Docker, never read or print `.env`, never apply migrations without approval."

## Phase 6 — Knowledge documents and RAG foundations

### BE-10 — Create the knowledge documents API and ingestion flow
- Goal: Expose a searchable knowledge-base layer for the Knowledge Center and later AI retrieval.
- Why it matters: The AI Consultant and the Knowledge Center both depend on stored documents and retrieval.
- Depends on: BE-01, BE-02
- Files: `app/api.py`, `app/models.py`, `alembic/versions/*.py`, `tests/test_api.py`
- Endpoint(s)/schema(s): `GET /api/v1/knowledge/documents`, `POST /api/v1/knowledge/documents:ingest`
- DB changes: `knowledge_documents`, `knowledge_chunks`, optional Supabase Storage hook for uploaded docs, `pgvector` migration in its own migration via `extensions.vector`, HNSW index definition, and RLS on all tables with no policies and revoked `anon`/`authenticated` grants
- Acceptance criteria:
  - Documents can be ingested with title, summary, tags, and source metadata.
  - Chunk retrieval is available for future vector search.
  - Duplicate ingestion is handled safely.
  - `CREATE EXTENSION IF NOT EXISTS vector;` is enabled in its own migration, not in Phase 0.
  - An HNSW index is planned for the vector column and migration order is explicit.
  - Every new table gets `ENABLE ROW LEVEL SECURITY`, no policies, and `REVOKE ALL ON TABLE ... FROM anon, authenticated`.
  - Migration SQL is reviewed via `alembic upgrade head --sql`; any apply is postponed until explicit owner approval.
  - Optional Supabase Storage is noted for uploaded knowledge documents but not required for initial ingestion.
  - No secrets are printed in logs.
- Test plan: ingest a document, chunk it, verify list response and metadata shape, validate migration order and RLS setup.
- Effort: L
- Frontend change needed afterward: knowledge center list page and document detail can render from API-backed records.
- Prompt: "Build a document ingestion API and a base knowledge schema that can later be upgraded to embeddings and vector search. Keep the initial version simple but structured for RAG, create pgvector in its own migration, add HNSW scaffolding, and enforce RLS with no policies on every related table. Guardrails for the agent: Follow `docs/gap-analysis/00-project-context.md`: Supabase only, no Docker, never read or print `.env`, never apply migrations without approval."

## Phase 7 — AI Consultant back end

### BE-11 — Add chat and conversation persistence for the AI Consultant
- Goal: Create the basic chat API, conversation model, and message persistence.
- Why it matters: AI Consultant screen is a late-phase feature but a major product differentiator; the frontend expects chat plus citations and tool metadata.
- Depends on: BE-10
- Files: `app/api.py`, `app/models.py`, `alembic/versions/*.py`, `tests/test_api.py`
- Endpoint(s)/schema(s): `POST /api/v1/ai/chat`, `GET /api/v1/ai/conversations/{id}`
- DB changes: `ai_conversations`, `ai_messages`, `ai_message_citations`
- Acceptance criteria:
  - New conversation starts with a user message and assistant response.
  - Messages persist and are retrievable.
  - Citation IDs can be attached to assistant responses.
  - Migration SQL is reviewed via `alembic upgrade head --sql`; any apply is postponed until explicit owner approval.
  - RLS is enabled for all new tables and no secrets are printed in logs.
- Test plan: create conversation, send message, verify persistence and retrieval.
- Effort: L
- Frontend change needed afterward: chat UI can submit messages, render conversation history, and show assistant citations.
- Prompt: "Create a chat API for the AI Consultant with conversation persistence, message records, and citation links. Implement a simple assistant reply flow that can later be upgraded to LLM streaming and retrieval. Guardrails for the agent: Follow `docs/gap-analysis/00-project-context.md`: Supabase only, no Docker, never read or print `.env`, never apply migrations without approval."

### BE-12 — Add retrieval, tool metadata, and structured response blocks
- Goal: Support citations, tool-use chips, and structured response blocks to match the prototype’s AI Consultant expectations.
- Why it matters: The consultant UI expects richer content than plain text; later phases require RAG and LangGraph integration.
- Depends on: BE-10, BE-11
- Files: `app/api.py` (new schema handlers), `app/services/` (new), `tests/test_api.py` (new)
- Endpoint(s)/schema(s): `POST /api/v1/ai/chat`, advanced message/response block schema
- DB changes: additive metadata in `ai_messages` and citations tables
- Acceptance criteria:
  - Assistant responses include structured blocks, citations, tool references, and source metadata.
  - Tool metadata is captured without breaking simple chat responses.
  - Migration SQL is reviewed via `alembic upgrade head --sql`; any apply is postponed until explicit owner approval.
  - RLS is enabled for all new tables and no secrets are printed in logs.
- Test plan: message payload validation for both simple text and rich structured blocks.
- Effort: L
- Frontend change needed afterward: UI can render citations, rich card blocks, and tool badges.
- Prompt: "Add structured output handling for AI Consultant responses so the API can return text blocks, tool metadata, and citations in a format the UI can render without additional transformation. Guardrails for the agent: Follow `docs/gap-analysis/00-project-context.md`: Supabase only, no Docker, never read or print `.env`, never apply migrations without approval."

## Phase 8 — Workspace, settings, auth demo, and polish

### BE-13 — Add workspace and settings APIs for shell navigation and user preferences
- Goal: Support workspace switching, settings page, and minimal user configuration.
- Why it matters: The app shell has workspace switching and settings navigation; these are stubbed in the prototype.
- Depends on: BE-01, BE-02
- Files: `app/api.py`, `app/models.py`, `alembic/versions/*.py`, `tests/test_api.py`
- Endpoint(s)/schema(s): `/api/v1/workspaces`, `/api/v1/settings`, `/api/v1/me`
- DB changes: `workspaces`, `profiles`, `workspace_memberships`, `user_settings`
- Acceptance criteria:
  - User can list workspaces and read the current workspace settings.
  - Settings updates persist and are scoped to workspace/profile.
  - Demo-mode no-auth is explicit; future JWT verification remains a separate product step.
  - Migration SQL is reviewed via `alembic upgrade head --sql`; any apply is postponed until explicit owner approval.
  - RLS is enabled for all new tables and no secrets are printed in logs.
- Test plan: create workspace and profile, read settings, update locale/currency.
- Effort: M
- Frontend change needed afterward: shell can source workspace names and user preferences from API.
- Prompt: "Implement minimal workspace and settings APIs with a clear data model for workspace membership and user preferences, keeping the auth story explicit for later production hardening. Guardrails for the agent: Follow `docs/gap-analysis/00-project-context.md`: Supabase only, no Docker, never read or print `.env`, never apply migrations without approval."

### BE-14 — Add observability, evaluation, and regression test coverage
- Goal: Establish the validation harness and monitoring needed to keep frontend and backend contracts aligned.
- Why it matters: The prototype has a broad UI contract that is easy to drift from; contract tests reduce the risk of mismatched fields and stale formulas.
- Depends on: all prior items
- Files: `tests/contract/` (new), `pytest.ini` or config (new), `app/logging.py` (new), `app/api.py` (update)
- Endpoint(s)/schema(s): all endpoints; contract snapshots
- DB changes: none
- Acceptance criteria:
  - Contract tests cover at least all public endpoints in the frontend contract.
  - API response snapshots include field names, types, and enums.
  - Logs include request IDs for API diagnostics.
  - `scoring_engine_version` is included in any scored-opportunity payload and updated whenever formulas change.
  - Unit/contract tests run via `pytest -q` with mocked DB sessions; integration tests are tagged `@pytest.mark.integration` and run with `pytest -m integration` only, using `TEST_DATABASE_SCHEMA` (default `test`) and refusing to run against `public`.
  - No connection details are printed in logs or test output.
- Test plan: end-to-end contract runs for the main flows: create assessment, patch assessment, list results, opportunity detail, ROI scenario, chat call; integration test smoke for a dedicated test schema only.
- Effort: M
- Frontend change needed afterward: none or minimal, mostly to keep UI contract stable.
- Prompt: "Create a regression and contract test harness for the TransformIQ API so each user-facing screen is validated against the backend schema and business rules. Include request IDs, structured logging, and scoring version metadata. Guardrails for the agent: Follow `docs/gap-analysis/00-project-context.md`: Supabase only, no Docker, never read or print `.env`, never apply migrations without approval."

## Summary of phases
- Phase 0: foundations and data plumbing
- Phase 1: wizard and assessment histories
- Phase 2: opportunity catalog and detail content
- Phase 3: ROI and scenario engine
- Phase 4: dashboard aggregations and KPIs
- Phase 5: roadmap planning
- Phase 6: knowledge and RAG foundations
- Phase 7: AI Consultant chat, retrieval, and tool metadata
- Phase 8: workspace, settings, and product hardening

The suggested first build order is BE-01 → BE-02 → BE-03 → BE-05 → BE-07 because it hits the highest-visibility screens earliest: new assessment, opportunity scoring, and ROI overview.
