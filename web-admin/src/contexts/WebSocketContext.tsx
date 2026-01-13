import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';

interface NotificationMessage {
    event_type: string;
    payload: any;
}

interface WebSocketContextType {
    isConnected: boolean;
    lastMessage: NotificationMessage | null;
    sendMessage: (msg: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<NotificationMessage | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<number | undefined>(undefined);

    const connect = useCallback(() => {
        // Use window.location only if we served from same origin, or env var
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';

        // Close existing if any
        if (ws.current) {
            ws.current.close();
        }

        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('WebSocket Connected');
            setIsConnected(true);
        };

        socket.onclose = () => {
            console.log('WebSocket Disconnected');
            setIsConnected(false);
            // Reconnect logic
            reconnectTimeout.current = window.setTimeout(() => {
                connect();
            }, 3000); // Retry every 3s
        };

        socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
            socket.close();
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event_type) {
                    setLastMessage(data); // Trigger updates
                    handleGlobalNotification(data);
                }
            } catch (e) {
                console.error('WS Parse Error', e);
            }
        };

        ws.current = socket;
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (ws.current) ws.current.close();
            clearTimeout(reconnectTimeout.current);
        };
    }, [connect]);

    const sendMessage = useCallback((msg: any) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(msg));
        }
    }, []);

    const handleGlobalNotification = (msg: NotificationMessage) => {
        // Example global toast for critical events
        if (msg.event_type === 'WORK_ORDER_COMPLETED') {
            notifications.show({
                title: 'Work Order Completed',
                message: `WO #${msg.payload.id} was completed`,
                color: 'blue',
            });
        }
    };

    return (
        <WebSocketContext.Provider value={{ isConnected, lastMessage, sendMessage }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};
