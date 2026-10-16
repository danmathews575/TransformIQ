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


@pytest.mark.xfail(
    reason="Double-subtraction bug: annual_net_benefit incorrectly subtracts implementation_cost",
    strict=True,
)
def test_annual_net_benefit_excludes_implementation_cost():
    """
    Regression test for double-subtraction bug in annual_net_benefit.

    According to the financial definitions (doc 04):
    - net_annual_benefit = gross_annual_benefit - annual_recurring_cost
    - year1_net = net_annual_benefit - investment
    - payback_months = investment / (net_annual_benefit / 12)

    The current implementation incorrectly subtracts implementation_cost from
    annual_net_benefit (line 55-57 in roi_engine.py), making it equal to
    year1_net instead of net_annual_benefit.

    This test is expected to fail (xfail) until the bug is fixed in a later BE item.
    """
    result = calculate_roi(
        monthly_queries=10_000,
        minutes_per_query=8,
        hourly_labor_cost=300,
        automation_rate=0.30,
        implementation_cost=50_000,
        monthly_ai_cost=10_000,
    )

    # Correct calculation per doc 04:
    # monthly_labor_cost = 10000 * 8 / 60 * 300 = 400_000
    # monthly_gross_savings = 400_000 * 0.30 = 120_000
    # monthly_net_savings = 120_000 - 10_000 = 110_000
    # annual_net_benefit (correct) = 110_000 * 12 = 1_320_000
    # annual_net_benefit (buggy) = 1_320_000 - 50_000 = 1_270_000
    expected_correct_annual_net_benefit = 1_320_000

    # This assertion documents the expected correct behavior.
    # Currently fails because of the double-subtraction bug.
    assert result.annual_net_benefit == pytest.approx(expected_correct_annual_net_benefit)


def test_payback_months_uses_correct_formula():
    """
    Test that payback_months uses the correct formula:
    payback_months = investment / (net_annual_benefit / 12)
    """
    result = calculate_roi(
        monthly_queries=10_000,
        minutes_per_query=8,
        hourly_labor_cost=300,
        automation_rate=0.30,
        implementation_cost=50_000,
        monthly_ai_cost=10_000,
    )

    # Correct net_annual_benefit = 1_320_000
    # Correct payback = 50_000 / (1_320_000 / 12) = 50_000 / 110_000 = 0.4545...
    # Current buggy payback uses buggy annual_net_benefit (1_270_000 / 12 = 105_833)
    # But payback_months is calculated BEFORE the buggy subtraction on line 44-48
    # So payback_months is actually correct!
    expected_payback = 50_000 / 110_000
    assert result.payback_months == pytest.approx(expected_payback)