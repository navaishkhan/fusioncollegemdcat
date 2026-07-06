"""Vercel serverless entry point."""
import sys
from pathlib import Path

# Ensure the backend package is importable
backend_dir = str(Path(__file__).resolve().parents[1])
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from mangum import Mangum
from app.main import app

handler = Mangum(app, lifespan="off")
