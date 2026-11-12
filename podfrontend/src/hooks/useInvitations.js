
import { useEffect, useState } from "react";
import { getMyInvitations } from "../api/invitations";

function useInvitations(status = "awaiting_acceptance") {
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;
        const fetchInvitations = async () => {
            try {
                const data = await getMyInvitations(status);
                const invitationList = Array.isArray(data)
                    ? data
                    : data?.results || [];
                if (isMounted) {
                    setInvitations(invitationList);
                    setError("");
                }
            } catch (error) {
                if (isMounted) {
                    setError(
                        error.response?.data?.detail ||
                        "Unable to load invitations. Please try again."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        fetchInvitations();
        return () => {
            isMounted = false;
        };
    }, [status]);
    return {
        invitations,
        setInvitations,
        loading,
        error,
    };
}

export default useInvitations;
