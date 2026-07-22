import { useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { initialsOf } from "../lib/utils-date";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Mail, Briefcase, Building2, IdCard, CalendarCheck, ShieldCheck } from "lucide-react";

export default function Profile() {
    const { user } = useAuth();
    const [cur, setCur] = useState("");
    const [np, setNp] = useState("");
    const [cp, setCp] = useState("");
    const [busy, setBusy] = useState(false);

    const joined = user?.created_at
        ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
        : "—";

    const submit = async (e) => {
        e.preventDefault();
        if (np.length < 8) { toast.error("New password must be at least 8 characters"); return; }
        if (np !== cp) { toast.error("New password and confirmation do not match"); return; }
        if (np === cur) { toast.error("New password cannot be the same as current"); return; }
        setBusy(true);
        try {
            await api.put("/profile/change-password", {
                current_password: cur, new_password: np, confirm_password: cp,
            });
            toast.success("Password updated successfully");
            setCur(""); setNp(""); setCp("");
        } catch (err) {
            toast.error(formatApiError(err, "Failed to change password"));
        } finally { setBusy(false); }
    };

    const cancel = () => { setCur(""); setNp(""); setCp(""); };

    return (
        <Layout title="Profile">
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6" data-testid="personal-info-card">
                    <div className="flex items-center justify-between mb-5">
                        <div className="text-[16px] font-bold text-slate-900">Personal information</div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 uppercase tracking-wide">
                            Read only
                        </span>
                    </div>

                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold"
                             style={{ background: "var(--brand-orange)" }}>
                            {initialsOf(user?.name)}
                        </div>
                        <div>
                            <div className="text-[22px] font-extrabold text-slate-900">{user?.name}</div>
                            <div className="text-[13px] text-slate-500">{user?.designation}</div>
                        </div>
                    </div>

                    <div className="mt-6 divide-y divide-slate-100">
                        <Row icon={<IdCard className="w-4 h-4" />} label="Employee ID" value={user?.employee_id} testid="profile-employee-id" />
                        <Row icon={<Mail className="w-4 h-4" />} label="Email" value={user?.email} testid="profile-email" />
                        <Row icon={<Building2 className="w-4 h-4" />} label="Department" value={user?.department} testid="profile-department" />
                        <Row icon={<Briefcase className="w-4 h-4" />} label="Designation" value={user?.designation} testid="profile-designation" />
                        <Row icon={<ShieldCheck className="w-4 h-4" />} label="Role" value={<span className="uppercase font-bold text-orange-600 tracking-wide">{user?.role}</span>} testid="profile-role" />
                        <Row icon={<CalendarCheck className="w-4 h-4" />} label="Date joined" value={joined} testid="profile-joined" />
                    </div>
                </div>

                {/* Change Password */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6" data-testid="change-password-card">
                    <div className="text-[16px] font-bold text-slate-900">Change password</div>
                    <p className="mt-1 text-[13px] text-slate-500">Passwords must be at least 8 characters and different from the current one.</p>

                    <form onSubmit={submit} className="mt-5 space-y-4">
                        <PwField label="Current password" value={cur} setValue={setCur} testid="current-password-input" />
                        <PwField label="New password" value={np} setValue={setNp} testid="new-password-input" />
                        <PwField label="Confirm new password" value={cp} setValue={setCp} testid="confirm-password-input" />

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={busy || !cur || !np || !cp}
                                data-testid="change-password-btn"
                                className="px-5 py-3 rounded-xl font-bold text-white disabled:opacity-50"
                                style={{ background: "var(--brand-orange)" }}
                            >
                                {busy ? "Updating…" : "Change password"}
                            </button>
                            <button
                                type="button"
                                onClick={cancel}
                                data-testid="cancel-password-btn"
                                className="px-5 py-3 rounded-xl font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}

function Row({ icon, label, value, testid }) {
    return (
        <div className="py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">{icon}</div>
            <div className="flex-1 flex items-center justify-between">
                <div className="text-[13px] text-slate-500">{label}</div>
                <div className="text-[14px] font-semibold text-slate-900" data-testid={testid}>{value}</div>
            </div>
        </div>
    );
}

function PwField({ label, value, setValue, testid }) {
    const [show, setShow] = useState(false);
    return (
        <div>
            <label className="text-[13px] font-semibold text-slate-700">{label}</label>
            <div className="relative mt-2">
                <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-4 py-3 pr-20 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition text-[15px]"
                    data-testid={testid}
                />
                <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-slate-500 hover:text-orange-600"
                >
                    {show ? "HIDE" : "SHOW"}
                </button>
            </div>
        </div>
    );
}
