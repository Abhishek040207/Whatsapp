import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

function ProfileSetup() {
    const { updateProfile, user } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [about, setAbout] = useState(user?.about || 'Hey there! I am using WhatsApp.');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [avatarPreview, setAvatarPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result);
        reader.readAsDataURL(file);

        // Upload
        const formData = new FormData();
        formData.append('file', file);
        try {
            const { data } = await API.post('/upload/avatars', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setAvatar(data.fileUrl);
        } catch (err) {
            setError('Failed to upload photo');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || name.length < 2) {
            setError('Name must be at least 2 characters');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await updateProfile({ name, about, avatar });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save profile');
        }
        setLoading(false);
    };

    const displayAvatar = avatarPreview || (avatar ? `http://localhost:5000${avatar}` : '');

    return (
        <div className="auth-page">
            <div className="auth-container profile-setup">
                <div className="auth-logo">
                    <div className="auth-logo__icon">
                        <svg viewBox="0 0 39 39" width="39" height="39">
                            <path fill="currentColor" d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16 0-4.2-1.7-8.3-4.7-11.3s-7-4.7-11.3-4.7c-8.8 0-16 7.2-15.9 16.1 0 3 .9 5.9 2.4 8.4l.4.6-1.5 5.7 5.9-1.3z" />
                            <path fill="#fff" d="M32.4 6.4C29 2.9 24.3 1 19.5 1 9.3 1 1.1 9.3 1.2 19.4c0 3.2.9 6.3 2.4 9.1L1 38l9.7-2.5c2.7 1.5 5.7 2.2 8.7 2.2 10.1 0 18.3-8.3 18.3-18.4 0-4.9-1.9-9.5-5.3-12.9z" />
                        </svg>
                    </div>
                    <h1>Profile Setup</h1>
                </div>

                <p className="auth-subtitle">Set up your profile to get started</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="auth-error">{error}</div>}

                    <div className="profile-avatar-upload">
                        <label htmlFor="avatar-input" className="profile-avatar-upload__label">
                            {displayAvatar ? (
                                <img src={displayAvatar} alt="Avatar" className="profile-avatar-upload__img" />
                            ) : (
                                <div className="profile-avatar-upload__placeholder">
                                    <span>📷</span>
                                    <small>Add Photo</small>
                                </div>
                            )}
                        </label>
                        <input
                            id="avatar-input"
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Your Name</label>
                        <input
                            type="text"
                            placeholder="e.g. John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={50}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>About</label>
                        <input
                            type="text"
                            placeholder="Hey there! I am using WhatsApp."
                            value={about}
                            onChange={(e) => setAbout(e.target.value)}
                            maxLength={140}
                        />
                        <span className="form-hint">{140 - about.length} characters remaining</span>
                    </div>

                    <button className="auth-btn" type="submit" disabled={loading}>
                        {loading ? <span className="auth-btn__spinner"></span> : 'Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ProfileSetup;
