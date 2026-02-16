import { useState, useEffect, useRef, useCallback } from 'react';
import {
    HiOutlineEllipsisVertical,
    HiOutlineFaceSmile,
    HiOutlinePaperClip,
    HiOutlineMicrophone,
    HiPaperAirplane,
    HiOutlineArrowLeft,
    HiOutlineClock,
    HiOutlineDocumentText,
    HiOutlineTrash,
    HiOutlinePhone,
    HiOutlineVideoCamera,
} from 'react-icons/hi2';
import { BsCheck2, BsCheck2All } from 'react-icons/bs';
import EmojiPicker from 'emoji-picker-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';
import { useNotification } from '../../context/NotificationContext';
import Avatar from '../Common/Avatar';
import SmartReply from '../AI/SmartReply';
import ChatSummary from '../AI/ChatSummary';
import VoiceToText from '../AI/VoiceToText';
import ScheduleModal from '../Scheduling/ScheduleModal';
import API from '../../utils/api';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function ChatWindow({ onBack }) {
    const { user } = useAuth();
    const { selectedChat, messages, sendMessage, loadingMessages } = useChat();
    const { onlineUsers, typingUsers, emitEvent } = useSocket();
    const { callUser } = useCall();
    const { clearUnread } = useNotification();

    const [input, setInput] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [reactionMsgId, setReactionMsgId] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);

    // Auto-scroll + clear unread
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (selectedChat) {
            clearUnread(selectedChat._id);
        }
        inputRef.current?.focus();
    }, [selectedChat]);

    // ─── Chat info helpers ───
    const getOtherUser = () => {
        if (!selectedChat || selectedChat.isGroup) return null;
        return selectedChat.participants?.find((p) => p._id !== user?._id);
    };

    const otherUser = getOtherUser();
    const isOtherOnline = otherUser ? onlineUsers.has(otherUser._id) : false;
    const chatTyping = typingUsers[selectedChat?._id];

    const getChatName = () => {
        if (!selectedChat) return '';
        if (selectedChat.isGroup) return selectedChat.groupName;
        return otherUser?.name || 'Unknown';
    };

    const getStatusText = () => {
        if (chatTyping) return 'typing...';
        if (selectedChat?.isGroup) {
            return selectedChat.participants?.map((p) => p.name).join(', ');
        }
        if (isOtherOnline) return 'online';
        if (otherUser?.lastSeen) {
            return `last seen ${new Date(otherUser.lastSeen).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
        }
        return 'offline';
    };

    // ─── Typing ───
    const handleTyping = () => {
        emitEvent('typing', { chatId: selectedChat._id, userId: user._id, userName: user.name });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            emitEvent('stop-typing', { chatId: selectedChat._id, userId: user._id });
        }, 2000);
    };

    // ─── Send message ───
    const handleSend = async () => {
        const text = input.trim();
        if (!text) return;
        setInput('');
        setShowEmoji(false);
        emitEvent('stop-typing', { chatId: selectedChat._id, userId: user._id });
        await sendMessage(text);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ─── File upload ───
    const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        let uploadType = 'chat';
        if (file.type.startsWith('audio')) uploadType = 'voice';

        try {
            const { data } = await API.post(`/upload/${uploadType}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            let msgType = 'document';
            if (file.type.startsWith('image')) msgType = 'image';
            if (file.type.startsWith('video')) msgType = 'video';
            if (file.type.startsWith('audio')) msgType = 'voice';

            await sendMessage('', msgType, data.fileUrl, data.fileName, data.fileSize);
        } catch (err) {
            console.error('Upload error:', err);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) uploadFile(file);
        e.target.value = '';
    };

    // ─── Drag & drop ───
    const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback(() => setIsDragging(false), []);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    }, [selectedChat]);

    // ─── Reactions ───
    const handleReaction = async (messageId, emoji) => {
        try {
            await API.put(`/message/react/${messageId}`, { emoji });
            setReactionMsgId(null);
        } catch (err) {
            console.error('Reaction error:', err);
        }
    };

    // ─── Emoji ───
    const onEmojiClick = (emojiData) => {
        setInput((prev) => prev + emojiData.emoji);
        inputRef.current?.focus();
    };

    // ─── Smart reply ───
    const handleSmartReplySelect = (reply) => {
        setInput(reply);
        inputRef.current?.focus();
    };

    // ─── Delete ───
    const handleDeleteMessage = async (messageId) => {
        try { await API.delete(`/message/${messageId}`); } catch (err) { console.error(err); }
    };

    // ─── Format helpers ───
    const formatMessageTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const getDateLabel = (d) => {
        const date = new Date(d);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const renderTicks = (msg) => {
        if ((msg.sender._id || msg.sender) !== user?._id) return null;
        const readByOthers = msg.readBy?.filter((id) => {
            const rid = typeof id === 'object' ? id._id : id;
            return rid !== user?._id;
        });
        if (readByOthers?.length > 0)
            return <span className="message-bubble__ticks message-bubble__ticks--read"><BsCheck2All /></span>;
        if (msg.isDelivered)
            return <span className="message-bubble__ticks message-bubble__ticks--delivered"><BsCheck2All /></span>;
        return <span className="message-bubble__ticks message-bubble__ticks--sent"><BsCheck2 /></span>;
    };

    // ─── Render file content ───
    const renderFileContent = (msg) => {
        if (msg.type === 'image' && msg.fileUrl) {
            return <img src={`http://localhost:5000${msg.fileUrl}`} className="message-bubble__image" alt="Shared" />;
        }
        if (msg.type === 'video' && msg.fileUrl) {
            return <video src={`http://localhost:5000${msg.fileUrl}`} className="message-bubble__video" controls />;
        }
        if (msg.type === 'voice' && msg.fileUrl) {
            return <audio src={`http://localhost:5000${msg.fileUrl}`} className="message-bubble__audio" controls />;
        }
        if (msg.type === 'document' && msg.fileUrl) {
            return (
                <a href={`http://localhost:5000${msg.fileUrl}`} className="message-bubble__document" target="_blank" rel="noreferrer">
                    📄 {msg.fileName || 'Document'} {msg.fileSize ? `(${(msg.fileSize / 1024).toFixed(1)}KB)` : ''}
                </a>
            );
        }
        return null;
    };

    let lastDate = null;

    return (
        <div
            className={`chat-window ${isDragging ? 'chat-window--dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag overlay */}
            {isDragging && (
                <div className="chat-window__drag-overlay">
                    <div className="chat-window__drag-text">Drop file to send</div>
                </div>
            )}

            {/* Header */}
            <div className="chat-header">
                <button className="sidebar__icon-btn chat-header__back" onClick={onBack}>
                    <HiOutlineArrowLeft />
                </button>
                <Avatar
                    name={getChatName()}
                    avatar={selectedChat?.isGroup ? selectedChat.groupAvatar : otherUser?.avatar}
                    isOnline={isOtherOnline}
                />
                <div className="chat-header__info">
                    <div className="chat-header__name">{getChatName()}</div>
                    <div className={`chat-header__status ${chatTyping ? 'chat-header__status--typing' : isOtherOnline ? 'chat-header__status--online' : ''}`}>
                        {getStatusText()}
                    </div>
                </div>
                <div className="chat-header__actions">
                    {!selectedChat?.isGroup && otherUser && (
                        <>
                            <button className="sidebar__icon-btn" onClick={() => callUser(otherUser, 'voice')} title="Voice call">
                                <HiOutlinePhone />
                            </button>
                            <button className="sidebar__icon-btn" onClick={() => callUser(otherUser, 'video')} title="Video call">
                                <HiOutlineVideoCamera />
                            </button>
                        </>
                    )}
                    <div className="dropdown">
                        <button className="sidebar__icon-btn" onClick={() => setShowMenu(!showMenu)}>
                            <HiOutlineEllipsisVertical />
                        </button>
                        {showMenu && (
                            <div className="dropdown__menu">
                                <button className="dropdown__item" onClick={() => { setShowSchedule(true); setShowMenu(false); }}>
                                    <HiOutlineClock /> Schedule Message
                                </button>
                                <button className="dropdown__item" onClick={() => { setShowSummary(true); setShowMenu(false); }}>
                                    <HiOutlineDocumentText /> Chat Summary
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="message-list">
                {loadingMessages ? (
                    <div className="loading-spinner"><div className="loading-spinner__circle"></div></div>
                ) : (
                    messages.map((msg, idx) => {
                        const msgDate = getDateLabel(msg.createdAt);
                        const showDateSep = msgDate !== lastDate;
                        lastDate = msgDate;
                        const isMine = (msg.sender._id || msg.sender) === user?._id;

                        return (
                            <div key={msg._id || idx}>
                                {showDateSep && (
                                    <div className="message-date-separator">
                                        <span className="message-date-separator__label">{msgDate}</span>
                                    </div>
                                )}
                                <div className={`message-bubble ${isMine ? 'message-bubble--sent' : 'message-bubble--received'} ${msg.isDeleted ? 'message-bubble--deleted' : ''}`}>
                                    {selectedChat?.isGroup && !isMine && msg.sender.name && (
                                        <div className="message-bubble__sender">{msg.sender.name}</div>
                                    )}

                                    {/* File content */}
                                    {!msg.isDeleted && renderFileContent(msg)}

                                    {/* Text */}
                                    <span className="message-bubble__content">
                                        {msg.isDeleted ? '🚫 This message was deleted' : msg.content}
                                    </span>

                                    <div className="message-bubble__footer">
                                        <span className="message-bubble__time">{formatMessageTime(msg.createdAt)}</span>
                                        {renderTicks(msg)}
                                    </div>

                                    {/* Reactions display */}
                                    {msg.reactions?.length > 0 && (
                                        <div className="message-bubble__reactions">
                                            {msg.reactions.map((r, ri) => (
                                                <span key={ri} className="reaction-chip" title={r.user?.name}>
                                                    {r.emoji}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Hover actions */}
                                    {!msg.isDeleted && (
                                        <div className="message-bubble__hover-actions">
                                            <button onClick={() => setReactionMsgId(reactionMsgId === msg._id ? null : msg._id)} title="React">
                                                😀
                                            </button>
                                            {isMine && (
                                                <button onClick={() => handleDeleteMessage(msg._id)} title="Delete">
                                                    <HiOutlineTrash />
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Reaction picker */}
                                    {reactionMsgId === msg._id && (
                                        <div className="reaction-picker">
                                            {REACTION_EMOJIS.map((emoji) => (
                                                <button key={emoji} className="reaction-picker__btn" onClick={() => handleReaction(msg._id, emoji)}>
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Smart Reply */}
            <SmartReply onSelect={handleSmartReplySelect} />

            {/* Emoji Picker */}
            {showEmoji && (
                <div className="emoji-picker-container">
                    <EmojiPicker theme="dark" onEmojiClick={onEmojiClick} width={350} height={400} searchDisabled={false} skinTonesDisabled previewConfig={{ showPreview: false }} />
                </div>
            )}

            {/* Input area */}
            <div className="message-input-area">
                <div className="message-input-area__actions">
                    <button className="message-input-area__btn" onClick={() => setShowEmoji(!showEmoji)} title="Emoji">
                        <HiOutlineFaceSmile />
                    </button>
                    <button className="message-input-area__btn" onClick={() => fileInputRef.current?.click()} title="Attach file">
                        <HiOutlinePaperClip />
                    </button>
                    <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" />
                    <button className="message-input-area__btn" onClick={() => setShowSchedule(true)} title="Schedule">
                        <HiOutlineClock />
                    </button>
                </div>

                {isRecording ? (
                    <VoiceToText
                        onTranscription={(text) => { setInput(text); setIsRecording(false); }}
                        onCancel={() => setIsRecording(false)}
                    />
                ) : (
                    <div className="message-input-area__input-wrap">
                        <input
                            ref={inputRef}
                            className="message-input-area__input"
                            placeholder="Type a message"
                            value={input}
                            onChange={(e) => { setInput(e.target.value); handleTyping(); }}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                )}

                {input.trim() ? (
                    <button className="message-input-area__send" onClick={handleSend} title="Send">
                        <HiPaperAirplane />
                    </button>
                ) : (
                    <button className="message-input-area__send" onClick={() => setIsRecording(true)} title="Voice message"
                        style={{ background: isRecording ? 'var(--wa-danger)' : undefined }}>
                        <HiOutlineMicrophone />
                    </button>
                )}
            </div>

            {/* Modals */}
            {showSummary && <ChatSummary onClose={() => setShowSummary(false)} />}
            {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} />}
        </div>
    );
}

export default ChatWindow;
