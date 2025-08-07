import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.database import Document, ChatSession, ChatMessage
from app.services.vector_store import VectorStore
from app.services.embedding_service import EmbeddingService
from app.services.llm_service import LLMService


class ChatService:
    def __init__(self):
        self.vector_store = VectorStore()
        self.embedding_service = EmbeddingService()
        self.llm_service = LLMService()
    
    async def process_question(
        self, 
        question: str, 
        document_id: int,
        session_id: Optional[int],
        db: Session
    ) -> Dict[str, Any]:
        """
        Process a question using the RAG pipeline.
        """
        try:
            # Verify document exists
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise Exception(f"Document with ID {document_id} not found")
            
            if document.processing_status != "completed":
                raise Exception(f"Document is not ready for querying. Status: {document.processing_status}")
            
            # Generate embedding for the question
            question_embedding = await self.embedding_service.generate_single_embedding(question)
            
            # Perform similarity search
            search_results = self.vector_store.similarity_search(
                query_embedding=question_embedding,
                document_id=document_id,
                top_k=5
            )
            
            if not search_results:
                return {
                    "answer": "I couldn't find relevant information in the document to answer your question.",
                    "context_chunks": [],
                    "session_id": session_id
                }
            
            # Build RAG prompt
            prompt = self.llm_service.build_rag_prompt(question, search_results)
            
            # Generate response
            response_text = ""
            async for chunk in self.llm_service.generate_response(prompt, stream=False):
                response_text += chunk
            
            # Create or get chat session
            if not session_id:
                session = ChatSession(
                    document_id=document_id,
                    title=await self.llm_service.generate_chat_title(question)
                )
                db.add(session)
                db.commit()
                db.refresh(session)
                session_id = session.id
            else:
                session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
                if not session:
                    raise Exception(f"Chat session {session_id} not found")
            
            # Save messages to database
            user_message = ChatMessage(
                session_id=session_id,
                content=question,
                role="user"
            )
            
            assistant_message = ChatMessage(
                session_id=session_id,
                content=response_text,
                role="assistant",
                context_chunks=json.dumps([
                    {
                        "content": chunk["content"],
                        "score": chunk["score"],
                        "chunk_index": chunk["metadata"].get("chunk_index", 0)
                    }
                    for chunk in search_results
                ])
            )
            
            db.add(user_message)
            db.add(assistant_message)
            db.commit()
            
            return {
                "answer": response_text,
                "context_chunks": search_results,
                "session_id": session_id
            }
            
        except Exception as e:
            raise Exception(f"Error processing question: {str(e)}")
    
    async def stream_response(
        self, 
        question: str, 
        document_id: int,
        session_id: Optional[int],
        db: Session
    ):
        """
        Stream response for real-time chat.
        """
        try:
            # Verify document exists
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                yield {"type": "error", "content": f"Document with ID {document_id} not found"}
                return
            
            if document.processing_status != "completed":
                yield {"type": "error", "content": f"Document is not ready. Status: {document.processing_status}"}
                return
            
            # Generate embedding for the question
            yield {"type": "status", "content": "Searching document..."}
            question_embedding = await self.embedding_service.generate_single_embedding(question)
            
            # Perform similarity search
            search_results = self.vector_store.similarity_search(
                query_embedding=question_embedding,
                document_id=document_id,
                top_k=5
            )
            
            if not search_results:
                yield {"type": "answer", "content": "I couldn't find relevant information in the document to answer your question."}
                return
            
            # Send context information
            yield {"type": "context", "content": search_results}
            
            # Create or get chat session
            if not session_id:
                session = ChatSession(
                    document_id=document_id,
                    title=await self.llm_service.generate_chat_title(question)
                )
                db.add(session)
                db.commit()
                db.refresh(session)
                session_id = session.id
                yield {"type": "session", "content": session_id}
            
            # Build RAG prompt
            prompt = self.llm_service.build_rag_prompt(question, search_results)
            
            # Stream response
            yield {"type": "status", "content": "Generating response..."}
            
            response_text = ""
            async for chunk in self.llm_service.generate_response(prompt, stream=True):
                response_text += chunk
                yield {"type": "answer_chunk", "content": chunk}
            
            # Save messages to database
            user_message = ChatMessage(
                session_id=session_id,
                content=question,
                role="user"
            )
            
            assistant_message = ChatMessage(
                session_id=session_id,
                content=response_text,
                role="assistant",
                context_chunks=json.dumps([
                    {
                        "content": chunk["content"],
                        "score": chunk["score"],
                        "chunk_index": chunk["metadata"].get("chunk_index", 0)
                    }
                    for chunk in search_results
                ])
            )
            
            db.add(user_message)
            db.add(assistant_message)
            db.commit()
            
            yield {"type": "complete", "content": {"session_id": session_id}}
            
        except Exception as e:
            yield {"type": "error", "content": f"Error: {str(e)}"}
