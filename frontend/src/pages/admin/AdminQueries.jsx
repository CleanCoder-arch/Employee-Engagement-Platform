import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import api, { formatApiError } from "../../lib/api";
import { fmtDateTime, initialsOf } from "../../lib/utils-date";
import { Trash2, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { ReactionFill } from "../Dashboard";
import QueryParticipants from "../../components/QueryParticipants";
import { useAuth } from "../../context/AuthContext";

export default function AdminQueries() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirm, setConfirm] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/queries");
            setItems(data);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const del = async () => {
        try {
            await api.delete(`/queries/${confirm.id}`);
            toast.success("Query removed");
            setConfirm(null);
            load();
        } catch (err) { toast.error(formatApiError(err, "Failed")); }
    };

    const updateInList = (updated) => setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));

    return (
        <Layout title="All Queries">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="text-[16px] font-bold text-slate-900">Platform-wide queries</div>
                    <div className="text-[13px] text-slate-500" data-testid="admin-queries-count">{items.length} total</div>
                </div>
            </div>

            {loading && <div className="py-12 text-center text-slate-500">Loading…</div>}
            {!loading && items.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-500">No queries yet.</div>
            )}

            <div className="space-y-4">
                {items.map((q) => {
                    const totalEmployees = q.total_employees ?? 0;
                    const reactorCount = q.reactor_count ?? 0;
                    return (
                        <div key={q.id} className="bg-white rounded-2xl border border-slate-100 p-6" data-testid={`admin-query-${q.id}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold bg-blue-600">
                                        {initialsOf(q.author?.name)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-900">{q.author?.name}</div>
                                        <div className="text-[13px] text-slate-500">
                                            {q.author?.designation} · <span className="text-blue-700 font-semibold">{q.author?.department}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-[12px] text-slate-500 whitespace-nowrap">{fmtDateTime(q.created_at)}</div>
                                    <button
                                        onClick={() => setConfirm(q)}
                                        data-testid={`admin-delete-query-${q.id}`}
                                        className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="text-[17px] font-extrabold text-slate-900">{q.title}</div>
                                <p className="mt-1 text-[14px] text-slate-600 leading-relaxed">{q.description}</p>
                            </div>

                            <div className="mt-5">
                                <div className="reaction-bar">
                                    <ReactionFill agree={q.agree_count} disagree={q.disagree_count} />
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[12px] text-slate-500">
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5 text-emerald-600" /> {q.agree_count}</span>
                                        <span className="inline-flex items-center gap-1"><ThumbsDown className="w-3.5 h-3.5 text-orange-500" /> {q.disagree_count}</span>
                                        <span>· {q.comment_count ?? 0} comments</span>
                                    </div>
                                    <span data-testid={`admin-reaction-summary-${q.id}`}>
                                        <b className="text-slate-700">{reactorCount}</b> of {totalEmployees} employees reacted
                                    </span>
                                </div>
                            </div>

                            <QueryParticipants query={q} me={user} onUpdate={updateInList} />
                        </div>
                    );
                })}
            </div>

            <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Remove this query?</DialogTitle></DialogHeader>
                    <p className="text-slate-600 text-[14px]">
                        This will delete "{confirm?.title}" and all its reactions and comments. The author will be notified.
                    </p>
                    <DialogFooter>
                        <button className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setConfirm(null)}>Cancel</button>
                        <button onClick={del} data-testid="admin-confirm-delete-query" className="px-4 py-2 rounded-lg text-white font-semibold bg-red-600 hover:bg-red-700">Remove</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
