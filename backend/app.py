from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from routes.stock_routes import stock_bp
from routes.ai_routes import ai_bp
from routes.risk_routes import risk_bp
from routes.earnings_routes import earnings_bp
from routes.watchlist_routes import watchlist_bp
from routes.dashboard_routes import dashboard_bp


def create_app():
    app = Flask(__name__)
    CORS(app, origins=Config.CORS_ORIGINS)

    app.register_blueprint(stock_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(risk_bp)
    app.register_blueprint(earnings_bp)
    app.register_blueprint(watchlist_bp)
    app.register_blueprint(dashboard_bp)

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok"})

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.FLASK_DEBUG)
