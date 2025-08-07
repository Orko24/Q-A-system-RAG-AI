import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy import text

from app.core.config import settings
from app.models.database import create_tables
from app.api import documents, chat, search


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application lifecycle events."""
    # Startup
    print("Starting AI Document Q&A System...")
    
    # Create database tables
    create_tables()
    print("Database tables created successfully")
    
    # Create upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    print(f"Upload directory created: {settings.UPLOAD_DIR}")
    
    # Create ChromaDB directory
    os.makedirs(settings.CHROMA_DB_PATH, exist_ok=True)
    print(f"ChromaDB directory created: {settings.CHROMA_DB_PATH}")
    
    # Verify API keys
    if settings.CLAUDE_API_KEY:
        print("API Keys configured: Claude ✓")
    else:
        print("⚠️  WARNING: CLAUDE_API_KEY not configured!")
    
    print("✅ Application startup complete!")
    
    yield
    
    # Shutdown
    print("Shutting down AI Document Q&A System...")


# Create FastAPI app
app = FastAPI(
    title="AI Document Q&A System",
    description="A RAG-based system for document question answering",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(search.router)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "AI Document Q&A System API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check database connection
        from app.models.database import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Check vector store
    try:
        from app.services.vector_store import VectorStore
        vector_store = VectorStore()
        vector_status = "healthy" if vector_store.health_check() else "unhealthy"
    except Exception as e:
        vector_status = f"unhealthy: {str(e)}"
    
    # Check API keys
    api_keys = {
        "claude": bool(settings.CLAUDE_API_KEY)
    }
    
    return {
        "status": "healthy",
        "database": db_status,
        "vector_store": vector_status,
        "api_keys": api_keys,
        "upload_dir": os.path.exists(settings.UPLOAD_DIR),
        "chroma_dir": os.path.exists(settings.CHROMA_DB_PATH)
    }


@app.get("/api/info")
async def api_info():
    """Get API configuration information."""
    return {
        "max_file_size_mb": settings.MAX_FILE_SIZE / (1024 * 1024),
        "supported_file_types": ["pdf", "docx", "doc", "txt"],
        "chunk_size": settings.CHUNK_SIZE,
        "chunk_overlap": settings.CHUNK_OVERLAP,
        "available_llms": ["claude"] if settings.CLAUDE_API_KEY else [],
        "embedding_model": "sentence-transformers/all-MiniLM-L6-v2"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
