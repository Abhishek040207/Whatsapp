import { useState } from 'react';
import { HiOutlineDocumentText, HiXMark } from 'react-icons/hi2';
import { useChat } from '../../context/ChatContext';
import API from '../../utils/api';

function ChatSummary({ onClose }) {
    const { selectedChat } = useChat();
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [messageCount, setMessageCount] = useState(0);
    const [fetched, setFetched] = useState(false);

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const { data } = await API.post('/ai/summarize', {
                chatId: selectedChat._id,
                messageCount: 50,
            });
            setSummary(data.summary);
            setMessageCount(data.messageCount || 0);
            setFetched(true);
        } catch (error) {
            setSummary('Failed to generate summary. Please try again.');
            setFetched(true);
        }
        setLoading(false);
    };

    // Fetch on mount
    if (!fetched && !loading) {
        fetchSummary();
    }

    return (
        <div className="summary-overlay" onClick={onClose}>
            <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
                <div className="summary-modal__header">
                    <h3>
                        <HiOutlineDocumentText /> Chat Summary
                    </h3>
                    <button className="summary-modal__close" onClick={onClose}>
                        <HiXMark />
                    </button>
                </div>
                <div className="summary-modal__body">
                    {loading ? (
                        <div className="loading-spinner">
                            <div className="loading-spinner__circle"></div>
                        </div>
                    ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{summary}</div>
                    )}
                </div>
                {fetched && !loading && (
                    <div className="summary-modal__footer">
                        Summarized from {messageCount} messages • Powered by AI
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChatSummary;
