import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";

import useChamaInvitations from "../../hooks/useChamaInvitations";
import { proposeInvitation , reviewInvitation} from "../../api/invitations";


function ChamaInvitations() {
    const { chamaId } = useParams();
    const {invitations, loading,error,refetch,} = useChamaInvitations(chamaId);          
    const [username, setUsername] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState("");
    const [actionError, setActionError] = useState("");
    const [processingId, setProcessingId] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setSuccess("");
        setActionError("");

        try {
            await proposeInvitation(chamaId, username.trim());
            setUsername("");
            setSuccess("Invitation proposal submitted successfully.");
            await refetch();
        } catch (error) {
            const data = error.response?.data;

            setActionError(
                data?.detail ||
                data?.username?.[0] ||
                "Unable to propose invitation. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleReview = async (invitationId, decision) => {
    setProcessingId(invitationId);
    setSuccess("");
    setActionError("");

    try {
        await reviewInvitation(chamaId, invitationId, decision);

        setSuccess(
            decision === "approve"
                ? "Invitation approved successfully."
                : "Invitation rejected successfully."
        );

        await refetch();
    } catch (error) {
        setActionError(
            error.response?.data?.detail ||
            "Unable to review invitation. Please try again."
        );
    } finally {
        setProcessingId(null);
    }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <Link
                to="/dashboard/chamas"
                className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink transition mb-6"
            >
                <ArrowLeft size={17} />
                Back to Chamas
            </Link>

            <div className="mb-8">
                <h2 className="text-2xl font-bold text-ink">
                    Chama Invitations
                </h2>
                <p className="text-sm text-muted mt-2">
                    Invite new members and manage existing invitation requests.
                </p>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-5">
                    <div className="bg-powder-light p-3 rounded-lg">
                        <UserPlus size={21} className="text-ink" />
                    </div>

                    <div>
                        <h3 className="font-bold text-ink">
                            Propose an Invitation
                        </h3>

                        <p className="text-sm text-muted">
                            Enter the username of the person you want to invite.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="Enter username"
                        required
                        className="flex-1 border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-powder"
                    />

                    <button
                        type="submit"
                        disabled={submitting || !username.trim()}
                        className="bg-ink text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition"
                    >
                        {submitting ? "Submitting..." : "Propose Invitation"}
                    </button>
                </form>

                {success && (
                    <p className="text-sm text-green-600 mt-4">
                        {success}
                    </p>
                )}

                {actionError && (
                    <p className="text-sm text-red-600 mt-4">
                        {actionError}
                    </p>
                )}
            </div>

            <div>
                <h3 className="text-lg font-bold text-ink mb-4">
                    Open Invitations
                </h3>

                {loading ? (
                    <p className="text-sm text-muted text-center py-8">
                        Loading invitations...
                    </p>
                ) : error ? (
                    <p className="text-sm text-red-600 text-center py-8">
                        {error}
                    </p>
                ) : invitations.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-xl p-8 text-center">
                        <p className="font-semibold text-ink">
                            No open invitations.
                        </p>

                        <p className="text-sm text-muted mt-2">
                            New invitation proposals will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {invitations.map((invitation) => (
                            <div
                                key={invitation.invitation_id}
                                className="bg-white border border-slate-100 rounded-xl p-5"
                            >
                                <h4 className="font-semibold text-ink">
                                    @{invitation.invited_user_username}
                                </h4>

                                <p className="text-sm text-muted mt-2">
                                    Proposed by: {invitation.invited_by_username}
                                </p>
                                <p className="text-xs text-muted mt-2">
                                    Status: {invitation.status.replaceAll("_", " ")}
                                </p>
                                {invitation.status === "pending_approval" && (
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={() =>
                                            handleReview(invitation.invitation_id, "approve")
                                        }
                                        disabled={processingId !== null}
                                        className="bg-ink text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition"
                                    >
                                        {processingId === invitation.invitation_id
                                            ? "Processing..."
                                            : "Approve"}
                                    </button>

                                    <button
                                        onClick={() =>
                                            handleReview(invitation.invitation_id, "reject")
                                        }
                                        disabled={processingId !== null}
                                        className="border border-red-200 text-red-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 transition"
                                    >
                                        {processingId === invitation.invitation_id
                                            ? "Processing..."
                                            : "Reject"}
                                    </button>
                                </div>
                            )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChamaInvitations;
