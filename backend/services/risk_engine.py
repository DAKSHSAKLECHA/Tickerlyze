"""
Simple, explainable risk scoring engine.

Each factor contributes 0-100 points (higher = riskier). We weight and
average them into a final 0-100 risk score, then bucket into
Low / Medium / High.

This is a heuristic model for informational purposes, not financial advice.
"""

WEIGHTS = {
    "pe": 0.35,
    "growth": 0.35,
    "debt": 0.30,
}


def _score_pe(pe_ratio):
    """Very low or very high/negative PE is treated as riskier."""
    if pe_ratio is None or pe_ratio <= 0:
        return 80, "PE ratio is negative or unavailable (unprofitable or unstable earnings)."
    if pe_ratio < 10:
        return 55, "PE below 10 can signal market skepticism about future earnings."
    if pe_ratio <= 25:
        return 20, "PE ratio is in a healthy, moderately valued range."
    if pe_ratio <= 45:
        return 55, "PE ratio is elevated, pricing in significant growth expectations."
    return 85, "PE ratio is very high, indicating rich valuation and downside risk."


def _score_growth(revenue_growth):
    """revenue_growth is a fraction, e.g. 0.15 = 15%."""
    if revenue_growth is None:
        return 60, "Revenue growth data unavailable."
    pct = revenue_growth * 100
    if pct < 0:
        return 90, "Revenue is contracting year-over-year."
    if pct < 5:
        return 65, "Revenue growth is sluggish."
    if pct <= 20:
        return 25, "Revenue growth is healthy and sustainable."
    if pct <= 40:
        return 35, "Revenue growth is strong but may be hard to sustain."
    return 55, "Revenue growth is extremely high, which can be volatile or unsustainable."


def _score_debt(debt_to_equity):
    """debt_to_equity from yfinance is usually already a percentage-like number (e.g. 45.2 = 45.2%)."""
    if debt_to_equity is None:
        return 55, "Debt data unavailable."
    if debt_to_equity < 30:
        return 15, "Debt levels are low relative to equity."
    if debt_to_equity <= 100:
        return 40, "Debt levels are moderate."
    if debt_to_equity <= 200:
        return 70, "Debt levels are elevated relative to equity."
    return 90, "Debt levels are very high relative to equity, raising financial risk."


def calculate_risk(pe_ratio=None, revenue_growth=None, debt_to_equity=None):
    pe_score, pe_note = _score_pe(pe_ratio)
    growth_score, growth_note = _score_growth(revenue_growth)
    debt_score, debt_note = _score_debt(debt_to_equity)

    final_score = (
        pe_score * WEIGHTS["pe"]
        + growth_score * WEIGHTS["growth"]
        + debt_score * WEIGHTS["debt"]
    )
    final_score = round(final_score, 1)

    if final_score < 35:
        level = "Low"
    elif final_score < 65:
        level = "Medium"
    else:
        level = "High"

    return {
        "riskScore": final_score,
        "riskLevel": level,
        "breakdown": {
            "peRatio": {"value": pe_ratio, "score": pe_score, "note": pe_note},
            "revenueGrowth": {"value": revenue_growth, "score": growth_score, "note": growth_note},
            "debtToEquity": {"value": debt_to_equity, "score": debt_score, "note": debt_note},
        },
        "weights": WEIGHTS,
    }
