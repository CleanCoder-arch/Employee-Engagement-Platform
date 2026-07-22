import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import api from "../../lib/api";
import { fmtDateTime, timeAgo, initialsOf } from "../../lib/utils-date";
import { Users2, MessageSquareText, MessageCircle, ThumbsUp, TrendingUp, Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const AVATAR_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#0EA5E9", "#EC4899"];
function colorFor(id) {
    let h = 0;
    for (let i = 0; i < (id || "").length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("/admin/analytics");
                setData(data);
            } finally { setLoading(false); }
        })();
    }, []);

    if (loading || !data) {
        return (
            <Layout title="Admin Dashboard">
                <div className="grid grid-cols-4 gap-5 mb-6">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl bg-white animate-pulse border border-slate-100" />)}
                </div>
                <div className="h-72 rounded-2xl bg-white animate-pulse border border-slate-100" />
            </Layout>
        );
    }

    const t = data.totals;
    const tm = data.this_month;
    const maxComments = Math.max(1, ...data.monthly.map((m) => m.comments));
    const maxAny = Math.max(1, ...data.monthly.flatMap((m) => [m.queries, m.comments, m.reactions]));

    return (
        <Layout title="Admin Dashboard">
            {/* Hero */}
            <div className="hero-gradient rounded-2xl p-6 md:p-7 flex items-center gap-5 text-white mb-6" data-testid="admin-hero">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-white"
                         style={{ background: "var(--brand-orange)" }}>
                        {initialsOf(user?.name)}
                    </div>
                </div>
                <div>
                    <div className="text-2xl md:text-[26px] font-extrabold tracking-tight">Welcome back, {user?.name?.split(" ")[0]}</div>
                    <div className="text-white/80 text-[14px]">Platform activity overview · {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</div>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard testid="admin-stat-employees" icon={<Users2 className="w-5 h-5" />} tone="blue" label="Total employees" value={t.employees} sub="Across all circles" />
                <StatCard testid="admin-stat-queries" icon={<MessageSquareText className="w-5 h-5" />} tone="orange" label="Total queries" value={t.queries} sub={`${tm.queries} this month`} />
                <StatCard testid="admin-stat-comments" icon={<MessageCircle className="w-5 h-5" />} tone="violet" label="Total comments" value={t.comments} sub={`${tm.comments} this month`} />
                <StatCard testid="admin-stat-reactions" icon={<ThumbsUp className="w-5 h-5" />} tone="emerald" label="Total reactions" value={t.reactions} sub={`${tm.reactions} this month`} />
            </div>

            {/* Monthly activity chart */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6" data-testid="monthly-analytics-panel">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <div className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-orange-600" /> Monthly activity — last 6 months
                        </div>
                        <div className="text-[12px] text-slate-500 mt-0.5">Queries, comments and reactions over time</div>
                    </div>
                    <div className="flex items-center gap-4 text-[12px]">
                        <LegendDot color="#EA5B0C" label="Queries" />
                        <LegendDot color="#8B5CF6" label="Comments" />
                        <LegendDot color="#10B981" label="Reactions" />
                    </div>
                </div>

                <div className="flex items-end gap-3 md:gap-5 h-56 pb-2">
                    {data.monthly.map((m) => (
                        <div key={m.label} className="flex-1 flex flex-col items-center gap-2" data-testid={`monthly-bar-${m.label.replace(" ", "-")}`}>
                            <div className="flex items-end gap-1 w-full h-full">
                                <Bar value={m.queries} max={maxAny} color="#EA5B0C" />
                                <Bar value={m.comments} max={maxAny} color="#8B5CF6" />
                                <Bar value={m.reactions} max={maxAny} color="#10B981" />
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500 tracking-wide">{m.label}</div>
                        </div>
                    ))}
                </div>

                {/* Dedicated comments line for scanning */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="text-[13px] font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <MessageCircle className="w-3.5 h-3.5 text-violet-600" /> Comments trend
                    </div>
                    <div className="flex items-center gap-3">
                        {data.monthly.map((m) => (
                            <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5">
                                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${(m.comments / maxComments) * 100}%`,
                                            background: "linear-gradient(90deg,#8B5CF6,#C4B5FD)",
                                        }}
                                    />
                                </div>
                                <div className="text-[11px] font-bold text-slate-700 tabular-nums">{m.comments}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                {/* Top engaged queries */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6" data-testid="top-queries-panel">
                    <div className="text-[16px] font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" /> Top engaged queries this month
                    </div>
                    {data.top_queries.length === 0 && (
                        <div className="py-8 text-center text-slate-500 text-sm">No queries posted this month yet.</div>
                    )}
                    <div className="divide-y divide-slate-100">
                        {data.top_queries.map((q, idx) => (
                            <div key={q.id} className="py-3 flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-700 font-bold text-[13px] flex items-center justify-center shrink-0">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[14px] font-bold text-slate-900 truncate">{q.title}</div>
                                    <div className="text-[12px] text-slate-500 truncate">{q.author_name} · {q.author_designation}</div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-[13px] font-bold text-slate-900 tabular-nums">{q.engagement}</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{q.reactions}R · {q.comments}C</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent comments */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6" data-testid="recent-comments-panel">
                    <div className="text-[16px] font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-violet-600" /> Recent comments
                    </div>
                    {data.recent_comments.length === 0 && (
                        <div className="py-8 text-center text-slate-500 text-sm">No comments yet.</div>
                    )}
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {data.recent_comments.map((c) => (
                            <div key={c.id} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                                     style={{ background: colorFor(c.id) }}>
                                    {initialsOf(c.author_name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-bold text-slate-900">
                                        {c.author_name} <span className="text-slate-400 font-normal">· {c.author_designation}</span>
                                    </div>
                                    <div className="text-[13px] text-slate-600 line-clamp-2">{c.text}</div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">on “{c.query_title}” · {timeAgo(c.created_at)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Departments */}
            <div className="mt-4 bg-white rounded-2xl border border-slate-100 p-6" data-testid="departments-panel">
                <div className="text-[16px] font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" /> Employees by department
                </div>
                {data.departments.length === 0 && (
                    <div className="py-6 text-center text-slate-500 text-sm">No department data.</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.departments.map((d) => {
                        const pct = t.employees > 0 ? (d.employees / t.employees) * 100 : 0;
                        return (
                            <div key={d.name} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center justify-between text-[13px] mb-2">
                                    <div className="font-semibold text-slate-800 truncate">{d.name}</div>
                                    <div className="text-slate-500 tabular-nums">{d.employees}</div>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Layout>
    );
}

function StatCard({ icon, label, value, sub, tone, testid }) {
    const tones = {
        blue: "bg-blue-50 text-blue-700",
        orange: "bg-orange-50 text-orange-700",
        violet: "bg-violet-50 text-violet-700",
        emerald: "bg-emerald-50 text-emerald-700",
    };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid={testid}>
            <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>{icon}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live</div>
            </div>
            <div className="mt-3 text-[12px] text-slate-500 font-medium">{label}</div>
            <div className="text-3xl font-extrabold text-slate-900 tabular-nums leading-none mt-1">{value}</div>
            {sub && <div className="mt-1 text-[12px] text-slate-500">{sub}</div>}
        </div>
    );
}

function Bar({ value, max, color }) {
    const h = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div className="text-[10px] font-bold text-slate-500 tabular-nums">{value || ""}</div>
            <div className="w-full rounded-t-md" style={{ height: `${h}%`, minHeight: value > 0 ? 4 : 0, background: color }} />
        </div>
    );
}

function LegendDot({ color, label }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            {label}
        </span>
    );
}
