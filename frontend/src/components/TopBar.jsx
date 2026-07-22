import { useEffect, useState } from "react";
import { Headphones, Mail } from "lucide-react";
import NotificationBell from "./NotificationBell";

function useNow() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    return now;
}

export default function TopBar({ title }) {
    const now = useNow();
    const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).toLowerCase();

    return (
        <div>
            {/* Support bar */}
            <div
                className="w-full text-center py-2.5 text-[13px] font-semibold flex items-center justify-center gap-4"
                style={{ background: "var(--brand-orange-soft)", color: "var(--brand-orange)" }}
                data-testid="support-bar"
            >
                <span>24×7 Customer Support</span>
                <span className="flex items-center gap-1.5"><Headphones className="w-4 h-4" /> 1912</span>
                <span className="text-orange-400">or</span>
                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> support@apdcl.org</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-100">
                <h1 className="text-[26px] font-extrabold text-slate-900 tracking-tight" data-testid="page-title">{title}</h1>
                <div className="flex items-center gap-5">
                    <div className="text-right leading-tight">
                        <div className="text-[16px] font-bold text-slate-900 tabular-nums" data-testid="top-time">{timeStr}</div>
                        <div className="text-[12px] text-slate-500" data-testid="top-date">{dateStr}</div>
                    </div>
                    <NotificationBell />
                </div>
            </div>
        </div>
    );
}
