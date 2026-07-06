"""Vercel serverless entry point — app/ lives alongside this file."""
import sys
import os

# The Python function runs from /var/task/ but this file is at /var/task/api/index.py
_api_dir = os.path.dirname(os.path.abspath(__file__))
if _api_dir not in sys.path:
    sys.path.insert(0, _api_dir)

from mangum import Mangum
from app.main import app

handler = Mangum(app, lifespan="off")
