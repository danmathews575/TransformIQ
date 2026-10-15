# 04. Proposed target API and data model

This section proposes the backend contract the frontend prototype needs, without implementing it.

## Testing policy (enforced)

1. Unit and contract tests: mocked DB sessions or dependency overrides. They run with no network and no `DATABASE_URL`. This is the default `pytest -q`.
2. Integration tests: marked `@pytest.mark.integration`, excluded by default (`addopts = -m "not integration"`). They run only with `pytest -m integration`, and require an explicit `TEST_DATABASE_SCHEMA` (default `test`). They create that schema, run migrations/DDL inside it, and wrap each test in a transaction that is rolled back. They must refuse to run if the target schema is `public`.
3. Tests never write to `public` and never print connection details.

## 1) Target endpoint list and status

| Endpoint | Method | Status | Notes |
| --- | --- | --- | --- |
| `/health` | GET | EXISTS | Keep as-is. |
| `/api/v1/assessments` | POST | PARTIAL | Accepts only the wizard schema; the legacy ROI-only payload moved to `/api/v1/roi/quick`. |
| `/api/v1/assessments` | GET | PARTIAL | Returns assessment list data; still needs workspace-aware sorting/filtering. |
| `/api/v1/assessments/{id}` | GET | PARTIAL | Returns assessment detail and summary data; not fully aligned with the wizard. |
| `/api/v1/assessments/{id}` | PATCH | MISSING | Saves draft wizard progress without creating a separate assessment-runs model. |
| `/api/v1/roi/quick` | POST | PARTIAL | Legacy ROI-only payload retained for demos and backward compatibility only. |
| `/api/v1/workspaces` | GET/POST | MISSING | Needed for shell/workspace support. |
| `/api/v1/workspaces/{id}/assessments` | GET | MISSING | Workspace-scoped assessment history. |
| `/api/v1/assessments/{assessment_id}/opportunities` | GET | MISSING | Returns rows from `assessment_opportunities` for a given assessment. |
| `/api/v1/opportunities/{id}` | GET | MISSING | Uses the `assessment_opportunities` id, not the catalog id. |
| `/api/v1/opportunities/{id}/roi` | GET | MISSING | Needed for scenario and ROI detail views. |
| `/api/v1/opportunities/{id}/business-cases` | GET/POST | MISSING | Needed for ROI scenarios and sensitivity inputs. |
| `/api/v1/roadmaps` | GET/POST | MISSING | Needed for roadmap page and add-to-roadmap actions. |
| `/api/v1/roadmaps/{id}/items` | GET/POST | MISSING | Needed for phased milestones. |
| `/api/v1/knowledge/documents` | GET | MISSING | Needed for the Knowledge Center. |
| `/api/v1/knowledge/documents:ingest` | POST | MISSING | Needed for ingestion and later RAG foundation. |
| `/api/v1/ai/chat` | POST | MISSING | Needed for AI Consultant. |
| `/api/v1/ai/conversations/{id}` | GET | MISSING | Needed for thread history. |
| `/api/v1/settings` | GET/PATCH | MISSING | Needed for settings page. |
| `/api/v1/me` | GET | MISSING | Needed for user profile and workspace membership. |

## 2) Pydantic-style request/response objects

