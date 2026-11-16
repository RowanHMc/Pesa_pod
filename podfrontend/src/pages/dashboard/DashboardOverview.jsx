
import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
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

import TreasurerDashboard from "./TreasurerDashboard";
import ChairpersonDashboard from "./ChairpersonDashboard";
import ChamaList from "../chamas/ChamaList";
import MemberCycleCard from "./MemberCycleCard";

function DashboardOverview() {
    const { user } = useOutletContext();

    const [selectedTreasurerChamaId, setSelectedTreasurerChamaId] = useState("");
    const [selectedChairpersonChamaId, setSelectedChairpersonChamaId] = useState("");

    const {
        chamas,
        loading: chamasLoading,
        error: chamasError,
    } = useChamas();

    const { cycles, refetch: refetchCycles } = useCycles();
    const { contributions } = useContributions();

    // Treasurer chamas
    const treasurerChamas = chamas.filter(
        (chama) => chama.my_role === "treasurer"
    );

    const selectedTreasurerChama =
        treasurerChamas.find(
            (chama) => chama.chama_id === selectedTreasurerChamaId
        ) || treasurerChamas[0];

    const selectedTreasurerCycle = cycles.find(
        (cycle) => cycle.chama === selectedTreasurerChama?.chama_id
    );

    const {
        payments,
        loading,
        error,
        refreshPayments,
    } = usePendingPayments(selectedTreasurerChama?.chama_id);

    // Chairperson chamas
    const chairpersonChamas = chamas.filter(
        (chama) => chama.my_role === "chairperson"
    );
    const memberChamas = chamas.filter(
    (chama) => chama.my_role === "member"
    );

    const memberCycles = cycles.filter((cycle) =>
    memberChamas.some(
        (chama) => chama.chama_id === cycle.chama
    )
    );
    const selectedChairpersonChama =
        chairpersonChamas.find(
            (chama) => chama.chama_id === selectedChairpersonChamaId
        ) || chairpersonChamas[0];

    const selectedChairpersonCycle = cycles.find(
        (cycle) => cycle.chama === selectedChairpersonChama?.chama_id
    );

    // Dashboard summary cards
    const summaryCards = [
        {
            title: "My Chamas",
            icon: Users,
            description: "Your savings groups",
            value: chamas.length,
            path: "/dashboard/chamas",
        },
        {
            title: "Active Cycles",
            icon: Wallet,
            description: "Ongoing savings cycles",
            value: cycles.length,
            path: "/dashboard/cycles",
        },
        {
            title: "Contributions",
            icon: HandCoins,
            description: "Your contribution records",
            value: contributions.length,
            // path: "/dashboard/contributions",
        },
        {
            title: "Pending Payments",
            icon: Bell,
            description: "Awaiting confirmation",
            value: payments.length,
            path: "/dashboard/payments",
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
                        <Link
                            key={card.title}
                            to={card.path}
                            className="block bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-powder transition"
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
                        </Link>
                    );
                })}
            </section>

            {/* Treasurer Dashboard */}
            {!chamasLoading && treasurerChamas.length > 0 && (
                <>
                    <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-ink">
                                    Treasurer
                                </h2>

                                <p className="text-sm text-muted mt-1">
                                    Select a chama to manage its financial activities.
                                </p>
                            </div>

                            <div className="w-full sm:w-72">
                                <label
                                    htmlFor="treasurer-chama"
                                    className="block text-sm font-medium text-ink mb-2"
                                >
                                    Select Chama
                                </label>

                                <select
                                    id="treasurer-chama"
                                    value={selectedTreasurerChama?.chama_id || ""}
                                    onChange={(event) =>
                                        setSelectedTreasurerChamaId(event.target.value)
                                    }
                                    className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-orange"
                                >
                                    {treasurerChamas.map((chama) => (
                                        <option
                                            key={chama.chama_id}
                                            value={chama.chama_id}
                                        >
                                            {chama.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedTreasurerChama && (
                            <div className="mt-5 p-4 bg-orange-light rounded-lg">
                                <p className="text-sm text-muted">
                                    Currently managing
                                </p>

                                <h3 className="text-lg font-semibold text-ink mt-1">
                                    {selectedTreasurerChama.name}
                                </h3>
                            </div>
                        )}
                    </section>

                    {selectedTreasurerChama && (
                        <TreasurerDashboard
                            chama={selectedTreasurerChama}
                            cycle={selectedTreasurerCycle}
                            payments={payments}
                            loading={loading}
                            error={error}
                            onReviewed={refreshPayments}
                        />
                    )}
                </>
            )}

            {/* Chairperson Dashboard */}
            {!chamasLoading && chairpersonChamas.length > 0 && (
                <>
                    <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm my-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-ink">
                                    Chairperson
                                </h2>

                                <p className="text-sm text-muted mt-1">
                                    Select a chama to manage its members and leadership.
                                </p>
                            </div>

                            <div className="w-full sm:w-72">
                                <label
                                    htmlFor="chairperson-chama"
                                    className="block text-sm font-medium text-ink mb-2"
                                >
                                    Select Chama
                                </label>

                                <select
                                    id="chairperson-chama"
                                    value={selectedChairpersonChama?.chama_id || ""}
                                    onChange={(event) =>
                                        setSelectedChairpersonChamaId(event.target.value)
                                    }
                                    className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-orange"
                                >
                                    {chairpersonChamas.map((chama) => (
                                        <option
                                            key={chama.chama_id}
                                            value={chama.chama_id}
                                        >
                                            {chama.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedChairpersonChama && (
                            <div className="mt-5 p-4 bg-orange-light rounded-lg">
                                <p className="text-sm text-muted">
                                    Currently managing
                                </p>

                                <h3 className="text-lg font-semibold text-ink mt-1">
                                    {selectedChairpersonChama.name}
                                </h3>
                            </div>
                        )}
                    </section>

                    {selectedChairpersonChama && (
                        <ChairpersonDashboard
                            chama={selectedChairpersonChama}
                            cycle={selectedChairpersonCycle}
                            onCycleChanged={refetchCycles}
                        />
                    )}
                </>
            )}

            {/* Member Savings Cycles */}
            {!chamasLoading && memberChamas.length > 0 && (
                <section className="space-y-6 mt-8">
                    <div>
                        <h2 className="text-xl font-semibold text-ink">
                            Member Savings Cycles
                        </h2>

                        <p className="text-sm text-muted mt-1">
                            View the active savings cycles and payout schedules
                            for your chamas.
                        </p>
                    </div>

                    {memberCycles.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-xl p-6">
                            <p className="text-sm text-muted">
                                None of your chamas currently has an active savings cycle.
                            </p>
                        </div>
                    ) : (
                        memberCycles.map((cycle) => (
                            <MemberCycleCard
                                key={cycle.id}
                                cycle={cycle}
                            />
                        ))
                    )}
                </section>
            )}
            {/* Main dashboard panels */}
            <section className="grid lg:grid-cols-3 gap-6 items-start mt-8">
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
