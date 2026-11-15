
import { useState } from "react";

import useSavingsCycle from "../../hooks/useSavingsCycle";
import useContributions from "../../hooks/useContributions";
import usePayments from "../../hooks/usePayments";
import usePayouts from "../../hooks/usePayouts";

function MemberCycleCard({ cycle }) {
    const {
        cycleDetails,
        loading: cycleLoading,
        error: cycleError,
    } = useSavingsCycle(cycle.id);

    const {
        contributions,
        loading: contributionsLoading,
        error: contributionsError,
        refetch: refreshContributions,
    } = useContributions(cycle.id);

    const {
        payments,
        loading: paymentsLoading,
        submitting,
        error: paymentError,
        submitPaymentReport,
        refetch: refreshPayments,
    } = usePayments();

    const {
        payouts,
        loading: payoutsLoading,
        responding,
        error: payoutError,
        refreshPayouts,
        respondToPayout,
    } = usePayouts(cycle.chama);

    const [actionError, setActionError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");

    const formatAmount = (amount) =>
        new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: "KES",
        }).format(Number(amount || 0));

    const formatDate = (date) => {
        if (!date) return "Not available";

        return new Date(`${date}T00:00:00`).toLocaleDateString(
            "en-KE",
            { dateStyle: "medium" }
        );
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case "paid":
            case "confirmed":
                return "bg-green-100 text-green-700";
            case "pending":
            case "sent":
                return "bg-yellow-100 text-yellow-700";
            case "rejected":
                return "bg-red-100 text-red-700";
            default:
                return "bg-slate-100 text-slate-600";
        }
    };

    const cycleContributionIds = contributions.map(
        (contribution) => contribution.id
    );

    const cyclePayments = payments.filter((payment) =>
        cycleContributionIds.includes(payment.contribution)
    );

    const handlePaymentReport = async (event, contribution) => {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        const method = formData.get("method").trim();
        const reference = formData.get("reference").trim();

        if (!method || !reference) return;

        setActionError("");
        setSuccessMessage("");

        try {
            await submitPaymentReport(
                contribution.id,
                contribution.total_due,
                method,
                reference
            );

            form.reset();

            await refreshContributions();

            setSuccessMessage("Payment report submitted successfully.");
        } catch (error) {
            const data = error.response?.data;
            setActionError(
                data?.detail ||
                data?.contribution?.[0] ||
                data?.amount?.[0] ||
                data?.method?.[0] ||
                data?.reference?.[0] ||
                (data ? JSON.stringify(data): "Unable to connect to server")
            )
        }
    };

    const handlePayoutResponse = async (action, payoutId) => {
        setActionError("");
        setSuccessMessage("");

        if (action === "reject" && !rejectionReason.trim()) {
            setActionError("Please provide a reason for rejecting the payout.");
            return;
        }

        try {
            await respondToPayout(
                action,
                payoutId,
                rejectionReason.trim()
            );

            setRejectionReason("");

            setSuccessMessage(
                action === "confirm"
                    ? "Payout confirmed successfully."
                    : "Payout rejected successfully."
            );
        } catch {
            setActionError("Unable to process your payout response. Please try again.");
        }
    };

    return (
        <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
            {/* Cycle Overview */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                    <h3 className="text-lg font-semibold text-ink">
                        Savings Cycle
                    </h3>
                    <p className="text-sm text-muted mt-1">
                        Your chama's ongoing savings cycle.
                    </p>
                </div>

                <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full capitalize">
                    {cycle.status}
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mb-6">
                <div>
                    <p className="text-sm text-muted">Contribution</p>
                    <p className="font-semibold text-ink mt-1">
                        {formatAmount(cycle.contribution_amount)}
                    </p>
                </div>

                <div>
                    <p className="text-sm text-muted">Frequency</p>
                    <p className="font-semibold text-ink mt-1 capitalize">
                        {cycle.frequency}
                    </p>
                </div>

                <div>
                    <p className="text-sm text-muted">Start Date</p>
                    <p className="font-semibold text-ink mt-1">
                        {formatDate(cycle.start_date)}
                    </p>
                </div>
            </div>

            {/* Feedback */}
            {successMessage && (
                <p className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4">
                    {successMessage}
                </p>
            )}

            {actionError && (
                <p className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
                    {actionError}
                </p>
            )}

            {/* Contribution Obligations */}
            <div className="border-t border-slate-100 pt-5">
                <h4 className="font-semibold text-ink mb-1">
                    My Contribution Obligations
                </h4>
                <p className="text-sm text-muted mb-4">
                    Track your contributions and report payments made outside Pesa Pod.
                </p>

                {contributionsLoading ? (
                    <p className="text-sm text-muted">Loading your contributions...</p>
                ) : contributionsError ? (
                    <p className="text-sm text-red-600">{contributionsError}</p>
                ) : contributions.length === 0 ? (
                    <p className="text-sm text-muted">
                        No contribution obligations are available yet.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {contributions.map((contribution) => {
                            const contributionPayments = cyclePayments.filter(
                                (payment) =>
                                    payment.contribution === contribution.id
                            );

                            const outstandingReport = contributionPayments.find(
                                (payment) =>
                                    ["pending", "confirmed"].includes(payment.status)
                            );

                            return (
                                <div
                                    key={contribution.id}
                                    className="border border-slate-100 rounded-lg p-4"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-ink">
                                                Round {contribution.round_number}
                                            </p>
                                            <p className="text-xs text-muted mt-1">
                                                Due: {formatDate(contribution.due_date)}
                                            </p>
                                        </div>

                                        <span className={`w-fit text-xs font-medium px-3 py-1 rounded-full capitalize ${getStatusStyle(contribution.status)}`}>
                                            {contribution.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <p className="text-xs text-muted">
                                                Contribution
                                            </p>
                                            <p className="font-semibold text-ink mt-1">
                                                {formatAmount(contribution.amount_due)}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs text-muted">
                                                Total Due
                                            </p>
                                            <p className="font-semibold text-ink mt-1">
                                                {formatAmount(contribution.total_due)}
                                            </p>
                                        </div>
                                    </div>

                                    {contribution.penalty_amount > 0 && (
                                        <p className="text-xs text-red-600 mt-2">
                                            Includes penalty: {formatAmount(contribution.penalty_amount)}
                                        </p>
                                    )}

                                    {contribution.status !== "paid" && !outstandingReport && (
                                        <form
                                            onSubmit={(event) =>
                                                handlePaymentReport(event, contribution)
                                            }
                                            className="mt-4 border-t border-slate-100 pt-4 space-y-3"
                                        >
                                            <p className="text-sm font-medium text-ink">
                                                Report a payment
                                            </p>

                                            <div>
                                                <label className="block text-xs font-medium text-muted mb-1">Payment Method</label>
                                                <select
                                                    name="method" required defaultValue="" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange">

                                                    <option value="" disabled>
                                                        Select payment method
                                                    </option>
                                                    <option value="mpesa">M-Pesa</option>
                                                    <option value="bank">Bank Transfer</option>
                                                    <option value="cash">Cash</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-muted mb-1">
                                                    Payment Reference
                                                </label>
                                                <input name="reference" type="text" required
                                                     placeholder="Enter transaction reference"
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange"/>           
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="bg-orange text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-orange/90 disabled:opacity-50"
                                            >
                                                {submitting ? "Submitting..." : "Submit Payment Report"}
                                            </button>
                                        </form>
                                    )}

                                    {outstandingReport && (
                                        <p className="text-sm text-muted mt-4">
                                            Payment report:{" "}
                                            <span className="font-medium capitalize text-ink">
                                                {outstandingReport.status}
                                            </span>
                                        </p>
                                    )}

                                    {contributionPayments.some(
                                        (payment) => payment.status === "rejected"
                                    ) && (
                                        <p className="text-xs text-red-600 mt-2">
                                            A previous payment report was rejected. You can submit a new report.
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {paymentError && (
                    <p className="text-sm text-red-600 mt-3">{paymentError}</p>
                )}
            </div>

            {/* Payment History */}
            <div className="border-t border-slate-100 pt-5 mt-6">
                <h4 className="font-semibold text-ink mb-1">
                    My Payment History
                </h4>
                <p className="text-sm text-muted mb-4">
                    View your submitted payment reports and their confirmation status.
                </p>

                {paymentsLoading ? (
                    <p className="text-sm text-muted">Loading payment history...</p>
                ) : cyclePayments.length === 0 ? (
                    <p className="text-sm text-muted">
                        You have not submitted any payment reports for this cycle.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-muted">
                                    <th className="py-3 pr-4 font-medium">Round</th>
                                    <th className="py-3 px-4 font-medium">Amount</th>
                                    <th className="py-3 px-4 font-medium">Reference</th>
                                    <th className="py-3 pl-4 font-medium">Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {cyclePayments.map((payment) => (
                                    <tr key={payment.id} className="border-b border-slate-50 last:border-0">
                                        <td className="py-3 pr-4 text-ink">
                                            {payment.round_number}
                                        </td>
                                        <td className="py-3 px-4 text-ink">
                                            {formatAmount(payment.amount)}
                                        </td>
                                        <td className="py-3 px-4 text-muted">
                                            {payment.reference || "—"}
                                        </td>
                                        <td className="py-3 pl-4">
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${getStatusStyle(payment.status)}`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payout Information */}
            <div className="border-t border-slate-100 pt-5 mt-6">
                <h4 className="font-semibold text-ink mb-1">
                    My Payouts
                </h4>
                <p className="text-sm text-muted mb-4">
                    View payouts assigned to you and confirm when you receive them.
                </p>

                {payoutsLoading ? (
                    <p className="text-sm text-muted">Loading your payouts...</p>
                ) : payouts.length === 0 ? (
                    <p className="text-sm text-muted">
                        You have not received a payout in this cycle yet.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {payouts.map((payout) => (
                            <div
                                key={payout.id}
                                className="border border-slate-100 rounded-lg p-4"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <p className="font-medium text-ink">
                                            Round {payout.round_number} Payout
                                        </p>
                                        <p className="text-lg font-bold text-ink mt-1">
                                            {formatAmount(payout.amount)}
                                        </p>
                                    </div>

                                    <span className={`w-fit text-xs font-medium px-3 py-1 rounded-full capitalize ${getStatusStyle(payout.status)}`}>
                                        {payout.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                                    <div>
                                        <p className="text-xs text-muted">Method</p>
                                        <p className="text-ink mt-1">
                                            {payout.method || "Not available"}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-muted">Reference</p>
                                        <p className="text-ink mt-1">
                                            {payout.reference || "Not available"}
                                        </p>
                                    </div>
                                </div>

                                {payout.status === "sent" && (
                                    <div className="border-t border-slate-100 mt-4 pt-4 space-y-3">
                                        <p className="text-sm text-muted">
                                            Has this payout reached you?
                                        </p>

                                        <button
                                            type="button"
                                            disabled={responding}
                                            onClick={() =>
                                                handlePayoutResponse("confirm", payout.id)
                                            }
                                            className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {responding ? "Processing..." : "Confirm Receipt"}
                                        </button>

                                        <div>
                                            <label className="block text-xs font-medium text-muted mb-1">
                                                Reason for rejection
                                            </label>
                                            <textarea
                                                value={rejectionReason}
                                                onChange={(event) =>
                                                    setRejectionReason(event.target.value)
                                                }
                                                rows={2}
                                                placeholder="Explain why you are rejecting this payout"
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
                                            />

                                            <button
                                                type="button"
                                                disabled={responding || !rejectionReason.trim()}
                                                onClick={() =>
                                                    handlePayoutResponse("reject", payout.id)
                                                }
                                                className="mt-2 border border-red-200 text-red-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                            >
                                                Reject Payout
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {payout.status === "rejected" && payout.rejection_reason && (
                                    <p className="text-sm text-red-600 mt-3">
                                        Rejection reason: {payout.rejection_reason}
                                    </p>
                                )}

                                {payout.status === "confirmed" && (
                                    <p className="text-sm text-green-700 mt-3">
                                        You have confirmed receipt of this payout.
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {payoutError && (
                    <p className="text-sm text-red-600 mt-3">{payoutError}</p>
                )}
            </div>

            {/* Payout Schedule */}
            <div className="border-t border-slate-100 pt-5 mt-6">
                <h4 className="font-semibold text-ink mb-4">
                    Payout Schedule
                </h4>

                {cycleLoading ? (
                    <p className="text-sm text-muted">
                        Loading payout schedule...
                    </p>
                ) : cycleError ? (
                    <p className="text-sm text-red-600">{cycleError}</p>
                ) : !cycleDetails?.payout_schedule?.length ? (
                    <p className="text-sm text-muted">
                        No payout schedule is available yet.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-muted">
                                    <th className="py-3 pr-4 font-medium">Round</th>
                                    <th className="py-3 px-4 font-medium">Recipient</th>
                                    <th className="py-3 px-4 font-medium">Due Date</th>
                                    <th className="py-3 pl-4 font-medium">Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {cycleDetails.payout_schedule.map((item) => (
                                    <tr
                                        key={item.round_number}
                                        className="border-b border-slate-50 last:border-0"
                                    >
                                        <td className="py-3 pr-4 font-medium text-ink">
                                            {item.round_number}
                                        </td>
                                        <td className="py-3 px-4 text-ink">
                                            {item.username}
                                        </td>
                                        <td className="py-3 px-4 text-muted">
                                            {formatDate(item.due_date)}
                                        </td>
                                        <td className="py-3 pl-4">
                                            <span className="capitalize text-xs font-medium text-ink">
                                                {item.round_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}

export default MemberCycleCard;
