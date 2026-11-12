import { Users } from "lucide-react";

function ChamaList({ chamas, loading, error }) {
    if (loading) {
        return (
            <p className="text-sm text-muted text-center py-10">
                Loading your chamas...
            </p>
        );
    }
     if (error) {
        return (
            <p className="text-sm text-red-600 text-center py-10">
                {error}
            </p>
        );
    }
    if (chamas.length === 0) {
        return (
            <div className="min-h-48 flex flex-col items-center justify-center text-center">
                <div className="bg-powder-light p-4 rounded-full mb-4">
                    <Users size={30} className="text-ink" />
                </div>

                <p className="font-semibold text-ink">
                    You haven't joined any chama yet.
                </p>

                <p className="text-sm text-muted mt-2">
                    Your savings groups will appear here once you join one.
                </p>
            </div>
        );
    }
    return (
        <div className="mt-6 space-y-4">
            {chamas.map((chama) => (
                <div
                    key={chama.chama_id}
                    className="border border-slate-100 rounded-xl p-5 hover:border-powder transition"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h4 className="font-bold text-ink text-lg">
                                {chama.name}
                            </h4>

                            <p className="text-sm text-muted mt-1">
                                {chama.description || "No description provided."}
                            </p>
                        </div>

                        <span className="bg-orange-light text-orange text-xs font-semibold px-3 py-2 rounded-full w-fit">
                            {chama.my_role?.replaceAll("_", " ")}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-5 mt-5 pt-4 border-t border-slate-100 text-sm">
                        <div className="flex items-center gap-2 text-muted">
                            <Users size={17} />
                            <span>{chama.member_count} members</span>
                        </div>

                        <div className="text-muted">
                            Created by:{" "}
                            <span className="font-medium text-ink">
                                {chama.created_by_username}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ChamaList;

