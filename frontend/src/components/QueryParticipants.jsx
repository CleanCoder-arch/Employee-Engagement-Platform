import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageCircle, Send, Trash2 } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { initialsOf, timeAgo } from "../lib/utils-date";

const AVATAR_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#0EA5E9", "#EC4899"];
function colorFor(id) {
    let h = 0;
    for (let i = 0; i < (id || "").length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/**
 * Participants (reactors + commenters) card + comment composer.
 * Renders below a query's action bar.
 */
export default function QueryParticipants({ query, me, onUpdate }) {
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const participants = query.participants || [];
    const initiallyVisible = 3;
    const shown = expanded ? participants : participants.slice(0, initiallyVisible);
    const remaining = Math.max(0, participants.length - shown.length);

    const submit = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setBusy(true);
        try {
            const { data } = await api.post(`/queries/${query.id}/comments`, { text: text.trim() });
            setText("");
            onUpdate?.(data);
        } catch (err) {
            toast.error(formatApiError(err, "Failed to comment"));
        } finally { setBusy(false); }
    };

    const deleteComment = async (cid) => {
        try {
            const { data } = await api.delete(`/queries/${query.id}/comments/${cid}`);
            onUpdate?.(data);
        } catch (err) {
            toast.error(formatApiError(err, "Failed to delete comment"));
        }
    };

    return (
        <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5" /> Who reacted &amp; commented
                </div>
                <div className="text-[12px] text-slate-500" data-testid={`participants-count-${query.id}`}>
                    {participants.length} participant{participants.length === 1 ? "" : "s"}
                </div>
            </div>

            {participants.length === 0 ? (
                <div className="text-[13px] text-slate-400 italic py-3 pl-1">Be the first to react or comment.</div>
            ) : (
                <div className="space-y-2">
                    {shown.map((p) => (
                        <ParticipantRow
                            key={p.user_id}
                            p={p}
                            me={me}
                            queryId={query.id}
                            onDeleteComment={deleteComment}
                        />
                    ))}
                    {remaining > 0 && !expanded && (
                        <button
                            onClick={() => setExpanded(true)}
                            className="text-[13px] font-semibold text-orange-600 hover:text-orange-700"
                            data-testid={`show-more-participants-${query.id}`}
                        >
                            Show {remaining} more
                        </button>
                    )}
                    {expanded && participants.length > initiallyVisible && (
                        <button
                            onClick={() => setExpanded(false)}
                            className="text-[13px] font-semibold text-slate-500 hover:text-slate-700"
                        >
                            Show less
                        </button>
                    )}
                </div>
            )}

            <form onSubmit={submit} className="mt-4 flex items-start gap-2" data-testid={`comment-form-${query.id}`}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
                     style={{ background: colorFor(me?.id || "me") }}>
                    {initialsOf(me?.name)}
                </div>
                <div className="flex-1 relative">
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Share your thoughts or reasoning…"
                        maxLength={2000}
                        data-testid={`comment-input-${query.id}`}
                        className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition text-[14px]"
                    />
                    <button
                        type="submit"
                        disabled={busy || !text.trim()}
                        data-testid={`comment-submit-${query.id}`}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-white disabled:opacity-40"
                        style={{ background: "var(--brand-orange)" }}
                        aria-label="Post comment"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}

function ParticipantRow({ p, me, queryId, onDeleteComment }) {
    const initials = initialsOf(p.name);
    const bg = colorFor(p.user_id);
    const badge = p.vote_type === "agree"
        ? { text: "Agreed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: ThumbsUp }
        : p.vote_type === "disagree"
        ? { text: "Disagreed", cls: "bg-orange-50 text-orange-700 border-orange-200", Icon: ThumbsDown }
        : null;

    return (
        <div className="rounded-xl bg-slate-50/70 border border-slate-100 px-3 py-2.5" data-testid={`participant-${queryId}-${p.user_id}`}>
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                     style={{ background: bg }}>
                    {initials}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-[14px]">{p.name}</span>
                        {badge && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.cls}`}>
                                <badge.Icon className="w-3 h-3" /> {badge.text}
                            </span>
                        )}
                    </div>
                    <div className="text-[12px] text-slate-500">{p.designation}{p.department ? ` · ${p.department}` : ""}</div>
                </div>
            </div>
            {p.comments && p.comments.length > 0 && (
                <div className="mt-2 pl-10.5 space-y-1.5" style={{ paddingLeft: "42px" }}>
                    {p.comments.map((c) => {
                        const canDelete = c.user_id === me?.id || me?.role === "admin";
                        return (
                            <div key={c.id} className="group flex items-start gap-2 text-[13px] text-slate-700 leading-relaxed">
                                <div className="flex-1">
                                    {c.text}
                                    <span className="ml-2 text-[11px] text-slate-400">{timeAgo(c.created_at)}</span>
                                </div>
                                {canDelete && (
                                    <button
                                        onClick={() => onDeleteComment(c.id)}
                                        data-testid={`delete-comment-${c.id}`}
                                        className="opacity-0 group-hover:opacity-100 transition p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                                        aria-label="Delete comment"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
