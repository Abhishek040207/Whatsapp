import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const [permission, setPermission] = useState(Notification.permission || 'default');
    const [unreadCounts, setUnreadCounts] = useState({}); // { chatId: count }
    const [totalUnread, setTotalUnread] = useState(0);
    const notifSoundRef = useRef(null);

    // Initialize notification sound
    useEffect(() => {
        // Create a simple beep via Web Audio API
        notifSoundRef.current = () => {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            } catch (e) {
                // Audio not available
            }
        };
    }, []);

    // Request notification permission
    const requestPermission = useCallback(async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            const result = await Notification.requestPermission();
            setPermission(result);
        }
    }, []);

    // Show browser notification
    const showNotification = useCallback((title, body, icon) => {
        if (permission === 'granted') {
            try {
                new Notification(title, {
                    body,
                    icon: icon || '/whatsapp.svg',
                    badge: '/whatsapp.svg',
                });
            } catch (e) {
                // Notifications not supported
            }
        }
    }, [permission]);

    // Play notification sound
    const playSound = useCallback(() => {
        if (notifSoundRef.current) {
            notifSoundRef.current();
        }
    }, []);

    // Handle new message notification
    const notifyMessage = useCallback((message, chatName) => {
        const senderName = message.sender?.name || 'Someone';
        const content = message.type === 'text'
            ? message.content
            : `Sent a ${message.type}`;

        showNotification(senderName, content);
        playSound();

        // Update unread count
        setUnreadCounts((prev) => ({
            ...prev,
            [message.chat?._id || message.chat]: (prev[message.chat?._id || message.chat] || 0) + 1,
        }));
    }, [showNotification, playSound]);

    // Clear unread for a specific chat
    const clearUnread = useCallback((chatId) => {
        setUnreadCounts((prev) => {
            const next = { ...prev };
            delete next[chatId];
            return next;
        });
    }, []);

    // Calculate total unread
    useEffect(() => {
        setTotalUnread(Object.values(unreadCounts).reduce((a, b) => a + b, 0));
    }, [unreadCounts]);

    // Request permission on mount
    useEffect(() => {
        if (user) {
            requestPermission();
        }
    }, [user, requestPermission]);

    return (
        <NotificationContext.Provider
            value={{
                permission,
                unreadCounts,
                totalUnread,
                requestPermission,
                showNotification,
                playSound,
                notifyMessage,
                clearUnread,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotification = () => useContext(NotificationContext);
