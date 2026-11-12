
import useChamas from "../../hooks/useChamas";
import ChamaList from "./ChamaList";

function Chamas() {
    const { chamas, loading, error } = useChamas();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-ink">
                    My Chamas
                </h2>

                <p className="text-sm text-muted mt-1">
                    Manage and keep track of your savings groups.
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div>
                    <h3 className="text-lg font-bold text-ink">
                        Your Savings Groups
                    </h3>

                    <p className="text-sm text-muted mt-1">
                        All the chamas you currently belong to.
                    </p>
                </div>

                <ChamaList
                    chamas={chamas}
                    loading={loading}
                    error={error}
                />
            </div>
        </div>
    );
}

export default Chamas;
