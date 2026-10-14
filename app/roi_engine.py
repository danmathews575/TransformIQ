
"""TransformIQ: deterministic ROI calculations."""

from dataclasses import dataclass


@dataclass
class ROIResult:
    monthly_labor_cost: float
    monthly_gross_savings: float
    monthly_recurring_cost: float
    monthly_net_savings: float
    annual_net_benefit: float
    payback_months: float | None


def calculate_roi(
    monthly_queries: int,
    minutes_per_query: float,
    hourly_labor_cost: float,
    automation_rate: float,
    implementation_cost: float,
    monthly_ai_cost: float = 0.0,
) -> ROIResult:
    """Estimate financial outcomes using explicit assumptions."""

    if monthly_queries < 0:
        raise ValueError("Monthly queries cannot be negative.")
    if minutes_per_query < 0 or hourly_labor_cost < 0:
        raise ValueError("Time and labor cost cannot be negative.")
    if not 0 <= automation_rate <= 1:
        raise ValueError("Automation rate must be between 0 and 1.")
    if implementation_cost < 0 or monthly_ai_cost < 0:
        raise ValueError("Costs cannot be negative.")

    monthly_labor_cost = (
        monthly_queries * minutes_per_query / 60
    ) * hourly_labor_cost

    monthly_gross_savings = monthly_labor_cost * automation_rate
    monthly_net_savings = monthly_gross_savings - monthly_ai_cost
    annual_net_benefit = monthly_net_savings * 12

    payback_months = (
        implementation_cost / monthly_net_savings
        if monthly_net_savings > 0
        else None
    )

    return ROIResult(
        monthly_labor_cost=monthly_labor_cost,
        monthly_gross_savings=monthly_gross_savings,
        monthly_recurring_cost=monthly_ai_cost,
        monthly_net_savings=monthly_net_savings,
        annual_net_benefit=(
            annual_net_benefit - implementation_cost
        ),
        payback_months=payback_months,
    )
