import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { fmtDateTime, initialsOf } from "../lib/utils-date";
import { MessageSquareText, Users2, ThumbsUp, ThumbsDown } from "lucide-react";

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ total_posted: 0, total_engagement: 0 });
    const [myQueries, setMyQueries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [s, m] = await Promise.all([api.get("/dashboard/stats"), api.get("/queries/mine")]);
                setStats(s.data);
                setMyQueries(m.data);
            } finally { setLoading(false); }
        })();
    }, []);

    return (
        <Layout title="Dashboard">
            {/* Welcome hero */}
            <div className="hero-gradient rounded-2xl p-7 md:p-8 flex items-center gap-6 text-white shadow-lg" data-testid="welcome-hero">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-lg"
                         style={{ background: "var(--brand-orange)" }}>
                        {initialsOf(user?.name)}
                    </div>
                </div>
                <div className="min-w-0">
                    <div className="text-2xl md:text-3xl font-extrabold tracking-tight">Welcome back, {user?.name?.split(" ")[0]}</div>
                    <div className="mt-1 text-white/80 text-[14px]">
                        {user?.designation} · {user?.department} · ID {user?.employee_id}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="mt-6 grid md:grid-cols-2 gap-5">
                <StatCard
                    icon={<MessageSquareText className="w-5 h-5 text-orange-600" />}
                    tone="orange"
                    label="Total queries posted"
                    value={stats.total_posted}
                    testid="stat-posted"
                />
                <StatCard
                    icon={<Users2 className="w-5 h-5 text-emerald-600" />}
                    tone="emerald"
                    label="Engagements on your queries"
                    value={stats.total_engagement}
                    testid="stat-engagement"
                />
            </div>

            {/* Recent queries */}
            <div className="mt-6 bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-[18px] font-bold text-slate-900">Your posted queries</div>
                    <div className="text-[13px] text-slate-500">{myQueries.length} posted</div>
                </div>

                {loading && <SkeletonRows />}
                {!loading && myQueries.length === 0 && (
                    <div className="py-10 text-center text-slate-500 text-sm">
                        You haven’t posted any queries yet. Head to <b>Post Query</b> to start.
                    </div>
                )}

                <div className="divide-y divide-slate-100">
                    {myQueries.map((q) => (
                        <div key={q.id} className="py-4" data-testid={`dashboard-query-${q.id}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="font-bold text-slate-900">{q.title}</div>
                                    <p className="text-[14px] text-slate-600 mt-1 line-clamp-2">{q.description}</p>
                                </div>
                                <div className="text-[12px] text-slate-500 whitespace-nowrap">{fmtDateTime(q.created_at)}</div>
                            </div>
                            <div className="mt-3 flex items-center gap-4 text-[13px] text-slate-600">
                                <span className="inline-flex items-center gap-1.5"><ThumbsUp className="w-4 h-4 text-emerald-600" /> {q.agree_count}</span>
                                <span className="inline-flex items-center gap-1.5"><ThumbsDown className="w-4 h-4 text-orange-500" /> {q.disagree_count}</span>
                                <span className="text-slate-400">·</span>
                                <span>{q.total_engagement} total reactions</span>
                            </div>
                            <div className="reaction-bar mt-3">
                                <ReactionFill agree={q.agree_count} disagree={q.disagree_count} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
}

function StatCard({ icon, label, value, tone, testid }) {
    const bg = tone === "orange" ? "bg-orange-50" : "bg-emerald-50";
    return (
        <div className="card-lift bg-white rounded-2xl border border-slate-100 p-6 flex items-center gap-5" data-testid={testid}>
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
            <div>
                <div className="text-[13px] text-slate-500 font-medium">{label}</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-0.5 tabular-nums">{value}</div>
            </div>
        </div>
    );
}

export function ReactionFill({ agree, disagree }) {
    const total = agree + disagree;
    if (total === 0) return null;
    const aPct = (agree / total) * 100;
    return (
        <div className="flex h-full">
            <div className="reaction-fill-agree" style={{ width: `${aPct}%` }} />
            <div className="reaction-fill-disagree" style={{ width: `${100 - aPct}%` }} />
        </div>
    );
}

function SkeletonRows() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
            ))}
        </div>
    );
}
