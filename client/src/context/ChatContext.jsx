import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../utils/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export function ChatProvider({ children }) {
    const { user } = useAuth();
    const { emitEvent, onEvent, offEvent } = useSocket();
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingChats, setLoadingChats] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Fetch all chats
    const fetchChats = useCallback(async () => {
        if (!user) return;
        setLoadingChats(true);
        try {
            const { data } = await API.get('/chat');
            setChats(data);
        } catch (error) {
            console.error('Error fetching chats:', error);
        }
        setLoadingChats(false);
    }, [user]);

    // Fetch messages for a specific chat
    const loadMessages = useCallback(async (chatId) => {
        if (!chatId) return;
        setLoadingMessages(true);
        try {
            const { data } = await API.get(`/message/${chatId}`);
            setMessages(data);
            // Mark messages as read
            await API.put(`/message/read/${chatId}`);
            emitEvent('read-receipt', { chatId, userId: user._id });
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
        setLoadingMessages(false);
    }, [user, emitEvent]);

    // Select a chat
    const selectChat = useCallback((chat) => {
        setSelectedChat(chat);
        if (chat) {
            emitEvent('join-chat', chat._id);
            loadMessages(chat._id);
        } else {
            setMessages([]);
        }
    }, [emitEvent, loadMessages]);

    // Send a message (supports text, file uploads with metadata)
    const sendMessage = useCallback(async (content, type = 'text', fileUrl = '', fileName = '', fileSize = 0) => {
        if (!selectedChat) return null;
        try {
            const { data } = await API.post('/message', {
                chatId: selectedChat._id,
                content,
                type,
                fileUrl,
                fileName,
                fileSize,
            });
            setMessages((prev) => [...prev, data]);
            // Update chat list
            setChats((prev) =>
                prev.map((chat) =>
                    chat._id === selectedChat._id
                        ? { ...chat, lastMessage: data, updatedAt: new Date().toISOString() }
                        : chat
                ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            );
            return data;
        } catch (error) {
            console.error('Error sending message:', error);
            return null;
        }
    }, [selectedChat]);

    // Create or access a 1-on-1 chat
    const accessChat = useCallback(async (userId) => {
        try {
            const { data } = await API.post('/chat', { userId });
            const exists = chats.find((c) => c._id === data._id);
            if (!exists) {
                setChats((prev) => [data, ...prev]);
            }
            selectChat(data);
            return data;
        } catch (error) {
            console.error('Error accessing chat:', error);
            return null;
        }
    }, [chats, selectChat]);

    // Create group chat
    const createGroupChat = useCallback(async (name, participants) => {
        try {
            const { data } = await API.post('/chat/group', { name, participants });
            setChats((prev) => [data, ...prev]);
            selectChat(data);
            return data;
        } catch (error) {
            console.error('Error creating group:', error);
            return null;
        }
    }, [selectChat]);

    // Listen for new messages and reactions
    useEffect(() => {
        const handleNewMessage = (message) => {
            if (selectedChat && message.chat._id === selectedChat._id) {
                setMessages((prev) => {
                    if (prev.find((m) => m._id === message._id)) return prev;
                    return [...prev, message];
                });
                API.put(`/message/read/${selectedChat._id}`);
                emitEvent('read-receipt', { chatId: selectedChat._id, userId: user?._id });
            }
            setChats((prev) =>
                prev.map((chat) =>
                    chat._id === (message.chat._id || message.chat)
                        ? { ...chat, lastMessage: message, updatedAt: new Date().toISOString() }
                        : chat
                ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            );
        };

        const handleMessageDeleted = ({ messageId }) => {
            setMessages((prev) =>
                prev.map((m) =>
                    m._id === messageId
                        ? { ...m, isDeleted: true, content: 'This message was deleted', reactions: [] }
                        : m
                )
            );
        };

        const handleMessagesRead = ({ chatId, readBy }) => {
            if (selectedChat && chatId === selectedChat._id) {
                setMessages((prev) =>
                    prev.map((m) => ({
                        ...m,
                        readBy: m.readBy?.includes(readBy) ? m.readBy : [...(m.readBy || []), readBy],
                    }))
                );
            }
        };

        const handleReaction = ({ messageId, reactions }) => {
            setMessages((prev) =>
                prev.map((m) =>
                    m._id === messageId ? { ...m, reactions } : m
                )
            );
        };

        onEvent('new-message', handleNewMessage);
        onEvent('message-received', handleNewMessage);
        onEvent('message-deleted', handleMessageDeleted);
        onEvent('messages-read', handleMessagesRead);
        onEvent('message-reaction', handleReaction);

        return () => {
            offEvent('new-message', handleNewMessage);
            offEvent('message-received', handleNewMessage);
            offEvent('message-deleted', handleMessageDeleted);
            offEvent('messages-read', handleMessagesRead);
            offEvent('message-reaction', handleReaction);
        };
    }, [selectedChat, user, emitEvent, onEvent, offEvent]);

    // Fetch chats on mount
    useEffect(() => {
        fetchChats();
    }, [fetchChats]);

    return (
        <ChatContext.Provider
            value={{
                chats,
                selectedChat,
                setSelectedChat,
                messages,
                loadingChats,
                loadingMessages,
                selectChat,
                sendMessage,
                accessChat,
                createGroupChat,
                fetchChats,
                loadMessages,
                setMessages,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}
