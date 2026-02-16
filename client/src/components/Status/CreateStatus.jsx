import { useState } from 'react';
import { HiXMark, HiPhoto } from 'react-icons/hi2';
import { useStatus } from '../../context/StatusContext';
import API from '../../utils/api';

const BG_COLORS = [
    '#00a884', '#0284c7', '#7c3aed', '#dc2626',
    '#ea580c', '#ca8a04', '#16a34a', '#0891b2',
    '#6d28d9', '#be185d', '#334155', '#1e293b',
];

function CreateStatus({ onClose }) {
    const { createStatus } = useStatus();
    const [tab, setTab] = useState('text'); // text or media
    const [content, setContent] = useState('');
    const [bgColor, setBgColor] = useState('#00a884');
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState('');
    const [mediaType, setMediaType] = useState('image');
    const [loading, setLoading] = useState(false);

    const handleMediaSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setMediaFile(file);
        setMediaType(file.type.startsWith('video') ? 'video' : 'image');

        const reader = new FileReader();
        reader.onloadend = () => setMediaPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (tab === 'text' && !content.trim()) return;
        if (tab === 'media' && !mediaFile) return;

        setLoading(true);
        try {
            let mediaUrl = '';
            if (mediaFile) {
                const formData = new FormData();
                formData.append('file', mediaFile);
                const { data } = await API.post('/upload/status', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                mediaUrl = data.fileUrl;
            }

            await createStatus({
                type: tab === 'text' ? 'text' : mediaType,
                content: content.trim(),
                mediaUrl,
                backgroundColor: tab === 'text' ? bgColor : '#000000',
            });

            onClose();
        } catch (err) {
            console.error('Create status error:', err);
        }
        setLoading(false);
    };

    return (
        <div className="summary-overlay" onClick={onClose}>
            <div className="create-status-modal" onClick={(e) => e.stopPropagation()}>
                <div className="create-status-modal__header">
                    <div className="create-status-modal__tabs">
                        <button
                            className={`create-status-modal__tab ${tab === 'text' ? 'active' : ''}`}
                            onClick={() => setTab('text')}
                        >
                            Text
                        </button>
                        <button
                            className={`create-status-modal__tab ${tab === 'media' ? 'active' : ''}`}
                            onClick={() => setTab('media')}
                        >
                            Photo/Video
                        </button>
                    </div>
                    <button className="summary-modal__close" onClick={onClose}>
                        <HiXMark />
                    </button>
                </div>

                <div className="create-status-modal__body">
                    {tab === 'text' ? (
                        <>
                            <div
                                className="create-status-modal__text-preview"
                                style={{ backgroundColor: bgColor }}
                            >
                                <textarea
                                    placeholder="Type a status..."
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    maxLength={500}
                                    autoFocus
                                />
                            </div>
                            <div className="create-status-modal__colors">
                                {BG_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        className={`color-dot ${bgColor === c ? 'active' : ''}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setBgColor(c)}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="create-status-modal__media">
                            {mediaPreview ? (
                                <div className="create-status-modal__media-preview">
                                    {mediaType === 'video' ? (
                                        <video src={mediaPreview} controls />
                                    ) : (
                                        <img src={mediaPreview} alt="Preview" />
                                    )}
                                    <input
                                        type="text"
                                        className="create-status-modal__caption"
                                        placeholder="Add a caption..."
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <label className="create-status-modal__upload-area">
                                    <HiPhoto size={48} />
                                    <span>Click to select photo or video</span>
                                    <input
                                        type="file"
                                        accept="image/*,video/*"
                                        onChange={handleMediaSelect}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            )}
                        </div>
                    )}
                </div>

                <div className="create-status-modal__footer">
                    <button className="schedule-modal__btn schedule-modal__btn--cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="schedule-modal__btn schedule-modal__btn--submit"
                        onClick={handleSubmit}
                        disabled={loading || (tab === 'text' ? !content.trim() : !mediaFile)}
                    >
                        {loading ? 'Posting...' : 'Post Status'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CreateStatus;
