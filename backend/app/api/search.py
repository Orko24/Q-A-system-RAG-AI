from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db, Document
from app.models.schemas import SemanticSearchRequest, SemanticSearchResponse, SearchResult
from app.services.vector_store import VectorStore
from app.services.embedding_service import EmbeddingService

router = APIRouter(prefix="/api/search", tags=["search"])

vector_store = VectorStore()
embedding_service = EmbeddingService()


@router.post("/semantic", response_model=SemanticSearchResponse)
async def semantic_search(
    search_request: SemanticSearchRequest,
    db: Session = Depends(get_db)
):
    """Perform semantic search on document chunks."""
    
    # Verify document exists
    document = db.query(Document).filter(Document.id == search_request.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.processing_status != "completed":
        raise HTTPException(
            status_code=400, 
            detail=f"Document is not ready for search. Status: {document.processing_status}"
        )
    
    try:
        # Generate embedding for search query
        query_embedding = await embedding_service.generate_single_embedding(search_request.query)
        
        # Perform similarity search
        search_results = vector_store.similarity_search(
            query_embedding=query_embedding,
            document_id=search_request.document_id,
            top_k=search_request.top_k
        )
        
        # Format results
        formatted_results = [
            SearchResult(
                content=result["content"],
                score=result["score"],
                metadata=result["metadata"]
            )
            for result in search_results
        ]
        
        return SemanticSearchResponse(
            results=formatted_results,
            query=search_request.query
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


@router.get("/health")
async def search_health():
    """Check search service health."""
    try:
        is_healthy = vector_store.health_check()
        collection_info = vector_store.get_collection_info()
        
        return {
            "status": "healthy" if is_healthy else "unhealthy",
            "vector_store": collection_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")