```python
class AssessmentWizardInput(BaseModel):
    business_name: str
    industry: str
    business_model: Literal["D2C", "B2B", "Marketplace", "Hybrid"]
    company_size: Literal["Small", "Mid-size", "Large"]
    revenue_band: Literal["Under $1M", "$1M-$10M", "$10M-$25M", "$25M+"]
    employees: int
    market: str
    website: str | None = None
    sales_channels: list[str]
    order_volume_band: str
    inventory_system: str
    customer_service_stack: str
    marketing_stack: str
    logistics_stack: str
    finance_stack: str
    bottlenecks: list[str]
    bottleneck_notes: str | None = None
    ecommerce_platform: str
    crm_erp: str
    analytics_tools: str
    data_quality: Literal["Poor", "Fair", "Good", "Excellent"]
    existing_ai_automation: str
    top_challenges: list[str]
    goals: str
    budget_band: Literal["Under $50K", "$50K-$100K", "$100K-$250K", "$250K+"]
    timeline_band: Literal["Under 3 months", "3-6 months", "6-12 months", "12+ months"]
    technical_readiness: Literal["Low", "Medium", "High"]
    risk_tolerance: Literal["Conservative", "Moderate", "Aggressive"]
    build_vs_buy: Literal["Build in-house", "Buy / partner", "Not sure"]

class AssessmentCreateRequest(BaseModel):
    workspace_id: UUID | None = None
    name: str
    wizard_input: AssessmentWizardInput
    source: Literal["wizard", "import", "demo"] = "wizard"
    currency: Literal["USD"] = "USD"

class AssessmentPatchRequest(BaseModel):
    name: str | None = None
    status: Literal["Draft", "In progress", "Completed", "Archived"] | None = None
    wizard_input: AssessmentWizardInput | None = None
    currency: Literal["USD"] | None = None

class AssessmentSummary(BaseModel):
    id: UUID
    workspace_id: UUID | None
    name: str
    created_at: datetime
    updated_at: datetime
    status: Literal["Draft", "In progress", "Completed", "Archived"]
    opportunity_count: int
    estimated_value: Decimal | None
    top_opportunity_name: str | None
    source: Literal["wizard", "import", "demo"]
    currency: Literal["USD"]

class OpportunityCatalogItem(BaseModel):
    id: UUID
    workspace_id: UUID | None
    function_name: str
    name: str
    impact: Literal["High", "Medium", "Low"]
    effort: Literal["Low", "Medium", "High"]
    feasibility_pct: Decimal | None
    priority_score: Decimal | None
    category: str | None
    narrative_template: dict[str, Any]
    default_assumptions: dict[str, Any]

class AssessmentOpportunity(BaseModel):
    id: UUID
    assessment_id: UUID
    catalog_id: UUID | None
    rank: int
    impact: Literal["High", "Medium", "Low"]
    effort: Literal["Low", "Medium", "High"]
    feasibility_pct: Decimal
    priority_score: Decimal
    investment: Decimal
    recurring_cost: Decimal
    gross_annual_benefit: Decimal
    net_annual_benefit: Decimal
    payback_months: Decimal | None
    readiness_score: Decimal | None
    scoring_policy_version: str
    inputs_snapshot: dict[str, Any]
    created_at: datetime

class OpportunityDetail(BaseModel):
    id: UUID
    name: str
    function_name: str
    summary: str
    problem: str
    solution: str
    why_it_fits: str
    outcomes: list[str]
    required_data: list[str]
    risks: list[str]
    success_metrics: list[str]
    sources: list["SourceReference"]
    next_steps: list[str]
    opportunity: AssessmentOpportunity

class SourceReference(BaseModel):
    title: str
    publisher: str
    url: str | None = None
    excerpt: str | None = None

class QuickROIRequest(BaseModel):
    monthly_queries: int
    minutes_per_query: float
    hourly_labor_cost: Decimal
    automation_rate: Decimal = Field(..., ge=0, le=1)
    implementation_cost: Decimal
    monthly_ai_cost: Decimal = Decimal("0")

class QuickROIResponse(BaseModel):
    monthly_labor_cost: Decimal
    monthly_gross_savings: Decimal
    monthly_recurring_cost: Decimal
    monthly_net_savings: Decimal
    annual_net_benefit: Decimal
    payback_months: Decimal | None
    currency: Literal["USD"] = "USD"

class ScenarioInput(BaseModel):
    adoption_multiplier: Decimal = Field(default=1, ge=0)
    labor_multiplier: Decimal = Field(default=1, ge=0)
    benefit_multiplier: Decimal = Field(default=1, ge=0)
    automation_rate: Decimal = Field(default=0.3, ge=0, le=1)
    recurring_cost_multiplier: Decimal = Field(default=1, ge=0)

class ROIResult(BaseModel):
    opportunity_id: UUID
    scenario_name: str
    investment: Decimal
    recurring_cost: Decimal
    gross_benefit: Decimal
    net_benefit: Decimal
    payback_months: Decimal | None
    roi_3y_pct: Decimal
    cumulative_benefit_36m: Decimal
    sensitivity: dict[str, Decimal]
    currency: Literal["USD"] = "USD"

class RoadmapItem(BaseModel):
    id: UUID
    title: str
    phase: Literal["Foundation", "Pilot", "Scale", "Optimize"]
    status: Literal["Planned", "In progress", "Complete"]
    target_month: int | None
    assessment_opportunity_id: UUID | None = None
    dependencies: list[str] = []

class KnowledgeDocument(BaseModel):
    id: UUID
    title: str
    summary: str
    source_type: Literal["article", "playbook", "vendor", "internal"]
    url: str | None = None
    tags: list[str] = []
    chunk_count: int
    updated_at: datetime

class ChatMessage(BaseModel):
    id: UUID
    role: Literal["user", "assistant", "tool"]
    content: str
    tool_name: str | None = None
    citations: list[SourceReference] = []
    metadata: dict[str, Any] = {}
    created_at: datetime

class ChatRequest(BaseModel):
    conversation_id: UUID | None = None
    message: str
    assessment_opportunity_id: UUID | None = None
    context: dict[str, Any] = {}

class Settings(BaseModel):
    workspace_id: UUID | None
    currency: Literal["USD"] = "USD"
    locale: str = "en-US"
    default_assessment_template: str | None = None
    notifications_enabled: bool = True
```

