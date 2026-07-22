import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const raw = localStorage.getItem("apdcl_user");
        return raw ? JSON.parse(raw) : null;
    });
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const token = localStorage.getItem("apdcl_token");
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }
        try {
            const { data } = await api.get("/auth/me");
            setUser(data);
            localStorage.setItem("apdcl_user", JSON.stringify(data));
        } catch (e) {
            localStorage.removeItem("apdcl_token");
            localStorage.removeItem("apdcl_user");
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const login = async (employee_id, password) => {
        const { data } = await api.post("/auth/login", { employee_id, password });
        localStorage.setItem("apdcl_token", data.token);
        localStorage.setItem("apdcl_user", JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    };

    const logout = () => {
        localStorage.removeItem("apdcl_token");
        localStorage.removeItem("apdcl_user");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refresh, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
