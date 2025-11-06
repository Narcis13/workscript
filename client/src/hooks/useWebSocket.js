import { useEffect, useRef, useState, useCallback } from 'react';
export const useWebSocket = (options) => {
    const { url, protocols, reconnect = true, reconnectInterval = 1000, maxReconnectAttempts = 5, onOpen, onClose, onError, onMessage } = options;
    const [state, setState] = useState({
        socket: null,
        lastMessage: null,
        readyState: WebSocket.CLOSED,
        isConnected: false,
        reconnectAttempts: 0
    });
    const reconnectTimeoutRef = useRef();
    const shouldReconnectRef = useRef(true);
    const connect = useCallback(() => {
        try {
            const socket = new WebSocket(url, protocols);
            socket.onopen = (event) => {
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
                if (reconnect && shouldReconnectRef.current && state.reconnectAttempts < maxReconnectAttempts) {
                    const backoffDelay = Math.min(reconnectInterval * Math.pow(2, state.reconnectAttempts), 30000);
                    setState(prev => ({
                        ...prev,
                        reconnectAttempts: prev.reconnectAttempts + 1
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
                    const parsedMessage = JSON.parse(event.data);
                    setState(prev => ({
                        ...prev,
                        lastMessage: parsedMessage
                    }));
                    onMessage?.(parsedMessage);
                }
                catch (error) {
                    // Handle non-JSON messages
                    const message = {
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
        }
        catch (error) {
            console.error('WebSocket connection error:', error);
        }
    }, [url, protocols, reconnect, reconnectInterval, maxReconnectAttempts, onOpen, onClose, onError, onMessage, state.reconnectAttempts]);
    const disconnect = useCallback(() => {
        shouldReconnectRef.current = false;
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
    const sendMessage = useCallback((message) => {
        if (state.socket && state.socket.readyState === WebSocket.OPEN) {
            try {
                state.socket.send(JSON.stringify(message));
                return true;
            }
            catch (error) {
                console.error('Failed to send WebSocket message:', error);
                return false;
            }
        }
        return false;
    }, [state.socket]);
    const sendRaw = useCallback((data) => {
        if (state.socket && state.socket.readyState === WebSocket.OPEN) {
            try {
                state.socket.send(data);
                return true;
            }
            catch (error) {
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
    }, []);
    return {
        ...state,
        connect,
        disconnect,
        sendMessage,
        sendRaw
    };
};
