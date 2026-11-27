import { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import {cancelInvitation, proposeInvitation, reviewInvitation,} from "../../api/invitations";
import useChama from "../../hooks/useChama";
import useChamaInvitations from "../../hooks/useChamaInvitations";

const openStatuses = ["pending_approval", "awaiting_acceptance"];

export default function ChamaInvitations() {
    const { chamaId } = useParams();
    const { user } = useOutletContext();
    const { chama } = useChama(chamaId);
    const isChairperson = chama?.my_role === "chairperson";
    const [showHistory, setShowHistory] = useState(false);
    const [username, setUsername] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [success, setSuccess] = useState("");
    const [actionError, setActionError] = useState("");

    const { invitations, loading, error, refetch } = useChamaInvitations(
        chamaId,
        showHistory ? "all" : "open",
    );

    const displayedInvitations = invitations.filter(({ status }) =>
        showHistory ? !openStatuses.includes(status) : openStatuses.includes(status),
    );

    async function handleSubmit(event) {
        event.preventDefault();
        const proposedUsername = username.trim();
        if (!proposedUsername) return;
        setSubmitting(true);
        setSuccess("");
        setActionError("");

        try {
            await proposeInvitation(chamaId, proposedUsername);
            setUsername("");
            setSuccess("Invitation proposal submitted successfully.");
            await refetch();
        } catch (error) {
            const data = error.response?.data;
            setActionError(
                data?.detail ||
                    data?.username?.[0] ||
                    "Unable to propose invitation. Please try again.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleAction(invitationId, action) {
        setProcessingId(invitationId);
        setSuccess("");
        setActionError("");

        try {
            if (action === "cancel") {
                await cancelInvitation(chamaId, invitationId);
                setSuccess("Invitation cancelled successfully.");
            } else {
                await reviewInvitation(chamaId, invitationId, action);
                setSuccess(
                    action === "approve"
                        ? "Invitation approved successfully."
                        : "Invitation rejected successfully.",
                );
            }

            await refetch();
        } catch (error) {
            setActionError(
                error.response?.data?.detail ||
                    "Unable to update this invitation. Please try again.",
            );
        } finally {
            setProcessingId(null);
        }
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <Link to={`/dashboard/chamas/${chamaId}`}               
                className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink">            
                <ArrowLeft size={17} aria-hidden="true" />
                Back to chama
            </Link>

            <h1 className="text-2xl font-bold text-ink">Invitations</h1>

            <section className="rounded-xl border border-slate-100 bg-white p-6">
                <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-lg bg-powder-light p-3">
                        <UserPlus size={21} className="text-ink" aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="font-bold text-ink">Propose an Invitation</h2>
                        <p className="text-sm text-muted">
                            Enter the username of the person you want to invite.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                    <input
                        type="text"
                        aria-label="Username to invite"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="Enter username"
                        required
                        className="flex-1 rounded-lg border border-slate-200 px-4 py-3 text-sm focus:border-orange focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={submitting || !username.trim()}
                        className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50">                    
                        {submitting ? "Submitting…" : "Propose Invitation"}
                    </button>
                </form>
            </section>

            {success && <p role="status" className="text-sm text-green-700">{success}</p>}
            {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}

            <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-ink">
                        {showHistory
                            ? "Invitation History"
                            : isChairperson
                                ? "Manage Invitations"
                                : "Your Open Invitations"}
                    </h2>

                    <button
                        type="button"
                        onClick={() => setShowHistory((current) => !current)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-powder-light"
                    >
                        {showHistory ? "View open invitations" : "View history"}
                    </button>
                </div>

                {loading ? (
                    <p className="py-4 text-sm text-muted">Loading invitations…</p>
                ) : error ? (
                    <p role="alert" className="py-4 text-sm text-red-700">{error}</p>
                ) : displayedInvitations.length === 0 ? (
                    <p className="rounded-xl border border-slate-100 bg-white p-6 text-sm text-muted">
                        {showHistory ? "No invitation history yet." : "No open invitations."}
                    </p>
                ) : (
                    <ul className="space-y-4">
                        {displayedInvitations.map((invitation) => {
                            const id = invitation.invitation_id;
                            const isPending = invitation.status === "pending_approval";
                            const canReview = isChairperson && isPending;
                            const canCancel = isChairperson
                                ? openStatuses.includes(invitation.status)
                                : isPending && invitation.invited_by_id === user?.id;

                            return (
                                <li key={id} className="rounded-xl border border-slate-100 bg-white p-5">
                                    <h3 className="font-semibold text-ink">
                                        @{invitation.invited_user_username}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted">
                                        Proposed by: {invitation.invited_by_username}
                                    </p>
                                    <p className="mt-1 text-sm text-muted">
                                        Status: {invitation.status.replaceAll("_", " ")}
                                    </p>

                                    {(canReview || canCancel) && (
                                        <div className="mt-4 flex flex-wrap gap-3">
                                            {canReview && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAction(id, "approve")}
                                                        disabled={processingId !== null}
                                                        className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAction(id, "reject")}
                                                        disabled={processingId !== null}
                                                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}

                                            {canCancel && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAction(id, "cancel")}
                                                    disabled={processingId !== null}
                                                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-muted hover:bg-powder-light disabled:opacity-50"
                                                >
                                                    Cancel Invitation
                                                </button>
                                            )}

                                            {processingId === id && (
                                                <span role="status" className="self-center text-sm text-muted">
                                                    Processing…
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}