
import { useCallback, useEffect, useState } from "react";
import { getActiveCycles } from "../api/cycles";

function useCycles(chamaId=null) {
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchCycles = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getActiveCycles(chamaId);
            const cycleList = Array.isArray(data)
                ? data
                : data?.results || [];

            setCycles(cycleList);
        } catch (error) {
            setError(
                error.response?.data?.detail ||
                "Unable to load active cycles. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, [chamaId]);

    useEffect(() => {
        fetchCycles();
    }, [fetchCycles]);

    return {
        cycles,
        loading,
        error,
        refetch: fetchCycles,
    };
}

export default useCycles;
