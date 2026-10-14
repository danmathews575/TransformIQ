
import pytest

from app.roi_engine import calculate_roi


def test_roi_with_illustrative_business_data():
    result = calculate_roi(
        monthly_queries=10_000,
        minutes_per_query=8,
        hourly_labor_cost=300,
        automation_rate=0.30,
        implementation_cost=50_000,
        monthly_ai_cost=10_000,
    )

    assert result.monthly_labor_cost == pytest.approx(400_000)
    assert result.monthly_gross_savings == pytest.approx(120_000)
    assert result.monthly_net_savings == pytest.approx(110_000)
    assert result.annual_net_benefit == pytest.approx(1_270_000)
    assert result.payback_months == pytest.approx(50_000 / 110_000)


def test_zero_net_savings_has_no_payback_period():
    result = calculate_roi(
        monthly_queries=100,
        minutes_per_query=5,
        hourly_labor_cost=100,
        automation_rate=0,
        implementation_cost=10_000,
    )

    assert result.monthly_net_savings == 0
    assert result.payback_months is None


def test_invalid_automation_rate_is_rejected():
    with pytest.raises(ValueError):
        calculate_roi(
            monthly_queries=100,
            minutes_per_query=5,
            hourly_labor_cost=100,
            automation_rate=1.5,
            implementation_cost=10_000,
        )
