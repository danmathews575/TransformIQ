
"""TransformIQ: REST API for business assessments."""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.roi_engine import calculate_roi
from app.opportunity_engine import assess_ecommerce_opportunities

app = FastAPI(
    title="TransformIQ API",
    description="AI opportunity prioritization and ROI assessment.",
    version="0.2.0",
)


class BusinessAssessment(BaseModel):
    monthly_queries: int = Field(ge=0)
    minutes_per_query: float = Field(ge=0)
    hourly_labor_cost: float = Field(ge=0)
    automation_rate: float = Field(ge=0, le=1)
    implementation_cost: float = Field(ge=0)
    monthly_ai_cost: float = Field(default=0, ge=0)


@app.get("/")
def root():
    return {
        "name": "TransformIQ",
        "status": "running",
        "version": "0.2.0",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post(
    "/api/v1/assessments",
    responses={422: {"description": "Validation error"}},
)
def create_assessment(data: BusinessAssessment):
    try:
        roi = calculate_roi(
            monthly_queries=data.monthly_queries,
            minutes_per_query=data.minutes_per_query,
            hourly_labor_cost=data.hourly_labor_cost,
            automation_rate=data.automation_rate,
            implementation_cost=data.implementation_cost,
            monthly_ai_cost=data.monthly_ai_cost,
        )

        opportunities = assess_ecommerce_opportunities(
            monthly_queries=data.monthly_queries,
            minutes_per_query=data.minutes_per_query,
            hourly_labor_cost=data.hourly_labor_cost,
            automation_rate=data.automation_rate,
        )

        return {
            "opportunities": [
                {
                    "name": item["name"],
                    "score": item["score"],
                }
                for item in opportunities
            ],
            "roi": {
                "monthly_labor_cost": roi.monthly_labor_cost,
                "monthly_gross_savings": roi.monthly_gross_savings,
                "monthly_net_savings": roi.monthly_net_savings,
                "annual_net_benefit": roi.annual_net_benefit,
                "payback_months": roi.payback_months,
            },
            "note": (
                "Estimates are based on illustrative assumptions. "
                "Opportunity scores use preliminary rule-based criteria."
            ),
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

