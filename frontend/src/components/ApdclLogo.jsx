export function ApdclLogo({ size = 40, className = "" }) {
    // Stylized sun/star mark used throughout APDCL Connect
    return (
        <div
            className={`rounded-xl apdcl-logo-bg flex items-center justify-center ${className}`}
            style={{ width: size, height: size }}
            aria-label="APDCL logo"
        >
            <svg viewBox="0 0 32 32" width={size * 0.65} height={size * 0.65} fill="none">
                {/* rays */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                    <rect
                        key={deg}
                        x="15"
                        y="2"
                        width="2"
                        height="6"
                        rx="1"
                        fill="#EA5B0C"
                        transform={`rotate(${deg} 16 16)`}
                    />
                ))}
                <circle cx="16" cy="16" r="5" fill="#F97316" />
            </svg>
        </div>
    );
}
