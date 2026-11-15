import { useCallback, useEffect, useState } from "react";
import { getSavingsCycle } from "../api/cycles";

function useSavingsCycle(cycleId) {
    const [cycleDetails, setCycleDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchCycleDetails = useCallback(async () => {
        if (!cycleId) {
            setCycleDetails(null);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data = await getSavingsCycle(cycleId);
            setCycleDetails(data);
        } catch (error) {
            setError(
                error.response?.data?.detail ||
                "Unable to load cycle details."
            );
        } finally {
            setLoading(false);
        }
    }, [cycleId]);

    useEffect(() => {
        fetchCycleDetails();
    }, [fetchCycleDetails]);

    return {
        cycleDetails,
        loading,
        error,
        refetch: fetchCycleDetails,
    };
}

export default useSavingsCycle;