## 3) Financial definitions

These formulas are the single source of truth for ROI and opportunity output. The frontend may render them, but the backend owns the math.

```python
net_annual_benefit = gross_annual_benefit - annual_recurring_cost
year1_net = net_annual_benefit - investment
payback_months = investment / (net_annual_benefit / 12) if net_annual_benefit > 0 and investment > 0 else None
roi_3y_pct = (((3 * net_annual_benefit) - investment) / investment) * 100 if investment > 0 else None
```

Notes:
- `roi_3y_pct` is a percentage value in v1, not a ratio; the formula above multiplies the ratio by 100 before returning it.
- If `investment == 0`, return `roi_3y_pct = None` and `payback_months = None` because the denominator is zero.
- If `net_annual_benefit <= 0`, return `payback_months = None`; the ROI can still be negative if `investment > 0`, but the payback period is undefined in v1.
- `net_annual_benefit` excludes one-time implementation cost; that cost remains in `investment` and is used for payback/3-year ROI.
- API returns `payback_months` as a decimal rounded to 1 dp; the UI may round again for display, but the API contract keeps the underlying decimal value.
- The 3-year ROI is undiscounted and uses no ramp-up in v1; this is a simplification for the initial product.
- v1 uses `currency = "USD"` and money fields remain currency-neutral in naming.
- All amounts are `Decimal` / PostgreSQL `NUMERIC` values.

## 4) Legacy data note

Existing `assessments.roi_results` rows from the legacy ROI-only flow used the old `annual_net_benefit` calculation that double-subtracted implementation cost. Those rows must be treated as legacy data until they are reprocessed or replaced. The backend should carry a `scoring_engine_version` (or `roi_engine_version`) on the scored opportunity result and on migrated ROI outputs so the app can distinguish legacy rows from corrected calculations.

This is fixed by BE-02 (regression test + version bump) before the legacy `/api/v1/roi/quick` endpoint is exposed in production or used by the new frontend contract.

## 5) Additive database design plan

The following is an additive plan that preserves the current `assessments` and `opportunity_rankings` tables while adding the richer product model.

### Extend existing `assessments` table

```sql
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS workspace_id UUID NULL,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NULL,
  ADD COLUMN IF NOT EXISTS wizard_input JSONB NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NULL,
  ADD COLUMN IF NOT EXISTS currency TEXT NULL DEFAULT 'USD';
```

`input_data` and `roi_results` remain for legacy rows.

### New tables for the target product model

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  industry TEXT,
  country_code TEXT,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE workspaces FROM anon, authenticated;

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE profiles FROM anon, authenticated;

CREATE TABLE workspace_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  UNIQUE(workspace_id, profile_id)
);
ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE workspace_memberships FROM anon, authenticated;

CREATE TABLE opportunity_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NULL REFERENCES workspaces(id) ON DELETE SET NULL,
  function_name TEXT NOT NULL,
  name TEXT NOT NULL,
  impact TEXT NOT NULL,
  effort TEXT NOT NULL,
  feasibility_pct NUMERIC(5,2),
  priority_score NUMERIC(5,2),
  category TEXT,
  narrative_template JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);
