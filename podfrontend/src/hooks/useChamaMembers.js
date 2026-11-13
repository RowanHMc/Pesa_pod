
import { useCallback, useEffect, useState } from "react";
import { getChamaMembers } from "../api/chamas";

function useChamaMembers(chamaId, includeLeft = false) {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchMembers = useCallback(async () => {
        if (!chamaId) return;

        setLoading(true);
        setError("");

        try {
            const data = await getChamaMembers(chamaId, includeLeft);

            const memberList = Array.isArray(data)
                ? data
                : data?.results || [];

            setMembers(memberList);
        } catch (error) {
            setError(
                error.response?.data?.detail ||
                "Unable to load chama members. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, [chamaId, includeLeft]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    return {
        members,
        setMembers,
        loading,
        error,
        refetch: fetchMembers,
    };
}
export default useChamaMembers;
