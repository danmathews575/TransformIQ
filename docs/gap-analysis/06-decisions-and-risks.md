# 06. Open decisions and risks

## Resolved decisions

### 1) Currency policy (Resolved)
Outcome: USD only for v1, with a currency-neutral schema and a `currency` field on `assessments` and money payloads. INR, FX, and rate-card logic are deferred; the data model names remain neutral (`investment`, `recurring_cost`, `gross_annual_benefit`, `net_annual_benefit`, etc.) while the app returns `USD` in v1.
- Blocks: BE-07, BE-08, BE-13, plus all ROI, dashboard, settings, and report screens.

### 2) Narrative text strategy (Open)
Question: Should opportunity narratives be stored as static templates in a database, generated through an LLM, or a hybrid model?
- Options:
  - A. Fully static templates per opportunity type and business function.
  - B. LLM-generated text at runtime based on assessment input.
  - C. Hybrid: store canonical structure and templates, then use LLM for narrative polishing.
- Recommendation: C. Maintain structured opportunity metadata plus static blocks for problem/solution/fit, then let the LLM fill or refine them later. This reduces hallucination risk and preserves traceability for the UI.
- Blocks: BE-06, BE-09, BE-11, BE-12, and any AI consultant or roadmap workflow.

### 3) Scoring weights and formula ownership (Resolved)
Outcome: The backend owns the formula and exposes weights as config or a versioned scoring policy; the frontend consumes the API values, not its own hidden formula. The scoring logic lives on the assessment-backed opportunity results, not the static catalog alone.
- Blocks: BE-05, BE-08, BE-14, plus any screen displaying priority score or readiness.

### 4) Scenario multiplier ownership (Resolved)
Outcome: Frontend may send assumption edits, but the backend is the system of record for all scenario math, including multipliers, sensitivity sweeps, and cumulative series. Scenario outputs are persisted on `roi_scenarios` and linked to `assessment_opportunities`.
- Blocks: BE-07, BE-08, ROI pages, business case pages.

### 5) Auth scope for v1 demo (Resolved)
Outcome: v1 stays no-auth; the data model supports future Supabase JWT verification via `workspace_memberships` and `profiles` tables without forcing auth early. `user_id` columns remain nullable UUIDs; `profiles.id` maps to Supabase `auth.users` in the future.
- Blocks: BE-13 and later workspace/user features.

### 6) Embedding model and vector search (Resolved)
Outcome: Vector support is deferred until the pgvector extension is verified in the managed Postgres environment. The app adds vector-ready schema in BE-10, but the actual vector index and embedding workflow are enabled only after environment validation.
- Blocks: BE-10, BE-11, BE-12.

### 7) Supabase project strategy for prod (Open)
Question: Do we want a second Supabase project for production later, or do we keep a single project with stricter guardrails and a clear separation of dev/demo data?
- Options:
  - A. Single project now; add a dedicated prod project later when usage and constraints are clearer.
  - B. Dedicated prod project from day one.
  - C. Keep one project and enforce stricter dev/demo isolation, schema testing, and approval gates.
- Recommendation: A for now, with a clear migration plan to a second project later if business usage grows. This is not blocking the backlog and should not be treated as a v1 requirement.
- Blocks: none in the current backlog; it becomes relevant for deployment and production hardening.

### 8) LLM provider and hosting choice (Open)
Question: Which LLM provider and host environment will power AI Consultant and other generated narratives?
- Options:
  - A. OpenAI or Azure OpenAI
  - B. Anthropic / Bedrock / Vertex
  - C. Local/self-hosted/open-source model
- Recommendation: A or B, depending enterprise constraints; choose one provider and define a provider abstraction early. Avoid mixing provider-specific logic into route handlers.
- Blocks: BE-06, BE-11, BE-12.

## Top risks

### Risk 1: mismatched scoring definitions
The frontend uses mock outputs such as priority score, impact level, feasibility percentage, payback months, and estimated value, while the backend has to define a canonical scoring policy for assessment-backed opportunities. If the definitions drift, UI and API can diverge in a way that feels “correct” but is mathematically inconsistent.
- Impact: high
- Mitigation: use a versioned scoring policy in the backend; store `scoring_policy_version` on `assessment_opportunities` and add contract tests.

### Risk 2: mock numbers have no defensible formula
The mock data file hardcodes numbers such as `priorityScore`, `grossAnnualBenefitUSD`, `netAnnualBenefitUSD`, and `overallReadinessPct`. The exact calculations are not transparent, which makes the numbers easy to challenge during product review.
- Impact: high
- Mitigation: define the formula and required inputs in the API contract; the backend must own them. Step 0 confirmed there are no gross-recurring mismatches in the mock opportunities, but several `paybackMonths` values are rounded integer displays rather than exact formula values.

### Risk 3: pgvector / Supabase extension not verified (Low)
The future knowledge and AI retrieval work assumes pgvector support. The current codebase does not yet verify the managed Postgres environment or index performance characteristics, so the vector layer should be introduced intentionally in BE-10 rather than assumed in Phase 0.
- Impact: low
- Mitigation: enable the extension in a dedicated migration, validate the environment in a sandbox project, and maintain a vector-ready schema without blocking the rest of the roadmap.

### Risk 4: data model drift between frontend and backend
The frontend wizard collects a six-step object with a large number of fields, while the backend historically accepted a narrow ROI-only model. This is still the main domain risk without a canonical assessment schema and versioning policy.
- Impact: high
- Mitigation: canonicalize the wizard contract, persist it on `assessments.wizard_input`, and keep `POST /api/v1/assessments` wizard-only.

### Risk 5: live-DB blast radius: dev and demo data share one Supabase project
The product will likely share a single Supabase project across local dev, shared demo data, and possibly some early test use. That means a careless migration or a mistaken seed script can affect data that is not clearly separated from real product rows.
- Impact: high
- Mitigation: keep all new tables behind RLS, `source='demo'` markers for seed data, a dedicated `test` schema for integration tests, and approval-gated migration review with `alembic upgrade head --sql` before any apply.

### Risk 6: free-tier project pausing
The managed Supabase project can pause on a free or low-usage tier, which makes the app unavailable even though the code is healthy. This is a real-world outage mode and not a code bug.
- Impact: medium
- Mitigation: treat paused-project outages as a 503 case in the app, prefer the `/health/db` check, and keep demo/test flows isolated from the live project. The app should not silently fall back to SQLite.

### Risk 7: no standard error format or pagination strategy
The current backend returns raw `detail` strings and simple limit/offset semantics, but the prototype expects a more stable product API. This will matter as soon as the frontend starts calling real data.
- Impact: medium
- Mitigation: define a shared error envelope `{code, message, details}` and a consistent list contract with filters/sorts in the backend before wiring screens.

## Recommended immediate actions
1. Finalize the canonical wizard assessment schema and keep the legacy ROI model in `/api/v1/roi/quick` only.
2. Build BE-01 → BE-02 → BE-03 → BE-05 → BE-07 as the first execution path.
3. Keep LLM-generated narratives and RAG/vector work behind the assessment and knowledge-layer foundation, not in Phase 0.
