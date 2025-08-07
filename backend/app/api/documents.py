import os
import asyncio
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.models.database import get_db, Document
from app.models.schemas import DocumentResponse
from app.services.document_processor import DocumentProcessor
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStore
from app.core.config import settings

router = APIRouter(prefix="/api/documents", tags=["documents"])

document_processor = DocumentProcessor()
embedding_service = EmbeddingService()
vector_store = VectorStore()


async def process_document_background(document_id: int, file_content: bytes, file_type: str):
    """Background task to process document and generate embeddings."""
    db = next(get_db())
    
    try:
        # Update status to processing
        document = db.query(Document).filter(Document.id == document_id).first()
        document.processing_status = "processing"
        db.commit()
        
        # Extract text
        text = document_processor.extract_text(file_content, file_type)
        
        if not text.strip():
            raise Exception("No text could be extracted from the document")
        
        # Create chunks
        chunks = document_processor.create_chunks(text)
        
        if not chunks:
            raise Exception("No valid chunks could be created from the document")
        
        # Generate embeddings
        embeddings = await embedding_service.generate_embeddings(chunks)
        
        # Store in vector database
        vector_store.add_document_chunks(document_id, chunks, embeddings)
        
        # Update document status
        document.processing_status = "completed"
        document.total_chunks = len(chunks)
        db.commit()
        
    except Exception as e:
        # Update status to failed
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            document.processing_status = "failed"
            document.error_message = str(e)
            db.commit()
    
    finally:
        db.close()


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and process a document."""
    
    # Validate file type
    allowed_types = ['pdf', 'docx', 'doc', 'txt']
    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    if file_extension not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"File type '{file_extension}' not supported. Allowed types: {allowed_types}"
        )
    
    # Check file size
    file_content = await file.read()
    if len(file_content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE / (1024*1024)} MB"
        )
    
    if len(file_content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    try:
        # Save file to disk
        file_path = document_processor.save_file(file_content, file.filename)
        
        # Create document record
        document = Document(
            filename=os.path.basename(file_path),
            original_filename=file.filename,
            file_path=file_path,
            file_size=len(file_content),
            file_type=file_extension,
            processing_status="pending"
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        # Start background processing
        background_tasks.add_task(
            process_document_background,
            document.id,
            file_content,
            file_extension
        )
        
        return document
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading document: {str(e)}")


@router.get("/", response_model=List[DocumentResponse])
async def list_documents(db: Session = Depends(get_db)):
    """List all uploaded documents."""
    documents = db.query(Document).order_by(Document.upload_date.desc()).all()
    return documents


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: int, db: Session = Depends(get_db)):
    """Get a specific document by ID."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.delete("/{document_id}")
async def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Delete a document and its associated data."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        # Delete from vector store
        vector_store.delete_document(document_id)
        
        # Delete file from disk
        document_processor.delete_file(document.file_path)
        
        # Delete from database (cascade will handle related records)
        db.delete(document)
        db.commit()
        
        return {"message": "Document deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")


@router.get("/{document_id}/status")
async def get_document_status(document_id: int, db: Session = Depends(get_db)):
    """Get processing status of a document."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": document.id,
        "status": document.processing_status,
        "total_chunks": document.total_chunks,
        "error_message": document.error_message
    }
