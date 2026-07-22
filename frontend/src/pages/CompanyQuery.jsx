import { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { fmtDateTime, initialsOf } from "../lib/utils-date";
import { ThumbsUp, ThumbsDown, Share2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ReactionFill } from "./Dashboard";
import { toast } from "sonner";

const FILTERS = [
    { key: "all", label: "All time" },
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "month", label: "This month" },
];

const AVATAR_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#0EA5E9", "#EC4899"];
function colorFor(id) {
    let h = 0;
    for (let i = 0; i < (id || "").length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function CompanyQuery() {
    const { user } = useAuth();
    const [filter, setFilter] = useState("all");
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/queries?filter=${filter}`);
            setItems(data);
        } finally { setLoading(false); }
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    const vote = async (q, type) => {
        try {
            const { data } = await api.post(`/queries/${q.id}/vote`, { vote_type: type });
            setItems((prev) => prev.map((x) => (x.id === q.id ? data : x)));
        } catch (e) {
            toast.error(formatApiError(e, "Vote failed"));
        }
    };

    const share = (q) => {
        const url = `${window.location.origin}/queries`;
        try {
            if (navigator.share) navigator.share({ title: q.title, text: q.description, url });
            else {
                navigator.clipboard.writeText(`${q.title} — ${url}`);
                toast.success("Link copied to clipboard");
            }
        } catch (_) {}
    };

    return (
        <Layout title="Company Query">
            <div className="flex items-center justify-between mb-5">
                <div className="text-[14px] text-slate-500" data-testid="query-count-label">
                    Showing <b className="text-slate-800">{items.length}</b> {items.length === 1 ? "query" : "queries"}
                </div>
                <div className="w-44">
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger data-testid="query-filter-trigger" className="rounded-xl border-slate-200 bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {FILTERS.map((f) => (
                                <SelectItem key={f.key} value={f.key} data-testid={`filter-${f.key}`}>{f.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading && (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-white animate-pulse border border-slate-100" />)}
                </div>
            )}

            {!loading && items.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-500">
                    No queries found for this filter.
                </div>
            )}

            <div className="space-y-4">
                {items.map((q) => (
                    <QueryCard key={q.id} q={q} me={user} onVote={vote} onShare={share} />
                ))}
            </div>
        </Layout>
    );
}

function QueryCard({ q, me, onVote, onShare }) {
    const a = q.author || {};
    const isMine = q.user_id === me?.id;
    const initials = initialsOf(a.name);
    const bg = colorFor(a.id || a.employee_id || "x");
    const total = q.agree_count + q.disagree_count;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 card-lift" data-testid={`query-card-${q.id}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ background: bg }}>
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{a.name}</span>
                            {isMine && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "var(--brand-orange-soft)", color: "var(--brand-orange)" }}>
                                    Posted by you
                                </span>
                            )}
                        </div>
                        <div className="text-[13px] text-slate-500">
                            {a.designation} · <span className="text-blue-700 font-semibold">{a.department}</span>
                        </div>
                    </div>
                </div>
                <div className="text-[12px] text-slate-500 whitespace-nowrap">{fmtDateTime(q.created_at)}</div>
            </div>

            <div className="mt-4">
                <div className="text-[17px] font-extrabold text-slate-900">{q.title}</div>
                <p className="mt-1 text-[14px] text-slate-600 leading-relaxed">{q.description}</p>
            </div>

            <div className="mt-5">
                <div className="reaction-bar">
                    <ReactionFill agree={q.agree_count} disagree={q.disagree_count} />
                </div>
                <div className="mt-2 text-right text-[12px] text-slate-500">
                    {total} {total === 1 ? "employee" : "employees"} reacted
                </div>
            </div>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
                <button
                    onClick={() => onVote(q, "agree")}
                    data-testid={`agree-btn-${q.id}`}
                    className={`px-4 py-2 rounded-xl border font-semibold text-[14px] inline-flex items-center gap-2 transition ${
                        q.my_vote === "agree"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                >
                    <ThumbsUp className="w-4 h-4" /> Agree · {q.agree_count}
                </button>
                <button
                    onClick={() => onVote(q, "disagree")}
                    data-testid={`disagree-btn-${q.id}`}
                    className={`px-4 py-2 rounded-xl border font-semibold text-[14px] inline-flex items-center gap-2 transition ${
                        q.my_vote === "disagree"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                >
                    <ThumbsDown className="w-4 h-4" /> Disagree · {q.disagree_count}
                </button>
                <button
                    onClick={() => onShare(q)}
                    data-testid={`share-btn-${q.id}`}
                    className="ml-auto px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 inline-flex items-center gap-2 text-[13px] font-semibold"
                >
                    <Share2 className="w-4 h-4" /> Share
                </button>
            </div>
        </div>
    );
}
