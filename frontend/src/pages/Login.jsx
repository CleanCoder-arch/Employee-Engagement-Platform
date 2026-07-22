import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { ApdclLogo } from "../components/ApdclLogo";
import { Headphones, Mail } from "lucide-react";

export default function Login() {
    const { user, login } = useAuth();
    const nav = useNavigate();
    const [employeeId, setEmployeeId] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to="/" replace />;

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            const u = await login(employeeId.trim(), password);
            nav(u.role === "admin" ? "/admin/employees" : "/");
        } catch (err) {
            setError(formatApiError(err, "Login failed"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <div
                className="w-full text-center py-2.5 text-[13px] font-semibold flex items-center justify-center gap-4"
                style={{ background: "var(--brand-orange-soft)", color: "var(--brand-orange)" }}
            >
                <span>24×7 Customer Support</span>
                <span className="flex items-center gap-1.5"><Headphones className="w-4 h-4" /> 1912</span>
                <span className="text-orange-400">or</span>
                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> support@apdcl.org</span>
            </div>

            <div className="flex-1 grid lg:grid-cols-2">
                {/* Left brand panel */}
                <div
                    className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden"
                    style={{ background: "var(--brand-navy)" }}
                >
                    <div className="flex items-center gap-3">
                        <ApdclLogo size={52} />
                        <div>
                            <div className="text-[22px] font-extrabold leading-tight">APDCL Connect</div>
                            <div className="text-[13px] text-slate-400">Employee Engagement Portal</div>
                        </div>
                    </div>
                    <div className="max-w-md">
                        <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
                            Powering conversations across every circle.
                        </h2>
                        <p className="mt-4 text-slate-300 text-[15px] leading-relaxed">
                            Post queries, engage with your colleagues, and stay aligned with what matters — from
                            Guwahati to Dibrugarh, all in one place.
                        </p>
                        <div className="mt-8 flex items-center gap-6 text-[13px] text-slate-400">
                            <div>
                                <div className="text-white font-bold text-lg">14,000+</div>
                                <div>employees</div>
                            </div>
                            <div className="w-px h-8 bg-white/15" />
                            <div>
                                <div className="text-white font-bold text-lg">25</div>
                                <div>circles</div>
                            </div>
                            <div className="w-px h-8 bg-white/15" />
                            <div>
                                <div className="text-white font-bold text-lg">1912</div>
                                <div>helpline</div>
                            </div>
                        </div>
                    </div>
                    <div className="text-[12px] text-slate-500">© Assam Power Distribution Company Limited</div>
                    <div
                        className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full"
                        style={{ background: "radial-gradient(circle, rgba(234,91,12,0.25), transparent 65%)" }}
                    />
                </div>

                {/* Right form */}
                <div className="flex items-center justify-center p-8 bg-white">
                    <form
                        onSubmit={submit}
                        className="w-full max-w-md"
                        data-testid="login-form"
                    >
                        <div className="lg:hidden mb-8 flex items-center gap-3">
                            <ApdclLogo size={44} />
                            <div>
                                <div className="text-[18px] font-extrabold">APDCL Connect</div>
                                <div className="text-[12px] text-slate-500">Employee Portal</div>
                            </div>
                        </div>

                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Welcome back</h1>
                        <p className="mt-2 text-slate-500 text-[15px]">Sign in with your employee credentials.</p>

                        {error && (
                            <div
                                data-testid="login-error"
                                className="mt-6 px-4 py-3 rounded-lg text-[14px] font-medium bg-red-50 text-red-700 border border-red-100"
                            >
                                {error}
                            </div>
                        )}

                        <div className="mt-8 space-y-5">
                            <div>
                                <label className="text-[13px] font-semibold text-slate-700">Employee ID</label>
                                <input
                                    type="text"
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    placeholder="e.g. AP10234"
                                    required
                                    data-testid="login-employee-id-input"
                                    className="mt-2 w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition text-[15px]"
                                />
                            </div>
                            <div>
                                <label className="text-[13px] font-semibold text-slate-700">Password</label>
                                <div className="relative mt-2">
                                    <input
                                        type={showPw ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                        data-testid="login-password-input"
                                        className="w-full px-4 py-3.5 pr-20 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition text-[15px]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw((s) => !s)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-slate-500 hover:text-orange-600"
                                    >
                                        {showPw ? "HIDE" : "SHOW"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={busy}
                            data-testid="login-submit-btn"
                            className="mt-8 w-full py-3.5 rounded-xl font-bold text-white text-[15px] transition disabled:opacity-60"
                            style={{ background: "var(--brand-orange)" }}
                        >
                            {busy ? "Signing in..." : "Sign in"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
