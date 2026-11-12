import { useState } from "react";
import { Plus } from "lucide-react";

import useChamas from "../../hooks/useChamas";
import ChamaList from "./ChamaList";
import CreateChama from "./CreateChamas";

function Chamas() {
    const { chamas, loading, error } = useChamas();
    const  [showForm, setShowForm] = useState(false);

    const handleChamaCreated = (newChama) => {
        setChamas((currentChamas) => [newChama, ...currentChamas]);
        setShowForm(false);
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-ink">
                        My Chamas
                    </h2>

                    <p className="text-sm text-muted mt-1">
                        Manage and keep track of your savings groups.
                    </p>
                </div>

                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center justify-center gap-2 bg-ink text-white px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90"
                    >
                        <Plus size={18} />
                        Create Chama
                    </button>
                )}
            </div>

            {showForm && (
                <CreateChama
                    onCreated={handleChamaCreated}
                    onCancel={() => setShowForm(false)}
                />
            )}

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
