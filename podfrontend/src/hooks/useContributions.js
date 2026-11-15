
import { useCallback, useEffect, useState } from "react";
import { getMyContributions } from "../api/contributions";

function useContributions() {
    const [contributions, setContributions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchContributions = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await getMyContributions();

            const contributionList = Array.isArray(data)
                ? data
                : data?.results || [];

            setContributions(contributionList);
        } catch (error) {
            setError(
                error.response?.data?.detail ||
                "Unable to load your contributions. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchContributions();
    }, [fetchContributions]);

    return {
        contributions,
        loading,
        error,
        refetch: fetchContributions,
    };
}

export default useContributions;
