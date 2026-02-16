import { useState } from 'react';
import { HiArrowLeft, HiOutlineCamera } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import API from '../../utils/api';
import Avatar from '../Common/Avatar';

function ProfileEdit({ onClose }) {
    const { user, updateProfile } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [about, setAbout] = useState(user?.about || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [avatarPreview, setAvatarPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result);
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append('file', file);
        try {
            const { data } = await API.post('/upload/avatars', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setAvatar(data.fileUrl);
        } catch (err) {
            setMessage('Failed to upload photo');
        }
    };

    const handleSave = async () => {
        if (!name || name.length < 2) {
            setMessage('Name must be at least 2 characters');
            return;
        }
        setLoading(true);
        try {
            await updateProfile({ name, about, avatar });
            setMessage('Profile updated! ✅');
            setTimeout(onClose, 1000);
        } catch (err) {
            setMessage('Failed to save');
        }
        setLoading(false);
    };

    const displayAvatar = avatarPreview || (avatar ? `http://localhost:5000${avatar}` : '');

    return (
        <div className="profile-panel">
            <div className="profile-panel__header">
                <button className="sidebar__icon-btn" onClick={onClose}>
                    <HiArrowLeft />
                </button>
                <h3>Profile</h3>
            </div>

            <div className="profile-panel__body">
                <div className="profile-panel__avatar-section">
                    <label className="profile-panel__avatar-label">
                        {displayAvatar ? (
                            <img src={displayAvatar} alt="Avatar" className="profile-panel__avatar-img" />
                        ) : (
                            <Avatar name={name || 'U'} size={120} />
                        )}
                        <div className="profile-panel__avatar-overlay">
                            <HiOutlineCamera size={24} />
                        </div>
                        <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                    </label>
                </div>

                {message && (
                    <div className="profile-panel__message">{message}</div>
                )}

                <div className="profile-panel__field">
                    <label>Your name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={50}
                    />
                </div>

                <div className="profile-panel__field">
                    <label>About</label>
                    <input
                        type="text"
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        maxLength={140}
                    />
                    <span className="form-hint">{140 - about.length} characters remaining</span>
                </div>

                <div className="profile-panel__field">
                    <label>Phone</label>
                    <div className="profile-panel__phone">{user?.phone || 'N/A'}</div>
                </div>

                <button className="auth-btn" onClick={handleSave} disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
}

export default ProfileEdit;
