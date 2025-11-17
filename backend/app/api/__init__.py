"""API routes."""
from .auth import router as auth_router
from .research import router as research_router
from .storage import router as storage_router

__all__ = [
    "auth_router",
    "research_router",
    "storage_router",
]
