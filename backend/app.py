
import os
from flask import Flask, render_template
from flask_jwt_extended import JWTManager
from Application.database import db
import webbrowser
 
# frontend folder sits one level up from backend/
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BACKEND_DIR, '..', 'frontend')
DB_PATH = os.path.join(BACKEND_DIR, 'placement-portal.sqlite3')
 
 
def create_app():
    app = Flask(
        __name__,
        template_folder=os.path.join(FRONTEND_DIR),          # index.html lives here
        static_folder=os.path.join(FRONTEND_DIR, 'static'),  # static/ lives here
        static_url_path='/static',
    )
    app.debug = True
 
    # Absolute path — guarantees Flask, Celery worker, and any manual scripts
    # all point at the exact same database file, regardless of the
    # process's current working directory.
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
    app.config['SECRET_KEY'] = 'secret'
    app.config['JWT_SECRET_KEY'] = 'jwt-secret-change-me'
    app.config['REDIS_HOST'] = 'localhost'
    app.config['REDIS_PORT'] = 6379
 
    db.init_app(app)
    JWTManager(app)
 
    from Application.cache import cache
    cache.init_app(app)
 
    from Application.controller import init_routes
    init_routes(app)
 
    # Serve the Vue SPA for every non-API route
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_spa(path):
        if path.startswith('api/'):
            from flask import abort
            abort(404)
        return render_template('index.html')
 
    return app
 
 
app = create_app()
 
 
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
 
        from Application.model import User
        if not User.query.filter_by(role='admin').first():
            admin = User(name='Admin', email='admin@ppa.local', role='admin')
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print('Admin seeded: admin@ppa.local / admin123')
 
    webbrowser.open('http://127.0.0.1:5000/')
    app.run(debug=True)
 