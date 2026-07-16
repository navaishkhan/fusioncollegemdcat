"""Vercel serverless entry point — app/ lives alongside this file."""
import sys
import os

_api_dir = os.path.dirname(os.path.abspath(__file__))
if _api_dir not in sys.path:
    sys.path.insert(0, _api_dir)

from mangum import Mangum
from app.main import app
from app.database import Base, get_engine

# Ensure tables exist on cold start (Mangum lifespan="off" skips FastAPI startup events)
# Wrap in try/except so a DB failure doesn't break the function entirely
_tables_created = False


def ensure_tables():
    global _tables_created
    if not _tables_created:
        try:
            engine = get_engine()
            Base.metadata.create_all(bind=engine)
            with engine.begin() as conn:
                from sqlalchemy import text
                conn.execute(text("ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_preset BOOLEAN DEFAULT FALSE"))
            _tables_created = True
        except Exception:
            pass  # Will retry on next request


# Create a wrapper handler that ensures tables before each request
_raw_handler = Mangum(app, lifespan="off")


def handler(event, context):
    ensure_tables()
    return _raw_handler(event, context)
