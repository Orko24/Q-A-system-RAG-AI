import json
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db, Document, ChatSession
from app.models.schemas import ChatSessionResponse
from app.services.chat_service import ChatService

router = APIRouter(prefix="/api/chat", tags=["chat"])

chat_service = ChatService()


@router.websocket("/{document_id}")
async def chat_websocket(websocket: WebSocket, document_id: int):
    """WebSocket endpoint for real-time chat with documents."""
    await websocket.accept()
    
    try:
        # Get database session
        db = next(get_db())
        
        # Verify document exists and is ready
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            await websocket.send_text(json.dumps({
                "type": "error",
                "content": f"Document with ID {document_id} not found"
            }))
            await websocket.close()
            return
        
        if document.processing_status != "completed":
            await websocket.send_text(json.dumps({
                "type": "error", 
                "content": f"Document is not ready for chat. Status: {document.processing_status}"
            }))
            await websocket.close()
            return
        
        # Send initial success message
        await websocket.send_text(json.dumps({
            "type": "connected",
            "content": f"Connected to document: {document.original_filename}"
        }))
        
        session_id = None
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message_data = json.loads(data)
                question = message_data.get("message", "").strip()
                session_id = message_data.get("session_id", session_id)
                
                if not question:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "content": "Message cannot be empty"
                    }))
                    continue
                
                # Process question and stream response
                async for response in chat_service.stream_response(
                    question, document_id, session_id, db
                ):
                    await websocket.send_text(json.dumps(response))
                    
                    # Update session_id if a new session was created
                    if response.get("type") == "session":
                        session_id = response.get("content")
                
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "content": "Invalid JSON format"
                }))
            except Exception as e:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "content": f"Error processing message: {str(e)}"
                }))
                
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for document {document_id}")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "content": f"Connection error: {str(e)}"
            }))
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


@router.get("/{document_id}/sessions")
async def get_chat_sessions(document_id: int, db: Session = Depends(get_db)):
    """Get all chat sessions for a document."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    sessions = db.query(ChatSession).filter(
        ChatSession.document_id == document_id
    ).order_by(ChatSession.updated_at.desc()).all()
    
    return sessions


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(session_id: int, db: Session = Depends(get_db)):
    """Get a specific chat session with messages."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    return session


@router.delete("/sessions/{session_id}")
async def delete_chat_session(session_id: int, db: Session = Depends(get_db)):
    """Delete a chat session and its messages."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    db.delete(session)
    db.commit()
    
    return {"message": "Chat session deleted successfully"}
