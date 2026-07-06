"""Vercel serverless entry point."""
import sys
import os
from pathlib import Path

# Compute absolute path to backend directory
_backend = Path(__file__).resolve().parent.parent  # backend/
_bp = str(_backend)
if _bp not in sys.path:
    sys.path.insert(0, _bp)
os.environ["PYTHONPATH"] = _bp

from mangum import Mangum
from app.main import app

handler = Mangum(app, lifespan="off")
