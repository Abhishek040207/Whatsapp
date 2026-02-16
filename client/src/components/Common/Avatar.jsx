function Avatar({ name, avatar, isOnline, size = 'md' }) {
    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    // Support numeric pixel sizes or string sizes ('sm', 'md', 'lg')
    const isNumeric = typeof size === 'number';
    const sizeClass = isNumeric ? '' : size !== 'md' ? `avatar--${size}` : '';
    const style = isNumeric ? { width: size, height: size, minWidth: size } : {};

    return (
        <div className={`avatar ${sizeClass}`} style={style}>
            {avatar ? (
                <img
                    className="avatar__img"
                    src={avatar.startsWith('http') ? avatar : `http://localhost:5000${avatar}`}
                    alt={name}
                    style={isNumeric ? { width: size, height: size } : {}}
                />
            ) : (
                <div
                    className={`avatar__placeholder ${size === 'sm' ? 'avatar__placeholder--sm' : ''}`}
                    style={isNumeric ? { width: size, height: size, fontSize: Math.max(size * 0.4, 12) } : {}}
                >
                    {getInitials(name)}
                </div>
            )}
            {isOnline && <div className="avatar__online-dot"></div>}
        </div>
    );
}

export default Avatar;
