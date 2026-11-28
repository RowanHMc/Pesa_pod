import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { activateSavingsCycle, cancelSavingsCycle, createSavingsCycle,} from "../../api/cycles";
import useChama from "../../hooks/useChama";
import useChamaCycles from "../../hooks/useChamaCycles";
import usePendingPayments from "../../hooks/usePendingPayments";
import MemberCycleCard from "../dashboard/MemberCycleCard";
import TreasurerDashboard from "../dashboard/TreasurerDashboard";

const panel = "space-y-3 rounded-xl border border-slate-100 bg-white p-5";
const field = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2";
const button ="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-powder-light disabled:opacity-50";
    
function TreasurerTools({ chama, cycle }) {
    const { payments, loading, error, refetch } = usePendingPayments(chama.chama_id);

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

export default function ChamaCycles() {
    const { chamaId } = useParams();

    return <CyclePage key={chamaId} chamaId={chamaId} />;
}

function CyclePage({ chamaId }) {
    const { chama, loading: chamaLoading, error: chamaError } = useChama(chamaId);
    const { cycles, loading, error, refetch } = useChamaCycles(chamaId);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState("");
    const [actionError, setActionError] = useState("");
    const [showCancellation, setShowCancellation] = useState(false);

    const isChairperson = chama?.my_role === "chairperson";
    const activeCycle = cycles.find(({ status }) => status === "active");
    const draft = cycles.find(({ status }) => status === "draft");
    const currentCycle = activeCycle ?? draft;
    const history = cycles.filter(({ status }) =>
        ["completed", "cancelled"].includes(status),
    );

    async function saveCycle(action, successMessage) {
        if (!isChairperson || saving) return;

        setSaving(true);
        setNotice("");
        setActionError("");

        try {
            await action();
            setShowCancellation(false);
            setNotice(successMessage);
            await refetch();
        } catch (error) {
            const data = error.response?.data;
            setActionError(
                data?.detail ||
                    data?.contribution_amount?.[0] ||
                    data?.start_date?.[0] ||
                    data?.frequency?.[0] ||
                    data?.reason?.[0] ||
                    "Could not update the savings cycle.",
            );
        } finally {
            setSaving(false);
        }
    }

    function createDraft(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);

        void saveCycle(
            () => createSavingsCycle({
                chama: chamaId,
                contribution_amount: form.get("contribution_amount"),
                frequency: form.get("frequency"),
                start_date: form.get("start_date"),
            }),
            "Draft cycle created.",
        );
    }

    function cancelCycle(event) {
        event.preventDefault();
        const reason = new FormData(event.currentTarget).get("reason").trim();

        if (activeCycle && !reason) {
            setActionError("Enter a reason to cancel the active cycle.");
            return;
        }

        if (!window.confirm("Cancel this savings cycle?")) return;

        void saveCycle(
            () => cancelSavingsCycle(currentCycle.id, reason),
            "Savings cycle cancelled.",
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-5">
            <Link to={`/dashboard/chamas/${chamaId}`} className="text-sm text-muted hover:text-ink">
                ← Back to chama
            </Link>

            <h1 className="text-2xl font-bold text-ink">
                {chama ? `${chama.name} · Cycles` : "Cycles"}
            </h1>

            {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
            {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}

            {chamaLoading || loading ? (
                <p className="text-muted">Loading cycles…</p>
            ) : chamaError || error ? (
                <p role="alert" className="text-sm text-red-700">{chamaError || error}</p>
            ) : (
                <>
                    <section className={panel}>
                        <h2 className="font-semibold text-ink">
                            {activeCycle ? "Active cycle" : draft ? "Draft cycle" : "Current cycle"}
                        </h2>

                        {currentCycle ? (
                            <p className="text-sm text-muted">
                                KES {currentCycle.contribution_amount} · {currentCycle.frequency}
                                {" · "}Starts {currentCycle.start_date}
                                {activeCycle?.current_round && ` · Round ${activeCycle.current_round}`}
                            </p>
                        ) : (
                            <p className="text-sm text-muted">No active or draft cycle.</p>
                        )}

                        {isChairperson && currentCycle && (
                            <div className="flex flex-wrap gap-2">
                                {draft && !activeCycle && (
                                    <button
                                        type="button"
                                        className={button}
                                        disabled={saving}
                                        onClick={() => {
                                            if (window.confirm("Activate this cycle and create the first round?")) {
                                                void saveCycle(
                                                    () => activateSavingsCycle(draft.id),
                                                    "Savings cycle activated.",
                                                );
                                            }
                                        }}
                                    >
                                        Activate cycle
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={`${button} text-red-700`}
                                    disabled={saving}
                                    onClick={() => setShowCancellation((shown) => !shown)}
                                >
                                    {showCancellation ? "Keep cycle" : "Cancel cycle"}
                                </button>
                            </div>
                        )}

                        {isChairperson && currentCycle && showCancellation && (
                            <form onSubmit={cancelCycle} className="space-y-2">
                                <label className="block text-sm font-medium">
                                    Cancellation reason {activeCycle ? "(required)" : "(optional)"}
                                    <input
                                        name="reason"
                                        required={Boolean(activeCycle)}
                                        maxLength={200}
                                        className={field}
                                    />
                                </label>
                                <button type="submit" disabled={saving} className={`${button} text-red-700`}>
                                    Confirm cancellation
                                </button>
                            </form>
                        )}
                    </section>

                    {isChairperson && !currentCycle && (
                        <form onSubmit={createDraft} className={panel}>
                            <h2 className="font-semibold text-ink">Create a draft cycle</h2>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <label className="text-sm font-medium">
                                    Contribution amount (KES)
                                    <input
                                        type="number" name="contribution_amount"
                                        min="0.01" step="0.01" required className={field}
                                    />
                                </label>
                                <label className="text-sm font-medium">
                                    Frequency
                                    <select name="frequency" className={field}>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </label>
                                <label className="text-sm font-medium">
                                    Start date
                                    <input type="date" name="start_date" required className={field} />
                                </label>
                            </div>
                            <button type="submit" disabled={saving} className={`${button} bg-orange-light text-ink`}>
                                {saving ? "Saving…" : "Create draft"}
                            </button>
                        </form>
                    )}

                    {activeCycle && (
                        <details className={panel}>
                            <summary className="cursor-pointer font-semibold text-ink">
                                My contributions and payouts
                            </summary>
                            <MemberCycleCard key={activeCycle.id} cycle={activeCycle} />
                        </details>
                    )}

                    {activeCycle && chama?.my_role === "treasurer" && (
                        <details className={panel}>
                            <summary className="cursor-pointer font-semibold text-ink">
                                Treasurer tools
                            </summary>
                            <TreasurerTools chama={chama} cycle={activeCycle} />
                        </details>
                    )}

                    <section className={panel}>
                        <h2 className="font-semibold text-ink">Cycle history</h2>
                        {history.length === 0 ? (
                            <p className="text-sm text-muted">No completed or cancelled cycles yet.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {history.map((cycle) => (
                                    <li key={cycle.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                                        <span className="text-ink">
                                            {cycle.start_date} · KES {cycle.contribution_amount} · {cycle.frequency}
                                        </span>
                                        <span className="capitalize text-muted">{cycle.status}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}