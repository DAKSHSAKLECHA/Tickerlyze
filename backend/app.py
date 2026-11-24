from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix
from config import Config
from services import database
from routes.stock_routes import stock_bp
from routes.ai_routes import ai_bp
from routes.earnings_routes import earnings_bp
from routes.watchlist_routes import watchlist_bp
from routes.dashboard_routes import dashboard_bp

def create_app(test_config=None):
    app = Flask(__name__)
    app.config.update(MAX_CONTENT_LENGTH=8192, RATE_LIMIT_ENABLED=True)
    if test_config:
        app.config.update(test_config)
    if Config.TRUST_PROXY_COUNT:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=Config.TRUST_PROXY_COUNT, x_proto=Config.TRUST_PROXY_COUNT)
    CORS(app, origins=Config.CORS_ORIGINS)
    database.init_database()
    database.import_legacy_data()
    for blueprint in (stock_bp, ai_bp, earnings_bp, watchlist_bp, dashboard_bp):
        app.register_blueprint(blueprint)

    @app.before_request
    def protect_api():
        if not request.path.startswith('/api/') or request.path == '/api/health' or request.method == 'OPTIONS':
            return None
        if app.config['RATE_LIMIT_ENABLED']:
            allowed, retry = database.consume('http:' + (request.remote_addr or 'unknown'), 180, 60)
            if not allowed:
                return jsonify(error='Too many requests. Please wait a moment.'), 429, {'Retry-After': str(retry)}

    @app.after_request
    def response_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        if request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        return response

    @app.get('/api/health')
    def health():
        database.init_database()
        return jsonify(status='ok', version='2.0', storage='postgresql' if Config.DATABASE_URL else 'sqlite')

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify(error=error.description), error.code

    @app.errorhandler(Exception)
    def unexpected(error):
        app.logger.exception('Request failed')
        return jsonify(error='The service is temporarily unavailable. Please retry shortly.'), 503

    return app

def __getattr__(name):
    # Keep existing Render start commands using app:app working during rollout.
    if name == 'app':
        application = create_app()
        globals()['app'] = application
        return application
    raise AttributeError(name)

if __name__ == '__main__':
    create_app().run(host='0.0.0.0', port=Config.PORT, debug=Config.FLASK_DEBUG)
