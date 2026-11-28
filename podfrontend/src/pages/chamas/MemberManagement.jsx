import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {appointTreasurer, removeChamaMember, removeTreasurer, transferChair,} from "../../api/chamas";
import useChama from "../../hooks/useChama";
import useChamaMembers from "../../hooks/useChamaMembers";

export default function MemberManagement() {
    const { chamaId } = useParams();
    const navigate = useNavigate();
    const { chama, loading, error } = useChama(chamaId);
    const isChairperson = chama?.my_role === "chairperson";
    const { members, loading: membersLoading, error: membersError, refetch } =
        useChamaMembers(isChairperson ? chamaId : null);

    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState("");
    const [actionError, setActionError] = useState("");
    const chamaPath = `/dashboard/chamas/${chamaId}`;

    const manageableMembers = members.filter(
        (member) => member.is_active && member.role !== "chairperson",
    );

    async function updateMember(member, action) {
        if (!isChairperson || saving) return;

        const prompts = {
            remove: `Remove ${member.username} from this chama?`,
            appoint: `Appoint ${member.username} as treasurer? This replaces the current treasurer if there is one.`,
            removeTreasurer: `Remove ${member.username} from the treasurer role? They will remain a member.`,
            transfer: `Transfer the chairperson role to ${member.username}? You will become a regular member.`,
        };

        if (!window.confirm(prompts[action])) return;

        setSaving(true);
        setNotice("");
        setActionError("");

        try {
            const membershipId = member.membership_id;

            if (action === "transfer") {
                await transferChair(chamaId, membershipId);
                navigate(chamaPath, { replace: true });
                return;
            }

            if (action === "remove") {
                await removeChamaMember(chamaId, membershipId);
            } else if (action === "appoint") {
                await appointTreasurer(chamaId, membershipId);
            } else {
                await removeTreasurer(chamaId);
            }

            setNotice(`Updated ${member.username}.`);
            await refetch();
        } catch (error) {
            const data = error.response?.data;
            setActionError(
                data?.detail ||
                    data?.membership_id?.[0] ||
                    "Could not update this member. Please try again.",
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mx-auto max-w-4xl space-y-5">
            <Link to={chamaPath} className="text-sm text-muted hover:text-ink">
                ← Back to chama
            </Link>
            <h1 className="text-2xl font-bold text-ink">Member Management</h1>

            {loading ? (
                <p className="text-sm text-muted">Loading chama…</p>
            ) : error ? (
                <p role="alert" className="text-sm text-red-700">{error}</p>
            ) : !isChairperson ? (
                <p className="text-sm text-muted">
                    Only this chama’s chairperson can manage its members.
                </p>
            ) : (
                <>
                    {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
                    {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}

                    {membersLoading ? (
                        <p className="text-sm text-muted">Loading members…</p>
                    ) : membersError ? (
                        <p role="alert" className="text-sm text-red-700">{membersError}</p>
                    ) : manageableMembers.length === 0 ? (
                        <p className="text-sm text-muted">No other active members to manage.</p>
                    ) : (
                        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
                            {manageableMembers.map((member) => {
                                const treasurer = member.role === "treasurer";
                                const actions = [
                                    treasurer
                                        ? ["removeTreasurer", "Remove treasurer role"]
                                        : ["appoint", "Appoint as treasurer"],
                                    ["transfer", "Transfer chairperson role"],
                                    ["remove", "Remove member"],
                                ];

                                return (
                                    <li key={member.membership_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                        <div>
                                            <p className="font-semibold text-ink">{member.username}</p>
                                            <p className="text-sm capitalize text-muted">{member.role}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {actions.map(([action, label]) => (
                                                <button
                                                    key={action}
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={() => updateMember(member, action)}
                                                    className={`rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-powder-light disabled:opacity-50 ${
                                                        action === "remove" ? "text-red-700" : "text-ink"
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}