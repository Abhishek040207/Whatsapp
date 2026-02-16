import { useState, useEffect } from 'react';
import { HiOutlineSparkles } from 'react-icons/hi2';
import { useChat } from '../../context/ChatContext';
import API from '../../utils/api';

function SmartReply({ onSelect }) {
    const { selectedChat, messages } = useChat();
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Only fetch suggestions when there are messages and the last one isn't from us
        if (!selectedChat || messages.length === 0) {
            setSuggestions([]);
            return;
        }

        const fetchSuggestions = async () => {
            setLoading(true);
            try {
                const { data } = await API.post('/ai/smart-reply', {
                    chatId: selectedChat._id,
                });
                setSuggestions(data.suggestions || []);
            } catch (error) {
                console.error('Smart reply error:', error);
                setSuggestions([]);
            }
            setLoading(false);
        };

        // Debounce — fetch after 1 second of no new messages
        const timer = setTimeout(fetchSuggestions, 1000);
        return () => clearTimeout(timer);
    }, [selectedChat?._id, messages.length]);

    if (suggestions.length === 0 && !loading) return null;

    return (
        <div className="smart-reply-bar">
            <span className="smart-reply-bar__label">
                <HiOutlineSparkles /> AI
            </span>
            {loading ? (
                <span style={{ fontSize: 12, color: 'var(--wa-text-meta)' }}>Thinking...</span>
            ) : (
                suggestions.map((s, i) => (
                    <button key={i} className="smart-reply-chip" onClick={() => onSelect(s)}>
                        {s}
                    </button>
                ))
            )}
        </div>
    );
}

export default SmartReply;
