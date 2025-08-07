# Project 1: AI-Powered Document Q&A System
## Architecture & Implementation Guide

### 🎯 Project Overview
Build a RAG (Retrieval-Augmented Generation) system that allows users to upload documents and ask questions about their content in real-time. Think "ChatGPT for your documents."

### 🏗️ System Architecture
```
Frontend (React) ↔ FastAPI Backend ↔ ChromaDB ↔ Claude/OpenAI API
                              ↔ PostgreSQL ↔ File Storage
```

### 📚 Tech Stack
- **Backend**: FastAPI, SQLAlchemy, Pydantic
- **Frontend**: React, TypeScript, Tailwind CSS
- **Vector DB**: ChromaDB for embeddings
- **LLM**: Claude API or OpenAI GPT-4
- **Database**: PostgreSQL for metadata
- **File Processing**: PyPDF2, python-docx
- **Real-time**: WebSocket for chat

---

## 🏃‍♂️ Implementation Steps

### Phase 1: Backend Foundation (15 minutes)

#### 1. Project Structure Setup
```
app/
├── main.py                    # FastAPI app + CORS
├── api/
│   ├── documents.py          # Upload, list, delete endpoints  
│   ├── chat.py              # WebSocket chat endpoint
│   └── search.py            # Semantic search endpoint
├── services/
│   ├── document_processor.py # PDF extraction + chunking
│   ├── embedding_service.py  # OpenAI embeddings integration
│   └── vector_store.py      # ChromaDB operations
├── models/
│   ├── database.py          # SQLAlchemy models
│   └── schemas.py           # Pydantic request/response models
└── core/
    └── config.py            # Environment variables
```

#### 2. Key API Endpoints to Implement
```python
# Document management
POST /api/documents/upload     # File upload + processing
GET /api/documents/           # List all documents
DELETE /api/documents/{id}    # Remove document + embeddings

# Chat interface  
WS /api/chat/{document_id}    # WebSocket for real-time Q&A

# Search functionality
POST /api/search/semantic     # Direct semantic search
```

#### 3. Database Models Design
**Documents Table:**
- id, filename, upload_date, processing_status, total_chunks

**Chat Sessions Table:**  
- id, document_id, created_at, title

**Chat Messages Table:**
- id, session_id, content, role (user/assistant), timestamp

#### 4. RAG Pipeline Implementation Strategy
1. **Document Processing**: Extract text → Split into 1000-char chunks with 200 overlap
2. **Embedding Generation**: Use OpenAI text-embedding-ada-002  
3. **Vector Storage**: Store in ChromaDB with metadata
4. **Query Processing**: Embed question → Similarity search → Top 5 chunks
5. **Response Generation**: Build prompt with context → Send to Claude → Stream response

### Phase 2: Core Services (20 minutes)

#### Document Processor Service
**Responsibilities:**
- Handle multiple file formats (PDF, DOCX, TXT)
- Smart text chunking with sentence boundaries
- Generate embeddings via OpenAI API
- Store chunks in ChromaDB with metadata

**Key Methods to Implement:**
- `process_document(file_path, document_id)`
- `extract_text(file_path, file_type)`  
- `create_chunks(text, chunk_size=1000)`
- `generate_embeddings(chunks)`

#### Vector Store Service  
**Responsibilities:**
- ChromaDB connection management
- Add document chunks with embeddings
- Similarity search functionality
- Clean up deleted documents

**Key Methods to Implement:**
- `add_document_chunks(document_id, chunks, embeddings)`
- `similarity_search(query, document_id, top_k=5)`
- `delete_document(document_id)`

#### Chat Service
**Responsibilities:**  
- WebSocket connection management
- RAG query processing
- Response streaming
- Chat history persistence

**Key Methods to Implement:**
- `handle_websocket_connection(websocket, document_id)`
- `process_question(question, document_id)`
- `build_rag_prompt(question, retrieved_chunks)`

### Phase 3: Frontend Implementation (10 minutes)

#### Component Structure
```
src/
├── components/
│   ├── DocumentUpload.tsx    # Drag-n-drop file upload
│   ├── DocumentList.tsx      # Show uploaded documents  
│   ├── ChatInterface.tsx     # Main chat UI
│   ├── MessageBubble.tsx     # Individual chat messages
│   └── ProcessingStatus.tsx  # Upload progress indicator
├── hooks/
│   ├── useWebSocket.ts       # WebSocket connection hook
│   ├── useDocuments.ts       # Document CRUD operations
│   └── useFileUpload.ts      # File upload with progress
└── services/
    ├── api.ts               # HTTP client (axios)
    └── websocket.ts         # WebSocket client wrapper
```

