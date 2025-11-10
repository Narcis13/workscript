import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp?: number;
}

export interface WebSocketOptions {
  url: string;
  protocols?: string | string[];
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

export interface WebSocketState {
  socket: WebSocket | null;
  lastMessage: WebSocketMessage | null;
  readyState: number;
  isConnected: boolean;
  reconnectAttempts: number;
}

export const useWebSocket = (options: WebSocketOptions) => {
  const {
    url,
    protocols,
    reconnect = true,
    reconnectInterval = 1000,
    maxReconnectAttempts = 5,
    onOpen,
    onClose,
    onError,
    onMessage
  } = options;

  const [state, setState] = useState<WebSocketState>({
    socket: null,
    lastMessage: null,
    readyState: WebSocket.CLOSED,
    isConnected: false,
    reconnectAttempts: 0
  });

  const reconnectTimeoutRef = useRef<number | undefined>(undefined);
  const shouldReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    try {
      const socket = new WebSocket(url, protocols);

      socket.onopen = (event) => {
        reconnectAttemptsRef.current = 0;
        setState(prev => ({
          ...prev,
          socket,
          readyState: socket.readyState,
          isConnected: true,
          reconnectAttempts: 0
        }));
        onOpen?.(event);
      };

      socket.onclose = (event) => {
        setState(prev => ({
          ...prev,
          socket: null,
          readyState: WebSocket.CLOSED,
          isConnected: false
        }));

        onClose?.(event);

        // Handle reconnection
        if (reconnect && shouldReconnectRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const backoffDelay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );

          reconnectAttemptsRef.current += 1;
          setState(prev => ({
            ...prev,
            reconnectAttempts: reconnectAttemptsRef.current
          }));

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, backoffDelay);
        }
      };

      socket.onerror = (event) => {
        onError?.(event);
      };

      socket.onmessage = (event) => {
        try {
          const parsedMessage: WebSocketMessage = JSON.parse(event.data);
          setState(prev => ({
            ...prev,
            lastMessage: parsedMessage
          }));
          onMessage?.(parsedMessage);
        } catch (error) {
          // Handle non-JSON messages
          const message: WebSocketMessage = {
            type: 'raw',
            payload: event.data,
            timestamp: Date.now()
          };
          setState(prev => ({
            ...prev,
            lastMessage: message
          }));
          onMessage?.(message);
        }
      };

      setState(prev => ({
        ...prev,
        socket,
        readyState: socket.readyState
      }));

    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, [url, protocols, reconnect, reconnectInterval, maxReconnectAttempts, onOpen, onClose, onError, onMessage]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    reconnectAttemptsRef.current = 0;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      state.socket.close();
    }

    setState(prev => ({
      ...prev,
      socket: null,
      readyState: WebSocket.CLOSED,
      isConnected: false,
      reconnectAttempts: 0
    }));
  }, [state.socket]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      try {
        state.socket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    }
    return false;
  }, [state.socket]);

  const sendRaw = useCallback((data: string | ArrayBuffer | Blob) => {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      try {
        state.socket.send(data);
        return true;
      } catch (error) {
        console.error('Failed to send raw WebSocket data:', error);
        return false;
      }
    }
    return false;
  }, [state.socket]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (state.socket) {
        state.socket.close();
      }
    };
  }, [connect, state.socket]);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    sendRaw
  };
};
