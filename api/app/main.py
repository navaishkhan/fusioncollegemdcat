from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.database import Base, get_engine
from app.routers import admin, auth, batches, health, parent, questions, tests

app = FastAPI(
    title="Fusion MDCAT API",
    description="MDCAT test platform for Fusion College Narowal",
    version="1.0.0",
)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(batches.router, prefix="/api")
app.include_router(tests.router, prefix="/api")
app.include_router(parent.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.on_event("startup")
def on_startup():
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
