"""Vercel serverless entry point – placed at project root."""
import sys
from pathlib import Path

# Vercel runs from a temp dir, so add backend/ to sys.path explicitly
sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))

from mangum import Mangum
from app.main import app

handler = Mangum(app, lifespan="off")
