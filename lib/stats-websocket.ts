// lib/websocket.ts
// This is a client-side utility for handling WebSocket connections to update stats in real-time

class StatsWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds
  private listeners: Array<(data: any) => void> = [];
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('Connected to stats WebSocket');
        this.reconnectAttempts = 0; // Reset on successful connection
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.listeners.forEach(listener => listener(data));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Disconnected from stats WebSocket');
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.reconnect();
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public addListener(callback: (data: any) => void): void {
    this.listeners.push(callback);
  }

  public removeListener(callback: (data: any) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached. Please refresh the page.');
    }
  }
}

// Create a singleton instance
let statsWebSocket: StatsWebSocket | null = null;

export const getStatsWebSocket = (url: string): StatsWebSocket => {
  if (!statsWebSocket) {
    statsWebSocket = new StatsWebSocket(url);
  }
  return statsWebSocket;
};

// For client-side real-time updates, you'd typically use something like:
// - Server-sent events (SSE)
// - WebSockets
// - Polling
// 
// Since we're working with Next.js, we'll use polling for now but the
// infrastructure is set up for WebSockets if needed in the future.