
from fastapi.testclient import TestClient

from app.api import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["name"] == "TransformIQ"


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_assessment_endpoint():
    response = client.post(
        "/api/v1/assessments",
        json={
            "monthly_queries": 10000,
            "minutes_per_query": 8,
            "hourly_labor_cost": 300,
            "automation_rate": 0.3,
            "implementation_cost": 50000,
            "monthly_ai_cost": 10000,
        },
    )

    assert response.status_code == 200

    result = response.json()

    assert len(result["opportunities"]) == 3
    assert result["opportunities"][0]["name"] == (
        "Customer Support Automation"
    )
    assert result["roi"]["monthly_labor_cost"] == 400000
    assert result["roi"]["monthly_net_savings"] == 110000
    assert result["roi"]["annual_net_benefit"] == 1270000


def test_invalid_automation_rate():
    response = client.post(
        "/api/v1/assessments",
        json={
            "monthly_queries": 10000,
            "minutes_per_query": 8,
            "hourly_labor_cost": 300,
            "automation_rate": 1.5,
            "implementation_cost": 50000,
            "monthly_ai_cost": 10000,
        },
    )

    assert response.status_code == 422


def test_negative_monthly_queries():
    response = client.post(
        "/api/v1/assessments",
        json={
            "monthly_queries": -100,
            "minutes_per_query": 8,
            "hourly_labor_cost": 300,
            "automation_rate": 0.3,
            "implementation_cost": 50000,
            "monthly_ai_cost": 10000,
        },
    )

    assert response.status_code == 422
