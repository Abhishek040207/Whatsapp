import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { SocketProvider } from './context/SocketContext';
import { StatusProvider } from './context/StatusContext';
import { CallProvider } from './context/CallContext';
import { NotificationProvider } from './context/NotificationContext';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import Home from './pages/Home';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="auth-page">
                <div className="loading-spinner">
                    <div className="loading-spinner__circle"></div>
                </div>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" />;
    if (!user.isProfileComplete) return <Navigate to="/setup-profile" />;

    return children;
}

function SetupRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" />;
    if (user.isProfileComplete) return <Navigate to="/" />;
    return children;
}

function AuthRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (user && user.isProfileComplete) return <Navigate to="/" />;
    if (user && !user.isProfileComplete) return <Navigate to="/setup-profile" />;
    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/setup-profile" element={<SetupRoute><ProfileSetup /></SetupRoute>} />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <SocketProvider>
                            <ChatProvider>
                                <StatusProvider>
                                    <CallProvider>
                                        <NotificationProvider>
                                            <Home />
                                        </NotificationProvider>
                                    </CallProvider>
                                </StatusProvider>
                            </ChatProvider>
                        </SocketProvider>
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}

export default App;