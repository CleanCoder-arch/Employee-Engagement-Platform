import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import api, { formatApiError } from "../../lib/api";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { fmtDateTime } from "../../lib/utils-date";

const empty = { employee_id: "", name: "", email: "", department: "", designation: "", password: "" };

export default function AdminEmployees() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [creating, setCreating] = useState(null);
    const [editing, setEditing] = useState(null);
    const [confirmDel, setConfirmDel] = useState(null);
    const [stats, setStats] = useState({ total_employees: 0, total_queries: 0, total_votes: 0 });

    const load = async () => {
        setLoading(true);
        try {
            const [{ data }, s] = await Promise.all([api.get("/admin/employees"), api.get("/admin/stats")]);
            setItems(data);
            setStats(s.data);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const filtered = items.filter((e) => {
        const t = q.toLowerCase();
        return !t || e.name.toLowerCase().includes(t) || e.employee_id.toLowerCase().includes(t)
               || e.email.toLowerCase().includes(t) || e.department.toLowerCase().includes(t);
    });

    const save = async () => {
        try {
            if (creating) {
                await api.post("/admin/employees", creating);
                toast.success("Employee added");
                setCreating(null);
            } else {
                const body = { ...editing };
                delete body.employee_id;
                delete body.id;
                delete body.created_at;
                delete body.role;
                if (!body.password) delete body.password;
                await api.put(`/admin/employees/${editing.id}`, body);
                toast.success("Employee updated");
                setEditing(null);
            }
            load();
        } catch (err) { toast.error(formatApiError(err, "Failed")); }
    };

    const del = async () => {
        try {
            await api.delete(`/admin/employees/${confirmDel.id}`);
            toast.success("Employee removed");
            setConfirmDel(null);
            load();
        } catch (err) { toast.error(formatApiError(err, "Failed")); }
    };

    return (
        <Layout title="Employee Management">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-5 mb-6">
                <StatBox label="Total employees" value={stats.total_employees} tone="orange" />
                <StatBox label="Total queries" value={stats.total_queries} tone="blue" />
                <StatBox label="Total reactions" value={stats.total_votes} tone="emerald" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by name, ID, department…"
                            data-testid="employee-search-input"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition text-[14px]"
                        />
                    </div>
                    <button
                        onClick={() => setCreating({ ...empty })}
                        data-testid="add-employee-btn"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-[14px]"
                        style={{ background: "var(--brand-orange)" }}
                    >
                        <Plus className="w-4 h-4" /> Add Employee
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-[14px]">
                        <thead>
                            <tr className="text-left text-slate-500 border-b border-slate-100">
                                <th className="py-3 font-semibold">Employee</th>
                                <th className="py-3 font-semibold">Email</th>
                                <th className="py-3 font-semibold">Department</th>
                                <th className="py-3 font-semibold">Designation</th>
                                <th className="py-3 font-semibold">Joined</th>
                                <th className="py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={6} className="py-12 text-center text-slate-500">Loading…</td></tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={6} className="py-12 text-center text-slate-500">No employees found.</td></tr>
                            )}
                            {filtered.map((e) => (
                                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/60" data-testid={`emp-row-${e.employee_id}`}>
                                    <td className="py-4">
                                        <div className="font-semibold text-slate-900">{e.name}</div>
                                        <div className="text-[12px] text-slate-500">{e.employee_id}</div>
                                    </td>
                                    <td className="py-4 text-slate-700">{e.email}</td>
                                    <td className="py-4 text-slate-700">{e.department}</td>
                                    <td className="py-4 text-slate-700">{e.designation}</td>
                                    <td className="py-4 text-slate-500 text-[13px]">{fmtDateTime(e.created_at)}</td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-1 justify-end">
                                            <button
                                                onClick={() => setEditing({ ...e, password: "" })}
                                                data-testid={`edit-emp-btn-${e.employee_id}`}
                                                className="p-2 rounded-lg text-blue-700 hover:bg-blue-50"
                                            ><Pencil className="w-4 h-4" /></button>
                                            <button
                                                onClick={() => setConfirmDel(e)}
                                                data-testid={`delete-emp-btn-${e.employee_id}`}
                                                className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                                            ><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create / edit dialog */}
            <Dialog open={!!(creating || editing)} onOpenChange={(o) => !o && (setCreating(null), setEditing(null))}>
                <DialogContent data-testid="employee-form-dialog" className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{creating ? "Add employee" : "Edit employee"}</DialogTitle>
                    </DialogHeader>
                    <EmployeeForm state={creating || editing} setState={creating ? setCreating : setEditing} isCreate={!!creating} />
                    <DialogFooter>
                        <button className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => { setCreating(null); setEditing(null); }}>Cancel</button>
                        <button
                            onClick={save}
                            data-testid="employee-save-btn"
                            className="px-4 py-2 rounded-lg text-white font-semibold"
                            style={{ background: "var(--brand-orange)" }}
                        >
                            {creating ? "Add employee" : "Save changes"}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Remove employee?</DialogTitle></DialogHeader>
                    <p className="text-slate-600 text-[14px]">
                        {confirmDel?.name} ({confirmDel?.employee_id}) will be permanently removed along with their queries and votes.
                    </p>
                    <DialogFooter>
                        <button className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setConfirmDel(null)}>Cancel</button>
                        <button onClick={del} data-testid="confirm-delete-emp-btn" className="px-4 py-2 rounded-lg text-white font-semibold bg-red-600 hover:bg-red-700">Remove</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}

function EmployeeForm({ state, setState, isCreate }) {
    if (!state) return null;
    const set = (k) => (e) => setState({ ...state, [k]: e.target.value });
    const inputCls = "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition text-[14px]";
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <Field label="Employee ID">
                    <input value={state.employee_id} onChange={set("employee_id")} disabled={!isCreate} className={inputCls + (!isCreate ? " opacity-60" : "")} data-testid="emp-form-employee-id" />
                </Field>
                <Field label="Full name">
                    <input value={state.name} onChange={set("name")} className={inputCls} data-testid="emp-form-name" />
                </Field>
                <Field label="Email">
                    <input value={state.email} onChange={set("email")} className={inputCls} data-testid="emp-form-email" />
                </Field>
                <Field label="Department">
                    <input value={state.department} onChange={set("department")} className={inputCls} data-testid="emp-form-department" />
                </Field>
                <Field label="Designation">
                    <input value={state.designation} onChange={set("designation")} className={inputCls} data-testid="emp-form-designation" />
                </Field>
                <Field label={isCreate ? "Password" : "New password (optional)"}>
                    <input type="password" value={state.password || ""} onChange={set("password")} className={inputCls} data-testid="emp-form-password" />
                </Field>
            </div>
        </div>
    );
}
function Field({ label, children }) {
    return (
        <div>
            <label className="text-[12px] font-semibold text-slate-600">{label}</label>
            <div className="mt-1">{children}</div>
        </div>
    );
}

function StatBox({ label, value, tone }) {
    const bg = { orange: "bg-orange-50 text-orange-700", blue: "bg-blue-50 text-blue-700", emerald: "bg-emerald-50 text-emerald-700" }[tone];
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between">
            <div>
                <div className="text-[13px] text-slate-500 font-medium">{label}</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">{value}</div>
            </div>
            <div className={`px-3 py-1 rounded-full text-[11px] font-bold ${bg} uppercase tracking-wide`}>live</div>
        </div>
    );
}
