
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";

import useChamaMembers from "../../hooks/useChamaMembers";

function ChamaMembers() {
    const { chamaId } = useParams();
    const {members,loading,error,} = useChamaMembers(chamaId);                      

    if (loading) {
        return (
            <div className="p-6 text-gray-500">
                Loading members...
            </div>
        );
    }
    if (error) {
        return (
            <div className="p-6 text-red-600">
                {error}
            </div>
        );
    }
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link
                    to="/dashboard/chamas"
                    className="rounded-lg p-2 hover:bg-gray-100"
                >
                    <ArrowLeft size={20} />
                </Link>

                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Chama Members
                    </h1>
                    <p className="text-sm text-gray-500">
                        View members and their roles.
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                    <Users className="text-blue-600" size={22} />

                    <h2 className="text-lg font-semibold text-gray-800">
                        Members ({members.length})
                    </h2>
                </div>

                {members.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        No members found.
                    </p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {members.map((member) => (
                            <div
                                key={member.membership_id}
                                className="flex items-center justify-between gap-4 py-4"
                            >
                                <div>
                                    <p className="font-medium text-gray-800">
                                        {member.username}
                                        {member.is_me && (
                                            <span className="ml-2 text-xs text-blue-600">
                                                You
                                            </span>
                                        )}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                        Joined: {new Date(
                                            member.joined_at
                                        ).toLocaleDateString()}
                                    </p>
                                </div>

                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                    {member.role}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChamaMembers;
