# 02. Backend inventory

Sources reviewed:
- `app/api.py`
- `app/models.py`
- `app/database.py`
- `app/roi_engine.py`
- `app/opportunity_engine.py`
- `app/assessment.py`
- `app/main.py`
- `alembic/env.py`
- `alembic/versions/aa8bd5c84595_create_assessment_history_tables.py`
- `requirements.txt`
- `tests/*.py`

## 1) Runtime and app setup
The backend is a FastAPI application created in `app/api.py:16-20`:
- title: `TransformIQ API`
- version: `0.3.0`
- root endpoint `/`
- health endpoint `/health`

The app loads environment variables via `python-dotenv` in `app/database.py:9-15`; it reads `DATABASE_URL` and raises a runtime error if absent. The app does not configure CORS, auth middleware, or request logging. There is no `CORSMiddleware`, no JWT/auth dependency, and no `logging` setup in the application code.

## 2) Existing endpoints and contracts

### API inventory
| Method | Path | Source | Request schema | Response schema | Status codes |
| --- | --- | --- | --- | --- | --- |
| GET | `/` | `app/api.py:32-38` | none | `{ name, status, version }` | 200 |
| GET | `/health` | `app/api.py:41-43` | none | `{ status }` | 200 |
| POST | `/api/v1/assessments` | `app/api.py:46-121` | `BusinessAssessment` | `{ id, created_at, opportunities, roi, note }` | 200, 422, 500 |
| GET | `/api/v1/assessments` | `app/api.py:124-150` | query `limit`, `offset` | `{ items, limit, offset }` | 200 |
| GET | `/api/v1/assessments/{assessment_id}` | `app/api.py:153-182` | path UUID | `{ id, created_at, input_data, roi, opportunities, scoring_engine_version }` | 200, 404 |

### Request schema: `BusinessAssessment`
Defined in `app/api.py:23-29`:

```python
class BusinessAssessment(BaseModel):
    monthly_queries: int = Field(ge=0)
    minutes_per_query: float = Field(ge=0)
    hourly_labor_cost: float = Field(ge=0)
    automation_rate: float = Field(ge=0, le=1)
    implementation_cost: float = Field(ge=0)
    monthly_ai_cost: float = Field(default=0, ge=0)
```

This is a narrow ROI/automation model and not aligned with the frontend wizard fields in `frontend/src/routes/assessments.new.tsx`.

### Response behavior
- `POST /api/v1/assessments` persists an `Assessment` row and a list of `OpportunityRanking` rows.
- Returns only simplified `opportunities: [{ name, score }]` plus `roi` summary.
- No nested business profile, assessment answers, or complete opportunity detail payloads are returned.
- The `note` field tells the client the figures are illustrative and that opportunity rankings are based on preliminary rule-based criteria.

## 3) Pydantic models and SQLAlchemy models
### Pydantic models
Only one Pydantic model exists: `BusinessAssessment` (`app/api.py:23-29`). The backend does not define separate request/response models for:
- assessment creation with business metadata
- opportunity detail
- ROI scenarios
- chat messages
- roadmap items
- knowledge docs
- settings

### ORM models
`app/models.py:19-75` defines:

- `Assessment` table (`assessments`)
  - `id` UUID PK
  - `input_data` JSONB
  - `roi_results` JSONB
  - `scoring_engine_version` String(30)
  - `created_at` DateTime(timezone=True)
  - relationship: `rankings`

- `OpportunityRanking` table (`opportunity_rankings`)
  - `id` Integer PK
  - `assessment_id` UUID FK -> `assessments.id` with cascade delete
  - `opportunity_name` String(200)
  - `score` Float
  - `rank` Integer
  - `details` JSONB

This is a minimal historical storage model; it does not capture workspace membership, assessment answers, scenarios, public documents, or conversational state.

## 4) Services and engine logic

### 4.1 Opportunity scoring engine
`app/opportunity_engine.py:7-126`

Core dataclass:
```python
@dataclass(frozen=True)
class Opportunity:
    name: str
    business_impact: int
    feasibility: int
    strategic_alignment: int
    implementation_effort: int
    risk: int
```

Scoring formula (`app/opportunity_engine.py:17-40`):
```python
score = (
    opportunity.business_impact / 5 * 40
    + opportunity.feasibility / 5 * 25
    + opportunity.strategic_alignment / 5 * 20
    + (6 - opportunity.implementation_effort) / 5 * 10
    + (6 - opportunity.risk) / 5 * 5
)
```

The engine accepts only five numeric inputs and ensures each is between 1 and 5.

`assess_ecommerce_opportunities()` (`app/opportunity_engine.py:56-125`) derives a small set of opportunities using basic support-workload heuristics:
- `support_workload = monthly_queries * minutes_per_query`
- `support_cost = support_workload / 60 * hourly_labor_cost`
- `support_impact = min(5, max(1, round(support_cost / 100_000) + 1))`
- `support_feasibility = 5 if automation_rate >= 0.5 else 4 if automation_rate >= 0.25 else 3`

It returns three hardcoded opportunity names:
- `Customer Support Automation`
- `Lead Qualification`
- `Invoice Processing`

There is no connection to the frontend’s mock opportunity catalog (e.g., inventory optimization, recommendations, financial reporting, content generation), and no path to generate business-problem or solution narratives beyond a generic score payload.

