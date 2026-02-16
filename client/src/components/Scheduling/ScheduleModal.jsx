import { useState } from 'react';
import { HiOutlineClock, HiXMark } from 'react-icons/hi2';
import { useChat } from '../../context/ChatContext';
import API from '../../utils/api';

function ScheduleModal({ onClose }) {
    const { selectedChat } = useChat();
    const [content, setContent] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Set minimum datetime to now
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    const minDateTime = now.toISOString().slice(0, 16);

    const handleSubmit = async () => {
        if (!content.trim() || !scheduledTime) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await API.post('/message/schedule', {
                chatId: selectedChat._id,
                content: content.trim(),
                scheduledTime: new Date(scheduledTime).toISOString(),
            });
            setSuccess('Message scheduled successfully! ✅');
            setContent('');
            setScheduledTime('');
            setTimeout(onClose, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to schedule message');
        }
        setLoading(false);
    };

    return (
        <div className="summary-overlay" onClick={onClose}>
            <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
                <div className="schedule-modal__header">
                    <h3>
                        <HiOutlineClock style={{ color: 'var(--wa-teal)' }} /> Schedule Message
                    </h3>
                    <button className="summary-modal__close" onClick={onClose}>
                        <HiXMark />
                    </button>
                </div>
                <div className="schedule-modal__body">
                    {error && <div className="auth-error">{error}</div>}
                    {success && (
                        <div style={{
                            background: 'rgba(0, 168, 132, 0.15)',
                            color: 'var(--wa-teal)',
                            padding: '10px 14px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            marginBottom: '16px',
                            textAlign: 'center',
                        }}>
                            {success}
                        </div>
                    )}
                    <div className="form-group">
                        <label>Message</label>
                        <textarea
                            placeholder="Type your message..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Schedule Time</label>
                        <input
                            type="datetime-local"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            min={minDateTime}
                        />
                    </div>
                </div>
                <div className="schedule-modal__footer">
                    <button className="schedule-modal__btn schedule-modal__btn--cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="schedule-modal__btn schedule-modal__btn--submit"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Scheduling...' : 'Schedule'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ScheduleModal;
