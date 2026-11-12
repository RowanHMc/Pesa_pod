
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
    Wallet,
    LayoutDashboard,
    Users,
    HandCoins,
    Bell,
    Settings,
    LogOut,
    Menu,
    X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function Dashboard() {
    const { user, loading, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [chamas, setChamas] = useState([]);
    const [chamasLoading, setChamasLoading] = useState(true);
    const [chamasError, setChamasError] = useState("");
    
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

    const navigation = [
        { label: "Overview", icon: LayoutDashboard },
        { label: "My Chamas", icon: Users },
        { label: "Contributions", icon: Wallet },
        { label: "Payouts", icon: HandCoins },
        { label: "Notifications", icon: Bell },
        { label: "Settings", icon: Settings },
    ];

    const handleLogout = async () => {
        await logout();
    };

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
                        {navigation.map((item, index) => {
                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.label}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                                        index === 0
                                            ? "bg-orange text-white"
                                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <Icon size={19} />
                                    {item.label}
                                </button>
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
                                Overview
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            className="relative p-2 text-muted hover:text-orange transition"
                            aria-label="Notifications"
                        >
                            <Bell size={22} />
                        </button>

                        <div className="w-10 h-10 rounded-full bg-powder flex items-center justify-center font-bold text-ink">
                            {(user.first_name || user.username || "U")
                                .charAt(0)
                                .toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Dashboard overview */}
                <div className="p-5 sm:p-8 max-w-7xl mx-auto">

                    <section className="mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-ink">
                            Welcome back, {user.first_name || user.username}!
                        </h1>

                        <p className="text-muted mt-2">
                            Here's an overview of your Pesa Pod activities.
                        </p>
                    </section>

                    {/* Summary cards */}
                    <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
                        {[
                            {
                                title: "My Chamas",
                                icon: Users,
                                description: "Your savings groups",
                            },
                            {
                                title: "Active Cycles",
                                icon: Wallet,
                                description: "Ongoing savings cycles",
                            },
                            {
                                title: "Contributions",
                                icon: HandCoins,
                                description: "Your contribution records",
                            },
                            {
                                title: "Pending Payments",
                                icon: Bell,
                                description: "Awaiting confirmation",
                            },
                        ].map((card) => {
                            const Icon = card.icon;

                            return (
                                <div
                                    key={card.title}
                                    className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm"
                                >
                                    <div className="flex items-center justify-between mb-5">
                                        <p className="text-sm font-medium text-muted">
                                            {card.title}
                                        </p>

                                        <div className="bg-orange-light p-3 rounded-lg">
                                            <Icon size={21} className="text-orange" />
                                        </div>
                                    </div>

                                    <p className="text-2xl font-bold text-ink">
                                        —
                                    </p>

                                    <p className="text-xs text-muted mt-2">
                                        {card.description}
                                    </p>
                                </div>
                            );
                        })}
                    </section>

                    {/* Main dashboard panels */}
                    <section className="grid lg:grid-cols-3 gap-6">

                        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                            <h3 className="font-bold text-lg text-ink">
                                My Chamas
                            </h3>

                            <p className="text-sm text-muted mt-1">
                                Your chama groups will appear here.
                            </p>

                            <div className="min-h-48 flex flex-col items-center justify-center text-center">
                                <div className="bg-powder-light p-4 rounded-full mb-4">
                                    <Users size={30} className="text-ink" />
                                </div>

                                <p className="font-semibold text-ink">
                                    No chama information loaded yet
                                </p>

                                <p className="text-sm text-muted mt-2">
                                    We'll connect this section to your chama data next.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                            <h3 className="font-bold text-lg text-ink">
                                Recent Activity
                            </h3>

                            <p className="text-sm text-muted mt-1">
                                Your latest account activities.
                            </p>

                            <div className="min-h-48 flex flex-col items-center justify-center text-center">
                                <div className="bg-orange-light p-4 rounded-full mb-4">
                                    <Bell size={28} className="text-orange" />
                                </div>

                                <p className="font-semibold text-ink">
                                    Nothing to show yet
                                </p>

                                <p className="text-sm text-muted mt-2">
                                    Recent activity will appear here.
                                </p>
                            </div>
                        </div>

                    </section>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;
