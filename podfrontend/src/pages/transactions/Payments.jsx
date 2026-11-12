
import { CreditCard, RefreshCw } from "lucide-react";
import usePayments from "../../hooks/usePayments";

function Payments() {
    const { payments, loading, error } = usePayments();

    const formatDate = (date) => {
        if (!date) return "-";

        return new Date(date).toLocaleDateString("en-KE", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const formatAmount = (amount) => {
        return `KSh ${Number(amount).toLocaleString("en-KE")}`;
    };

    const statusStyles = {
        pending: "bg-yellow-100 text-yellow-700",
        confirmed: "bg-green-100 text-green-700",
        rejected: "bg-red-100 text-red-700",
    };

    return (
        <div>
            {/* Page heading */}
            <section className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-ink">
                    Payments
                </h1>

                <p className="text-muted mt-2">
                    View and track your submitted payment reports.
                </p>
            </section>

            {/* Payment records */}
            <section className="bg-white border border-slate-100 rounded-xl shadow-sm">

                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-light p-3 rounded-lg">
                            <CreditCard size={22} className="text-orange" />
                        </div>

                        <div>
                            <h2 className="font-bold text-lg text-ink">
                                Payment History
                            </h2>

                            <p className="text-sm text-muted">
                                {payments.length} payment reports
                            </p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 text-center">
                        <RefreshCw
                            size={25}
                            className="animate-spin text-orange mx-auto mb-3"
                        />

                        <p className="text-sm text-muted">
                            Loading payment reports...
                        </p>
                    </div>
                ) : error ? (
                    <div className="py-16 px-6 text-center">
                        <p className="text-sm text-red-600">
                            {error}
                        </p>
                    </div>
                ) : payments.length === 0 ? (
                    <div className="py-16 px-6 text-center">
                        <div className="bg-powder-light p-4 rounded-full w-fit mx-auto mb-4">
                            <CreditCard size={28} className="text-ink" />
                        </div>

                        <h3 className="font-semibold text-ink">
                            No payment reports yet
                        </h3>

                        <p className="text-sm text-muted mt-2">
                            Your submitted payment reports will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-muted">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">
                                        Chama
                                    </th>

                                    <th className="px-6 py-4 font-semibold">
                                        Round
                                    </th>

                                    <th className="px-6 py-4 font-semibold">
                                        Amount
                                    </th>

                                    <th className="px-6 py-4 font-semibold">
                                        Method
                                    </th>

                                    <th className="px-6 py-4 font-semibold">
                                        Reference
                                    </th>

                                    <th className="px-6 py-4 font-semibold">
                                        Date
                                    </th>

                                    <th className="px-6 py-4 font-semibold">
                                        Status
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {payments.map((payment) => (
                                    <tr
                                        key={payment.id}
                                        className="hover:bg-slate-50 transition"
                                    >
                                        <td className="px-6 py-4 font-medium text-ink">
                                            {payment.chama_name}
                                        </td>

                                        <td className="px-6 py-4 text-muted">
                                            Round {payment.round_number}
                                        </td>

                                        <td className="px-6 py-4 font-medium text-ink whitespace-nowrap">
                                            {formatAmount(payment.amount)}
                                        </td>

                                        <td className="px-6 py-4 text-muted capitalize">
                                            {payment.method?.replaceAll("_", " ") || "-"}
                                        </td>

                                        <td className="px-6 py-4 text-muted">
                                            {payment.reference || "-"}
                                        </td>

                                        <td className="px-6 py-4 text-muted whitespace-nowrap">
                                            {formatDate(payment.created_at)}
                                        </td>

                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                                                    statusStyles[payment.status] ||
                                                    "bg-slate-100 text-slate-600"
                                                }`}
                                            >
                                                {payment.status}
                                            </span>

                                            {payment.status === "rejected" &&
                                                payment.rejection_reason && (
                                                    <p className="text-xs text-red-600 mt-2 max-w-48">
                                                        {payment.rejection_reason}
                                                    </p>
                                                )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default Payments;
