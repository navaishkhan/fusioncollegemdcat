"""Vercel serverless entry point — app/ lives alongside this file."""
from mangum import Mangum
from app.main import app

handler = Mangum(app, lifespan="off")
