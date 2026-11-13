
import { Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

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
                <Link
                    key={chama.chama_id}
                    to={`/dashboard/chamas/${chama.chama_id}`}
                    className="block border border-slate-100 rounded-xl p-5 hover:border-powder hover:shadow-sm transition group"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h4 className="font-bold text-ink text-lg group-hover:text-orange transition">
                                {chama.name}
                            </h4>

                            <p className="text-sm text-muted mt-1">
                                {chama.description || "No description provided."}
                            </p>
                        </div>

                        <ArrowRight
                            size={20}
                            className="text-muted group-hover:text-orange group-hover:translate-x-1 transition"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-5">
                        <span className="bg-orange-light text-orange text-xs font-semibold px-3 py-2 rounded-full">
                            {chama.my_role?.replaceAll("_", " ")}
                        </span>

                        <div className="flex items-center gap-2 text-sm text-muted">
                            <Users size={17} />
                            <span>{chama.member_count} members</span>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-muted">
                        Created by:{" "}
                        <span className="font-medium text-ink">
                            {chama.created_by_username}
                        </span>
                    </div>
                </Link>
            ))}
        </div>
    );
}

export default ChamaList;
