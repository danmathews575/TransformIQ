# 03. Gap matrix

## A. Endpoint and API contract coverage

| Frontend screen or action | Endpoint contract | Status | Notes |
| --- | --- | --- | --- |
| Overview dashboard | `GET /api/v1/assessments`, `GET /api/v1/assessments/{id}` | PARTIAL | Backend can list assessments, but dashboard-specific KPIs and top-opportunity rollups are not exposed as dedicated endpoints. |
| Assessments history search/sort | `GET /api/v1/assessments` | PARTIAL | Supports limit/offset and generic list; no server-side search, sort, or filter by business/date/status. |
| New Assessment wizard submit | `POST /api/v1/assessments` | PARTIAL | API accepts a narrowly defined ROI model, not the wizard’s full assessment payload. |
| Step-by-step wizard validation | local Zod validation only | STATIC | Frontend validation exists; no backend schema parity for wizard fields. |
| Results/opportunities list | `GET /api/v1/assessments/{id}` | PARTIAL | Returns ranked opportunities with `name`+`score`, but not the full table data the frontend expects (function, impact, feasibility, investment, benefit, payback, readyness, etc.). |
| Opportunity detail page | none | MISSING | No endpoint for narrative detail, sources, risks, next steps, or results detail. |
| ROI & Business Cases page | none | MISSING | No scenario, sensitivity, assumption, or comparison API exists. |
| Roadmap page | none | MISSING | No roadmap CRUD or generation endpoint exists. |
| AI Consultant chat | none | MISSING | No chat endpoint, conversation persistence, or structured block schema. |
| Knowledge Center | none | MISSING | No document library API or ingestion endpoint exists. |
| Settings / workspace config | none | MISSING | No settings endpoint or workspace model exists. |
| Floating assistant | none | MISSING | Only static message in shell; no assistant API. |
| Not found / error states | built-in FastAPI 404/422/500 | EXISTS | Basic fallback behavior exists, but no product-level error envelope. |

## B. Request/response schema mismatches

| Frontend field or action | Frontend name | Backend name | Status | Mismatch |
| --- | --- | --- | --- | --- |
| Assessment creation | `name, industry, model, size, revenue, employees...` | `monthly_queries, minutes_per_query, hourly_labor_cost, automation_rate, implementation_cost, monthly_ai_cost` | MISSING | Wizard input schema does not match API schema. Backend uses operational cost model, not business assessment fields. |
| Opportunity result | `priorityScore`, `feasibility`, `investmentUSD`, `grossAnnualBenefitUSD`, `netAnnualBenefitUSD`, `paybackMonths` | returned `score` only | PARTIAL | Backend exposes only score and not the full opportunity financial model. |
| Opportunity detail | `problem`, `solution`, `fit`, `outcomes`, `risk`, `data`, `sources`, `nextSteps` | none | MISSING | No narrative field set or source metadata. |
| Business case | scenario multipliers, sensitivity, assumptions | none | MISSING | No API contract for scenario analysis. |
| ROI | USD, percentages, months | mathematical fields in generic floats | PARTIAL | API is numeric, but no units or currency metadata; no explicit precision or currency enum. |
| Readiness | `overallReadinessPct` | none | MISSING | No readiness scoring model or endpoint exists. |
| Opportunity function or type | `function` and `impact` | none | MISSING | No taxonomy or categorization schema. |
| Assessment status | `Completed` / `In progress` | no status field in model | MISSING | No persisted assessment status. |
| Search/sort/filter | front-end search/sort/filter behavior | `limit`/`offset` only | PARTIAL | Backend lacks semantic server-side search and sort support. |
| Validation | Zod on frontend | Pydantic on backend | PARTIAL | Both validate, but they validate totally different objects and cannot share rules. |
| Currency units | USD values in UI | backend uses plain float values without currency metadata | PARTIAL | `annual_net_benefit` is a number with no currency or unit semantics; `₹` appears in CLI, not API. |

## C. Database / data model gap

