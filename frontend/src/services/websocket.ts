import { WebSocketMessage } from '../types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessage: (message: WebSocketMessage) => void;
  private onError: (error: Event) => void;
  private onClose: (event: CloseEvent) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;

  constructor(
    url: string,
    onMessage: (message: WebSocketMessage) => void,
    onError: (error: Event) => void,
    onClose: (event: CloseEvent) => void
  ) {
    this.url = url;
    this.onMessage = onMessage;
    this.onError = onError;
    this.onClose = onClose;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.onMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          this.onError(error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          this.onClose(event);
          
          // Attempt to reconnect if not closed intentionally
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++;
              this.connect().catch(() => {
                // Reconnection failed
              });
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  sendMessage(message: string, sessionId?: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const messageData = {
        message,
        session_id: sessionId,
      };
      this.ws.send(JSON.stringify(messageData));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const createWebSocketURL = (documentId: number): string => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // In Docker: use current host so Nginx can proxy WebSocket connections
  // In development: use direct localhost connection
  let wsHost: string;
  if (process.env.NODE_ENV === 'production') {
    wsHost = window.location.host; // Use current host (nginx proxy)
  } else {
    wsHost = process.env.REACT_APP_WS_URL || 
             process.env.REACT_APP_API_URL?.replace('http://', '').replace('https://', '') || 
             'localhost:8000';
  }
  
  return `${wsProtocol}//${wsHost}/api/chat/${documentId}`;
};
