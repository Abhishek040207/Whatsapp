import { useState } from 'react';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatWindow from '../components/ChatWindow/ChatWindow';
import StatusSidebar from '../components/Status/StatusSidebar';
import StatusViewer from '../components/Status/StatusViewer';
import CreateStatus from '../components/Status/CreateStatus';
import IncomingCall from '../components/Call/IncomingCall';
import ActiveCall from '../components/Call/ActiveCall';
import ProfileEdit from '../components/Profile/ProfileEdit';
import EmptyState from '../components/Common/EmptyState';
import { useChat } from '../context/ChatContext';

function Home() {
    const { selectedChat, setSelectedChat } = useChat();
    const [activeTab, setActiveTab] = useState('chats');
    const [showProfile, setShowProfile] = useState(false);
    const [showStatusViewer, setShowStatusViewer] = useState(null);
    const [showCreateStatus, setShowCreateStatus] = useState(false);

    return (
        <div className="app-container">
            {/* Profile Edit Panel */}
            {showProfile && (
                <div className="profile-panel-overlay" onClick={() => setShowProfile(false)}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <ProfileEdit onClose={() => setShowProfile(false)} />
                    </div>
                </div>
            )}

            {/* Two-panel layout */}
            <div className="app-layout">
                {/* Left panel: Sidebar or Status list */}
                <div className={`app-layout__sidebar ${selectedChat ? 'app-layout__sidebar--hide-mobile' : ''}`}>
                    {activeTab === 'status' ? (
                        <div className="sidebar">
                            {/* Status header with tabs via Sidebar tabs */}
                            <Sidebar
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                                onProfileClick={() => setShowProfile(true)}
                            />
                        </div>
                    ) : (
                        <Sidebar
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            onProfileClick={() => setShowProfile(true)}
                        />
                    )}
                </div>

                {/* Right panel: Chat window or empty state */}
                <div className={`app-layout__main ${selectedChat ? '' : 'app-layout__main--hide-mobile'}`}>
                    {activeTab === 'status' ? (
                        <div className="status-main">
                            <StatusSidebar
                                onViewStatus={(group) => setShowStatusViewer(group)}
                                onCreateStatus={() => setShowCreateStatus(true)}
                            />
                        </div>
                    ) : selectedChat ? (
                        <ChatWindow
                            onBack={() => setSelectedChat(null)}
                        />
                    ) : (
                        <EmptyState />
                    )}
                </div>
            </div>

            {/* Modals & Overlays */}
            {showStatusViewer && (
                <StatusViewer
                    statusGroup={showStatusViewer}
                    onClose={() => setShowStatusViewer(null)}
                />
            )}
            {showCreateStatus && (
                <CreateStatus onClose={() => setShowCreateStatus(false)} />
            )}

            {/* Call overlays */}
            <IncomingCall />
            <ActiveCall />
        </div>
    );
}

export default Home;
