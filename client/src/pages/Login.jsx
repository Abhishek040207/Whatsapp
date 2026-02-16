import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function Login() {
    const { sendOtp, verifyOtp, resendOtp } = useAuth();
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [step, setStep] = useState('phone'); // 'phone' or 'otp'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const otpRefs = useRef([]);
    const cooldownRef = useRef(null);

    // Cooldown timer
    useEffect(() => {
        if (cooldown > 0) {
            cooldownRef.current = setTimeout(() => setCooldown(cooldown - 1), 1000);
        }
        return () => clearTimeout(cooldownRef.current);
    }, [cooldown]);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!phone || phone.length < 10) {
            setError('Enter a valid phone number (at least 10 digits)');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await sendOtp(phone);
            setStep('otp');
            setCooldown(30);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        }
        setLoading(false);
    };

    const handleOtpChange = (idx, value) => {
        if (value && !/^\d$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[idx] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && idx < 5) {
            otpRefs.current[idx + 1]?.focus();
        }

        // Auto-submit when all filled
        if (newOtp.every((d) => d !== '') && value) {
            handleVerify(newOtp.join(''));
        }
    };

    const handleOtpKeyDown = (idx, e) => {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
            otpRefs.current[idx - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            const digits = pasted.split('');
            setOtp(digits);
            handleVerify(pasted);
        }
    };

    const handleVerify = async (code) => {
        setLoading(true);
        setError('');
        try {
            await verifyOtp(phone, code);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP');
            setOtp(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        }
        setLoading(false);
    };

    const handleResend = async () => {
        if (cooldown > 0) return;
        setError('');
        try {
            await resendOtp(phone);
            setCooldown(30);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-logo">
                    <div className="auth-logo__icon">
                        <svg viewBox="0 0 39 39" width="39" height="39">
                            <path fill="currentColor" d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16 0-4.2-1.7-8.3-4.7-11.3s-7-4.7-11.3-4.7c-8.8 0-16 7.2-15.9 16.1 0 3 .9 5.9 2.4 8.4l.4.6-1.5 5.7 5.9-1.3z" />
                            <path fill="#fff" d="M32.4 6.4C29 2.9 24.3 1 19.5 1 9.3 1 1.1 9.3 1.2 19.4c0 3.2.9 6.3 2.4 9.1L1 38l9.7-2.5c2.7 1.5 5.7 2.2 8.7 2.2 10.1 0 18.3-8.3 18.3-18.4 0-4.9-1.9-9.5-5.3-12.9zM19.5 34.6c-2.7 0-5.4-.7-7.7-2.1l-.6-.3-5.8 1.5L6.9 28l-.4-.6c-4.4-7.1-2.3-16.5 4.9-20.9s16.5-2.3 20.9 4.9 2.3 16.5-4.9 20.9c-2.3 1.5-5.1 2.3-7.9 2.3zm8.8-11.1l-1.1-.5s-1.6-.7-2.6-1.2c-.1 0-.2-.1-.3-.1-.3 0-.5.1-.7.2 0 0-.1.1-1.5 1.7-.1.2-.3.3-.5.3h-.1c-.1 0-.3-.1-.4-.2l-.5-.2c-1.1-.5-2.1-1.1-2.9-1.9-.2-.2-.5-.4-.7-.6-.7-.7-1.4-1.5-1.9-2.4l-.1-.2c-.1-.1-.1-.2-.2-.4 0-.2 0-.4.1-.5 0 0 .4-.5.7-.8.2-.2.3-.5.5-.7.2-.3.3-.7.2-1-.1-.5-1.3-3.2-1.6-3.8-.2-.3-.4-.4-.7-.5h-1.1c-.2 0-.4.1-.6.1l-.1.1c-.2.1-.4.3-.6.4-.2.2-.3.4-.5.6-.7.9-1.1 2-1.1 3.1 0 .8.2 1.6.5 2.3l.1.3c.9 1.9 2.1 3.6 3.7 5.1l.4.4c.3.3.6.5.8.8 2.1 1.8 4.5 3.1 7.2 3.6.3.1.7.1 1 .2h1c.5 0 1.1-.2 1.5-.4.3-.2.5-.2.7-.4l.2-.2c.2-.2.4-.3.6-.5s.3-.4.5-.6c.2-.4.3-.9.4-1.4v-.7s-.1-.1-.3-.2z" />
                        </svg>
                    </div>
                    <h1>WhatsApp</h1>
                </div>

                {step === 'phone' ? (
                    <form onSubmit={handleSendOtp} className="auth-form">
                        <p className="auth-subtitle">Enter your phone number to get started</p>
                        {error && <div className="auth-error">{error}</div>}
                        <div className="form-group">
                            <label>Phone Number</label>
                            <div className="phone-input-wrap">
                                <span className="phone-prefix">+</span>
                                <input
                                    type="tel"
                                    placeholder="91 9876543210"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                                    maxLength={15}
                                    autoFocus
                                />
                            </div>
                            <span className="form-hint">Include country code (e.g., 919876543210)</span>
                        </div>
                        <button className="auth-btn" type="submit" disabled={loading}>
                            {loading ? (
                                <span className="auth-btn__spinner"></span>
                            ) : (
                                'Send OTP'
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="auth-form">
                        <p className="auth-subtitle">
                            Enter the 6-digit code sent to <strong>+{phone}</strong>
                        </p>
                        {error && <div className="auth-error">{error}</div>}
                        <div className="otp-inputs" onPaste={handleOtpPaste}>
                            {otp.map((digit, idx) => (
                                <input
                                    key={idx}
                                    ref={(el) => (otpRefs.current[idx] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    className="otp-input"
                                    value={digit}
                                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                    autoFocus={idx === 0}
                                />
                            ))}
                        </div>
                        <div className="otp-actions">
                            <button
                                className="otp-resend"
                                onClick={handleResend}
                                disabled={cooldown > 0}
                            >
                                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                            </button>
                            <button
                                className="otp-change-phone"
                                onClick={() => {
                                    setStep('phone');
                                    setOtp(['', '', '', '', '', '']);
                                    setError('');
                                }}
                            >
                                Change number
                            </button>
                        </div>
                        {loading && (
                            <div className="loading-spinner" style={{ padding: '10px 0' }}>
                                <div className="loading-spinner__circle"></div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Login;
