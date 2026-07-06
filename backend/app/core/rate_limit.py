"""Simple in-memory rate limiter for auth endpoints."""
import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding window rate limiter on auth routes."""

    def __init__(self, app):
        super().__init__(app)
        self._windows: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        path = request.url.path

        # Only rate-limit auth endpoints
        if path.startswith("/api/auth/"):
            ip = request.client.host if request.client else "unknown"
            key = f"{path}:{ip}"
            now = time.time()
            window = self._windows[key]
            cutoff = now - 60
            while window and window[0] < cutoff:
                window.pop(0)

            if len(window) >= settings.rate_limit_per_minute:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please try again later."},
                )

            window.append(now)

        return await call_next(request)
