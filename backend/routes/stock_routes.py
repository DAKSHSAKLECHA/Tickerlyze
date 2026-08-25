from flask import Blueprint, jsonify, request
from services import stock_service

stock_bp = Blueprint("stock", __name__, url_prefix="/api/stocks")


@stock_bp.route("/search", methods=["GET"])
def search_stocks():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Query parameter 'q' is required."}), 400
    try:
        results = stock_service.search_tickers(query)
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@stock_bp.route("/<symbol>", methods=["GET"])
def get_stock(symbol):
    try:
        quote = stock_service.get_quote(symbol)
        return jsonify(quote)
    except stock_service.StockNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {e}"}), 500


@stock_bp.route("/<symbol>/history", methods=["GET"])
def get_stock_history(symbol):
    period = request.args.get("period", "6mo")
    interval = request.args.get("interval", "1d")
    try:
        history = stock_service.get_history(symbol, period=period, interval=interval)
        return jsonify({"symbol": symbol.upper(), "period": period, "data": history})
    except stock_service.StockNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {e}"}), 500
