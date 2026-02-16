import { useState, useEffect, useRef } from 'react';
import { HiXMark, HiChevronLeft, HiChevronRight, HiEye } from 'react-icons/hi2';
import { useStatus } from '../../context/StatusContext';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../Common/Avatar';

function StatusViewer({ statusGroup, onClose }) {
    const { markSeen, deleteStatus } = useStatus();
    const { user } = useAuth();
    const [currentIdx, setCurrentIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const [showSeenBy, setShowSeenBy] = useState(false);
    const progressRef = useRef(null);
    const STATUS_DURATION = 5000; // 5 seconds per status

    const statuses = statusGroup.statuses || [];
    const current = statuses[currentIdx];
    const isMyStatus = statusGroup.user._id === user?._id;

    // Auto-advance progress bar
    useEffect(() => {
        setProgress(0);
        const startTime = Date.now();

        progressRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min((elapsed / STATUS_DURATION) * 100, 100);
            setProgress(pct);

            if (pct >= 100) {
                clearInterval(progressRef.current);
                goNext();
            }
        }, 50);

        // Mark as seen
        if (current && !isMyStatus) {
            markSeen(current._id);
        }

        return () => clearInterval(progressRef.current);
    }, [currentIdx]);

    const goNext = () => {
        if (currentIdx < statuses.length - 1) {
            setCurrentIdx(currentIdx + 1);
        } else {
            onClose();
        }
    };

    const goPrev = () => {
        if (currentIdx > 0) {
            setCurrentIdx(currentIdx - 1);
        }
    };

    const handleDelete = async () => {
        if (current) {
            await deleteStatus(current._id);
            if (statuses.length <= 1) {
                onClose();
            } else {
                goNext();
            }
        }
    };

    if (!current) return null;

    const time = new Date(current.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="status-viewer">
            <div className="status-viewer__backdrop" onClick={onClose} />

            <div className="status-viewer__content">
                {/* Progress bars */}
                <div className="status-viewer__progress-row">
                    {statuses.map((_, i) => (
                        <div key={i} className="status-viewer__progress-bar">
                            <div
                                className="status-viewer__progress-fill"
                                style={{
                                    width: i < currentIdx ? '100%' : i === currentIdx ? `${progress}%` : '0%',
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="status-viewer__header">
                    <Avatar name={statusGroup.user.name} avatar={statusGroup.user.avatar} size={36} />
                    <div className="status-viewer__info">
                        <span className="status-viewer__name">{statusGroup.user.name}</span>
                        <span className="status-viewer__time">{time}</span>
                    </div>
                    <div className="status-viewer__actions">
                        {isMyStatus && (
                            <button className="status-viewer__action-btn" onClick={() => setShowSeenBy(!showSeenBy)}>
                                <HiEye /> {current.seenBy?.length || 0}
                            </button>
                        )}
                        {isMyStatus && (
                            <button className="status-viewer__action-btn status-viewer__action-btn--delete" onClick={handleDelete}>
                                Delete
                            </button>
                        )}
                        <button className="status-viewer__close" onClick={onClose}>
                            <HiXMark />
                        </button>
                    </div>
                </div>

                {/* Status Content */}
                <div
                    className="status-viewer__body"
                    style={current.type === 'text' ? { backgroundColor: current.backgroundColor } : {}}
                >
                    {current.type === 'text' && (
                        <div className="status-viewer__text">{current.content}</div>
                    )}
                    {current.type === 'image' && (
                        <img src={`http://localhost:5000${current.mediaUrl}`} alt="Status" className="status-viewer__media" />
                    )}
                    {current.type === 'video' && (
                        <video src={`http://localhost:5000${current.mediaUrl}`} className="status-viewer__media" autoPlay muted />
                    )}
                    {current.content && current.type !== 'text' && (
                        <div className="status-viewer__caption">{current.content}</div>
                    )}
                </div>

                {/* Navigation */}
                <button className="status-viewer__nav status-viewer__nav--left" onClick={goPrev}>
                    <HiChevronLeft />
                </button>
                <button className="status-viewer__nav status-viewer__nav--right" onClick={goNext}>
                    <HiChevronRight />
                </button>

                {/* Seen By list */}
                {showSeenBy && isMyStatus && (
                    <div className="status-viewer__seen-by">
                        <h4>Viewed by {current.seenBy?.length || 0}</h4>
                        {current.seenBy?.map((s) => (
                            <div key={s.user._id} className="status-viewer__seen-item">
                                <Avatar name={s.user.name} avatar={s.user.avatar} size={28} />
                                <span>{s.user.name}</span>
                                <span className="status-viewer__seen-time">
                                    {new Date(s.seenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default StatusViewer;
