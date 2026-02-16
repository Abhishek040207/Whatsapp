import { useState, useRef, useEffect } from 'react';
import { HiPaperAirplane, HiXMark } from 'react-icons/hi2';
import API from '../../utils/api';

function VoiceToText({ onTranscription, onCancel }) {
    const [recording, setRecording] = useState(true);
    const [timer, setTimer] = useState(0);
    const [transcribing, setTranscribing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    useEffect(() => {
        startRecording();
        return () => {
            stopTimer();
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start();
            setRecording(true);
            startTimer();
        } catch (err) {
            console.error('Microphone access error:', err);
            onCancel();
        }
    };

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setTimer((prev) => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    };

    const formatTimer = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleSend = () => {
        if (!mediaRecorderRef.current) return;

        mediaRecorderRef.current.onstop = async () => {
            stopTimer();
            setTranscribing(true);

            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', blob, 'voice-note.webm');

            try {
                const { data } = await API.post('/ai/voice-to-text', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                onTranscription(data.text || '');
            } catch (err) {
                console.error('Transcription error:', err);
                onTranscription('');
            }
            setTranscribing(false);
        };

        mediaRecorderRef.current.stop();
        // Stop all tracks
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    };

    const handleCancel = () => {
        stopTimer();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        }
        onCancel();
    };

    if (transcribing) {
        return (
            <div className="voice-recording">
                <div className="loading-spinner" style={{ padding: 0 }}>
                    <div className="loading-spinner__circle" style={{ width: 20, height: 20 }}></div>
                </div>
                <span style={{ fontSize: 14, color: 'var(--wa-text-secondary)' }}>Transcribing...</span>
            </div>
        );
    }

    return (
        <div className="voice-recording">
            <div className="voice-recording__indicator"></div>
            <span className="voice-recording__timer">{formatTimer(timer)}</span>
            <div className="voice-recording__waveform">
                {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className="voice-recording__bar" style={{ height: `${Math.random() * 16 + 4}px` }} />
                ))}
            </div>
            <button className="voice-recording__cancel" onClick={handleCancel}>
                <HiXMark size={20} /> Cancel
            </button>
            <button className="voice-recording__send" onClick={handleSend} title="Send and transcribe">
                <HiPaperAirplane />
            </button>
        </div>
    );
}

export default VoiceToText;
