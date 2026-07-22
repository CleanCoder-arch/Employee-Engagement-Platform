import { useEffect, useState, useCallback, useRef } from "react";
import Layout from "../components/Layout";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { fmtDateTime, initialsOf } from "../lib/utils-date";
import { ThumbsUp, ThumbsDown, Share2, Search, X, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ReactionFill } from "./Dashboard";
import { toast } from "sonner";

const FILTERS = [
    { key: "all", label: "All time" },
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "month", label: "This month" },
];
const PAGE_SIZE = 5;

const AVATAR_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#0EA5E9", "#EC4899"];
function colorFor(id) {
    let h = 0;
    for (let i = 0; i < (id || "").length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function CompanyQuery() {
    const { user } = useAuth();
    const [filter, setFilter] = useState("all");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState(""); // debounced
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Debounce search input
    const debTimer = useRef(null);
    useEffect(() => {
        if (debTimer.current) clearTimeout(debTimer.current);
        debTimer.current = setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => debTimer.current && clearTimeout(debTimer.current);
    }, [searchInput]);

    const loadPage = useCallback(async (targetPage, append) => {
        if (append) setLoadingMore(true); else setLoading(true);
        try {
            const { data } = await api.get(`/queries`, {
                params: { filter, q: search, page: targetPage, limit: PAGE_SIZE },
            });
            setTotal(data.total);
            setHasMore(data.has_more);
            setPage(data.page);
            setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        } finally {
            if (append) setLoadingMore(false); else setLoading(false);
        }
    }, [filter, search]);

    // Reset & load first page whenever filter or search changes
    useEffect(() => {
        loadPage(1, false);
    }, [loadPage]);

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
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search queries, authors, departments…"
                        data-testid="query-search-input"
                        className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition text-[14px]"
                    />
                    {searchInput && (
                        <button
                            onClick={() => setSearchInput("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 text-slate-400"
                            aria-label="Clear search"
                            data-testid="query-search-clear"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-[14px] text-slate-500" data-testid="query-count-label">
                        Showing <b className="text-slate-800">{items.length}</b> of {total}
                    </div>
                    <div className="w-40">
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
            </div>

            {loading && (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-white animate-pulse border border-slate-100" />)}
                </div>
            )}

            {!loading && items.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-500" data-testid="query-empty-state">
                    {search
                        ? <>No queries match “<b className="text-slate-700">{search}</b>”.</>
                        : "No queries found for this filter."}
                </div>
            )}

            <div className="space-y-4">
                {items.map((q) => (
                    <QueryCard key={q.id} q={q} me={user} onVote={vote} onShare={share} />
                ))}
            </div>

            {!loading && hasMore && (
                <div className="mt-6 flex justify-center">
                    <button
                        onClick={() => loadPage(page + 1, true)}
                        disabled={loadingMore}
                        data-testid="query-load-more-btn"
                        className="px-6 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 text-[14px] inline-flex items-center gap-2 disabled:opacity-60"
                    >
                        {loadingMore ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</> : `Load more (${total - items.length} remaining)`}
                    </button>
                </div>
            )}
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
