import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Users, UserRound, Mail } from "lucide-react";
import useChama from "../../hooks/useChama";
import useChamaMembers from "../../hooks/useChamaMembers";

function ChamaDetails() {
    const { chamaId } = useParams();
    const { chama, loading, error } = useChama(chamaId);
    const { members, loading: membersLoading, error: membersError,} = useChamaMembers(chamaId);
    if (loading) {
        return (
            <p className="text-gray-500 text-sm">
                Loading chama details...
            </p>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <p className="text-red-600 text-sm">{error}</p>
                <Link
                    to="/dashboard/chamas"
                    className="text-blue-600 hover:underline text-sm"
                >
                    Back to Chamas
                </Link>
            </div>
        );
    }

    if (!chama) return null;

    const treasurer = members.find(
    (member) => member.role === "treasurer" && member.is_active
    );

    
return (
    <div className="space-y-6">
        <Link
            to="/dashboard/chamas"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600"
        >
            <ArrowLeft size={16} />
            Back to Chamas
        </Link>

        {/* Chama Information */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {chama.name}
                    </h1>

                    <p className="text-sm text-gray-500 mt-2">
                        {chama.description || "No description provided."}
                    </p>
                </div>

                <span className={`w-fit px-3 py-1 rounded-full text-xs font-medium ${
                    chama.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                }`}>
                    {chama.is_active ? "Active" : "Inactive"}
                </span>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mt-8">
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Users size={17} />
                        Members
                    </div>
                    <p className="text-xl font-semibold text-gray-900 mt-2">
                        {chama.member_count}
                    </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <UserRound size={17} />
                        Your Role
                    </div>
                    <p className="text-xl font-semibold text-gray-900 mt-2 capitalize">
                        {chama.my_role?.replaceAll("_", " ")}
                    </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <UserRound size={17} />
                        Created By
                    </div>
                    <p className="text-xl font-semibold text-gray-900 mt-2">
                        {chama.created_by_username}
                    </p>
                </div>
            </div>
        </div>

        {/* Chama Leadership */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900">
                Chama Leadership
            </h2>

            {membersLoading ? (
                <p className="text-sm text-gray-500 mt-4">
                    Loading leadership information...
                </p>
            ) : membersError ? (
                <p className="text-sm text-red-600 mt-4">
                    {membersError}
                </p>
            ) : (
                <div className="mt-4">
                    {treasurer ? (
                        <div>
                            <p className="text-sm text-gray-500">
                                Treasurer
                            </p>
                            <p className="font-medium text-gray-900 mt-1">
                                {treasurer.username}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">
                            No Treasurer has been appointed yet.
                        </p>
                    )}
                </div>
            )}
        </div>

        {/* Chama Navigation */}
        <div className="grid sm:grid-cols-2 gap-4">
            <Link
                to={`/dashboard/chamas/${chamaId}/members`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition"
            >
                <div className="flex items-center gap-3">
                    <Users className="text-blue-600" size={22} />
                    <h2 className="font-semibold text-gray-900">
                        Chama Members
                    </h2>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    View members and their roles.
                </p>
            </Link>

            <Link
                to={`/dashboard/chamas/${chamaId}/invitations`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition"
            >
                <div className="flex items-center gap-3">
                    <Mail className="text-blue-600" size={22} />
                    <h2 className="font-semibold text-gray-900">
                        Manage Invitations
                    </h2>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    Propose, review, and manage chama invitations.
                </p>
            </Link>
        </div>
    </div>
);

}

export default ChamaDetails;
