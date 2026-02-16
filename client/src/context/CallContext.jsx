import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const CallContext = createContext();

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export function CallProvider({ children }) {
    const { socket } = useSocket();
    const { user } = useAuth();
    const [callState, setCallState] = useState('idle'); // idle, calling, incoming, active
    const [callType, setCallType] = useState(null); // voice or video
    const [remoteUser, setRemoteUser] = useState(null);
    const [callId, setCallId] = useState(null);
    const [callTimer, setCallTimer] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);

    const peerRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const timerInterval = useRef(null);
    const incomingSignalRef = useRef(null);

    // ─── Start call timer ───
    const startTimer = useCallback(() => {
        setCallTimer(0);
        timerInterval.current = setInterval(() => {
            setCallTimer((prev) => prev + 1);
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
        }
    }, []);

    // ─── Cleanup ───
    const cleanup = useCallback(() => {
        stopTimer();
        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }
        remoteStreamRef.current = null;
        setCallState('idle');
        setCallType(null);
        setRemoteUser(null);
        setCallId(null);
        setCallTimer(0);
        setIsMuted(false);
        setIsCameraOff(false);
    }, [stopTimer]);

    // ─── Initiate a call ───
    const callUser = useCallback(async (targetUser, type) => {
        try {
            const isVideo = type === 'video';
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: isVideo,
            });
            localStreamRef.current = stream;

            setCallState('calling');
            setCallType(type);
            setRemoteUser(targetUser);

            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerRef.current = pc;

            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            pc.onicecandidate = (event) => {
                if (event.candidate && socket) {
                    socket.emit('ice-candidate', {
                        to: targetUser._id,
                        candidate: event.candidate,
                    });
                }
            };

            pc.ontrack = (event) => {
                remoteStreamRef.current = event.streams[0];
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('call-user', {
                to: targetUser._id,
                from: user._id,
                signal: offer,
                callType: type,
                callerInfo: { _id: user._id, name: user.name, avatar: user.avatar },
            });
        } catch (err) {
            console.error('Call error:', err);
            cleanup();
        }
    }, [socket, user, cleanup]);

    // ─── Accept incoming call ───
    const acceptCall = useCallback(async () => {
        try {
            const isVideo = callType === 'video';
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: isVideo,
            });
            localStreamRef.current = stream;

            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerRef.current = pc;

            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            pc.onicecandidate = (event) => {
                if (event.candidate && socket) {
                    socket.emit('ice-candidate', {
                        to: remoteUser._id,
                        candidate: event.candidate,
                    });
                }
            };

            pc.ontrack = (event) => {
                remoteStreamRef.current = event.streams[0];
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            await pc.setRemoteDescription(new RTCSessionDescription(incomingSignalRef.current));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('call-accepted', {
                to: remoteUser._id,
                signal: answer,
                callId,
            });

            setCallState('active');
            startTimer();
        } catch (err) {
            console.error('Accept call error:', err);
            cleanup();
        }
    }, [socket, callType, remoteUser, callId, startTimer, cleanup]);

    // ─── Reject incoming call ───
    const rejectCall = useCallback(() => {
        if (socket && remoteUser) {
            socket.emit('call-rejected', { to: remoteUser._id, callId });
        }
        cleanup();
    }, [socket, remoteUser, callId, cleanup]);

    // ─── End call ───
    const endCall = useCallback(() => {
        if (socket && remoteUser) {
            socket.emit('call-ended', { to: remoteUser._id, callId });
        }
        cleanup();
    }, [socket, remoteUser, callId, cleanup]);

    // ─── Toggle mute ───
    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    }, []);

    // ─── Toggle camera ───
    const toggleCamera = useCallback(() => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOff(!videoTrack.enabled);
            }
        }
    }, []);

    // ─── Socket listeners ───
    useEffect(() => {
        if (!socket) return;

        socket.on('incoming-call', ({ signal, from, callType: type, callerInfo, callId: cId }) => {
            incomingSignalRef.current = signal;
            setCallState('incoming');
            setCallType(type);
            setRemoteUser(callerInfo);
            setCallId(cId);
        });

        socket.on('call-accepted', async ({ signal }) => {
            if (peerRef.current) {
                await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                setCallState('active');
                startTimer();
            }
        });

        socket.on('call-rejected', () => {
            cleanup();
        });

        socket.on('call-ended', () => {
            cleanup();
        });

        socket.on('ice-candidate', async ({ candidate }) => {
            if (peerRef.current && candidate) {
                try {
                    await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error('ICE candidate error:', err);
                }
            }
        });

        socket.on('call-unavailable', ({ reason }) => {
            console.warn('Call unavailable:', reason);
            cleanup();
        });

        return () => {
            socket.off('incoming-call');
            socket.off('call-accepted');
            socket.off('call-rejected');
            socket.off('call-ended');
            socket.off('ice-candidate');
            socket.off('call-unavailable');
        };
    }, [socket, startTimer, cleanup]);

    return (
        <CallContext.Provider
            value={{
                callState,
                callType,
                remoteUser,
                callTimer,
                isMuted,
                isCameraOff,
                localVideoRef,
                remoteVideoRef,
                localStreamRef,
                callUser,
                acceptCall,
                rejectCall,
                endCall,
                toggleMute,
                toggleCamera,
            }}
        >
            {children}
        </CallContext.Provider>
    );
}

export const useCall = () => useContext(CallContext);
