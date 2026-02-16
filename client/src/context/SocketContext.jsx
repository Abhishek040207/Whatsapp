import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
    const { user } = useAuth();
    const socketRef = useRef(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [typingUsers, setTypingUsers] = useState({});

    useEffect(() => {
        if (!user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            return;
        }

        const socket = io('/', {
            transports: ['websocket', 'polling'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            socket.emit('setup', user._id);
        });

        // Handle initial list of online users from server
        socket.on('online-users', (userIds) => {
            setOnlineUsers(new Set(userIds));
        });

        socket.on('user-online', (userId) => {
            setOnlineUsers((prev) => new Set([...prev, userId]));
        });

        socket.on('user-offline', (userId) => {
            setOnlineUsers((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        });

        socket.on('typing', ({ chatId, userId, userName }) => {
            setTypingUsers((prev) => ({ ...prev, [chatId]: { userId, userName } }));
        });

        socket.on('stop-typing', ({ chatId }) => {
            setTypingUsers((prev) => {
                const next = { ...prev };
                delete next[chatId];
                return next;
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    const emitEvent = (event, data) => {
        if (socketRef.current) {
            socketRef.current.emit(event, data);
        }
    };

    const onEvent = (event, callback) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
    };

    const offEvent = (event, callback) => {
        if (socketRef.current) {
            socketRef.current.off(event, callback);
        }
    };

    return (
        <SocketContext.Provider
            value={{
                socket: socketRef.current,
                onlineUsers,
                typingUsers,
                emitEvent,
                onEvent,
                offEvent,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
}
