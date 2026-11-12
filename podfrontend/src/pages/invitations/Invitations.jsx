import { useState } from "react";
import { Clock, Mail, Check, X } from "lucide-react";

import useInvitations from "../../hooks/useInvitations";
import { respondToInvitation } from "../../api/invitations";

function Invitations() {
    const {invitations,setInvitations,loading,error, } = useInvitations("all");                     
    const [processingId, setProcessingId] = useState(null);
    const [actionError, setActionError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const pendingInvitations = invitations.filter(
        (invitation) => invitation.status === "awaiting_acceptance"
    );

    const invitationHistory = invitations.filter(
        (invitation) => invitation.status !== "awaiting_acceptance"
    );

    const handleResponse = async (invitationId, decision) => {
        setProcessingId(invitationId);
        setActionError("");
        setSuccessMessage("");

        try {
            const updatedInvitation = await respondToInvitation(
                invitationId,
                decision
            );
            setInvitations((currentInvitations) =>
                currentInvitations.map((invitation) =>
                    invitation.invitation_id === invitationId
                        ? updatedInvitation
                        : invitation
                )
            );
            setSuccessMessage(
                decision === "accept"
                    ? "Invitation accepted successfully."
                    : "Invitation declined."
            );
        } catch (error) {
            setActionError(
                error.response?.data?.detail ||
                "Unable to process invitation. Please try again."
            );
        } finally {
            setProcessingId(null);
        }
    };
    const formatDate = (date) => {
        if (!date) return "Not available";

        return new Date(date).toLocaleDateString("en-KE", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };
    const getStatusStyle = (status) => {
        switch (status) {
            case "awaiting_acceptance":
                return "bg-orange-light text-orange";
            case "accepted":
                return "bg-green-50 text-green-700";
            case "declined":
            case "rejected":
                return "bg-red-50 text-red-600";
            default:
                return "bg-slate-100 text-slate-600";
        }
    };
    const formatStatus = (status) => {
        return status.replaceAll("_", " ");
    };

    const InvitationCard = ({ invitation, pending = false }) => (
        <div
            key={invitation.invitation_id}
            className="border border-slate-100 rounded-xl p-5"
        >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h4 className="font-bold text-ink text-lg">
                        {invitation.chama_name}
                    </h4>

                    <p className="text-sm text-muted mt-1">
                        Invited by{" "}
                        <span className="font-medium text-ink">
                            {invitation.invited_by_username}
                        </span>
                    </p>
                </div>

                <span
                    className={`text-xs font-semibold px-3 py-2 rounded-full w-fit capitalize ${getStatusStyle(invitation.status)}`}
                >
                    {formatStatus(invitation.status)}
                </span>
            </div>

            <div className="flex flex-wrap gap-5 mt-5 text-sm text-muted">
                <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>
                        Received: {formatDate(invitation.created_at)}
                    </span>
                </div>

                {pending && (
                    <div className="flex items-center gap-2">
                        <Clock size={16} />
                        <span>
                            Expires: {formatDate(invitation.expires_at)}
                        </span>
                    </div>
                )}
            </div>

            {pending && (
                <div className="flex flex-wrap justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
                    <button
                        onClick={() =>
                            handleResponse(
                                invitation.invitation_id,
                                "decline"
                            )
                        }
                        disabled={processingId === invitation.invitation_id}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-muted hover:bg-slate-50 disabled:opacity-50"
                    >
                        <X size={16} />
                        Decline
                    </button>

                    <button
                        onClick={() =>
                            handleResponse(
                                invitation.invitation_id,
                                "accept"
                            )
                        }
                        disabled={processingId === invitation.invitation_id}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        <Check size={16} />
                        {processingId === invitation.invitation_id
                            ? "Processing..."
                            : "Accept"}
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-ink">
                    Invitations
                </h2>

                <p className="text-sm text-muted mt-1">
                    View and manage invitations to join savings groups.
                </p>
            </div>

            {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                    {actionError}
                </div>
            )}

            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm">
                    {successMessage}
                </div>
            )}

            {loading ? (
                <p className="text-sm text-muted text-center py-10">
                    Loading invitations...
                </p>
            ) : error ? (
                <p className="text-sm text-red-600 text-center py-10">
                    {error}
                </p>
            ) : (
                <>
                    <section className="bg-white rounded-2xl border border-slate-100 p-6">
                        <div className="mb-5">
                            <h3 className="text-lg font-bold text-ink">
                                Pending Invitations
                            </h3>

                            <p className="text-sm text-muted mt-1">
                                Invitations waiting for your response.
                            </p>
                        </div>

                        {pendingInvitations.length === 0 ? (
                            <div className="min-h-40 flex flex-col items-center justify-center text-center">
                                <div className="bg-powder-light p-4 rounded-full mb-3">
                                    <Mail size={28} className="text-ink" />
                                </div>

                                <p className="font-semibold text-ink">
                                    No pending invitations
                                </p>

                                <p className="text-sm text-muted mt-1">
                                    New invitations will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingInvitations.map((invitation) => (
                                    <InvitationCard
                                        key={invitation.invitation_id}
                                        invitation={invitation}
                                        pending
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                    <section className="bg-white rounded-2xl border border-slate-100 p-6">
                        <div className="mb-5">
                            <h3 className="text-lg font-bold text-ink">
                                Invitation History
                            </h3>
                            <p className="text-sm text-muted mt-1">
                                Your previously processed invitations.
                            </p>
                        </div>
                        {invitationHistory.length === 0 ? (
                            <p className="text-sm text-muted text-center py-8">
                                No invitation history yet.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {invitationHistory.map((invitation) => (
                                    <InvitationCard
                                        key={invitation.invitation_id}
                                        invitation={invitation}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

export default Invitations;



