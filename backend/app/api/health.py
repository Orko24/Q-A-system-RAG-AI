from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(prefix="/api", tags=["health"])

@router.get("/health")
async def health_check():
    """Comprehensive health check endpoint."""
    return {
        "status": "healthy",
        "service": "AI Document Q&A System",
        "version": "1.0.0",
        "api_keys_configured": {
            "openai": bool(settings.OPENAI_API_KEY),
            "claude": bool(settings.CLAUDE_API_KEY)
        }
    }
