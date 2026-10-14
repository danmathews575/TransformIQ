from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.api import app
from app.database import get_db
from app.models import Assessment

client = TestClient(app)


@pytest.fixture
def db_session():
    """Provide a mocked database session; never contact live Supabase."""
    db = MagicMock()
    saved_assessments = []

    def add_assessment(assessment):
        assessment.id = uuid4()
        assessment.created_at = datetime.now(timezone.utc)
        saved_assessments.append(assessment)

    db.add.side_effect = add_assessment
    db.commit.return_value = None
    db.refresh.return_value = None
    db.rollback.return_value = None
    db.close.return_value = None
    db.scalars.return_value.all.return_value = saved_assessments
    db.scalar.return_value = None

    app.dependency_overrides[get_db] = lambda: db

    yield db

    app.dependency_overrides.clear()


@pytest.fixture
def assessment_payload():
    return {
        "monthly_queries": 10000,
        "minutes_per_query": 8,
        "hourly_labor_cost": 300,
        "automation_rate": 0.3,
        "implementation_cost": 50000,
        "monthly_ai_cost": 10000,
    }


def test_root_endpoint():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["name"] == "TransformIQ"


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_assessment_endpoint(db_session, assessment_payload):
    response = client.post(
        "/api/v1/assessments",
        json=assessment_payload,
    )

    assert response.status_code == 200

    result = response.json()

    assert result["id"]
    assert result["created_at"]
    assert len(result["opportunities"]) == 3
    assert result["opportunities"][0]["name"] == (
        "Customer Support Automation"
    )
    assert result["roi"]["monthly_labor_cost"] == 400000
    assert result["roi"]["monthly_net_savings"] == 110000
    assert result["roi"]["annual_net_benefit"] == 1270000

    db_session.add.assert_called_once()
    db_session.commit.assert_called_once()
    db_session.refresh.assert_called_once()


def test_assessment_saves_rankings_and_inputs(
    db_session,
    assessment_payload,
):
    response = client.post(
        "/api/v1/assessments",
        json=assessment_payload,
    )

    assert response.status_code == 200

    saved = db_session.add.call_args.args[0]

    assert saved.input_data == assessment_payload
    assert saved.roi_results["annual_net_benefit"] == 1270000
    assert len(saved.rankings) == 3
    assert [item.rank for item in saved.rankings] == [1, 2, 3]
    assert [
        item.score for item in saved.rankings
    ] == sorted(
        [item.score for item in saved.rankings],
        reverse=True,
    )


def test_assessment_history_endpoint(
    db_session,
    assessment_payload,
):
    created = client.post(
        "/api/v1/assessments",
        json=assessment_payload,
    )
    assert created.status_code == 200

    response = client.get("/api/v1/assessments")

    assert response.status_code == 200
    result = response.json()
    assert len(result["items"]) == 1
    assert result["items"][0]["id"] == created.json()["id"]
    assert result["items"][0]["roi"]["annual_net_benefit"] == 1270000


def test_get_assessment_not_found(db_session):
    response = client.get(
        f"/api/v1/assessments/{uuid4()}"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Assessment not found"


def test_database_failure_returns_500(
    db_session,
    assessment_payload,
):
    db_session.commit.side_effect = SQLAlchemyError("simulated failure")

    response = client.post(
        "/api/v1/assessments",
        json=assessment_payload,
    )

    assert response.status_code == 500
    assert response.json()["detail"] == (
        "Unable to save assessment. Please try again."
    )
    db_session.rollback.assert_called_once()


def test_invalid_automation_rate(assessment_payload):
    assessment_payload["automation_rate"] = 1.5

    response = client.post(
        "/api/v1/assessments",
        json=assessment_payload,
    )

    assert response.status_code == 422


def test_negative_monthly_queries(assessment_payload):
    assessment_payload["monthly_queries"] = -100

    response = client.post(
        "/api/v1/assessments",
        json=assessment_payload,
    )

    assert response.status_code == 422