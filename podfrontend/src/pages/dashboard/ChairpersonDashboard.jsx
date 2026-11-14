import { useState } from "react";
import {Users,UserPlus,ShieldCheck,Crown, RefreshCw,UserMinus,CheckCircle, XCircle,Clock, Send,ArrowRightLeft,} from "lucide-react";
import useChama from "../../hooks/useChama";
import useChamaMembers from "../../hooks/useChamaMembers";
import useChamaInvitations from "../../hooks/useChamaInvitations";
import { removeChamaMember, appointTreasurer,removeTreasurer,transferChair,} from "../../api/chamas";
import { proposeInvitation,reviewInvitation, cancelInvitation,} from "../../api/invitations";
import useChamaCycles from "../../hooks/useChamaCycles";
import { createSavingsCycle, activateSavingsCycle, cancelSavingsCycle } from "../../api/cycles";

function ChairpersonDashboard({ chama, cycle }) {
    const chamaId = chama?.chama_id;
    const {cycles, loading: cyclesLoading, error: cyclesError, refetch: refetchCycles} = useChamaCycles(chamaId);
    const { chama: chamaDetails } = useChama(chamaId);
    const {members, loading: membersLoading, error: membersError, refetch: refreshMembers,} = useChamaMembers(chamaId, true);   
    const {invitations, loading: invitationsLoading, error: invitationsError, refetch: refreshInvitations,} = useChamaInvitations(chamaId, "open");
    const [username, setUsername] = useState("");
    const [selectedTreasurer, setSelectedTreasurer] = useState("");
    const [selectedChair, setSelectedChair] = useState("");
    const [showFormerMembers, setShowFormerMembers] = useState(false);
    const [busyAction, setBusyAction] = useState("");
    const [actionError, setActionError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [contributionAmount, setContributionAmount] = useState("");
    const [frequency, setFrequency] = useState("weekly");
    const [startDate, setStartDate] = useState("");
    const [cycleSubmitting, setCycleSubmitting] = useState(false);

    const currentCycle = cycles.find(
    (item) => item.status === "draft" || item.status === "active"
    );
    const displayChama = chamaDetails || chama;

    const activeMembers = members.filter(
        (member) => member.is_active
    );
    const formerMembers = members.filter(
        (member) => !member.is_active
    );
    const currentTreasurer = activeMembers.find(
        (member) => member.role === "treasurer"
    );
    const eligibleMembers = activeMembers.filter(
        (member) =>
            member.role !== "chairperson"
    );
    const transferCandidates = activeMembers.filter(
        (member) => member.role !== "chairperson"
    );
    const formatError = (error, fallback) => {
        const data = error.response?.data;

        if (typeof data?.detail === "string") {
            return data.detail;
        }
        if (typeof data === "object" && data !== null) {
            const firstError = Object.values(data).flat()[0];

            if (typeof firstError === "string") {
                return firstError;
            }
        }

        return fallback;
    };

    const runAction = async (actionName, action, successText) => {
        setBusyAction(actionName);
        setActionError("");
        setSuccessMessage("");
        try {
            await action();
            setSuccessMessage(successText);
            await refreshMembers();
            await refreshInvitations();
        } catch (error) {
            setActionError(
                formatError(error, "The action could not be completed.")
            );
        } finally {
            setBusyAction("");
        }
    };

    const handleInvite = async (event) => {
        event.preventDefault();

        if (!username.trim()) {
            setActionError("Enter the username of the person to invite.");
            return;
        }

        await runAction(
            "invite",
            async () => {
                await proposeInvitation(chamaId, username.trim());
                setUsername("");
            },
            "Invitation proposed successfully."
        );
    };

    const handleReviewInvitation = (invitationId, decision) => {
        runAction(
            `invitation-${invitationId}`,
            () => reviewInvitation(chamaId, invitationId, decision),
            `Invitation ${decision === "approve" ? "approved" : "rejected"} successfully.`
        );
    };

    const handleCancelInvitation = (invitationId) => {
        runAction(
            `cancel-${invitationId}`,
            () => cancelInvitation(chamaId, invitationId),
            "Invitation cancelled successfully."
        );
    };
    const handleRemoveMember = (membershipId) => {
        runAction(
            `remove-${membershipId}`,
            () => removeChamaMember(chamaId, membershipId),
            "Member removed successfully."
        );
    };

    const handleAppointTreasurer = async (event) => {
        event.preventDefault();

        if (!selectedTreasurer) {
            setActionError("Select a member to appoint as Treasurer.");
            return;
        }

        await runAction(
            "appoint-treasurer",
            async () => {
                await appointTreasurer(chamaId, selectedTreasurer);
                setSelectedTreasurer("");
            },
            "Treasurer appointed successfully."
        );
    };

    const handleRemoveTreasurer = () => {
        runAction(
            "remove-treasurer",
            () => removeTreasurer(chamaId),
            "Treasurer role removed successfully."
        );
    };

    const handleTransferChair = async (event) => {
        event.preventDefault();

        if (!selectedChair) {
            setActionError("Select a member to receive chairperson responsibilities.");
            return;
        }

        await runAction(
            "transfer-chair",
            async () => {
                await transferChair(chamaId, selectedChair);
                setSelectedChair("");
            },
            "Chairperson responsibilities transferred successfully."
        );
    };

    const getInvitationId = (invitation) =>
        invitation.id ?? invitation.invitation_id;

    const getInvitationUsername = (invitation) =>
        invitation.username ||
        invitation.proposed_username ||
        invitation.recipient_username ||
        invitation.invited_username ||
        "Invited member";

    const getMembershipId = (member) =>
        member.membership_id;
    
    const handleCreateCycle = async (event) => {
    event.preventDefault();

    if (!chamaId) return;

    setCycleSubmitting(true);
    setActionError("");
    setSuccessMessage("");

    try {
        await createSavingsCycle({
            chama: chamaId,
            contribution_amount: contributionAmount,
            frequency,
            start_date: startDate,
        });

        setContributionAmount("");
        setFrequency("weekly");
        setStartDate("");

        setSuccessMessage("Savings cycle draft created successfully.");
        await refetchCycles();
    } catch (error) {
        setActionError(
            error.response?.data?.detail ||
            "Unable to create the savings cycle. Please check the details."
        );
    } finally {
        setCycleSubmitting(false);
    }
};
    const handleActivateCycle = async () => {
        if (!currentCycle) return;

    const confirmed = window.confirm(
        "Are you sure you want to activate this savings cycle? This will generate the payout schedule and first round."
    );

    if (!confirmed) return;

    setCycleSubmitting(true);
    setActionError("");
    setSuccessMessage("");

    try {
        await activateSavingsCycle(currentCycle.id);

        setSuccessMessage("Savings cycle activated successfully.");
        await refetchCycles();
    } catch (error) {
        setActionError(
            error.response?.data?.detail ||
            "Unable to activate the savings cycle."
        );
    } finally {
        setCycleSubmitting(false);
    }
};

    const handleCancelCycle = async () => {
        if (!currentCycle) return;

    const confirmed = window.confirm(
        "Are you sure you want to cancel this savings cycle?"
    );

    if (!confirmed) return;

    setCycleSubmitting(true);
    setActionError("");
    setSuccessMessage("");

    try {
        await cancelSavingsCycle(currentCycle.id);

        setSuccessMessage("Savings cycle cancelled successfully.");
        await refetchCycles();
    } catch (error) {
        setActionError(
            error.response?.data?.detail ||
            "Unable to cancel the savings cycle."
        );
    } finally {
        setCycleSubmitting(false);
    }
};
    return (
        <section className="space-y-8">

            {/* Dashboard heading */}
            <div>
                <h2 className="text-xl font-bold text-ink">
                    Chairperson Management
                </h2>

                <p className="text-sm text-muted mt-1">
                    Manage members, invitations and leadership for your chama.
                </p>
            </div>

            {/* Feedback messages */}
            {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
                    {actionError}
                </div>
            )}

            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 text-sm">
                    {successMessage}
                </div>
            )}

            {/* Chama overview */}
            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                    <div className="bg-orange-light p-3 rounded-lg">
                        <Crown className="text-orange" size={23} />
                    </div>

                    <div>
                        <h3 className="font-bold text-lg text-ink">
                            {displayChama?.name}
                        </h3>

                        <p className="text-sm text-muted">
                            Chairperson overview
                        </p>
                    </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm text-muted">
                            Active Members
                        </p>

                        <p className="text-2xl font-bold text-ink mt-2">
                            {membersLoading ? "..." : activeMembers.length}
                        </p>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm text-muted">
                            Former Members
                        </p>

                        <p className="text-2xl font-bold text-ink mt-2">
                            {membersLoading ? "..." : formerMembers.length}
                        </p>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm text-muted">
                            Savings Cycle
                        </p>

                        <p className="text-lg font-bold text-ink mt-2 capitalize">
                            {cycle?.status || "No active cycle"}
                        </p>
                    </div>
                </div>
            </div>
            {/* Savings Cycle Management */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                            Savings Cycle Management
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Create and manage your chama's savings cycles.
                        </p>
                    </div>
                </div>

                {cyclesLoading ? (
                    <p className="text-sm text-gray-500">
                        Loading savings cycles...
                    </p>
                ) : cyclesError ? (
                    <p className="text-sm text-red-600">{cyclesError}</p>
                ) : currentCycle ? (
                    <div className="border border-gray-200 rounded-lg p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div>
                                <h3 className="font-semibold text-gray-800">
                                    Current Savings Cycle
                                </h3>
                                <span
                                    className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                                        currentCycle.status === "active"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-yellow-100 text-yellow-700"
                                    }`}
                                >
                                    {currentCycle.status.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Contribution per member
                                </p>
                                <p className="font-semibold text-gray-800">
                                    KSh {Number(currentCycle.contribution_amount).toLocaleString()}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">
                                    Frequency
                                </p>
                                <p className="font-semibold text-gray-800 capitalize">
                                    {currentCycle.frequency}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">
                                    Start date
                                </p>
                                <p className="font-semibold text-gray-800">
                                    {currentCycle.start_date}
                                </p>
                            </div>
                        </div>

                        {currentCycle.status === "draft" && (
                            <div className="flex flex-wrap gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={handleActivateCycle}
                                    disabled={cycleSubmitting}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    {cycleSubmitting ? "Processing..." : "Activate Cycle"}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCancelCycle}
                                    disabled={cycleSubmitting}
                                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                                >
                                    Cancel Draft
                                </button>
                            </div>
                        )}

                        {currentCycle.status === "active" && (
                            <div className="mt-5">
                                <p className="text-sm text-gray-600 mb-3">
                                    This cycle is active. Its payout schedule and rounds
                                    are now being managed.
                                </p>

                                <button
                                    type="button"
                                    onClick={handleCancelCycle}
                                    disabled={cycleSubmitting}
                                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                                >
                                    {cycleSubmitting ? "Processing..." : "Cancel Cycle"}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleCreateCycle} className="space-y-5">
                        <p className="text-sm text-gray-600">
                            There is no unfinished savings cycle for this chama.
                            Create a draft to begin setting up the next cycle.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contribution Amount (KSh)
                                </label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    required
                                    value={contributionAmount}
                                    onChange={(event) =>
                                        setContributionAmount(event.target.value)
                                    }
                                    placeholder="e.g. 1000"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contribution Frequency
                                </label>
                                <select
                                    value={frequency}
                                    onChange={(event) => setFrequency(event.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={startDate}
                                    onChange={(event) => setStartDate(event.target.value)}
                                    min={new Date().toLocaleDateString("en-CA")}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={cycleSubmitting}
                            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {cycleSubmitting ? "Creating..." : "Create Savings Cycle"}
                        </button>
                    </form>
                )}
            </section>
            {/* Member management */}
            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    <div>
                        <h3 className="font-bold text-lg text-ink">
                            Member Management
                        </h3>

                        <p className="text-sm text-muted mt-1">
                            View and manage chama membership.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowFormerMembers(!showFormerMembers)}
                        className="text-sm font-medium text-orange hover:underline"
                    >
                        {showFormerMembers ? "Show active members" : "Show former members"}
                    </button>
                </div>

                {membersLoading ? (
                    <p className="text-sm text-muted">
                        Loading members...
                    </p>
                ) : membersError ? (
                    <p className="text-sm text-red-600">
                        {membersError}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-muted">
                                    <th className="py-3 pr-4">Member</th>
                                    <th className="py-3 pr-4">Role</th>
                                    <th className="py-3 pr-4">Status</th>
                                    {!showFormerMembers && (
                                        <th className="py-3 text-right">Action</th>
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {(showFormerMembers ? formerMembers : activeMembers).map((member) => (
                                    <tr
                                        key={getMembershipId(member)}
                                        className="border-b border-slate-50"
                                    >
                                        <td className="py-4 pr-4 font-medium text-ink">
                                            {member.username}
                                            {member.is_me && (
                                                <span className="text-xs text-muted ml-2">
                                                    (You)
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-4 pr-4 capitalize text-slate-600">
                                            {member.role}
                                        </td>

                                        <td className="py-4 pr-4">
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                                member.is_active
                                                    ? "bg-green-50 text-green-700"
                                                    : "bg-slate-100 text-slate-500"
                                            }`}>
                                                {member.is_active ? "Active" : "Former"}
                                            </span>
                                        </td>

                                        {!showFormerMembers && (
                                            <td className="py-4 text-right">
                                                {member.role !== "chairperson" && (
                                                    <button
                                                        type="button"
                                                        disabled={!!busyAction}
                                                        onClick={() => handleRemoveMember(getMembershipId(member))}
                                                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                                        title="Remove member"
                                                    >
                                                        <UserMinus size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {(showFormerMembers ? formerMembers : activeMembers).length === 0 && (
                            <p className="text-sm text-muted py-6 text-center">
                                No members to display.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Invitation management */}
            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-6">
                <div>
                    <h3 className="font-bold text-lg text-ink">
                        Invitation Management
                    </h3>

                    <p className="text-sm text-muted mt-1">
                        Invite people and review proposed chama invitations.
                    </p>
                </div>

                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="Enter member's username"
                        className="flex-1 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
                    />

                    <button
                        type="submit"
                        disabled={!!busyAction}
                        className="flex items-center justify-center gap-2 bg-orange text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-orange/90 disabled:opacity-50"
                    >
                        <Send size={17} />
                        Send Invitation
                    </button>
                </form>

                <div>
                    <h4 className="font-semibold text-ink mb-3">
                        Open Invitations
                    </h4>

                    {invitationsLoading ? (
                        <p className="text-sm text-muted">
                            Loading invitations...
                        </p>
                    ) : invitationsError ? (
                        <p className="text-sm text-red-600">
                            {invitationsError}
                        </p>
                    ) : invitations.length === 0 ? (
                        <p className="text-sm text-muted bg-slate-50 rounded-lg p-4">
                            There are no open invitations.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {invitations.map((invitation) => {
                                const invitationId = getInvitationId(invitation);

                                return (
                                    <div
                                        key={invitationId}
                                        className="border border-slate-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                                    >
                                        <div>
                                            <p className="font-medium text-ink">
                                                {getInvitationUsername(invitation)}
                                            </p>

                                            <p className="text-xs text-muted mt-1 capitalize">
                                                {invitation.status || "Open"}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                disabled={!!busyAction}
                                                onClick={() => handleReviewInvitation(invitationId, "approve")}
                                                className="flex items-center gap-1 text-xs font-semibold bg-green-50 text-green-700 px-3 py-2 rounded-lg disabled:opacity-50"
                                            >
                                                <CheckCircle size={15} />
                                                Approve
                                            </button>

                                            <button
                                                type="button"
                                                disabled={!!busyAction}
                                                onClick={() => handleReviewInvitation(invitationId, "reject")}
                                                className="flex items-center gap-1 text-xs font-semibold bg-red-50 text-red-700 px-3 py-2 rounded-lg disabled:opacity-50"
                                            >
                                                <XCircle size={15} />
                                                Reject
                                            </button>

                                            <button
                                                type="button"
                                                disabled={!!busyAction}
                                                onClick={() => handleCancelInvitation(invitationId)}
                                                className="text-xs font-semibold text-slate-600 border border-slate-200 px-3 py-2 rounded-lg disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Treasurer management */}
            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-5">
                <div>
                    <h3 className="font-bold text-lg text-ink">
                        Treasurer Management
                    </h3>

                    <p className="text-sm text-muted mt-1">
                        Appoint or remove the chama Treasurer.
                    </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-3">
                    <ShieldCheck className="text-orange" size={23} />

                    <div>
                        <p className="text-xs text-muted">
                            Current Treasurer
                        </p>

                        <p className="font-semibold text-ink mt-1">
                            {currentTreasurer?.username || "No Treasurer appointed"}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleAppointTreasurer} className="space-y-3">
                    <label className="block text-sm font-medium text-ink">
                        Appoint a Treasurer
                    </label>

                    <select
                        value={selectedTreasurer}
                        onChange={(event) => setSelectedTreasurer(event.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm bg-white"
                    >
                        <option value="">Select an active member</option>

                        {eligibleMembers.map((member) => (
                            <option
                                key={getMembershipId(member)}
                                value={getMembershipId(member)}
                            >
                                {member.username}
                                {member.role === "treasurer" ? " (Current Treasurer)" : ""}
                            </option>
                        ))}
                    </select>

                    <button
                        type="submit"
                        disabled={!!busyAction || !selectedTreasurer}
                        className="bg-orange text-white px-5 py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                        Appoint Treasurer
                    </button>
                </form>

                {currentTreasurer && (
                    <button
                        type="button"
                        disabled={!!busyAction}
                        onClick={handleRemoveTreasurer}
                        className="text-sm text-red-600 font-semibold hover:underline disabled:opacity-50"
                    >
                        Remove Current Treasurer
                    </button>
                )}
            </div>

            {/* Leadership transfer */}
            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-5">
                <div>
                    <h3 className="font-bold text-lg text-ink">
                        Leadership Management
                    </h3>

                    <p className="text-sm text-muted mt-1">
                        Transfer chairperson responsibilities to another active member.
                    </p>
                </div>

                <form onSubmit={handleTransferChair} className="space-y-3">
                    <label className="block text-sm font-medium text-ink">
                        Select the new Chairperson
                    </label>

                    <select
                        value={selectedChair}
                        onChange={(event) => setSelectedChair(event.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm bg-white"
                    >
                        <option value="">Select an active member</option>

                        {transferCandidates.map((member) => (
                            <option
                                key={getMembershipId(member)}
                                value={getMembershipId(member)}
                            >
                                {member.username}
                            </option>
                        ))}
                    </select>

                    <button
                        type="submit"
                        disabled={!!busyAction || !selectedChair}
                        className="flex items-center gap-2 bg-slate-800 text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
                    >
                        <ArrowRightLeft size={17} />
                        Transfer Chairperson Role
                    </button>
                </form>

                <p className="text-xs text-muted">
                    Transferring leadership will change your role in this chama.
                    Make sure the selected member is ready to take responsibility.
                </p>
            </div>

        </section>
    );
}

export default ChairpersonDashboard;
