import { NavLink } from "react-router-dom";
import { LayoutGrid, MessageSquareText, FilePlus2, User, LogOut, Users, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApdclLogo } from "./ApdclLogo";

const Item = ({ to, icon: Icon, label, testid }) => (
    <NavLink
        to={to}
        end
        data-testid={testid}
        className={({ isActive }) =>
            `flex items-center gap-3 px-5 py-3 rounded-lg mx-3 text-[15px] font-medium transition-colors ${
                isActive ? "sidebar-active" : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`
        }
    >
        <Icon className="w-5 h-5 shrink-0" />
        <span>{label}</span>
    </NavLink>
);

export default function Sidebar() {
    const { user, logout } = useAuth();
    const isAdmin = user?.role === "admin";
    const initials = (user?.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

    return (
        <aside
            className="w-64 shrink-0 h-screen sticky top-0 flex flex-col text-white"
            style={{ background: "var(--brand-navy)" }}
            data-testid="sidebar"
        >
            <div className="px-6 pt-6 pb-8 flex items-center gap-3">
                <ApdclLogo size={44} />
                <div>
                    <div className="font-extrabold text-[18px] leading-tight tracking-tight">APDCL Connect</div>
                    <div className="text-[12px] text-slate-400">{isAdmin ? "Admin Portal" : "Employee Portal"}</div>
                </div>
            </div>

            <nav className="flex flex-col gap-1 flex-1">
                <Item to="/" icon={LayoutGrid} label="Dashboard" testid="nav-dashboard" />
                <Item to="/queries" icon={MessageSquareText} label="Company Query" testid="nav-queries" />
                <Item to="/post" icon={FilePlus2} label="Post Query" testid="nav-post" />
                <Item to="/profile" icon={User} label="Profile" testid="nav-profile" />

                {isAdmin && (
                    <>
                        <div className="mt-6 mb-2 px-6 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                            Admin
                        </div>
                        <Item to="/admin/employees" icon={Users} label="Employees" testid="nav-admin-employees" />
                        <Item to="/admin/queries" icon={ShieldCheck} label="All Queries" testid="nav-admin-queries" />
                    </>
                )}
            </nav>

            <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                         style={{ background: "var(--brand-orange)" }}>
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <div className="text-[14px] font-semibold truncate" data-testid="sidebar-user-name">{user?.name}</div>
                        <div className="text-[12px] text-slate-400 truncate">{user?.employee_id}</div>
                    </div>
                </div>
                <button
                    onClick={logout}
                    data-testid="sidebar-logout-btn"
                    className="mt-3 w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-white/15 hover:bg-white/5 transition text-[14px]"
                >
                    <LogOut className="w-4 h-4" /> Sign out
                </button>
            </div>
        </aside>
    );
}
