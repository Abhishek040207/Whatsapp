import { useEffect } from 'react';
import {
    HiOutlineMicrophone,
    HiOutlineVideoCamera,
    HiOutlineVideoCameraSlash,
    HiPhoneXMark,
} from 'react-icons/hi2';
import { BsMicMute } from 'react-icons/bs';
import { useCall } from '../../context/CallContext';
import Avatar from '../Common/Avatar';

function ActiveCall() {
    const {
        callState,
        callType,
        remoteUser,
        callTimer,
        isMuted,
        isCameraOff,
        localVideoRef,
        remoteVideoRef,
        localStreamRef,
        endCall,
        toggleMute,
        toggleCamera,
    } = useCall();

    // Attach local stream to video element
    useEffect(() => {
        if (callState === 'active' && localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        }
    }, [callState]);

    if (callState !== 'active' && callState !== 'calling') return null;

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="call-overlay">
            <div className={`active-call ${callType === 'video' ? 'active-call--video' : ''}`}>
                {/* Video streams */}
                {callType === 'video' && (
                    <>
                        <video
                            ref={remoteVideoRef}
                            className="active-call__remote-video"
                            autoPlay
                            playsInline
                        />
                        <video
                            ref={localVideoRef}
                            className="active-call__local-video"
                            autoPlay
                            playsInline
                            muted
                        />
                    </>
                )}

                {/* Voice call or video call info overlay */}
                <div className="active-call__info">
                    {callType === 'voice' && (
                        <Avatar name={remoteUser?.name || 'Unknown'} avatar={remoteUser?.avatar} size={100} />
                    )}
                    <h3 className="active-call__name">{remoteUser?.name || 'Unknown'}</h3>
                    <p className="active-call__status">
                        {callState === 'calling' ? 'Calling...' : formatTime(callTimer)}
                    </p>
                </div>

                {/* Controls */}
                <div className="active-call__controls">
                    <button
                        className={`active-call__ctrl ${isMuted ? 'active-call__ctrl--active' : ''}`}
                        onClick={toggleMute}
                    >
                        {isMuted ? <BsMicMute size={24} /> : <HiOutlineMicrophone size={24} />}
                    </button>

                    {callType === 'video' && (
                        <button
                            className={`active-call__ctrl ${isCameraOff ? 'active-call__ctrl--active' : ''}`}
                            onClick={toggleCamera}
                        >
                            {isCameraOff ? <HiOutlineVideoCameraSlash size={24} /> : <HiOutlineVideoCamera size={24} />}
                        </button>
                    )}

                    <button className="active-call__ctrl active-call__ctrl--end" onClick={endCall}>
                        <HiPhoneXMark size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ActiveCall;
