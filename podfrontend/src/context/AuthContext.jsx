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
};
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