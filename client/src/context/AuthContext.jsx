import { createContext, useContext, useEffect, useState } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            API.get('/auth/me')
                .then(({ data }) => {
                    setUser(data);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    // Send OTP to phone number
    const sendOtp = async (phone) => {
        const { data } = await API.post('/auth/send-otp', { phone });
        return data;
    };

    // Verify OTP and login
    const verifyOtp = async (phone, otp) => {
        const { data } = await API.post('/auth/verify-otp', { phone, otp });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        return data;
    };

    // Resend OTP
    const resendOtp = async (phone) => {
        const { data } = await API.post('/auth/resend-otp', { phone });
        return data;
    };

    // Setup / update profile
    const updateProfile = async (profileData) => {
        const { data } = await API.put('/auth/profile', profileData);
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading,
                sendOtp,
                verifyOtp,
                resendOtp,
                updateProfile,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
