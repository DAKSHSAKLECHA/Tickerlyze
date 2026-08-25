from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from config import Config
from services import stock_service, ai_service
from utils.json_store import read_json, write_json

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")


@ai_bp.route("/analyze/<symbol>", methods=["POST"])
def analyze_stock(symbol):
    try:
        quote = stock_service.get_quote(symbol)
    except stock_service.StockNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Could not fetch stock data: {e}"}), 500

    try:
        analysis = ai_service.generate_analysis(quote)
    except ai_service.AIServiceError as e:
        return jsonify({"error": str(e)}), 502
    except Exception as e:
        return jsonify({"error": f"Unexpected AI error: {e}"}), 500

    record = {
        "symbol": quote["symbol"],
        "name": quote.get("shortName"),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "priceAtAnalysis": quote.get("currentPrice"),
        "analysis": analysis,
    }

    analyses = read_json(Config.ANALYSES_FILE, default=[])
    analyses.insert(0, record)
    analyses = analyses[:50]  # keep last 50
    write_json(Config.ANALYSES_FILE, analyses)

    return jsonify(record)


@ai_bp.route("/analyses", methods=["GET"])
def recent_analyses():
    limit = request.args.get("limit", 10, type=int)
    analyses = read_json(Config.ANALYSES_FILE, default=[])
    return jsonify({"analyses": analyses[:limit]})


@ai_bp.route("/analyses/<symbol>", methods=["GET"])
def latest_analysis_for_symbol(symbol):
    """Returns the most recent saved analysis for a symbol, if one exists."""
    symbol = symbol.upper().strip()
    analyses = read_json(Config.ANALYSES_FILE, default=[])
    for record in analyses:
        if record.get("symbol") == symbol:
            return jsonify(record)
    return jsonify(None)