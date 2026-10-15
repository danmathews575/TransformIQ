# 01. Frontend requirements inventory

Sources reviewed:
- `frontend/src/routes/*.tsx`
- `frontend/src/components/AppShell.tsx`
- `frontend/src/components/OpportunitiesView.tsx`
- `frontend/src/data/mockData.ts`
- `frontend/src/routes/__root.tsx`

## Product profile
The frontend is a prototype product called TransformIQ. It is a business AI opportunity assessment dashboard for an e-commerce business (Urban Threads Co.). It models a workspace-based SaaS product with a left navigation, workspace switcher, notification button, user profile menu, and a floating assistant launcher.

The prototype is powered entirely by mock data in `frontend/src/data/mockData.ts` and does not call a real API for most screens. The routing is implemented with TanStack Router and file-based routes.

## Screen inventory

| Route | Screen | Purpose | Data displayed | User actions | MockData used |
| --- | --- | --- | --- | --- | --- |
| `/` | Overview | Executive dashboard summarizing assessment state and high-priority opportunities. | KPI tiles, bar chart by function, top 3 opportunities, recent assessments, recent activity, CTA to AI consultant. | Click a bar to filter `/opportunities` by function; click an opportunity to open detail; open report from recent assessments; open AI consultant. | `business`, `currentUser`, `assessments`, `activity`, `kpis`, `opportunities`, `opportunitiesByFunction()` |
| `/assessments` | Assessments history | List and search all assessments. Supports sort and filter by search term. | Assessment business name, date, status, opportunity count, estimated value, top opportunity. | Search, sort by column, open report for completed assessment. | `assessments`, `Assessment` type |
| `/assessments/new` | New Assessment wizard | Six-step assessment intake to collect business profile and readiness inputs. | Business profile, operations, tech stack, challenges/goals, budget readiness, summary review. | Fill fields, select options, toggle checkboxes, next/back, fill sample data, validate, submit. | `business`, `sample` local form values, option lists in route |
| `/assessments/$id/results` | Assessment results / opportunities list | Results page for a completed assessment; renders opportunities table. | Score summary cards, opportunity rows, filter by function and effort, grouping by function. | Search, filter by function/effort, group by function, sort, click an opportunity row. | `assessments`, `dataLimitations`, `overallReadinessPct`, `functions`, `kpis`, `opportunities`, `formatUSD` |
| `/opportunities` | Opportunities index | Ranked list of opportunities with summary KPIs and filter controls. | Opportunity table: name, function, impact, feasibility, effort, investment, net benefit, payback, score. | Search, filter by function and effort, sort, toggle group-by-function, click row. | `opportunities`, `functions`, `kpis`, `dataLimitations`, `overallReadinessPct` |
| `/opportunities/$id` | Opportunity detail | Deep dive into one opportunity, including narrative and costs. | Summary score, estimated investment and benefit, business problem, AI solution, fit, outcomes, risks, metrics, sources, next steps. | Add/remove from roadmap, ask AI Consultant, open ROI page. | `opportunities`, `opportunityDetails`, `formatUSD` |
| `/roi` | ROI & Business Cases | Placeholder route for ROI comparisons, scenario analysis, sensitivity, assumptions. | Not implemented yet; intended to show scenario charts and assumptions. | None implemented; intended scenario toggles, sensitivity adjustments, case comparisons. | None in mockData; route is a placeholder |
| `/roadmap` | Roadmap | Placeholder route for phased implementation plan by opportunity. | Not implemented yet; intended roadmap phases, dependencies, milestones. | None implemented. | None |
| `/consultant` | AI Consultant | Placeholder route for an AI advisor experience. | Intended chat UI, conversation history, rich reply blocks, citations, tool chips. | None implemented. | None |
| `/knowledge` | Knowledge Center | Placeholder route for curated knowledge and documents. | Intended library of articles, playbooks, and references. | None implemented. | None |
| `/settings` | Settings | Placeholder route for workspace, user, and app configuration. | Intended workspace and preferences state. | None implemented. | `workspaces`, `currentUser` in shell only |
| floating assistant | AI Assistant sheet | Quick-launch assistant drawer from shell. | One greeting + recommendation summary for highest-priority item. | Open the full consultant page. | `currentUser`, `opportunities`, `opportunitiesByFunction`, `assessments` indirectly |

## Detailed wizard fields (6 steps)

The wizard is implemented in `frontend/src/routes/assessments.new.tsx` and uses a single `form` state object and Zod validation per step. All six steps are:

### Step 1 — Business profile
Fields:
- `name` (Business name)
- `industry` (Industry)
- `model` (Business model) — select options: `Direct-to-consumer (D2C)`, `B2B`, `Marketplace`, `Hybrid`
- `size` (Company size) — select options: `Small (1–50)`, `Mid-size (51–200)`, `Large (200+)`
- `revenue` (Revenue range) — select options: `Under $1M`, `$1M–$10M`, `$10M–$25M`, `$25M+`
- `employees` (Employees) — numeric string
- `market` (Market)
- `website` (Website) — optional URL

