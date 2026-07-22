const APDCL_LOGO_URL = "https://customer-assets-rejwkqb3.emergentagent.net/job_employee-hub-506/artifacts/dog4npy2_9826d3e0-5464-4931-bd45-502e02519981.jpg";

export function ApdclLogo({ size = 40, className = "" }) {
    return (
        <div
            className={`rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm ${className}`}
            style={{ width: size, height: size }}
            aria-label="APDCL logo"
        >
            <img
                src={APDCL_LOGO_URL}
                alt="APDCL"
                className="w-full h-full object-cover"
                loading="eager"
            />
        </div>
    );
}
