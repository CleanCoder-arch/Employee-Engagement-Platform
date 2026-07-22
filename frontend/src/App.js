import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import CompanyQuery from "@/pages/CompanyQuery";
import PostQuery from "@/pages/PostQuery";
import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminEmployees from "@/pages/admin/AdminEmployees";
import AdminQueries from "@/pages/admin/AdminQueries";

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Toaster position="top-right" richColors />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<ProtectedRoute><HomeSwitch /></ProtectedRoute>} />
                    <Route path="/queries" element={<ProtectedRoute><CompanyQuery /></ProtectedRoute>} />
                    <Route path="/post" element={<ProtectedRoute><PostQuery /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/employees" element={<ProtectedRoute adminOnly><AdminEmployees /></ProtectedRoute>} />
                    <Route path="/admin/queries" element={<ProtectedRoute adminOnly><AdminQueries /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

function HomeSwitch() {
    const { user } = useAuth();
    if (user?.role === "admin") return <Navigate to="/admin" replace />;
    return <Dashboard />;
}
