import { useState, useEffect, useCallback } from 'react';
import { WebSocketMessage } from '@shared/schema';

interface UseWebSocketProps {
  onOpen?: () => void;
  onMessage?: (data: WebSocketMessage) => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket({ onOpen, onMessage, onClose, onError }: UseWebSocketProps = {}) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      if (onOpen) onOpen();
    };
    
    ws.onclose = (e) => {
      setIsConnected(false);
      if (onClose) onClose();
    };
    
    ws.onerror = (e) => {
      setError(e);
      if (onError) onError(e);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };
    
    setSocket(ws);
    
    return () => {
      ws.close();
    };
  }, [onOpen, onMessage, onClose, onError]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, [socket]);

  return {
    socket,
    isConnected,
    error,
    sendMessage
  };
}
