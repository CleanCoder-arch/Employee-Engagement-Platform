import { useEffect, useState, useCallback } from "react";
import { Bell, Check, Trash2, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";

function timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationBell() {
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const nav = useNavigate();

    const load = useCallback(async () => {
        try {
            const { data } = await api.get("/notifications");
            setItems(data.items || []);
            setUnread(data.unread_count || 0);
        } catch (_) {}
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(load, 30000);
        return () => clearInterval(t);
    }, [load]);

    const markRead = async (id) => {
        await api.put(`/notifications/${id}/read`);
        load();
    };
    const markAll = async () => {
        await api.put(`/notifications/read-all`);
        load();
    };
    const del = async (id) => {
        await api.delete(`/notifications/${id}`);
        load();
    };
    const openNotif = async (n) => {
        if (!n.is_read) await api.put(`/notifications/${n.id}/read`);
        setOpen(false);
        if (n.related_query_id) nav("/queries");
        load();
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    data-testid="notification-bell-btn"
                    className="relative w-11 h-11 rounded-full flex items-center justify-center hover:bg-slate-100 transition"
                    aria-label="Notifications"
                >
                    <Bell className="w-5 h-5 text-slate-700" />
                    {unread > 0 && (
                        <span
                            data-testid="notification-unread-count"
                            className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center"
                            style={{ background: "var(--brand-orange)" }}
                        >
                            {unread > 99 ? "99+" : unread}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0 rounded-2xl overflow-hidden shadow-xl border-slate-200">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
                    <div className="font-bold text-slate-900">Notifications</div>
                    {unread > 0 && (
                        <button
                            onClick={markAll}
                            data-testid="notification-mark-all-btn"
                            className="text-[12px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                        >
                            <CheckCheck className="w-4 h-4" /> Mark all read
                        </button>
                    )}
                </div>
                <div className="max-h-[420px] overflow-y-auto bg-white">
                    {items.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm">No notifications yet</div>
                    )}
                    {items.map((n) => (
                        <div
                            key={n.id}
                            data-testid={`notification-item-${n.id}`}
                            className={`px-4 py-3 border-b last:border-b-0 hover:bg-slate-50 cursor-pointer flex gap-3 ${!n.is_read ? "bg-orange-50/40" : ""}`}
                            onClick={() => openNotif(n)}
                        >
                            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.is_read ? "bg-orange-500" : "bg-transparent"}`} />
                            <div className="flex-1 min-w-0">
                                <div className="text-[14px] font-semibold text-slate-900 truncate">{n.title}</div>
                                <div className="text-[13px] text-slate-600 line-clamp-2">{n.message}</div>
                                <div className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                {!n.is_read && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                                        title="Mark read"
                                        className="p-1 rounded hover:bg-slate-200"
                                    >
                                        <Check className="w-4 h-4 text-slate-500" />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); del(n.id); }}
                                    title="Delete"
                                    className="p-1 rounded hover:bg-slate-200"
                                >
                                    <Trash2 className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
