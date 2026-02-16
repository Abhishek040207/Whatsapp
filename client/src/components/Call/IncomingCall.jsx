import { HiOutlinePhone, HiOutlineVideoCamera, HiXMark } from 'react-icons/hi2';
import { useCall } from '../../context/CallContext';
import Avatar from '../Common/Avatar';

function IncomingCall() {
    const { callState, callType, remoteUser, acceptCall, rejectCall } = useCall();

    if (callState !== 'incoming') return null;

    return (
        <div className="call-overlay">
            <div className="incoming-call">
                <div className="incoming-call__pulse"></div>
                <Avatar name={remoteUser?.name || 'Unknown'} avatar={remoteUser?.avatar} size={80} />
                <h3 className="incoming-call__name">{remoteUser?.name || 'Unknown'}</h3>
                <p className="incoming-call__type">
                    Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...
                </p>

                <div className="incoming-call__actions">
                    <button className="incoming-call__btn incoming-call__btn--reject" onClick={rejectCall}>
                        <HiXMark size={28} />
                        <span>Decline</span>
                    </button>
                    <button className="incoming-call__btn incoming-call__btn--accept" onClick={acceptCall}>
                        {callType === 'video' ? <HiOutlineVideoCamera size={28} /> : <HiOutlinePhone size={28} />}
                        <span>Accept</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default IncomingCall;
