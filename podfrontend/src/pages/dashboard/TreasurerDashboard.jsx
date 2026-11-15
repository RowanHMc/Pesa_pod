
import { useState } from "react";
import {CheckCircle, XCircle,Clock, Wallet,CalendarDays, AlertTriangle,} from "lucide-react"; 
import { confirmPayment, rejectPayment,} from "../../api/payments";
import useTreasurerOverview from "../../hooks/useTreasurerOverview";
import usePayouts from "../../hooks/usePayouts";


function TreasurerDashboard({
    chama,
    cycle,
    payments,
    loading,
    error,
    onReviewed,
}) {
    const [processingId, setProcessingId] = useState(null);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [actionError, setActionError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [payoutMethod, setPayoutMethod] = useState("");
    const [payoutReference, setPayoutReference] = useState("");
    const [payoutActionError, setPayoutActionError] = useState("");
    const [payoutSuccess, setPayoutSuccess] = useState("");
    const paymentList = Array.isArray(payments) ? payments : [];

    const {
        round,
        contributions,
        expectedAmount,
        confirmedAmount,
        overdueCount,
        loading: overviewLoading,
        error: overviewError,
    } = useTreasurerOverview(cycle);

    const {
        payouts,
        loading: payoutsLoading,
        submitting,
        error: payoutsError,
        createPayout,
    } = usePayouts(chama?.chama_id);
   
    const payoutSummary = payouts.reduce(
    (summary, payout) => {
        if (payout.status === "confirmed") {
            summary.confirmed += 1;
        }

        if (payout.status === "sent") {
            summary.awaiting += 1;
        }

        if (payout.status !== "rejected") {
            summary.totalAmount += Number(payout.amount || 0);
        }

        return summary;
    },
    {
        confirmed: 0,
        awaiting: 0,
        totalAmount: 0,
    }
);
    const formatAmount = (amount) => {
        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: "KES",
        }).format(Number(amount || 0));
    };

    const formatDate = (date) => {
        if (!date) return "Not available";

        return new Date(date).toLocaleDateString("en-KE", {
            dateStyle: "medium",
        });
    };

    const formatDateTime = (date) => {
        if (!date) return "Not available";

        return new Date(date).toLocaleString("en-KE", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    const isOverdue = (contribution) => {
        if (!round?.due_date || contribution.status === "paid") {
            return false;
        }

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        const todayString = `${year}-${month}-${day}`;

        return round.due_date < todayString;
    };

    const handleConfirm = async (paymentId) => {
        setProcessingId(paymentId);
        setActionError("");
        setSuccessMessage("");

        try {
            await confirmPayment(paymentId);

            setSuccessMessage("Payment confirmed successfully.");

            if (onReviewed) {
                onReviewed();
            }
        } catch (error) {
            setActionError(
                error.response?.data?.detail ||
                "Unable to confirm this payment. Please try again."
            );
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (paymentId) => {
        if (!rejectionReason.trim()) {
            setActionError(
                "Please provide a reason for rejecting this payment."
            );
            return;
        }

        setProcessingId(paymentId);
        setActionError("");
        setSuccessMessage("");

        try {
            await rejectPayment(paymentId, rejectionReason.trim());

            setSuccessMessage("Payment report rejected successfully.");
            setRejectingId(null);
            setRejectionReason("");

            if (onReviewed) {
                onReviewed();
            }
        } catch (error) {
            setActionError(
                error.response?.data?.detail ||
                "Unable to reject this payment. Please try again."
            );
        } finally {
            setProcessingId(null);
        }
    };

const handleRecordPayout = async (event) => {
    event.preventDefault();

    if (!round?.id) {
        setPayoutActionError("No current savings round is available.");
        return;
    }

    if (!payoutMethod.trim() || !payoutReference.trim()) {
        setPayoutActionError("Please provide the payment method and reference.");
        return;
    }

    setPayoutActionError("");
    setPayoutSuccess("");

    try {
        await createPayout(
            round.id,
            payoutMethod.trim(),
            payoutReference.trim()
        );

        setPayoutSuccess("Payout recorded successfully.");
        setPayoutMethod("");
        setPayoutReference("");
    } catch (error) {
        setPayoutActionError(
            error.response?.data?.detail ||
            "Unable to record payout. Please try again."
        );
    }
};


    return (
        <div className="space-y-8">

            {/* Financial Overview */}
            <section>
                <div className="mb-5">
                    <h2 className="text-xl font-semibold text-slate-800">
                        Financial Overview
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                        Financial summary for {chama?.name}.
                    </p>
                </div>

                {overviewError && (
                    <p className="text-sm text-red-600 mb-4">
                        {overviewError}
                    </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                Expected Contributions
                            </p>

                            <Wallet size={20} className="text-blue-600" />
                        </div>

                        <p className="text-2xl font-bold text-slate-800 mt-3">
                            {overviewLoading
                                ? "Loading..."
                                : formatAmount(expectedAmount)}
                        </p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                Confirmed Contributions
                            </p>

                            <CheckCircle size={20} className="text-green-600" />
                        </div>

                        <p className="text-2xl font-bold text-slate-800 mt-3">
                            {overviewLoading
                                ? "Loading..."
                                : formatAmount(confirmedAmount)}
                        </p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                Pending Reports
                            </p>

                            <Clock size={20} className="text-amber-600" />
                        </div>

                        <p className="text-2xl font-bold text-slate-800 mt-3">
                            {loading ? "Loading..." : paymentList.length}
                        </p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                Overdue Contributions
                            </p>

                            <AlertTriangle size={20} className="text-red-600" />
                        </div>

                        <p className="text-2xl font-bold text-slate-800 mt-3">
                            {overviewLoading ? "Loading..." : overdueCount}
                        </p>
                    </div>

                </div>
            </section>

            {/* Current Savings Round */}
            <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <CalendarDays size={22} className="text-blue-600" />

                    <h2 className="text-lg font-semibold text-slate-800">
                        Current Savings Round
                    </h2>
                </div>

                {overviewLoading ? (
                    <p className="text-sm text-slate-500">
                        Loading round information...
                    </p>
                ) : round ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div>
                            <p className="text-sm text-slate-500">
                                Round
                            </p>

                            <p className="font-semibold text-slate-800 mt-1">
                                {round.round_number}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Recipient
                            </p>

                            <p className="font-semibold text-slate-800 mt-1">
                                {round.recipient_username || "Not assigned"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Due Date
                            </p>

                            <p className="font-semibold text-slate-800 mt-1">
                                {formatDate(round.due_date)}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Round Status
                            </p>

                            <p className="font-semibold text-slate-800 mt-1 capitalize">
                                {round.status}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Confirmed Contributions
                            </p>

                            <p className="font-semibold text-slate-800 mt-1">
                                {round.paid_count} / {round.contribution_count}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Payout Status
                            </p>

                            <p className="font-semibold text-slate-800 mt-1 capitalize">
                                {round.payout_status || "Pending"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">
                        No current round information is available.
                    </p>
                )}
            </section>

            {/* Payment Approvals */}
            <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            Payment Approvals
                        </h2>

                        <p className="text-sm text-slate-500 mt-1">
                            Review and confirm member payment reports.
                        </p>
                    </div>

                    <span className="bg-amber-100 text-amber-700 text-sm font-medium px-3 py-1 rounded-full">
                        {paymentList.length} Pending
                    </span>
                </div>

                {actionError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
                        {actionError}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">
                        {successMessage}
                    </div>
                )}

                {loading ? (
                    <p className="text-sm text-slate-500">
                        Loading payment reports...
                    </p>
                ) : error ? (
                    <p className="text-sm text-red-600">
                        {error}
                    </p>
                ) : paymentList.length === 0 ? (
                    <div className="text-center py-8">
                        <CheckCircle
                            size={35}
                            className="mx-auto text-green-500 mb-3"
                        />

                        <p className="font-medium text-slate-700">
                            No pending payment reports
                        </p>

                        <p className="text-sm text-slate-500 mt-1">
                            All reported payments have been reviewed.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {paymentList.map((payment) => (
                            <div
                                key={payment.id}
                                className="border border-slate-100 rounded-lg p-4"
                            >
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div>
                                        <h3 className="font-semibold text-slate-800">
                                            {payment.reported_by_username}
                                        </h3>

                                        <p className="text-sm text-slate-500 mt-1">
                                            Round {payment.round_number}
                                        </p>

                                        <p className="text-sm text-slate-500">
                                            {payment.method} · Reference:{" "}
                                            {payment.reference || "Not provided"}
                                        </p>

                                        <p className="text-xs text-slate-400 mt-1">
                                            Reported: {formatDateTime(payment.created_at)}
                                        </p>
                                    </div>

                                    <div className="md:text-right">
                                        <p className="text-lg font-bold text-slate-800">
                                            {formatAmount(payment.amount)}
                                        </p>

                                        <span className="text-xs text-amber-600 font-medium">
                                            Awaiting confirmation
                                        </span>
                                    </div>
                                </div>

                                {rejectingId === payment.id && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Reason for rejection
                                        </label>

                                        <textarea
                                            value={rejectionReason}
                                            onChange={(event) =>
                                                setRejectionReason(event.target.value)
                                            }
                                            rows="2"
                                            className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Explain why this payment report is being rejected..."
                                        />
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-3 mt-4">
                                    <button
                                        onClick={() => handleConfirm(payment.id)}
                                        disabled={processingId === payment.id}
                                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
                                    >
                                        <CheckCircle size={16} />

                                        {processingId === payment.id
                                            ? "Processing..."
                                            : "Confirm"}
                                    </button>

                                    {rejectingId === payment.id ? (
                                        <>
                                            <button
                                                onClick={() => handleReject(payment.id)}
                                                disabled={processingId === payment.id}
                                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
                                            >
                                                <XCircle size={16} />

                                                {processingId === payment.id
                                                    ? "Processing..."
                                                    : "Submit Rejection"}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setRejectingId(null);
                                                    setRejectionReason("");
                                                    setActionError("");
                                                }}
                                                disabled={processingId === payment.id}
                                                className="text-sm text-slate-600 hover:text-slate-800 px-3 py-2"
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setRejectingId(payment.id);
                                                setRejectionReason("");
                                                setActionError("");
                                            }}
                                            disabled={processingId === payment.id}
                                            className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium px-4 py-2 rounded-lg"
                                        >
                                            <XCircle size={16} />
                                            Reject
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Member Contribution Tracking */}
            <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                <div className="mb-5">
                    <h2 className="text-lg font-semibold text-slate-800">
                        Member Contribution Tracking
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                        Track contributions for the current savings round.
                    </p>
                </div>

                {overviewLoading ? (
                    <p className="text-sm text-slate-500">
                        Loading member contributions...
                    </p>
                ) : overviewError ? (
                    <p className="text-sm text-red-600">
                        Unable to load member contributions.
                    </p>
                ) : contributions.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6 text-center">
                        No contribution records available for this round.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-500">
                                    <th className="py-3 pr-4 font-medium">
                                        Member
                                    </th>

                                    <th className="py-3 px-4 font-medium">
                                        Amount Due
                                    </th>

                                    <th className="py-3 px-4 font-medium">
                                        Penalty
                                    </th>

                                    <th className="py-3 px-4 font-medium">
                                        Total Due
                                    </th>

                                    <th className="py-3 pl-4 font-medium">
                                        Status
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {contributions.map((contribution) => {
                                    const overdue = isOverdue(contribution);

                                    return (
                                        <tr
                                            key={contribution.id}
                                            className="border-b border-slate-50 last:border-0"
                                        >
                                            <td className="py-4 pr-4 font-medium text-slate-800">
                                                {contribution.member_username}
                                            </td>

                                            <td className="py-4 px-4 text-slate-600">
                                                {formatAmount(contribution.amount_due)}
                                            </td>

                                            <td className="py-4 px-4 text-slate-600">
                                                {formatAmount(contribution.penalty_amount)}
                                            </td>

                                            <td className="py-4 px-4 font-medium text-slate-800">
                                                {formatAmount(contribution.total_due)}
                                            </td>

                                            <td className="py-4 pl-4">
                                                <span
                                                    className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                                        contribution.status === "paid"
                                                            ? "bg-green-100 text-green-700"
                                                            : overdue
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-amber-100 text-amber-700"
                                                    }`}
                                                >
                                                    {overdue
                                                        ? "Overdue"
                                                        : contribution.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

{/* Payout Management */}
<section className="bg-white border border-slate-100 rounded-xl mb-8 p-6 shadow-sm">
    <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-800">
            Payout Management
        </h2>
    </div>
    {payoutActionError && (
        <p className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
            {payoutActionError}
        </p>
    )}
    {payoutsError && (
        <p className="text-red-600 text-sm mb-4">
            {payoutsError}
        </p>
    )}
    {payoutSuccess && (
        <p className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">
            {payoutSuccess}
        </p>
    )}
    {/* Record Payout Form */}
    <div className="border border-slate-100 rounded-lg p-4 mb-6">
        {round ? (
            <form onSubmit={handleRecordPayout} className="space-y-4">
                <div>
                    <p className="text-sm text-slate-500">
                        Current round
                    </p>
                    <p className="font-medium text-slate-800">
                        Round {round.round_number} — {round.recipient_username}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Payment Method
                    </label>
                    <input
                        type="text"
                        value={payoutMethod}
                        onChange={(event) => setPayoutMethod(event.target.value)}
                        placeholder="e.g. M-Pesa, Bank Transfer"
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Payment Reference
                    </label>
                    <input
                        type="text"
                        value={payoutReference}
                        onChange={(event) => setPayoutReference(event.target.value)}
                        placeholder="Enter transaction reference"
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
                >
                    {submitting ? "Recording..." : "Record Payout"}
                </button>
            </form>
        ) : (
            <p className="text-sm text-slate-500">
                A savings round is required before recording a payout.
            </p>
        )}
    </div>
        {/* Payout Summary */}
<div>
    <h3 className="font-semibold text-slate-800 mb-4">
        Payout Summary
    </h3>

    {payoutsLoading ? (
        <p className="text-sm text-slate-500">
            Loading payout summary...
        </p>
    ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">
                    Payouts Recorded
                </p>
                <p className="text-2xl font-bold text-slate-800 mt-2">
                    {payouts.length}
                </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">
                    Total Payout Value
                </p>
                <p className="text-xl font-bold text-slate-800 mt-2">
                    {formatAmount(payoutSummary.totalAmount)}
                </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">
                    Confirmed Payouts
                </p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                    {payoutSummary.confirmed}
                </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">
                    Awaiting Confirmation
                </p>
                <p className="text-2xl font-bold text-amber-600 mt-2">
                    {payoutSummary.awaiting}
                </p>
            </div>
        </div>
    )}
</div>
    {/* Payout History */}
    <div>
        <h3 className="font-semibold text-slate-800 mb-4">
            Payout History
        </h3>

        {payoutsLoading ? (
            <p className="text-sm text-slate-500">
                Loading payout records...
            </p>
        ) : payouts.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
                No payouts have been recorded for this chama.
            </p>
        ) : (
            <div className="space-y-3">
                {payouts.map((payout) => (
                    <div
                        key={payout.id}
                        className="border border-slate-100 rounded-lg p-4"
                    >
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                            <div>
                                <h4 className="font-semibold text-slate-800">
                                    Round {payout.round_number}
                                </h4>

                                <p className="text-sm text-slate-500 mt-1">
                                    Recipient: {payout.recipient_username}
                                </p>

                                <p className="text-sm text-slate-500">
                                    {payout.method} · {payout.reference}
                                </p>

                                <p className="text-xs text-slate-400 mt-1">
                                    Recorded: {formatDateTime(payout.created_at)}
                                </p>
                            </div>

                            <div className="sm:text-right">
                                <p className="text-lg font-bold text-slate-800">
                                    {formatAmount(payout.amount)}
                                </p>

                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${
                                    payout.status === "confirmed"
                                        ? "bg-green-100 text-green-700"
                                        : payout.status === "rejected"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-amber-100 text-amber-700"
                                }`}>
                                    {payout.status}
                                </span>
                            </div>
                        </div>

                        {payout.rejection_reason && (
                            <p className="text-sm text-red-600 mt-3">
                                Rejection reason: {payout.rejection_reason}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        )}
    </div>
</section>

        </div>
    );
}

export default TreasurerDashboard;
