export interface Document {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  upload_date: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  total_chunks: number;
  error_message?: string;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  context_chunks?: string;
}

export interface ChatSession {
  id: number;
  document_id: number;
  title?: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface SearchResult {
  content: string;
  score: number;
  metadata: {
    document_id: number;
    chunk_index: number;
    chunk_length: number;
  };
}

export interface WebSocketMessage {
  type: 'connected' | 'status' | 'context' | 'session' | 'answer_chunk' | 'complete' | 'error';
  content: any;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
