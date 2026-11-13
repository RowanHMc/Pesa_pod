
import { useState } from "react";
import { CheckCircle, XCircle, Clock, Wallet } from "lucide-react";
import {
    confirmPayment,
    rejectPayment,
} from "../../api/payments";

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

    const formatAmount = (amount) => {
        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: "KES",
        }).format(Number(amount));
    };

    const formatDate = (date) => {
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
            setActionError("Please provide a reason for rejecting this payment.");
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
        <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-ink">
                        Payment Approvals
                    </h2>

                    <p className="text-sm text-muted mt-1">
                        Review reported contributions for {chama.name}.
                    </p>
                </div>

                <div className="bg-orange-light p-3 rounded-lg">
                    <Wallet size={22} className="text-orange" />
                </div>
            </div>

            {actionError && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">
                    {actionError}
                </div>
            )}

            {successMessage && (
                <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4">
                    {successMessage}
                </div>
            )}

            {loading ? (
                <p className="text-sm text-muted py-6 text-center">
                    Loading payment reports...
                </p>
            ) : error ? (
                <p className="text-sm text-red-600 py-6 text-center">
                    {error}
                </p>
            ) : payments.length === 0 ? (
                <div className="py-10 text-center">
                    <CheckCircle
                        size={36}
                        className="text-green-600 mx-auto mb-3"
                    />

                    <p className="font-semibold text-ink">
                        No pending payments
                    </p>

                    <p className="text-sm text-muted mt-1">
                        All reported payments for this chama have been reviewed.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {payments.map((payment) => (
                        <div
                            key={payment.id}
                            className="border border-slate-200 rounded-lg p-4"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    <h3 className="font-semibold text-ink">
                                        {payment.reported_by_username}
                                    </h3>

                                    <p className="text-sm text-muted mt-1">
                                        Round {payment.round_number}
                                    </p>

                                    <p className="text-xs text-muted mt-2">
                                        Reported: {formatDate(payment.created_at)}
                                    </p>
                                </div>

                                <div className="sm:text-right">
                                    <p className="text-lg font-bold text-ink">
                                        {formatAmount(payment.amount)}
                                    </p>

                                    <span className="inline-flex items-center gap-1 text-xs text-orange bg-orange-light px-2 py-1 rounded-full mt-2">
                                        <Clock size={13} />
                                        Pending
                                    </span>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
                                <p className="text-muted">
                                    Method:{" "}
                                    <span className="text-ink font-medium">
                                        {payment.method}
                                    </span>
                                </p>

                                <p className="text-muted">
                                    Reference:{" "}
                                    <span className="text-ink font-medium">
                                        {payment.reference || "Not provided"}
                                    </span>
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3 mt-5">
                                <button
                                    type="button"
                                    onClick={() => handleConfirm(payment.id)}
                                    disabled={processingId !== null}
                                    className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                                >
                                    <CheckCircle size={16} />
                                    {processingId === payment.id
                                        ? "Processing..."
                                        : "Confirm Payment"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setRejectingId(
                                            rejectingId === payment.id
                                                ? null
                                                : payment.id
                                        );
                                        setRejectionReason("");
                                        setActionError("");
                                    }}
                                    disabled={processingId !== null}
                                    className="inline-flex items-center gap-2 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                                >
                                    <XCircle size={16} />
                                    Reject Payment
                                </button>
                            </div>

                            {rejectingId === payment.id && (
                                <div className="mt-4">
                                    <label
                                        htmlFor={`rejection-${payment.id}`}
                                        className="block text-sm font-medium text-ink mb-2"
                                    >
                                        Reason for rejection
                                    </label>

                                    <textarea
                                        id={`rejection-${payment.id}`}
                                        value={rejectionReason}
                                        onChange={(e) =>
                                            setRejectionReason(e.target.value)
                                        }
                                        rows={3}
                                        placeholder="Explain why this payment is being rejected..."
                                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => handleReject(payment.id)}
                                        disabled={processingId !== null}
                                        className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                                    >
                                        Submit Rejection
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default TreasurerDashboard;
