
import { useState } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import {
    Wallet,
    LayoutDashboard,
    CreditCard,
    Users,
    LogOut,
    Menu,
    X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

function DashboardLayout() {
    const { user, loading, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    const navigation = [
        { label: "Overview", path: "/dashboard", icon: LayoutDashboard, end: true },
        { label: "Chamas", path: "/dashboard/chamas", icon: Users},
        { label: "Payments", path: "/dashboard/payments", icon: CreditCard },
    ];

    const currentPage =
        navigation.find((item) =>
            item.end
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path)
        )?.label || "Dashboard";

    const handleLogout = async () => {
        await logout();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-powder-light">
                <p className="text-muted font-medium">
                    Loading your dashboard...
                </p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-ink text-white flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="h-20 px-6 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-powder p-2 rounded-lg">
                            <Wallet size={23} className="text-ink" />
                        </div>

                        <h1 className="text-2xl font-bold">
                            Pesa <span className="text-orange">Pod</span>
                        </h1>
                    </div>

                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-white"
                        aria-label="Close navigation"
                    >
                        <X size={23} />
                    </button>
                </div>

                <div className="px-4 py-8 flex-1">
                    <p className="text-xs uppercase tracking-wider text-slate-400 px-3 mb-4">
                        Main Menu
                    </p>

                    <nav className="space-y-2">
                        {navigation.map((item) => {
                            const Icon = item.icon;

                            return (
                                <NavLink
                                    key={item.label}
                                    to={item.path}
                                    end={item.end}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                                            isActive
                                                ? "bg-orange text-white"
                                                : "text-slate-300 hover:bg-white/10 hover:text-white"
                                        }`
                                    }
                                >
                                    <Icon size={19} />
                                    {item.label}
                                </NavLink>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
                    >
                        <LogOut size={19} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0">

                {/* Top bar */}
                <header className="h-20 bg-white border-b border-slate-100 px-5 sm:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden text-ink"
                            aria-label="Open navigation"
                        >
                            <Menu size={25} />
                        </button>

                        <div>
                            <p className="text-sm text-muted">
                                Dashboard
                            </p>

                            <h2 className="font-bold text-ink">
                                {currentPage}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            className="relative p-2 text-muted hover:text-orange transition"
                            aria-label="Notifications"
                        >
                            <CreditCard size={22} />
                        </button>

                        <div className="w-10 h-10 rounded-full bg-powder flex items-center justify-center font-bold text-ink">
                            {(user.first_name || user.username || "U")
                                .charAt(0)
                                .toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <div className="p-5 sm:p-8 max-w-7xl mx-auto">
                    <Outlet context={{ user }}/>
                </div>

            </main>
        </div>
    );
}

export default DashboardLayout;
