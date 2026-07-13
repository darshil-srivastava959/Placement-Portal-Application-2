from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from .model import User


def get_current_user():
    """Returns the authenticated User row, or None."""
    identity = get_jwt_identity()
    if not identity:
        return None
    return User.query.get(int(identity))


def role_required(*allowed_roles):
    """Decorator: restrict a route to one or more roles.
    Calls verify_jwt_in_request() itself, so routes just need @role_required('admin')
    with no extra @jwt_required() stacking."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = get_current_user()
            if user is None or user.role not in allowed_roles:
                return jsonify({"error": "Forbidden: insufficient role"}), 403
            if user.is_blacklisted:
                return jsonify({"error": "Account is blacklisted"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
