
from app.roi_engine import calculate_roi


def main():
    result = calculate_roi(
        monthly_queries=10_000,
        minutes_per_query=8,
        hourly_labor_cost=300,
        automation_rate=0.30,
        implementation_cost=50_000,
        monthly_ai_cost=10_000,
    )

    print("\n=== TransformIQ | ROI Assessment ===")
    print(f"Monthly labor cost:       ₹{result.monthly_labor_cost:,.2f}")
    print(f"Monthly gross savings:    ₹{result.monthly_gross_savings:,.2f}")
    print(f"Monthly AI operating cost: ₹{result.monthly_recurring_cost:,.2f}")
    print(f"Monthly net savings:      ₹{result.monthly_net_savings:,.2f}")
    print(f"First-year net benefit:   ₹{result.annual_net_benefit:,.2f}")

    if result.payback_months is not None:
        print(f"Payback period:           {result.payback_months:.2f} months")
    else:
        print("Payback period:           Not achieved under these assumptions")

    print("\nNote: All figures are illustrative estimates.")


if __name__ == "__main__":
    main()
