
import useSavingsCycle from "../../hooks/useSavingsCycle";

function MemberCycleCard({ cycle }) {
    const {
        cycleDetails,
        loading,
        error,
    } = useSavingsCycle(cycle.id);

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

    return (
        <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
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
                    <p className="text-sm text-muted">
                        Contribution
                    </p>
                    <p className="font-semibold text-ink mt-1">
                        {formatAmount(cycle.contribution_amount)}
                    </p>
                </div>

                <div>
                    <p className="text-sm text-muted">
                        Frequency
                    </p>
                    <p className="font-semibold text-ink mt-1 capitalize">
                        {cycle.frequency}
                    </p>
                </div>

                <div>
                    <p className="text-sm text-muted">
                        Start Date
                    </p>
                    <p className="font-semibold text-ink mt-1">
                        {formatDate(cycle.start_date)}
                    </p>
                </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
                <h4 className="font-semibold text-ink mb-4">
                    Payout Schedule
                </h4>

                {loading ? (
                    <p className="text-sm text-muted">
                        Loading payout schedule...
                    </p>
                ) : error ? (
                    <p className="text-sm text-red-600">
                        {error}
                    </p>
                ) : !cycleDetails?.payout_schedule?.length ? (
                    <p className="text-sm text-muted">
                        No payout schedule is available yet.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-muted">
                                    <th className="py-3 pr-4 font-medium">
                                        Round
                                    </th>
                                    <th className="py-3 px-4 font-medium">
                                        Recipient
                                    </th>
                                    <th className="py-3 px-4 font-medium">
                                        Due Date
                                    </th>
                                    <th className="py-3 pl-4 font-medium">
                                        Status
                                    </th>
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