| Screen or feature | Existing DB support | Gap classification | Notes |
| --- | --- | --- | --- |
| Assessment history | `assessments` + `opportunity_rankings` | PARTIAL | Supports basic save/list/get, but the product needs the existing `assessments` table extended with `workspace_id`, `status`, `wizard_input`, `updated_at`, `source`, `currency`, and a new `assessment_opportunities` table for scored results. |
| Opportunity catalog | not persisted | MISSING | The front-end catalog is only static mock data. The product should use `opportunity_catalog` for shared templates and `assessment_opportunities` for per-assessment scored rows. |
| Opportunity detail content | not persisted | MISSING | No table for narrative text, proof sources, risks, metrics, or initiative steps; this should live in `opportunity_catalog` defaults plus assessment-linked narrative/metadata as needed. |
| ROI scenarios | not persisted | MISSING | Needs `roi_scenarios` with variant assumptions and results linked to `assessment_opportunities`. |
| Roadmap | not persisted | MISSING | Requires `roadmaps` and `roadmap_items` tied to `assessment_opportunities` rather than the catalog. |
| Knowledge Center | not persisted | MISSING | Requires document library with chunks, metadata, tags, and vector-ready schema in a later pgvector phase. |
| AI chat | not persisted | MISSING | Requires conversation/message tables and citations/tool metadata. |
| Workspaces | not persisted | MISSING | Requires `workspaces` and `workspace_memberships` tables; no `users` table in v1, only `profiles` in future Supabase design. |
| User settings | not persisted | MISSING | Requires preferences and app-config tables. |
| Assessment wizard data and draft progress | partly captured as `input_data` JSONB | PARTIAL | The existing model can keep legacy input_data, but the product requires extending `assessments` rather than introducing `assessment_runs`/`assessment_answers` as separate tables. |
|Indexes/relationships | only `opportunity_rankings.assessment_id` index | PARTIAL | Missing indexes for search/filtering and strongly typed relational lookups. |
|Schema change vs additive | current tables are preserved and extended | ADDITIVE | Preserve `assessments` and `opportunity_rankings`; add new tables such as `assessment_opportunities`, `roi_scenarios`, `roadmaps`, and `knowledge_documents` without dropping the legacy tables. |

## D. Business logic gap analysis

| Business figure in UI | Current backend status | What it means | Required formula/inputs |
| --- | --- | --- | --- |
| `priorityScore` | PARTIAL | Backend has a generic `score_opportunity()` but not the prototype’s weighted score. | Final score must tie to impact, feasibility, effort, investment, benefit, risk, and timing. Need explicit scoring weights and inputs from assessment + opportunity model. |
| `feasibility` | PARTIAL | UI uses `feasibility: 85` etc. Backend has feasibility in a generic score model but not a percentage from real inputs. | Must be derived from data quality, integration readiness, process maturity, and adoption effort. |
| `impact` | PARTIAL | Backend has `business_impact` on 1–5 scale but not the `High/Medium/Low` taxonomy. | Need thresholds tied to business value, customer experience, operating cost, or risk reduction. |
| `investmentUSD` | MISSING | No endpoint produces one-time implementation cost by opportunity. | Need estimated implementation cost inputs (internal hours, vendor fees, integrations, one-time setup). |
| `recurringCostUSD` | MISSING | No recurring operating-cost model exists. | Need recurring vendor, cloud, ops, and maintenance costs. |
| `grossAnnualBenefitUSD` | PARTIAL | Can be approximated from `monthly_gross_savings`, but no per-opportunity version. | `annualized benefit = production volume × time saved × labor rate × automation rate`, adjusted by opportunity type. |
| `netAnnualBenefitUSD` | PARTIAL | `monthly_net_savings` exists, but it is a single business-level metric, not per opportunity. | `net_annual_benefit = gross_annual_benefit - annual_recurring_cost` with no one-time cost included in the annual net benefit line item. |
| `paybackMonths` | PARTIAL | ROI engine computes this at aggregate level. | `payback_months = investment / (net_annual_benefit / 12)`, or `null` if `net_annual_benefit <= 0`. |
| `3-year ROI` | MISSING | No 36-month cumulative model exists. | `roi_3y_pct = (3 * net_annual_benefit - investment) / investment` with cumulative benefit tracked over 36 months. |
| `scenario multipliers` | MISSING | Not part of current backend. | Need scenario table with multiplier inputs such as adoption rate, automation rate, labor cost, and volume growth. |
| `sensitivity` | MISSING | No sensitivity analysis or assumption tuning. | Need parameter sweeps over automation rate, labor cost, adoption, and discount rates. |
| `cumulative benefit over 36 months` | MISSING | There is no time-series model. | Sum monthly net benefit across 36 months and show cumulative curve by scenario. |
| `readiness score` | MISSING | `overallReadinessPct` is only mocked in the UI. | Need readiness formula from technology, data quality, budget, timeline, and operating maturity. |
| `KPI aggregates` | PARTIAL | `assessments` endpoint returns history but not dashboard KPI rollups. | Need server-side summary queries: total assessments, total value, high-priority count, avg payback, etc. |

## E. Narrative content classification