### Step 2 — Operations
Fields:
- `channels` (Sales channels) — multi-select from `Own website`, `Marketplaces`, `Social commerce`, `Retail stores`, `Wholesale`
- `orderVolume` (Order volume) — select from `Under 1,000 / month`, `1,000–5,000 / month`, `5,000–20,000 / month`, `20,000+ / month`
- `inventory` (Inventory management) — select from `Spreadsheets`, `Shopify built-in`, `Inventory software`, `ERP`
- `service` (Customer service)
- `marketing` (Marketing)
- `logistics` (Logistics)
- `finance` (Finance)
- `bottlenecks` (Bottlenecks) — optional multi-select from `Customer support`, `Inventory planning`, `Order fulfillment`, `Marketing content`, `Reporting`, `Returns`
- `bottleneckNotes` (Bottleneck notes) — optional textarea

### Step 3 — Technology
Fields:
- `platform` (E-commerce platform)
- `crm` (CRM/ERP)
- `analytics` (Analytics tools)
- `dataQuality` (Data quality) — poor/fair/good/excellent
- `existingAI` (Existing AI/automation)

### Step 4 — Challenges & goals
Fields:
- `challenges` (Challenges) — multi-select chips from `High support workload`, `Poor forecasting`, `Stockouts`, `Low conversion`, `Manual data processing`, `Slow reporting`, `High costs`, `Inefficient workflows`
- `goals` (Goals) — textarea

### Step 5 — Budget & readiness
Fields:
- `budget` (Budget range) — `Under $50K`, `$50K–$100K`, `$100K–$250K`, `$250K+`
- `timeline` (Timeline) — `Under 3 months`, `3–6 months`, `6–12 months`, `12+ months`
- `readiness` (Technical readiness) — `Low`, `Medium`, `High`
- `risk` (Risk tolerance) — `Conservative`, `Moderate`, `Aggressive`
- `buildBuy` (Build vs buy) — `Build in-house`, `Buy / partner`, `Not sure`

### Step 6 — Review
This step does not add new input fields. It renders a summary of every field collected in the previous steps with an “Edit” shortcut to go back to any step.

## Data model in mockData.ts
The entire app state is seeded in `frontend/src/data/mockData.ts`.

Core exports:
- `business`: business name, industry, stack, employees, annual revenue, markets
- `currentUser`: current user name and initials
- `workspaces`: workspace names
- `opportunities`: all ranked opportunities with fields: `id`, `name`, `function`, `impact`, `feasibility`, `effort`, `investmentUSD`, `recurringCostUSD`, `grossAnnualBenefitUSD`, `netAnnualBenefitUSD`, `paybackMonths`, `priorityScore`, `whyItMatters`
- `assessments`: list of assessment summaries with name, date, status, opportunitiesCount, valuePotential, topOpportunity
- `kpis`: aggregate values for dashboard cards
- `activity`: recent activity feed
- `opportunityDetails`: narrative object per opportunity with problem/solution/fit/outcomes/data/risks/metrics/sources/nextSteps
- `functions`: set of functions used in opportunity filtering
- `overallReadinessPct` and `dataLimitations`
- `formatUSD` helper to format numeric values such as `$455K`

## Business logic visible in the prototype
The prototype displays business numbers, but only the mock data defines them. Examples:
- `Opportunity.priorityScore` is apparently a weighted measure on a 0–100 scale.
- `Opportunity.feasibility` is displayed as a percentage 0–100.
- `Opportunity.impact` is a string with values `High`, `Medium`, `Low`.
- `Opportunity.effort` is a string with values `Low`, `Medium`, `High`.
- `grossAnnualBenefitUSD`, `netAnnualBenefitUSD`, `paybackMonths`, and `priorityScore` are defined for each opportunity in `mockData.ts` and treated as authoritative values even though the frontend does not compute them.
- `kpis.estimatedAnnualValue` and `overallReadinessPct` are single-point hardcoded values defined in the data file.

## Notable frontend behavior
- `AppShell` provides persistent navigation and floating assistant.
- `OpportunitiesView` renders table rows that route to `/opportunities/$id`.
- The `Overview` route passes a function filter to `/opportunities` through a query string (`function`).
- The opportunity detail route passes `topic` to `/consultant` and `opportunity` to `/roi`.
- The sample-data “Fill with sample data” button in the wizard hydrates a realistic assessment payload.

## Missing or placeholder UI
The following screens are scaffolded but not implemented:
- ROI & Business Cases (`/roi`)
- Roadmap (`/roadmap`)
- AI Consultant (`/consultant`)
- Knowledge Center (`/knowledge`)
- Settings (`/settings`)

These routes render `ComingNext` from `AppShell`, and there is no data model or live interaction attached.