#### Key Frontend Features to Build
1. **File Upload**: Drag-and-drop with progress bars
2. **Document Management**: List view with delete functionality  
3. **Real-time Chat**: WebSocket-based chat interface
4. **Message Display**: User/AI message bubbles with timestamps
5. **Context Display**: Show retrieved document chunks for transparency

---

## 🔧 Technical Implementation Details

### ChromaDB Integration
```python
# Initialize ChromaDB client
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("documents")

# Add documents with embeddings
collection.add(
    documents=chunks,
    embeddings=embeddings,  
    ids=[f"{doc_id}_{i}" for i in range(len(chunks))],
    metadatas=[{"doc_id": doc_id, "chunk": i} for i in range(len(chunks))]
)

# Search similar chunks  
results = collection.query(
    query_texts=[question],
    n_results=5,
    where={"doc_id": document_id}
)
```

### WebSocket Chat Implementation
```python
# FastAPI WebSocket endpoint
@app.websocket("/api/chat/{document_id}")
async def chat_websocket(websocket: WebSocket, document_id: str):
    await websocket.accept()
    try:
        while True:
            # Receive question
            question = await websocket.receive_text()
            
            # Process with RAG pipeline
            response = await process_rag_query(question, document_id)
            
            # Stream response back
            await websocket.send_text(response)
    except WebSocketDisconnect:
        pass
```

### React WebSocket Hook
```typescript
// Custom hook for WebSocket chat
const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  useEffect(() => {
    const ws = new WebSocket(url);
    ws.onmessage = (event) => {
      // Handle incoming messages
    };
    setSocket(ws);
    
    return () => ws.close();
  }, [url]);
  
  const sendMessage = (message: string) => {
    socket?.send(message);
  };
  
  return { messages, sendMessage };
};
```

---

## 📊 Performance Considerations

### Optimization Strategies
1. **Chunking Strategy**: Balance between context preservation and search accuracy
2. **Embedding Caching**: Cache embeddings to avoid re-computation  
3. **Connection Pooling**: Reuse database connections
4. **Async Processing**: Use background tasks for document processing
5. **Rate Limiting**: Prevent abuse of expensive LLM calls

### Scaling Approach
- **Horizontal Scaling**: Multiple FastAPI instances behind load balancer
- **Vector DB Scaling**: ChromaDB persistence with backup strategies  
- **File Storage**: Move to S3/Azure Blob for production
- **Monitoring**: Add logging for query performance and LLM costs

---

## 🚀 Deployment Strategy

### Development Setup
```bash
# Backend
pip install fastapi uvicorn chromadb openai anthropic
uvicorn app.main:app --reload

# Frontend  
npx create-react-app frontend --template typescript
npm install axios @types/ws
npm start
```

### Docker Deployment
```yaml
# docker-compose.yml
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./uploads:/app/uploads
      - ./chroma_db:/app/chroma_db
      
  frontend:
    build: ./frontend  
    ports: ["3000:3000"]
    environment:
      - REACT_APP_API_URL=http://localhost:8000
```

---

## 🎤 Demo Script for Interview

### 5-Minute Demo Flow
1. **Upload Document**: "I'll upload this financial report PDF"
2. **Processing Status**: "Watch it extract text and create embeddings"  
3. **Ask Questions**: "What were the Q3 revenue figures?"
4. **Show Context**: "Here are the document chunks it used to answer"
5. **Follow-up**: "How did this compare to last year?"
6. **Real-time**: "Notice the streaming response and chat history"

### Technical Talking Points
- **RAG Benefits**: "Better than fine-tuning for specific documents"  
- **Vector Similarity**: "Using cosine similarity on embeddings"
- **Chunking Strategy**: "Balancing context vs. search granularity"
- **Real-time UX**: "WebSocket for streaming responses"
- **Enterprise Ready**: "Audit trails, user auth, document permissions"

### Business Value for Morgan Stanley
- **Internal Knowledge Base**: "Search through research reports, compliance docs"
- **Client Services**: "Quick answers from client documents and contracts"  
- **Regulatory Compliance**: "Audit trail of all Q&A interactions"
- **Cost Efficiency**: "Reduce time spent manually searching documents"

---

## 💡 Extension Ideas (If Extra Time)
- **Multi-document Chat**: Query across multiple documents simultaneously
- **Citation Tracking**: Show exact page/paragraph references  
- **Document Comparison**: "Compare these two quarterly reports"
- **Access Control**: User permissions and document sharing
- **Analytics Dashboard**: Usage metrics and popular queries