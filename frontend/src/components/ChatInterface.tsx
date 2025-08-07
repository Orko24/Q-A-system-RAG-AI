import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, User, Bot, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { Document, SearchResult } from '../types';

interface ChatInterfaceProps {
  document: Document | null;
}

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  contextChunks?: SearchResult[];
  isStreaming?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ document }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [expandedContext, setExpandedContext] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    isConnected,
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  } = useWebSocket(document?.id || null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isLoading || !isConnected) return;

    sendMessage(inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleContextExpansion = (messageId: string) => {
    setExpandedContext(expandedContext === messageId ? null : messageId);
  };

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <div className="text-center">
          <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No document selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a document from the list to start chatting
          </p>
        </div>
      </div>
    );
  }

  if (document.processing_status !== 'completed') {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin mx-auto h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Document Processing</h3>
          <p className="mt-1 text-sm text-gray-500">
            Status: {document.processing_status}
          </p>
          {document.error_message && (
            <p className="mt-1 text-sm text-red-600">
              {document.error_message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <MessageCircle className="h-5 w-5 text-primary-500" />
          <div>
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {document.original_filename}
            </h3>
            <p className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              Ask me anything about the document!
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-400">Try questions like:</p>
              <div className="space-y-1 text-xs text-gray-500">
                <p>"What is the main topic of this document?"</p>
                <p>"Summarize the key points"</p>
                <p>"What are the conclusions?"</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <div className={`flex items-center space-x-2 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className="flex-shrink-0">
                      {message.role === 'user' ? (
                        <User className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Bot className="h-4 w-4 text-primary-500" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                </div>
                
                <div
                  className={`
                    relative px-4 py-2 rounded-lg text-sm
                    ${message.role === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                    }
                    ${message.isStreaming ? 'animate-pulse' : ''}
                  `}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {message.role === 'assistant' && !message.isStreaming && (
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-all"
                      title="Copy message"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-500" />
                      )}
                    </button>
                  )}
                </div>

                {/* Context chunks */}
                {message.contextChunks && message.contextChunks.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => toggleContextExpansion(message.id)}
                      className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      {expandedContext === message.id ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      <span>View source context ({message.contextChunks.length} chunks)</span>
                    </button>
                    
                    {expandedContext === message.id && (
                      <div className="mt-2 space-y-2">
                        {message.contextChunks.map((chunk, idx) => (
                          <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-yellow-800">
                                Chunk {chunk.metadata.chunk_index + 1}
                              </span>
                              <span className="text-xs text-yellow-600">
                                Score: {(chunk.score * 100).toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-xs text-yellow-900 leading-relaxed">
                              {chunk.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Ask a question about the document..." : "Connecting..."}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={2}
              disabled={!isConnected || isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || !isConnected || isLoading}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        
        {!isConnected && (
          <p className="mt-2 text-xs text-red-500">
            Connection lost. Attempting to reconnect...
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
