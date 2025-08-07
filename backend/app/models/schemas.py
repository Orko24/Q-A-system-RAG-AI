from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Document schemas
class DocumentBase(BaseModel):
    filename: str
    file_type: str


class DocumentCreate(DocumentBase):
    pass


class DocumentResponse(DocumentBase):
    id: int
    original_filename: str
    file_size: int
    upload_date: datetime
    processing_status: str
    total_chunks: int
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


# Chat schemas
class ChatMessageBase(BaseModel):
    content: str
    role: str


class ChatMessageCreate(ChatMessageBase):
    session_id: int
    context_chunks: Optional[str] = None


class ChatMessageResponse(ChatMessageBase):
    id: int
    session_id: int
    timestamp: datetime
    context_chunks: Optional[str] = None
    
    class Config:
        from_attributes = True


class ChatSessionCreate(BaseModel):
    document_id: int
    title: Optional[str] = None


class ChatSessionResponse(BaseModel):
    id: int
    document_id: int
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageResponse] = []
    
    class Config:
        from_attributes = True


# Search schemas
class SemanticSearchRequest(BaseModel):
    query: str
    document_id: int
    top_k: int = 5


class SearchResult(BaseModel):
    content: str
    score: float
    metadata: dict


class SemanticSearchResponse(BaseModel):
    results: List[SearchResult]
    query: str


# WebSocket schemas
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[int] = None


class ChatResponse(BaseModel):
    message: str
    role: str
    context_chunks: Optional[List[dict]] = None
    session_id: int
    timestamp: datetime
