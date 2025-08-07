import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketClient, createWebSocketURL } from '../services/websocket';
import { WebSocketMessage, SearchResult } from '../types';
import toast from 'react-hot-toast';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  contextChunks?: SearchResult[];
  isStreaming?: boolean;
}

export const useWebSocket = (documentId: number | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const wsClient = useRef<WebSocketClient | null>(null);
  const currentMessageId = useRef<string | null>(null);

  const handleMessage = useCallback((wsMessage: WebSocketMessage) => {
    switch (wsMessage.type) {
      case 'connected':
        setIsConnected(true);
        toast.success('Connected to document chat');
        break;

      case 'status':
        // Show status updates
        break;

      case 'context':
        // Store context chunks for the current response
        if (currentMessageId.current) {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === currentMessageId.current 
                ? { ...msg, contextChunks: wsMessage.content }
                : msg
            )
          );
        }
        break;

      case 'session':
        setCurrentSessionId(wsMessage.content);
        break;

      case 'answer_chunk':
        if (currentMessageId.current) {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === currentMessageId.current 
                ? { ...msg, content: msg.content + wsMessage.content }
                : msg
            )
          );
        }
        break;

      case 'complete':
        if (currentMessageId.current) {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === currentMessageId.current 
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
        }
        setIsLoading(false);
        currentMessageId.current = null;
        break;

      case 'error':
        toast.error(wsMessage.content);
        setIsLoading(false);
        if (currentMessageId.current) {
          setMessages(prev => 
            prev.filter(msg => msg.id !== currentMessageId.current)
          );
        }
        currentMessageId.current = null;
        break;
    }
  }, []);

  const handleError = useCallback((error: Event) => {
    console.error('WebSocket error:', error);
    setIsConnected(false);
    toast.error('Connection error occurred');
  }, []);

  const handleClose = useCallback((event: CloseEvent) => {
    setIsConnected(false);
    if (!event.wasClean) {
      toast.error('Connection lost. Attempting to reconnect...');
    }
  }, []);

  const connect = useCallback(async () => {
    if (!documentId || wsClient.current?.isConnected()) return;

    try {
      const wsUrl = createWebSocketURL(documentId);
      wsClient.current = new WebSocketClient(wsUrl, handleMessage, handleError, handleClose);
      await wsClient.current.connect();
    } catch (error) {
      console.error('Failed to connect:', error);
      toast.error('Failed to connect to chat service');
    }
  }, [documentId, handleMessage, handleError, handleClose]);

  const disconnect = useCallback(() => {
    if (wsClient.current) {
      wsClient.current.close();
      wsClient.current = null;
    }
    setIsConnected(false);
    setMessages([]);
    setCurrentSessionId(null);
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (!wsClient.current?.isConnected() || !message.trim()) return;

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    // Add user message
    const userMessage: ChatMessage = {
      id: userMessageId,
      content: message.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    // Add streaming assistant message
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);
    currentMessageId.current = assistantMessageId;

    try {
      wsClient.current.sendMessage(message, currentSessionId || undefined);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      setIsLoading(false);
      currentMessageId.current = null;
    }
  }, [currentSessionId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(null);
  }, []);

  useEffect(() => {
    if (documentId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [documentId, connect, disconnect]);

  return {
    isConnected,
    messages,
    isLoading,
    currentSessionId,
    sendMessage,
    clearMessages,
    connect,
    disconnect,
  };
};