| Narrative item | Recommended storage / generation | Status |
| --- | --- | --- |
| `problem` text | Static template per opportunity type, later tuned by LLM | PARTIAL | Mock data has detailed business problem narratives but backend does not persist them. |
| `solution` text | LLM-generated from assessment & opportunity metadata, with template guardrails | MISSING | Needs structured opportunity model and prompt template. |
| `why this fits` text | Static template + assessment-specific facts | MISSING | Should be generated from data sources and business profile. |
| `risks` | Static template + risk engine inputs | MISSING | Not persisted or calculated today. |
| `success metrics` | Static template + opportunity-specific KPIs | MISSING | Need metric library per opportunity type. |
| `next steps` | Static template / workflow step library | MISSING | Needs roadmap integration. |
| `sources` | Database-backed references, citations, or vendor content | MISSING | Must be stored with source metadata for AI consultant and opportunity detail pages. |
| `whyItMatters` in opportunity list | Stored in DB as short summary | MISSING | Current mock field is static and not attached to a backend record. |

## F. Roadmap, knowledge center, settings, workspace/user data

| Feature | Frontend state | Backend status | Gap |
| --- | --- | --- | --- |
| Roadmap | Placeholder route | MISSING | No roadmap table, generation flow, milestones, dependencies, or owner assignment. |
| Knowledge Center | Placeholder route | MISSING | No document or article table; no ingestion or search layer. |
| Settings | Placeholder route | MISSING | No workspace/settings model. |
| Workspace switcher | `workspaces` list in shell | MISSING | No workspace schema or user mapping. |
| User profile | `currentUser` in mock data | MISSING | No auth or user profile model. |
| Notifications | bell icon only | STATIC | Can be UI-only initial placeholder. |

## G. AI Consultant coverage

| Capability | Frontend requirement | Backend status | Gap |
| --- | --- | --- | --- |
| Chat endpoint | Chat UI for consultant page | MISSING | No `/api/v1/ai/chat` or streaming channel. |
| Conversation persistence | Need thread and message history | MISSING | No `threads` or `messages` model. |
| Structured response blocks | Rich blocks, tool calls, source cards, actions | MISSING | No schema for message block content. |
| Citations / sources | Need document references | MISSING | No knowledge retrieval or citation model. |
| Tool-use chips | Need tools/agent metadata | MISSING | No agent/tool execution event schema. |
| Streaming responses | UI likely expects incremental updates | MISSING | No SSE/WS/websocket or stream endpoint. |
| RAG foundation | Search docs against knowledge base | MISSING | No vector DB or embeddings schema. |
| LangGraph orchestration | Future orchestrator | MISSING | No graph or tool definition layer. |
| Evaluation / quality checks | Not in current UI but implied | MISSING | No eval harness or prompt-feedback layer. |

## H. Cross-cutting concerns

| Concern | Frontend prototype expectation | Backend status | Decision |
| --- | --- | --- | --- |
| Validation | Zod front-end plus Pydantic back-end | PARTIAL | Need shared contract and validation library/API docs. |
| Error format | UI may want stable JSON, not raw `detail` strings | PARTIAL | Need a standard `error.code`, `message`, `request_id`, `field_errors` envelope. |
| Pagination/sorting | UI supports sort + search operation on list views | PARTIAL | Current backend only supports `limit/offset` and no search/sort semantics. |
| CORS | Frontend likely runs on 5173 and backend on 8000 | MISSING | Must add `CORSMiddleware` with allowlist or dev. |
| Config | UI uses Vite env `VITE_API_BASE_URL` | PARTIAL | Backend uses `.env` and Alembic config but no app settings module and no pydantic-settings. |
| Auth | Prototype has no auth flows | MISSING | Minimum for demo: no auth, but must define per-workspace access and optional future JWT. |
| Logging | No visible telemetry | MISSING | Need request, error, and DB-access logging with correlation IDs. |
| Tests | Core math covered, API tests for mocked DB | PARTIAL | Need contract tests for frontend payloads, error envelopes, and full screen behavior. |
| Seed/demo data | UI is hardcoded in `mockData.ts` | MISSING | Need `seed` scripts or fixtures for realistic demo workspace and assessment data. |
| Deployment | Prototype is local dev only | MISSING | Must define runtime, environment variables, and Postgres service configuration. |

## Overall classification
- Implemented: root health, basic assessment save/list/get, simple ROI/opportunity formula engine.
- Partial: existing core math; missing realistic product-facing API contract for prototypes.
- Missing: everything beyond the narrow ROI + generic score engine; no data persistence for product screens outside minimal assessment history.
- Static: route-level validation and mock UI content that intentionally does not require backend (not all of it; many screens are UI-only placeholders right now).

The largest product gaps are not “one missing endpoint.” They are a missing product data model and a missing domain contract between the wizard, opportunity detail, ROI/business case, roadmap, and AI consultant experiences.
