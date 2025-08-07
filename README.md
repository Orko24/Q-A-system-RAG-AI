# AI-Powered Document Q&A System

A full-stack RAG (Retrieval-Augmented Generation) application that allows users to upload documents and ask questions about their content in real-time. Built with FastAPI, React, ChromaDB, and LLM integration.

![System Architecture](https://img.shields.io/badge/Architecture-RAG%20System-blue)
![Tech Stack](https://img.shields.io/badge/Tech-FastAPI%20%7C%20React%20%7C%20PostgreSQL%20%7C%20ChromaDB-green)
![Docker](https://img.shields.io/badge/Deployment-Docker%20Compose-blue)

## 🎯 Features

- **Document Upload**: Support for PDF, DOCX, DOC, and TXT files (up to 50MB)
- **Real-time Chat**: WebSocket-based chat interface with streaming responses
- **RAG Pipeline**: Advanced document chunking and vector similarity search
- **Document Management**: Upload, view, and delete documents with processing status
- **Context Display**: Show source chunks used for answer generation
- **Scalable Architecture**: Docker-based deployment with environment configuration

## 🏗️ System Architecture

```
Frontend (React/TypeScript) ↔ FastAPI Backend ↔ ChromaDB Vector Store
                                      ↕
                              PostgreSQL Database ↔ OpenAI/Claude API
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API Key (required for embeddings)
- Claude API Key or OpenAI API Key (required for LLM responses)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd AI_Power_Document_Q_A_System
```

### 2. Environment Configuration

Create your environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=qdocument_qa
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here

# API Keys (Required)
OPENAI_API_KEY=sk-your-openai-api-key-here
CLAUDE_API_KEY=sk-ant-your-claude-api-key-here

# Application Security
SECRET_KEY=your-super-secret-key-at-least-32-characters-long

# Optional Configuration
MAX_FILE_SIZE_MB=50
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

### 3. Get API Keys

#### OpenAI API Key (Required for embeddings)
1. Visit [OpenAI API](https://platform.openai.com/api-keys)
2. Sign up/login and create a new API key
3. Add to `.env` as `OPENAI_API_KEY=sk-...`

#### Claude API Key (Recommended for LLM)
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up/login and create a new API key
3. Add to `.env` as `CLAUDE_API_KEY=sk-ant-...`

> **Note**: You need at least OpenAI for embeddings. For LLM responses, you can use either Claude (recommended) or OpenAI GPT-4.

### 4. Start the Application

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 📋 Usage Guide

### Document Upload
1. Navigate to the "Upload" tab
2. Drag & drop or click to select a document (PDF, DOCX, DOC, TXT)
3. Wait for processing to complete (status will show "Ready")

### Asking Questions
1. Select a processed document from the "Documents" tab
2. Go to the "Chat" tab
3. Type your question and press Enter
4. View the AI response with source context

### Example Questions
- "What is the main topic of this document?"
- "Summarize the key findings"
- "What are the conclusions and recommendations?"
- "Extract the important dates and numbers"

## 🛠️ Development Setup

### Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### Database Management

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d qdocument_qa

# View database logs
docker-compose logs postgres

# Reset database (removes all data)
docker-compose down -v
docker-compose up -d
```

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild services
docker-compose build

# View logs
docker-compose logs -f [service_name]

# Reset everything (removes all data)
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 📁 Project Structure

```
AI_Power_Document_Q_A_System/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/               # API endpoints
│   │   │   ├── documents.py   # Document management
│   │   │   ├── chat.py        # WebSocket chat
│   │   │   └── search.py      # Semantic search
│   │   ├── services/          # Core services
│   │   │   ├── document_processor.py
│   │   │   ├── embedding_service.py
│   │   │   ├── vector_store.py
│   │   │   ├── llm_service.py
│   │   │   └── chat_service.py
│   │   ├── models/            # Database models
│   │   │   ├── database.py
│   │   │   └── schemas.py
│   │   ├── core/              # Configuration
│   │   │   └── config.py
│   │   └── main.py           # FastAPI app
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                  # React Frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── DocumentUpload.tsx
│   │   │   ├── DocumentList.tsx
│   │   │   └── ChatInterface.tsx
│   │   ├── hooks/            # Custom hooks
│   │   │   ├── useDocuments.ts
│   │   │   └── useWebSocket.ts
│   │   ├── services/         # API services
│   │   │   ├── api.ts
│   │   │   └── websocket.ts
│   │   ├── types/            # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml         # Multi-service deployment
├── .env.example              # Environment template
└── README.md                 # This file
```

## ⚙️ Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `POSTGRES_PASSWORD` | Database password | - | ✅ |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | - | ✅ |
| `CLAUDE_API_KEY` | Claude API key for LLM | - | ⭐ |
| `SECRET_KEY` | Application secret key | - | ✅ |
| `MAX_FILE_SIZE_MB` | Maximum file size | 50 | ❌ |
| `CHUNK_SIZE` | Text chunk size | 1000 | ❌ |
| `CHUNK_OVERLAP` | Chunk overlap size | 200 | ❌ |

### Supported File Types

- **PDF**: `.pdf` files
- **Word Documents**: `.docx`, `.doc` files  
- **Text Files**: `.txt` files
- **Maximum Size**: 50MB per file

## 🔧 Troubleshooting

### Common Issues

#### 1. API Key Errors
```bash
# Check if API keys are set
docker-compose logs api | grep -i "api key"

# Verify in environment
docker-compose exec api env | grep API_KEY
```

#### 2. Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Reset database
docker-compose down -v && docker-compose up -d
```

#### 3. File Upload Failures
```bash
# Check upload directory permissions
docker-compose exec api ls -la /app/uploads

# View API logs
docker-compose logs api
```

#### 4. WebSocket Connection Issues
```bash
# Check CORS configuration
docker-compose logs api | grep -i cors

# Verify frontend can reach API
curl http://localhost:8000/health
```

### Debug Mode

Enable debug logging:

```bash
# Add to .env
DEBUG=True
LOG_LEVEL=DEBUG

# Restart services
docker-compose restart
```

## 📊 Performance Optimization

### Recommended Settings

For production environments:

```env
# Increase worker processes
WORKERS=4

# Optimize chunk settings
CHUNK_SIZE=800
CHUNK_OVERLAP=150

# Database connection pooling
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
```

### Monitoring

```bash
# Check resource usage
docker stats

# Monitor API performance
curl http://localhost:8000/health

# Check vector store statistics
curl http://localhost:8000/api/search/health
```

## 🚀 Production Deployment

### Security Checklist

- [ ] Change default passwords
- [ ] Use strong SECRET_KEY
- [ ] Configure HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Enable API rate limiting
- [ ] Configure backup strategy

### Scaling Considerations

- **Horizontal Scaling**: Use load balancer with multiple API instances
- **Database**: Use managed PostgreSQL service
- **File Storage**: Move to S3/Azure Blob Storage
- **Vector Database**: Consider hosted ChromaDB solutions
- **Monitoring**: Add logging and metrics collection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Review the logs: `docker-compose logs`
3. Check the [API documentation](http://localhost:8000/docs)
4. Create an issue with:
   - Docker logs
   - Error messages
   - Steps to reproduce

---

**Built for Morgan Stanley Technical Interview**  
*Demonstrating full-stack development, RAG implementation, and scalable architecture*
