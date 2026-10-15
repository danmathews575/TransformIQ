# TransformIQ 🚀

**AI-powered business transformation and ROI intelligence platform.**

TransformIQ helps businesses identify high-value AI opportunities, estimate ROI, and generate actionable AI implementation roadmaps.

## Project Structure

- backend/ — FastAPI application for assessment APIs and business logic (current Python app under `app/`)
- frontend/ — Lovable-generated React + TanStack Start app for the dashboard experience

## How to run

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.api:app --reload --host 127.0.0.1 --port 8000
```

Backend API endpoints are served on http://localhost:8000.

### Frontend

```bash
cd frontend
bun install
bun run dev --host 127.0.0.1 --port 5173
```

Frontend is served on http://localhost:5173 by default.

## 🎯 Objectives

- **AI Opportunity Discovery** — Identify and prioritize potential AI use cases.
- **ROI Analysis** — Estimate implementation costs, potential savings, and payback periods.
- **Implementation Roadmaps** — Generate practical, phased AI adoption strategies.
- **AI Evaluation** — Assess recommendation quality and reliability.

## 🛠️ Tech Stack

- **Backend:** Python, FastAPI
- **Frontend:** React, TypeScript, Vite, TanStack Start
- **Database:** PostgreSQL
- **AI Orchestration:** LangGraph
- **Testing:** pytest, Vitest

## 🏗️ Architecture

The platform combines deterministic business logic with AI-powered recommendations to support transparent, data-driven decisions.

## 🗺️ Roadmap

- [ ] Business assessment workflow
- [ ] AI use-case prioritization engine
- [ ] ROI calculator and scenario analysis
- [ ] AI-powered implementation roadmap generation
- [ ] Interactive analytics dashboard
- [ ] Evaluation and monitoring framework

## 💡 Use Case

Help an e-commerce business evaluate whether AI-powered customer support automation is feasible, financially beneficial, and worth implementing.

## ⚠️ Project Status

🚧 In development. Features will be added incrementally.

---

**TransformIQ** — Turning AI opportunities into measurable business value.
