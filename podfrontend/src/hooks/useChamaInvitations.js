
import { useCallback, useEffect, useState } from "react";
import { getChamaInvitations } from "../api/invitations";

function useChamaInvitations(chamaId, status = "open") {
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchInvitations = useCallback(async () => {
        if (!chamaId) return;
        setLoading(true);
        setError("");
        try {
            const data = await getChamaInvitations(chamaId, status);
            const invitationList = Array.isArray(data)
                ? data
                : data?.results || [];

            setInvitations(invitationList);
        } catch (error) {
            setError(
                error.response?.data?.detail ||
                "Unable to load chama invitations. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, [chamaId, status]);

    useEffect(() => {
        fetchInvitations();
    }, [fetchInvitations]);
    return {
        invitations,
        setInvitations,
        loading,
        error,
        refetch: fetchInvitations,
    };
}

export default useChamaInvitations;
