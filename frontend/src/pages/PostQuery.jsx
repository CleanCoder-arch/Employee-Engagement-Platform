import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api, { formatApiError } from "../lib/api";
import { Send, Pencil, Trash2, ThumbsUp, ThumbsDown } from "lucide-react";
import { fmtDateTime } from "../lib/utils-date";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "../components/ui/dialog";

export default function PostQuery() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [busy, setBusy] = useState(false);
    const [items, setItems] = useState([]);
    const [editing, setEditing] = useState(null);
    const [confirm, setConfirm] = useState(null);

    const load = async () => {
        const { data } = await api.get("/queries/mine");
        setItems(data);
    };

    useEffect(() => { load(); }, []);

    const submit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;
        setBusy(true);
        try {
            await api.post("/queries", { title, description });
            setTitle("");
            setDescription("");
            toast.success("Query posted");
            load();
        } catch (err) {
            toast.error(formatApiError(err, "Failed to post query"));
        } finally { setBusy(false); }
    };

    const saveEdit = async () => {
        try {
            await api.put(`/queries/${editing.id}`, { title: editing.title, description: editing.description });
            setEditing(null);
            toast.success("Query updated");
            load();
        } catch (err) {
            toast.error(formatApiError(err, "Failed to update"));
        }
    };

    const doDelete = async () => {
        try {
            await api.delete(`/queries/${confirm.id}`);
            setConfirm(null);
            toast.success("Query deleted");
            load();
        } catch (err) {
            toast.error(formatApiError(err, "Failed to delete"));
        }
    };

    return (
        <Layout title="Post Query">
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="text-[16px] font-bold text-slate-900 mb-4">Share what's on your mind</div>
                <form onSubmit={submit} data-testid="post-query-form" className="space-y-4">
                    <div>
                        <label className="text-[13px] font-semibold text-slate-700">Query title</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            maxLength={200}
                            placeholder="e.g. Additional field staff needed for feeder maintenance"
                            data-testid="query-title-input"
                            className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition text-[15px]"
                        />
                    </div>
                    <div>
                        <label className="text-[13px] font-semibold text-slate-700">Description</label>
                        <textarea
                            rows={5}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            maxLength={5000}
                            placeholder="Describe the query or concern you’d like other employees to weigh in on…"
                            data-testid="query-description-input"
                            className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition text-[15px] resize-y"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={busy}
                        data-testid="post-query-submit-btn"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold disabled:opacity-60"
                        style={{ background: "var(--brand-orange)" }}
                    >
                        <Send className="w-4 h-4" /> {busy ? "Posting…" : "Post query"}
                    </button>
                </form>
            </div>

            <div className="mt-6 bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-[16px] font-bold text-slate-900">Your posted queries</div>
                    <div className="text-[13px] text-slate-500">{items.length} posted</div>
                </div>

                {items.length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-sm">Nothing posted yet.</div>
                )}

                <div className="divide-y divide-slate-100">
                    {items.map((q) => (
                        <div key={q.id} className="py-4" data-testid={`my-query-${q.id}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="font-bold text-slate-900">{q.title}</div>
                                    <p className="text-[14px] text-slate-600 mt-1 line-clamp-2">{q.description}</p>
                                    <div className="mt-2 flex items-center gap-4 text-[13px] text-slate-500">
                                        <span>{fmtDateTime(q.created_at)}</span>
                                        <span className="inline-flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5 text-emerald-600" /> {q.agree_count}</span>
                                        <span className="inline-flex items-center gap-1"><ThumbsDown className="w-3.5 h-3.5 text-orange-500" /> {q.disagree_count}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => setEditing({ ...q })}
                                        data-testid={`edit-query-btn-${q.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-blue-700 hover:bg-blue-50 text-[13px] font-semibold"
                                    >
                                        <Pencil className="w-4 h-4" /> Edit
                                    </button>
                                    <button
                                        onClick={() => setConfirm(q)}
                                        data-testid={`delete-query-btn-${q.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 text-[13px] font-semibold"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Edit dialog */}
            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent data-testid="edit-query-dialog">
                    <DialogHeader><DialogTitle>Edit query</DialogTitle></DialogHeader>
                    {editing && (
                        <div className="space-y-4">
                            <input
                                value={editing.title}
                                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition text-[15px]"
                                data-testid="edit-title-input"
                            />
                            <textarea
                                rows={5}
                                value={editing.description}
                                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition text-[15px]"
                                data-testid="edit-description-input"
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <button className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setEditing(null)}>Cancel</button>
                        <button
                            onClick={saveEdit}
                            data-testid="edit-save-btn"
                            className="px-4 py-2 rounded-lg text-white font-semibold"
                            style={{ background: "var(--brand-orange)" }}
                        >
                            Save changes
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
                <DialogContent data-testid="delete-confirm-dialog">
                    <DialogHeader><DialogTitle>Delete this query?</DialogTitle></DialogHeader>
                    <p className="text-slate-600 text-[14px]">This action cannot be undone. All engagement will also be removed.</p>
                    <DialogFooter>
                        <button className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setConfirm(null)}>Cancel</button>
                        <button
                            onClick={doDelete}
                            data-testid="delete-confirm-btn"
                            className="px-4 py-2 rounded-lg text-white font-semibold bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
