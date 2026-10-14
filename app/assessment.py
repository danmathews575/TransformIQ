
"""TransformIQ: integrated business assessment."""

from app.roi_engine import calculate_roi
from app.opportunity_engine import Opportunity, rank_opportunities


def run_assessment():
    opportunities = [
        Opportunity("Customer Support Automation", 5, 4, 5, 2, 2),
        Opportunity("Invoice Processing", 3, 4, 3, 3, 2),
        Opportunity("Lead Qualification", 4, 4, 4, 3, 3),
    ]

    ranked = rank_opportunities(opportunities)

    print("\n=== TransformIQ Business Assessment ===")
    print("\nAI Opportunity Rankings")

    for rank, (opportunity, score) in enumerate(ranked, start=1):
        print(f"{rank}. {opportunity.name}: {score}/100")

    roi = calculate_roi(
        monthly_queries=10_000,
        minutes_per_query=8,
        hourly_labor_cost=300,
        automation_rate=0.30,
        implementation_cost=50_000,
        monthly_ai_cost=10_000,
    )

    print("\nROI Estimate — Customer Support Automation")
    print(f"Monthly gross savings: ₹{roi.monthly_gross_savings:,.2f}")
    print(f"Monthly net savings:   ₹{roi.monthly_net_savings:,.2f}")
    print(f"First-year net benefit: ₹{roi.annual_net_benefit:,.2f}")

    if roi.payback_months is not None:
        print(f"Payback period: {roi.payback_months:.2f} months")
    else:
        print("Payback period: Not achieved under current assumptions")

    print("\nAll figures are illustrative, not guaranteed outcomes.")


if __name__ == "__main__":
    run_assessment()
