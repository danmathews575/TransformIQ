
import pytest

from app.opportunity_engine import assess_ecommerce_opportunities
from app.opportunity_engine import (
    Opportunity,
    rank_opportunities,
    score_opportunity,
)


def test_high_impact_opportunity_scores_higher():
    support = Opportunity(
        "Customer Support Automation", 5, 4, 5, 2, 2
    )
    invoice = Opportunity(
        "Invoice Processing", 3, 4, 3, 3, 3
    )

    assert score_opportunity(support) > score_opportunity(invoice)


def test_perfect_scores_equal_100():
    opportunity = Opportunity(
        "Ideal Opportunity", 5, 5, 5, 1, 1
    )

    assert score_opportunity(opportunity) == 100


def test_invalid_score_is_rejected():
    opportunity = Opportunity(
        "Invalid Opportunity", 6, 4, 4, 2, 2
    )

    with pytest.raises(ValueError):
        score_opportunity(opportunity)


def test_ranking_is_descending():
    opportunities = [
        Opportunity("A", 3, 3, 3, 3, 3),
        Opportunity("B", 5, 5, 5, 1, 1),
    ]

    ranked = rank_opportunities(opportunities)

    assert ranked[0][0].name == "B"
    assert ranked[0][1] >= ranked[1][1]



def test_opportunities_are_ranked_highest_first():
    results = assess_ecommerce_opportunities(
        monthly_queries=10000,
        minutes_per_query=8,
        hourly_labor_cost=300,
        automation_rate=0.3,
    )

    assert len(results) == 3
    assert results[0]["score"] >= results[1]["score"]
    assert results[1]["score"] >= results[2]["score"]


def test_support_score_responds_to_workload():
    low = assess_ecommerce_opportunities(
        monthly_queries=100,
        minutes_per_query=2,
        hourly_labor_cost=100,
        automation_rate=0.3,
    )
    high = assess_ecommerce_opportunities(
        monthly_queries=10000,
        minutes_per_query=8,
        hourly_labor_cost=300,
        automation_rate=0.3,
    )

    low_support = next(
        item for item in low
        if item["name"] == "Customer Support Automation"
    )
    high_support = next(
        item for item in high
        if item["name"] == "Customer Support Automation"
    )

    assert high_support["score"] > low_support["score"]
