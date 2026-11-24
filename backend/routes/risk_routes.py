from flask import Blueprint, jsonify
from services import stock_service

risk_bp = Blueprint('risk', __name__, url_prefix='/api/risk')

@risk_bp.route('/<symbol>', methods=['GET'])
def get_risk(symbol):
    try:
        history = stock_service.get_history(symbol.upper().strip(), period='6mo', interval='1d')
        return jsonify(symbol=symbol.upper(), priceIndicators=history['priceIndicators'],
                       fetchedAt=history['fetchedAt'], stale=history['stale'])
    except stock_service.StockNotFoundError as exc:
        return jsonify(error=str(exc)), 404
    except stock_service.MarketDataUnavailable as exc:
        return jsonify(error=str(exc)), 503, {'Retry-After': '120'}
