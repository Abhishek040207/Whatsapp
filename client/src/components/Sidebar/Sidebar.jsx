import { useState, useEffect } from 'react';
import {
    HiOutlineChatBubbleLeftRight,
    HiOutlineCircleStack,
    HiOutlinePhone,
    HiOutlineEllipsisVertical,
    HiOutlineMagnifyingGlass,
    HiOutlineArrowRightOnRectangle,
    HiOutlineUserCircle,
} from 'react-icons/hi2';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNotification } from '../../context/NotificationContext';
import Avatar from '../Common/Avatar';
import API from '../../utils/api';

function Sidebar({ activeTab, onTabChange, onProfileClick }) {
    const { user, logout } = useAuth();
    const { chats, selectedChat, setSelectedChat, loadMessages } = useChat();
    const { onlineUsers } = useSocket();
    const { unreadCounts } = useNotification();
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showMenu, setShowMenu] = useState(false);

    // Search users
    useEffect(() => {
        const delaySearch = setTimeout(async () => {
            if (search.trim().length >= 2) {
                try {
                    const { data } = await API.get(`/auth/users?search=${search}`);
                    setSearchResults(data);
                } catch (err) {
                    console.error(err);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(delaySearch);
    }, [search]);

    // Start / open chat with user
    const openChat = async (otherUser) => {
        try {
            const { data } = await API.post('/chat', { userId: otherUser._id });
            setSelectedChat(data);
            loadMessages(data._id);
            setSearch('');
            setSearchResults([]);
        } catch (err) {
            console.error(err);
        }
    };

    // Get other participant of a 1-on-1 chat
    const getOtherUser = (chat) => {
        if (chat.isGroup) return null;
        return chat.participants?.find((p) => p._id !== user?._id);
    };

    const getChatName = (chat) => {
        if (chat.isGroup) return chat.groupName;
        const other = getOtherUser(chat);
        return other?.name || 'Unknown';
    };

    const getChatAvatar = (chat) => {
        if (chat.isGroup) return chat.groupAvatar;
        return getOtherUser(chat)?.avatar;
    };

    const getLastMessage = (chat) => {
        if (!chat.lastMessage) return 'No messages yet';
        if (typeof chat.lastMessage === 'string') return '';
        if (chat.lastMessage.isDeleted) return '🚫 Message deleted';
        if (chat.lastMessage.type === 'image') return '📷 Photo';
        if (chat.lastMessage.type === 'voice') return '🎤 Voice message';
        if (chat.lastMessage.type === 'document') return '📄 Document';
        if (chat.lastMessage.type === 'video') return '🎬 Video';
        return chat.lastMessage.content || '';
    };

    const getLastTime = (chat) => {
        const date = chat.lastMessage?.createdAt || chat.updatedAt;
        if (!date) return '';
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isOtherOnline = (chat) => {
        const other = getOtherUser(chat);
        return other ? onlineUsers.has(other._id) : false;
    };

    return (
        <div className="sidebar">
            {/* Header */}
            <div className="sidebar__header">
                <div className="sidebar__user" onClick={onProfileClick}>
                    <Avatar name={user?.name || 'U'} avatar={user?.avatar} size={36} />
                </div>
                <div className="sidebar__header-actions">
                    <div className="dropdown">
                        <button className="sidebar__icon-btn" onClick={() => setShowMenu(!showMenu)}>
                            <HiOutlineEllipsisVertical />
                        </button>
                        {showMenu && (
                            <div className="dropdown__menu">
                                <button className="dropdown__item" onClick={() => { onProfileClick(); setShowMenu(false); }}>
                                    <HiOutlineUserCircle /> Profile
                                </button>
                                <button className="dropdown__item" onClick={logout}>
                                    <HiOutlineArrowRightOnRectangle /> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tab bar */}
            <div className="sidebar__tabs">
                <button
                    className={`sidebar__tab ${activeTab === 'chats' ? 'sidebar__tab--active' : ''}`}
                    onClick={() => onTabChange('chats')}
                >
                    <HiOutlineChatBubbleLeftRight />
                    <span>Chats</span>
                </button>
                <button
                    className={`sidebar__tab ${activeTab === 'status' ? 'sidebar__tab--active' : ''}`}
                    onClick={() => onTabChange('status')}
                >
                    <HiOutlineCircleStack />
                    <span>Status</span>
                </button>
                <button
                    className={`sidebar__tab ${activeTab === 'calls' ? 'sidebar__tab--active' : ''}`}
                    onClick={() => onTabChange('calls')}
                >
                    <HiOutlinePhone />
                    <span>Calls</span>
                </button>
            </div>

            {/* Search */}
            {activeTab === 'chats' && (
                <div className="sidebar__search">
                    <div className="sidebar__search-wrap">
                        <HiOutlineMagnifyingGlass />
                        <input
                            placeholder="Search or start new chat"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="sidebar__list">
                {/* Search results */}
                {search && searchResults.length > 0 && (
                    <div className="sidebar__search-results">
                        <div className="sidebar__section-title">People</div>
                        {searchResults.map((u) => (
                            <div key={u._id} className="sidebar__chat-item" onClick={() => openChat(u)}>
                                <Avatar name={u.name} avatar={u.avatar} isOnline={onlineUsers.has(u._id)} />
                                <div className="sidebar__chat-info">
                                    <div className="sidebar__chat-name">{u.name}</div>
                                    <div className="sidebar__chat-last">{u.phone} • {u.about}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Chat list */}
                {activeTab === 'chats' && !search && (
                    chats.length === 0 ? (
                        <div className="sidebar__empty">
                            <p>No chats yet</p>
                            <small>Search for users to start chatting</small>
                        </div>
                    ) : (
                        chats.map((chat) => {
                            const unread = unreadCounts[chat._id] || 0;
                            return (
                                <div
                                    key={chat._id}
                                    className={`sidebar__chat-item ${selectedChat?._id === chat._id ? 'sidebar__chat-item--active' : ''
                                        }`}
                                    onClick={() => {
                                        setSelectedChat(chat);
                                        loadMessages(chat._id);
                                    }}
                                >
                                    <Avatar
                                        name={getChatName(chat)}
                                        avatar={getChatAvatar(chat)}
                                        isOnline={isOtherOnline(chat)}
                                    />
                                    <div className="sidebar__chat-info">
                                        <div className="sidebar__chat-top">
                                            <span className="sidebar__chat-name">{getChatName(chat)}</span>
                                            <span className={`sidebar__chat-time ${unread ? 'sidebar__chat-time--unread' : ''}`}>
                                                {getLastTime(chat)}
                                            </span>
                                        </div>
                                        <div className="sidebar__chat-bottom">
                                            <span className="sidebar__chat-last">{getLastMessage(chat)}</span>
                                            {unread > 0 && (
                                                <span className="sidebar__unread-badge">{unread > 99 ? '99+' : unread}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )
                )}
            </div>
        </div>
    );
}

export default Sidebar;
