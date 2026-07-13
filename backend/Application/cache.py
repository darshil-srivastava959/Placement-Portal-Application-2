import json
import redis

# ── TTLs (seconds) ────────────────────────────────────────────
TTL_STATS         = 120   # admin dashboard stats  — 2 min
TTL_DRIVES        = 180   # approved drives list   — 3 min
TTL_DRIVE_DETAIL  = 180   # single drive detail    — 3 min

# ── Key builders ──────────────────────────────────────────────
KEY_ADMIN_STATS    = 'ppa:admin:stats'
KEY_APPROVED_DRIVES = 'ppa:drives:approved'

def key_drive(drive_id):
    return f'ppa:drive:{drive_id}'


class RedisCache:
    def __init__(self):
        self._client = None

    def init_app(self, app):
        host = app.config.get('REDIS_HOST', 'localhost')
        port = app.config.get('REDIS_PORT', 6379)
        db   = app.config.get('REDIS_DB', 0)
        self._client = redis.Redis(host=host, port=port, db=db, decode_responses=True)

    @property
    def client(self):
        return self._client

    # ── Core operations ───────────────────────────────────────

    def get(self, key):
        """Return deserialized value or None if missing / Redis is down."""
        try:
            raw = self._client.get(key)
            return json.loads(raw) if raw is not None else None
        except Exception:
            return None   # degrade gracefully if Redis is unavailable

    def set(self, key, value, ttl=60):
        """Serialize value and store with TTL (seconds)."""
        try:
            self._client.setex(key, ttl, json.dumps(value))
        except Exception:
            pass  # degrade gracefully

    def delete(self, *keys):
        """Delete one or more exact keys."""
        try:
            self._client.delete(*keys)
        except Exception:
            pass

    def delete_pattern(self, pattern):
        """Delete all keys matching a glob pattern (e.g. 'ppa:drive:*')."""
        try:
            matched = self._client.keys(pattern)
            if matched:
                self._client.delete(*matched)
        except Exception:
            pass


cache = RedisCache()