### 4.2 ROI engine
`app/roi_engine.py:7-59`

`calculate_roi()` accepts:
- `monthly_queries`
- `minutes_per_query`
- `hourly_labor_cost`
- `automation_rate`
- `implementation_cost`
- `monthly_ai_cost = 0.0`

Formula in `app/roi_engine.py:31-59`:
```python
monthly_labor_cost = monthly_queries * minutes_per_query / 60 * hourly_labor_cost
monthly_gross_savings = monthly_labor_cost * automation_rate
monthly_net_savings = monthly_gross_savings - monthly_ai_cost
annual_net_benefit = monthly_net_savings * 12
payback_months = implementation_cost / monthly_net_savings if monthly_net_savings > 0 else None
```

Important logic detail: `annual_net_benefit` is calculated as `monthly_net_savings * 12` and then the code subtracts implementation cost again when returning the dataclass (`app/roi_engine.py:50-59`). This means the ROI result is not just a pure annual benefit; it is `annual net benefit after one-time cost` and is not described in the API docs or frontend naming.

## 5) Database access and persistence
- `app/database.py:9-18` loads `DATABASE_URL` and creates SQLAlchemy `create_engine()` with `pool_pre_ping=True`.
- `SessionLocal` is configured in `app/database.py:18-26`.
- `get_db()` yields a session and closes it in a `finally` block (`app/database.py:34-40`).
- There is no Supabase client or direct Supabase access in the codebase.
- The default test path is mocked DB/session-based coverage rather than a live project connection; the project’s managed Postgres configuration is treated as a Supabase-backed environment, and the test policy keeps writes and integration checks inside a dedicated test schema without touching `public`.
- `alembic/env.py:18-25` reads `DATABASE_URL` and configures Alembic to use it.
- `alembic/versions/aa8bd5c84595_create_assessment_history_tables.py:21-52` creates the two tables created by the app.

## 6) Settings, env usage, config
- `DATABASE_URL` is the only backend env key referenced in application code (`app/database.py:11` and `alembic/env.py:18`).
- Frontend `.env.example` contains `VITE_API_BASE_URL=http://localhost:8000` (`frontend/.env.example:1`).
- No `.env` values are committed to source control; a `.env` file exists in the repo root but was not read for its contents.
- No auth secrets, OAuth config, or provider API keys are defined anywhere else in the application code reviewed.

## 7) Error handling and API semantics
Current error handling is basic and inconsistent:
- Validation errors from pydantic are automatic 422 responses from FastAPI.
- `create_assessment()` catches `ValueError` and raises `HTTPException(status_code=422, detail=str(exc))` (`app/api.py:113-115`).
- `SQLAlchemyError` becomes `HTTPException(status_code=500, detail="Unable to save assessment. Please try again.")` (`app/api.py:116-121`).
- Missing record on GET by UUID returns 404 (`app/api.py:165-166`).

There is no global exception handler, no standardized error envelope, no pagination metadata, and no validation envelope beyond raw `detail` strings.

## 8) CORS, auth, logging
Not found in the current backend review:
- No `CORSMiddleware` in FastAPI app startup
- No user/session auth
- No JWT or API key enforcement
- No `logging.basicConfig` or structured loggers
- No request correlation ID setup

As a result, the backend is not yet suitable for a multi-user SaaS front end, but it is sufficient to serve a prototype local-mode workflow.

## 9) Test coverage
Tests are in `tests/` and cover the core engines and assessment API.

Files:
- `tests/test_opportunity_engine.py` — scoring, ranking, validation, support workload behavior
- `tests/test_roi_engine.py` — ROI math, zero-savings edge case, invalid automation rate
- `tests/test_api.py` — root and health checks, `POST /api/v1/assessments`, history list, fetch-by-ID, not-found, database failure, validation errors

Observed coverage status:
- The deterministic math paths are tested.
- The API layer uses mocked DB session objects rather than a live database.
- There are no tests for CORS, auth, exported schemas, or frontend-compatible payload formats.
- There are no tests for new user journeys such as wizard submission, mutual schema mismatch, ROI scenarios, or assistant chat endpoints.

## 10) Half-built or dead code
- `app/assessment.py` (`app/assessment.py:1-46`) is a script that prints ranked opportunities and ROI. It is not exposed as an API and appears to be a demo script, not active runtime logic.
- `app/main.py` (`app/main.py:1-31`) is a CLI sample that prints ROI values for a fixed scenario. It is not used by the app or the tests.
- `README.md` mentions roadmap milestones like “AI-powered implementation roadmap generation,” “Interactive analytics dashboard,” and “LangGraph,” but those features are not implemented.
- The app appears structurally ready to add more modules, but no chat, roadmap, knowledge, or settings APIs exist yet.

## 11) Current backend gap relative to frontend prototype
The backend is currently a narrow assessment engine, not a product backend. It supports:
- simple assessment submission
- list/fetch by ID
- deterministic ROI and opportunity scoring

It does not yet support the product screens built in the frontend, including:
- assessment wizard fields from the prototype
- opportunity narratives, sources, and detail content
- ROI scenarios and sensitivity analysis
- roadmap persistence and generation
- knowledge center documents
- AI consultant chat and streaming responses
- settings/workspace data
- user auth or workspace-scoped isolation
