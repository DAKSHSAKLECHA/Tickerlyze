from flask import Blueprint, jsonify
from services import stock_service, risk_engine

risk_bp = Blueprint("risk", __name__, url_prefix="/api/risk")


@risk_bp.route("/<symbol>", methods=["GET"])
def get_risk(symbol):
    try:
        quote = stock_service.get_quote(symbol)
    except stock_service.StockNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Could not fetch stock data: {e}"}), 500

    result = risk_engine.calculate_risk(
        pe_ratio=quote.get("peRatio"),
        revenue_growth=quote.get("revenueGrowth"),
        debt_to_equity=quote.get("debtToEquity"),
    )
    result["symbol"] = quote["symbol"]
    return jsonify(result)
