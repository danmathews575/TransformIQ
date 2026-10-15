"""TransformIQ: REST API for business assessments and history."""

import logging
import uuid
from typing import Any, Dict

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.database import DatabaseUnavailableError, check_database_connection, get_db
from app.errors import register_exception_handlers
from app.models import Assessment, OpportunityRanking
from app.roi_engine import calculate_roi
from app.opportunity_engine import assess_ecommerce_opportunities

settings = get_settings()

app = FastAPI(
    title="TransformIQ API",
    description="AI opportunity prioritization and ROI assessment.",
    version=settings.app_version,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# Register exception handlers
register_exception_handlers(app)

# Request ID middleware and logging
@app.middleware("http")
async def add_request_id_and_logging(request: Request, call_next):
    """Add request ID to request state and response headers, log request/response."""
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id

    # Log request
    logging.info(
        "Request: method=%s path=%s request_id=%s",
        request.method,
        request.url.path,
        request_id,
    )

    response = await call_next(request)

    # Add request ID to response headers
    response.headers["X-Request-ID"] = request_id

    # Log response
    logging.info(
        "Response: method=%s path=%s status=%s request_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        request_id,
    )

    return response


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
        "version": settings.app_version,
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/health/db")
def health_db():
    """Check database connectivity."""
    if check_database_connection():
        return {"status": "healthy"}
    else:
        raise DatabaseUnavailableError("Database connection failed")


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
            scoring_engine_version=settings.app_version,
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
        # Raise a custom HTTPException that the error handler can identify as a database error
        raise HTTPException(
            status_code=500,
            detail="Unable to save assessment. Please try again.",
            headers={"X-Error-Code": "database_error"},
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
    assessment_id: uuid.UUID,
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