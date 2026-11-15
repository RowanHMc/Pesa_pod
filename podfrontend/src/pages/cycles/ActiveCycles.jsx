
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Wallet, RefreshCw } from "lucide-react";

import useChamas from "../../hooks/useChamas";
import useCycles from "../../hooks/useCycles";
import usePendingPayments from "../../hooks/usePendingPayments";

import MemberCycleCard from "../dashboard/MemberCycleCard";
import TreasurerDashboard from "../dashboard/TreasurerDashboard";
import ChairpersonDashboard from "../dashboard/ChairpersonDashboard";

function TreasurerCycleSection({ chama, cycle }) {
    const {
        payments,
        loading,
        error,
        refetch,
    } = usePendingPayments(chama.chama_id);

    return (
        <TreasurerDashboard
            chama={chama}
            cycle={cycle}
            payments={payments}
            loading={loading}
            error={error}
            onReviewed={refetch}
        />
    );
}

function ActiveCycles() {
    const [searchParams, setSearchParams] = useSearchParams();

    const { chamas, loading: chamasLoading, error: chamasError } =
        useChamas();

    const [selectedChamaId, setSelectedChamaId] = useState(
        searchParams.get("chama") || ""
    );

    useEffect(() => {
        if (chamas.length === 0) return;

        const requestedId = searchParams.get("chama");

        const requestedChama = chamas.find(
            (chama) => chama.chama_id === requestedId
        );

        if (requestedChama) {
            setSelectedChamaId(requestedChama.chama_id);
        } else if (
            !chamas.some((chama) => chama.chama_id === selectedChamaId)
        ) {
            setSelectedChamaId(chamas[0].chama_id);
        }
    }, [chamas, searchParams, selectedChamaId]);

    const selectedChama = chamas.find(
        (chama) => chama.chama_id === selectedChamaId
    );

    const {
        cycles,
        loading: cyclesLoading,
        error: cyclesError,
        refetch: refetchCycles,
    } = useCycles(selectedChamaId || null);

    const activeCycle = cycles.find(
        (cycle) =>
            cycle.chama === selectedChamaId &&
            cycle.status === "active"
    );

    const handleChamaChange = (event) => {
        const chamaId = event.target.value;

        setSelectedChamaId(chamaId);
        setSearchParams(chamaId ? { chama: chamaId } : {});
    };

    if (chamasLoading) {
        return (
            <div className="py-12 text-center text-muted">
                Loading your chamas...
            </div>
        );
    }

    if (chamasError) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
                {chamasError}
            </div>
        );
    }

    if (chamas.length === 0) {
        return (
            <div className="bg-white border border-slate-100 rounded-xl p-8 text-center">
                <Wallet size={35} className="mx-auto text-muted mb-3" />
                <h2 className="font-bold text-lg text-ink">
                    No Chamas Found
                </h2>
                <p className="text-sm text-muted mt-2">
                    Join or create a chama to access its savings cycles.
                </p>
            </div>
        );
    }

    return (
        <section className="space-y-8">

            {/* Page heading */}
            <div>
                <h1 className="text-2xl font-bold text-ink">
                    Active Savings Cycles
                </h1>
                <p className="text-sm text-muted mt-1">
                    Manage your chama savings activities and contribution responsibilities.
                </p>
            </div>

            {/* Chama selector */}
            <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                <label
                    htmlFor="chama-select"
                    className="block text-sm font-semibold text-ink mb-2"
                >
                    Select Chama
                </label>

                <select
                    id="chama-select"
                    value={selectedChamaId}
                    onChange={handleChamaChange}
                    className="w-full sm:max-w-md border border-slate-200 rounded-lg px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange"
                >
                    {chamas.map((chama) => (
                        <option
                            key={chama.chama_id}
                            value={chama.chama_id}
                        >
                            {chama.name} ({chama.my_role})
                        </option>
                    ))}
                </select>
            </div>

            {selectedChama && (
                <>
                    {/* Selected chama information */}
                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h2 className="font-bold text-lg text-ink">
                                {selectedChama.name}
                            </h2>
                            <p className="text-sm text-muted mt-1 capitalize">
                                Your role: {selectedChama.my_role}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={refetchCycles}
                            disabled={cyclesLoading}
                            className="flex items-center justify-center gap-2 text-sm font-medium text-orange hover:text-orange/80 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={16}
                                className={cyclesLoading ? "animate-spin" : ""}
                            />
                            Refresh cycles
                        </button>
                    </div>

                    {/* Cycle loading and errors */}
                    {cyclesLoading ? (
                        <p className="text-sm text-muted py-4">
                            Loading savings cycle...
                        </p>
                    ) : cyclesError ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
                            {cyclesError}
                        </div>
                    ) : (
                        <>
                            {/* Personal member responsibilities */}
                            {activeCycle ? (
                                <MemberCycleCard cycle={activeCycle} />
                            ) : selectedChama.my_role !== "chairperson" ? (
                                <div className="bg-white border border-slate-100 rounded-xl p-6 text-center">
                                    <Wallet
                                        size={30}
                                        className="mx-auto text-muted mb-3"
                                    />
                                    <h3 className="font-semibold text-ink">
                                        No Active Savings Cycle
                                    </h3>
                                    <p className="text-sm text-muted mt-2">
                                        There are currently no active savings cycles for this chama.
                                    </p>
                                </div>
                            ) : null}

                            {/* Treasurer responsibilities */}
                            {selectedChama.my_role === "treasurer" &&
                                activeCycle && (
                                    <TreasurerCycleSection
                                        chama={selectedChama}
                                        cycle={activeCycle}
                                    />
                                )}

                            {/* Chairperson responsibilities */}
                            {selectedChama.my_role === "chairperson" && (
                                <ChairpersonDashboard
                                    chama={selectedChama}
                                    cycle={activeCycle}
                                    onCycleChanged={refetchCycles}
                                />
                            )}
                        </>
                    )}
                </>
            )}
        </section>
    );
}

export default ActiveCycles;
