"""
Main FastAPI application.
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager

from app.core.config import settings
from app.models.schemas import HealthCheck, ErrorResponse
from app.api import auth_router, research_router, storage_router


# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"🚀 Starting {settings.project_name} v{settings.version}")
    print(f"📍 Environment: {settings.environment}")
    yield
    # Shutdown
    print("👋 Shutting down application")


# Create FastAPI app
app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    description="A 3D Memory Palace with AI-powered research assistant",
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
    lifespan=lifespan
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    if settings.debug:
        detail = str(exc)
    else:
        detail = "An unexpected error occurred"

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="Internal Server Error",
            detail=detail
        ).model_dump()
    )


# Health check endpoint
@app.get("/health", response_model=HealthCheck, tags=["health"])
@limiter.limit("30/minute")
async def health_check(request: Request):
    """
    Health check endpoint.

    Returns application status and version information.
    """
    # Test external services
    services_status = {
        "anthropic": bool(settings.anthropic_api_key),
        "google_oauth": bool(settings.google_client_id and settings.google_client_secret),
    }

    return HealthCheck(
        status="healthy",
        version=settings.version,
        services=services_status
    )


# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.project_name,
        "version": settings.version,
        "docs": "/api/docs" if settings.debug else "Documentation disabled in production",
        "health": "/health"
    }


# Include routers
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(research_router, prefix=settings.api_v1_prefix)
app.include_router(storage_router, prefix=settings.api_v1_prefix)


# Development-only endpoints
if settings.debug:
    @app.get("/debug/config", tags=["debug"])
    async def debug_config():
        """Debug endpoint to check configuration (only in development)."""
        return {
            "environment": settings.environment,
            "debug": settings.debug,
            "cors_origins": settings.cors_origins_list,
            "api_prefix": settings.api_v1_prefix,
            "has_anthropic_key": bool(settings.anthropic_api_key),
            "has_google_credentials": bool(
                settings.google_client_id and settings.google_client_secret
            ),
        }
