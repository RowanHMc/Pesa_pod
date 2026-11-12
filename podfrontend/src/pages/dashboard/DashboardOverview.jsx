
import { useOutletContext } from "react-router-dom";
import {
    Users,
    Wallet,
    HandCoins,
    Bell,
} from "lucide-react";

import useChamas from "../../hooks/useChamas";
import useCycles from "../../hooks/useCycles";
import useContributions from "../../hooks/useContributions";
import usePendingPayments from "../../hooks/usePendingPayments";

import ChamaList from "../chamas/ChamaList";

function DashboardOverview() {
    const { user } = useOutletContext();

    const {
        chamas,
        loading: chamasLoading,
        error: chamasError,
    } = useChamas();

    const { cycles } = useCycles();
    const { contributions } = useContributions();
    const { payments } = usePendingPayments();

    const summaryCards = [
        {
            title: "My Chamas",
            icon: Users,
            description: "Your savings groups",
            value: chamas.length,
        },
        {
            title: "Active Cycles",
            icon: Wallet,
            description: "Ongoing savings cycles",
            value: cycles.length,
        },
        {
            title: "Contributions",
            icon: HandCoins,
            description: "Your contribution records",
            value: contributions.length,
        },
        {
            title: "Pending Payments",
            icon: Bell,
            description: "Awaiting confirmation",
            value: payments.length,
        },
    ];

    return (
        <>
            {/* Welcome section */}
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
                {summaryCards.map((card) => {
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
                                {card.value}
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
                        Your savings groups.
                    </p>

                    <ChamaList
                        chamas={chamas}
                        loading={chamasLoading}
                        error={chamasError}
                    />
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
        </>
    );
}

export default DashboardOverview;
