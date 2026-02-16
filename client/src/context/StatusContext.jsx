import { createContext, useContext, useState, useCallback } from 'react';
import API from '../utils/api';

const StatusContext = createContext();

export function StatusProvider({ children }) {
    const [myStatuses, setMyStatuses] = useState({ user: null, statuses: [] });
    const [contactStatuses, setContactStatuses] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchStatuses = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await API.get('/status');
            setMyStatuses(data.myStatuses);
            setContactStatuses(data.contactStatuses);
        } catch (err) {
            console.error('Fetch statuses error:', err);
        }
        setLoading(false);
    }, []);

    const createStatus = async (statusData) => {
        const { data } = await API.post('/status', statusData);
        // Refresh statuses
        await fetchStatuses();
        return data;
    };

    const markSeen = async (statusId) => {
        try {
            await API.put(`/status/seen/${statusId}`);
        } catch (err) {
            console.error('Mark seen error:', err);
        }
    };

    const deleteStatus = async (statusId) => {
        try {
            await API.delete(`/status/${statusId}`);
            await fetchStatuses();
        } catch (err) {
            console.error('Delete status error:', err);
        }
    };

    return (
        <StatusContext.Provider
            value={{
                myStatuses,
                contactStatuses,
                loading,
                fetchStatuses,
                createStatus,
                markSeen,
                deleteStatus,
            }}
        >
            {children}
        </StatusContext.Provider>
    );
}

export const useStatus = () => useContext(StatusContext);
