
import { useState } from "react";
import {
    CheckCircle,
    XCircle,
    Clock,
    Wallet,
    Users,
    CalendarDays,
    AlertTriangle,
} from "lucide-react";

import {
    confirmPayment,
    rejectPayment,
} from "../../api/payments";

import useTreasurerOverview from "../../hooks/useTreasurerOverview";

function TreasurerDashboard({
    chama,
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

    const {
        round,
        contributions,
        expectedAmount,
        confirmedAmount,
        overdueCount,
        loading: overviewLoading,
        error: overviewError,
    } = useTreasurerOverview(chama?.active_cycle);

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
                            {loading ? "Loading..." : payments.length}
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
                        {payments.length} Pending
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
                ) : payments.length === 0 ? (
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
                        {payments.map((payment) => (
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

            {/* Member Contribution Tracking - Next Implementation */}
            <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <Users size={22} className="text-blue-600" />

                    <h2 className="text-lg font-semibold text-slate-800">
                        Member Contribution Tracking
                    </h2>
                </div>

                <p className="text-sm text-slate-500">
                    Member-by-member contribution records will appear here.
                </p>

                <p className="text-sm text-slate-400 mt-2">
                    {overviewLoading
                        ? "Loading contribution records..."
                        : `${contributions.length} contribution records available.`}
                </p>
            </section>

        </div>
    );
}

export default TreasurerDashboard;
