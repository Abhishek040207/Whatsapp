import { useEffect } from 'react';
import { HiOutlinePlusCircle } from 'react-icons/hi2';
import { useStatus } from '../../context/StatusContext';
import Avatar from '../Common/Avatar';

function StatusSidebar({ onViewStatus, onCreateStatus }) {
    const { myStatuses, contactStatuses, loading, fetchStatuses } = useStatus();

    useEffect(() => {
        fetchStatuses();
    }, [fetchStatuses]);

    return (
        <div className="status-sidebar">
            {/* My Status */}
            <div className="status-sidebar__my" onClick={myStatuses.statuses?.length > 0 ? () => onViewStatus(myStatuses) : onCreateStatus}>
                <div className="status-sidebar__avatar-wrap">
                    <Avatar
                        name={myStatuses.user?.name || 'My Status'}
                        avatar={myStatuses.user?.avatar}
                    />
                    {!myStatuses.statuses?.length && (
                        <div className="status-sidebar__add-icon">
                            <HiOutlinePlusCircle />
                        </div>
                    )}
                    {myStatuses.statuses?.length > 0 && (
                        <div className="status-ring status-ring--seen"></div>
                    )}
                </div>
                <div className="status-sidebar__info">
                    <div className="status-sidebar__name">My status</div>
                    <div className="status-sidebar__time">
                        {myStatuses.statuses?.length > 0
                            ? `${myStatuses.statuses.length} update${myStatuses.statuses.length > 1 ? 's' : ''}`
                            : 'Tap to add status update'}
                    </div>
                </div>
            </div>

            {/* Add new status button */}
            <button className="status-sidebar__create-btn" onClick={onCreateStatus}>
                <HiOutlinePlusCircle /> New Status
            </button>

            {/* Contacts' statuses */}
            {contactStatuses.length > 0 && (
                <>
                    <div className="status-sidebar__section-title">Recent updates</div>
                    {contactStatuses.map((contact) => (
                        <div
                            key={contact.user._id}
                            className="status-sidebar__contact"
                            onClick={() => onViewStatus(contact)}
                        >
                            <div className="status-sidebar__avatar-wrap">
                                <Avatar name={contact.user.name} avatar={contact.user.avatar} />
                                <div className={`status-ring ${contact.hasUnseen ? 'status-ring--unseen' : 'status-ring--seen'}`}></div>
                            </div>
                            <div className="status-sidebar__info">
                                <div className="status-sidebar__name">{contact.user.name}</div>
                                <div className="status-sidebar__time">
                                    {contact.statuses.length} update{contact.statuses.length > 1 ? 's' : ''} •{' '}
                                    {new Date(contact.statuses[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {loading && (
                <div className="loading-spinner">
                    <div className="loading-spinner__circle"></div>
                </div>
            )}

            {!loading && contactStatuses.length === 0 && (
                <div className="status-sidebar__empty">No status updates from contacts</div>
            )}
        </div>
    );
}

export default StatusSidebar;
