
"""Business opportunity scoring and prioritization."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Opportunity:
    name: str
    business_impact: int
    feasibility: int
    strategic_alignment: int
    implementation_effort: int
    risk: int


def score_opportunity(opportunity: Opportunity) -> float:
    """Score an opportunity on a 0–100 scale."""

    scores = {
        "business_impact": opportunity.business_impact,
        "feasibility": opportunity.feasibility,
        "strategic_alignment": opportunity.strategic_alignment,
        "implementation_effort": opportunity.implementation_effort,
        "risk": opportunity.risk,
    }

    for field_name, value in scores.items():
        if not 1 <= value <= 5:
            raise ValueError(f"{field_name} must be between 1 and 5")

    score = (
        opportunity.business_impact / 5 * 40
        + opportunity.feasibility / 5 * 25
        + opportunity.strategic_alignment / 5 * 20
        + (6 - opportunity.implementation_effort) / 5 * 10
        + (6 - opportunity.risk) / 5 * 5
    )

    return round(score, 2)


def rank_opportunities(
    opportunities: list[Opportunity],
) -> list[tuple[Opportunity, float]]:
    """Return opportunity-score tuples sorted from highest to lowest."""

    ranked = [
        (opportunity, score_opportunity(opportunity))
        for opportunity in opportunities
    ]

    return sorted(ranked, key=lambda item: item[1], reverse=True)


def assess_ecommerce_opportunities(
    monthly_queries: int,
    minutes_per_query: float,
    hourly_labor_cost: float,
    automation_rate: float,
) -> list[dict]:
    """Rank illustrative e-commerce use cases using business inputs."""

    if monthly_queries < 0:
        raise ValueError("monthly_queries must be non-negative")
    if minutes_per_query < 0:
        raise ValueError("minutes_per_query must be non-negative")
    if hourly_labor_cost < 0:
        raise ValueError("hourly_labor_cost must be non-negative")
    if not 0 <= automation_rate <= 1:
        raise ValueError("automation_rate must be between 0 and 1")

    support_workload = monthly_queries * minutes_per_query
    support_cost = support_workload / 60 * hourly_labor_cost

    support_impact = min(
        5,
        max(1, round(support_cost / 100_000) + 1),
    )

    support_feasibility = (
        5 if automation_rate >= 0.5
        else 4 if automation_rate >= 0.25
        else 3
    )

    opportunities = [
        Opportunity(
            name="Customer Support Automation",
            business_impact=support_impact,
            feasibility=support_feasibility,
            strategic_alignment=5,
            implementation_effort=2,
            risk=2,
        ),
        Opportunity(
            name="Lead Qualification",
            business_impact=3,
            feasibility=4,
            strategic_alignment=4,
            implementation_effort=3,
            risk=3,
        ),
        Opportunity(
            name="Invoice Processing",
            business_impact=3,
            feasibility=4,
            strategic_alignment=3,
            implementation_effort=3,
            risk=2,
        ),
    ]

    return [
        {
            "name": opportunity.name,
            "score": score,
            "business_impact": opportunity.business_impact,
            "feasibility": opportunity.feasibility,
            "strategic_alignment": opportunity.strategic_alignment,
            "implementation_effort": opportunity.implementation_effort,
            "risk": opportunity.risk,
        }
        for opportunity, score in rank_opportunities(opportunities)
    ]
id="fixengine"
