import { HiOutlineClock, HiOutlineSparkles, HiOutlineDocumentText, HiOutlineMicrophone } from 'react-icons/hi2';

function EmptyState() {
    return (
        <div className="empty-state">
            <svg className="empty-state__icon" viewBox="0 0 303 172" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M229.565 160.229c32.647-16.166 55.563-50.555 55.563-90.228C285.128 31.34 253.788 0 215.127 0c-23.395 0-44.222 11.488-56.94 29.126C145.47 11.488 124.643 0 101.248 0 62.587 0 31.247 31.34 31.247 69.999c0 39.673 22.916 74.062 55.563 90.228" fill="#364147" />
                <path d="M145.81 164.882l-39.4-25.833c-5.32-3.488-12.666-.484-13.11 5.753-.443 6.237 6.412 10.446 12.15 7.48l11.106-5.74.087.136 29.167 18.204z" fill="#364147" />
                <circle cx="151.5" cy="86" r="86" fill="#202C33" />
                <path d="M151.5 32c-29.823 0-54 24.177-54 54 0 9.526 2.474 18.793 7.14 27.013l-7.49 27.387 28.08-7.367C133.09 137.4 142.095 140 151.5 140c29.823 0 54-24.177 54-54s-24.177-54-54-54z" fill="#00A884" />
                <path d="M175.5 98.275c-.746-.373-4.423-2.183-5.109-2.432-.686-.249-1.184-.373-1.682.373-.498.747-1.93 2.432-2.366 2.93-.435.498-.87.56-1.616.187-.747-.373-3.15-1.16-5.998-3.702-2.217-1.977-3.714-4.42-4.15-5.166-.435-.747-.047-1.15.328-1.522.336-.335.746-.872 1.12-1.309.372-.436.496-.747.745-1.245.249-.498.125-.934-.062-1.309-.187-.373-1.682-4.052-2.304-5.546-.608-1.457-1.226-1.26-1.682-1.283-.436-.02-.934-.025-1.432-.025s-1.308.187-1.993.934c-.686.747-2.614 2.556-2.614 6.231 0 3.676 2.676 7.228 3.05 7.726.373.498 5.267 8.04 12.762 11.275 1.784.77 3.175 1.23 4.262 1.575 1.79.57 3.42.49 4.708.297 1.436-.215 4.423-1.809 5.047-3.554.623-1.746.623-3.243.436-3.554-.187-.31-.685-.498-1.432-.872z" fill="white" />
            </svg>
            <h2 className="empty-state__title">WhatsApp Clone</h2>
            <p className="empty-state__text">
                Send and receive messages with AI-powered features. Select a chat or search for someone to get started.
            </p>
            <div className="empty-state__features">
                <div className="empty-state__feature">
                    <span className="empty-state__feature-icon"><HiOutlineClock /></span>
                    <span className="empty-state__feature-label">Schedule Messages</span>
                </div>
                <div className="empty-state__feature">
                    <span className="empty-state__feature-icon"><HiOutlineSparkles /></span>
                    <span className="empty-state__feature-label">Smart Replies</span>
                </div>
                <div className="empty-state__feature">
                    <span className="empty-state__feature-icon"><HiOutlineDocumentText /></span>
                    <span className="empty-state__feature-label">Chat Summary</span>
                </div>
                <div className="empty-state__feature">
                    <span className="empty-state__feature-icon"><HiOutlineMicrophone /></span>
                    <span className="empty-state__feature-label">Voice to Text</span>
                </div>
            </div>
        </div>
    );
}

export default EmptyState;