ALTER TABLE opportunity_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE opportunity_catalog FROM anon, authenticated;

CREATE TABLE assessment_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  catalog_id UUID NULL REFERENCES opportunity_catalog(id) ON DELETE SET NULL,
  rank INT NOT NULL,
  impact TEXT,
  effort TEXT,
  feasibility_pct NUMERIC(5,2),
  priority_score NUMERIC(5,2),
  investment NUMERIC(18,2),
  recurring_cost NUMERIC(18,2),
  gross_annual_benefit NUMERIC(18,2),
  net_annual_benefit NUMERIC(18,2),
  payback_months NUMERIC(8,2),
  readiness_score NUMERIC(5,2),
  scoring_policy_version TEXT NOT NULL DEFAULT 'v1',
  inputs_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE assessment_opportunities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE assessment_opportunities FROM anon, authenticated;

CREATE TABLE roi_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_opportunity_id UUID NOT NULL REFERENCES assessment_opportunities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  adoption_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1,
  labor_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1,
  automation_rate NUMERIC(5,3) NOT NULL,
  benefit_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1,
  recurring_cost_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1,
  is_base_case BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE roi_scenarios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE roi_scenarios FROM anon, authenticated;

CREATE TABLE roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE roadmaps FROM anon, authenticated;

CREATE TABLE roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  assessment_opportunity_id UUID REFERENCES assessment_opportunities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  phase TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  target_month INT,
  dependency_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE roadmap_items FROM anon, authenticated;

CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NULL REFERENCES workspaces(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  source_type TEXT NOT NULL,
  url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE knowledge_documents FROM anon, authenticated;

CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(document_id, chunk_index)
);
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE knowledge_chunks FROM anon, authenticated;

CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NULL REFERENCES workspaces(id) ON DELETE SET NULL,
  profile_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE ai_conversations FROM anon, authenticated;

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE ai_messages FROM anon, authenticated;

CREATE TABLE ai_message_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
  document_id UUID REFERENCES knowledge_documents(id) ON DELETE SET NULL,
  chunk_id UUID REFERENCES knowledge_chunks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  url TEXT,
  excerpt TEXT,
  score NUMERIC(6,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ai_message_citations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE ai_message_citations FROM anon, authenticated;

CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'USD',
  locale TEXT NOT NULL DEFAULT 'en-US',
  notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, profile_id)
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE user_settings FROM anon, authenticated;
```

### Migration order

Recommended order:
1. Extend `assessments` for wizard data and demo-state persistence.
2. Add `workspaces` and `workspace_memberships`.
3. Add `opportunity_catalog` and `assessment_opportunities`.
4. Add `roi_scenarios`, `roadmaps`, and `roadmap_items`.
5. Add `knowledge_documents` and `knowledge_chunks`.
6. Add `ai_conversations`, `ai_messages`, and `ai_message_citations`.
7. Add `user_settings` and any future profile hooks.

Migration guardrails: each migration is previewed with `alembic upgrade head --sql` and applied only after explicit owner approval; all new tables use `ENABLE ROW LEVEL SECURITY`, no policies, and `server_default=gen_random_uuid()` on UUID PKs. No secrets are printed in logs.

This keeps the current `assessments` table intact for earlier data while allowing a richer product model with additive schema changes only.

## 5) Notes for the target design

- `opportunity_catalog` is the canonical library of opportunity types, default narrative templates, and base assumptions; `workspace_id` is nullable for global catalog entries.
- `assessment_opportunities` stores the scored outcome for a specific assessment; `roi_scenarios` and `roadmap_items` link to this table rather than the catalog.
- `POST /api/v1/assessments` accepts only the wizard schema; do not continue accepting the legacy ROI-only payload in the same endpoint.
- `POST /api/v1/roi/quick` is the compatibility path for the old ROI-only flow while the new assessment route stabilizes.
- Use `Decimal`/`NUMERIC` for money and `Literal["USD"]` in v1. Currency-neutral field names remain in the SQL/data model.
- Treat `pgvector` as a later-phase requirement in BE-10 and keep the schema vector-ready without forcing the rest of the app to depend on it immediately.
