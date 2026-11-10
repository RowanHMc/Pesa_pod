import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);
export function AuthProvider({children}) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        const response = await api.get("accounts/users/me/");
        setUser(response.data);
        return response.data;
    }

    useEffect(() => {
        // restore session when page is eg: refreshed
        const restoreSession = async () => {
            const accessToken = localStorage.getItem("access_token");
            const refreshToken = localStorage.getItem("refresh_token");

            if (!accessToken && !refreshToken) {
                setLoading(false);
                return;
            }
            try {
                await fetchUser();
            } catch (error) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        restoreSession();

        const handleLogout = () => {
            setUser(null);
            setLoading(false);
        };
        window.addEventListener("auth:logout", handleLogout);

        return () => {
            window.removeEventListener("auth:logout", handleLogout);
        };
    },[]);
// authenticate
    const login = async(username, password) => {
        const response = await api.post("accounts/auth/login/",{
            username,
            password,
        });
        localStorage.setItem("access_token", response.data.access);
        localStorage.setItem("refresh_token", response.data.refresh);

        setUser(response.data.user);
        return response.data
    };

// logout
    const logout = async () => {
        const refreshToken = localStorage.getItem("refresh_token");
        try {
            if(refreshToken){
                await api.post("accounts/auth/logout/",{
                    refresh: refreshToken,
                });
            }
        } finally {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            setUser(null);
        }
    };
    const value = {
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        logout,
        fetchUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );

}
export function useAuth() {
    return useContext(AuthContext)
}
