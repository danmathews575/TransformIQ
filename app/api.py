"""TransformIQ: REST API for business assessments and history."""

from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Assessment, OpportunityRanking
from app.roi_engine import calculate_roi
from app.opportunity_engine import assess_ecommerce_opportunities

app = FastAPI(
    title="TransformIQ API",
    description="AI opportunity prioritization and ROI assessment.",
    version="0.3.0",
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
        "version": "0.3.0",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post(
    "/api/v1/assessments",
    status_code=200,
    responses={422: {"description": "Validation error"}},
)
def create_assessment(
    data: BusinessAssessment,
    db: Session = Depends(get_db),
):
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

        roi_results = {
            "monthly_labor_cost": roi.monthly_labor_cost,
            "monthly_gross_savings": roi.monthly_gross_savings,
            "monthly_net_savings": roi.monthly_net_savings,
            "annual_net_benefit": roi.annual_net_benefit,
            "payback_months": roi.payback_months,
        }

        assessment = Assessment(
            input_data=data.model_dump(),
            roi_results=roi_results,
            scoring_engine_version="0.3.0",
            rankings=[
                OpportunityRanking(
                    opportunity_name=item["name"],
                    score=item["score"],
                    rank=rank,
                    details=item,
                )
                for rank, item in enumerate(opportunities, start=1)
            ],
        )

        db.add(assessment)
        db.commit()
        db.refresh(assessment)

        return {
            "id": str(assessment.id),
            "created_at": assessment.created_at,
            "opportunities": [
                {"name": item["name"], "score": item["score"]}
                for item in opportunities
            ],
            "roi": roi_results,
            "note": (
                "Estimates are based on illustrative assumptions. "
                "Opportunity scores use preliminary rule-based criteria."
            ),
        }

    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save assessment. Please try again.",
        ) from exc


@app.get("/api/v1/assessments")
def list_assessments(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    statement = (
        select(Assessment)
        .order_by(Assessment.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    assessments = db.scalars(statement).all()

    return {
        "items": [
            {
                "id": str(item.id),
                "created_at": item.created_at,
                "input_data": item.input_data,
                "roi": item.roi_results,
            }
            for item in assessments
        ],
        "limit": limit,
        "offset": offset,
    }


@app.get("/api/v1/assessments/{assessment_id}")
def get_assessment(
    assessment_id: UUID,
    db: Session = Depends(get_db),
):
    statement = (
        select(Assessment)
        .options(selectinload(Assessment.rankings))
        .where(Assessment.id == assessment_id)
    )
    assessment = db.scalar(statement)

    if assessment is None:
        raise HTTPException(status_code=404, detail="Assessment not found")

    return {
        "id": str(assessment.id),
        "created_at": assessment.created_at,
        "input_data": assessment.input_data,
        "roi": assessment.roi_results,
        "opportunities": [
            {
                "name": item.opportunity_name,
                "score": item.score,
                "rank": item.rank,
                "details": item.details,
            }
            for item in assessment.rankings
        ],
        "scoring_engine_version": assessment.scoring_engine_version,
    }