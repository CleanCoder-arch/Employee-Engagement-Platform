import { useEffect, useState, useCallback, useMemo } from "react";
import { Bell, Check, Trash2, CheckCheck, ThumbsUp, ThumbsDown } from "lucide-react";
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

// Groups consecutive vote notifications on the SAME query with the SAME type
// into one entry: "Rupam Das and 3 others agreed with your query …"
function groupNotifications(items) {
    const result = [];
    for (const n of items) {
        const isVote = n.type === "vote_agree" || n.type === "vote_disagree";
        const prev = result[result.length - 1];
        if (
            isVote && prev && prev._group &&
            prev.type === n.type &&
            prev.related_query_id === n.related_query_id &&
            prev.is_read === n.is_read
        ) {
            prev._ids.push(n.id);
            prev._count += 1;
            // Keep the newest created_at (list is desc), the first one we saw
            continue;
        }
        if (isVote) {
            result.push({
                ...n,
                _group: true,
                _ids: [n.id],
                _count: 1,
            });
        } else {
            result.push({ ...n, _group: false, _ids: [n.id], _count: 1 });
        }
    }
    return result;
}

function extractActor(message) {
    // Backend messages like: "Rupam Das agreed with 'Title'" — first two words are usually the actor
    if (!message) return "";
    // Take everything before " agreed" / " disagreed"
    const m = message.match(/^(.+?)\s+(?:agreed|disagreed)/i);
    return m ? m[1] : message.split(" ").slice(0, 2).join(" ");
}

function groupedTitle(g) {
    if (!g._group || g._count === 1) return g.title;
    const verb = g.type === "vote_agree" ? "agreed with" : "disagreed with";
    return `${g._count} people ${verb} your query`;
}

function groupedMessage(g) {
    if (!g._group || g._count === 1) return g.message;
    const actor = extractActor(g.message);
    const verb = g.type === "vote_agree" ? "agreed" : "disagreed";
    const others = g._count - 1;
    return `${actor} and ${others} ${others === 1 ? "other" : "others"} ${verb} on your query.`;
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

    const grouped = useMemo(() => groupNotifications(items), [items]);

    const markGroupRead = async (g) => {
        await Promise.all(g._ids.filter((_, i) => !g.is_read || i === 0).map((id) =>
            api.put(`/notifications/${id}/read`).catch(() => null)
        ));
        load();
    };
    const markAll = async () => {
        await api.put(`/notifications/read-all`);
        load();
    };
    const delGroup = async (g) => {
        await Promise.all(g._ids.map((id) => api.delete(`/notifications/${id}`).catch(() => null)));
        load();
    };
    const openGroup = async (g) => {
        if (!g.is_read) await markGroupRead(g);
        setOpen(false);
        if (g.related_query_id) nav("/queries");
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
                    {grouped.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm">No notifications yet</div>
                    )}
                    {grouped.map((g) => {
                        const Icon = g.type === "vote_agree" ? ThumbsUp : g.type === "vote_disagree" ? ThumbsDown : null;
                        const iconTone = g.type === "vote_agree"
                            ? "bg-emerald-100 text-emerald-700"
                            : g.type === "vote_disagree"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-500";
                        return (
                            <div
                                key={g.id}
                                data-testid={`notification-item-${g.id}`}
                                className={`px-4 py-3 border-b last:border-b-0 hover:bg-slate-50 cursor-pointer flex gap-3 ${!g.is_read ? "bg-orange-50/40" : ""}`}
                                onClick={() => openGroup(g)}
                            >
                                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!g.is_read ? "bg-orange-500" : "bg-transparent"}`} />
                                {Icon && (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconTone}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="text-[14px] font-semibold text-slate-900 truncate flex items-center gap-2">
                                        {groupedTitle(g)}
                                        {g._group && g._count > 1 && (
                                            <span
                                                data-testid={`notification-group-badge-${g.id}`}
                                                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700"
                                            >
                                                +{g._count}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[13px] text-slate-600 line-clamp-2">{groupedMessage(g)}</div>
                                    <div className="text-[11px] text-slate-400 mt-1">{timeAgo(g.created_at)}</div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    {!g.is_read && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); markGroupRead(g); }}
                                            title="Mark read"
                                            className="p-1 rounded hover:bg-slate-200"
                                        >
                                            <Check className="w-4 h-4 text-slate-500" />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); delGroup(g); }}
                                        title="Delete"
                                        className="p-1 rounded hover:bg-slate-200"
                                    >
                                        <Trash2 className="w-4 h-4 text-slate-500" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
