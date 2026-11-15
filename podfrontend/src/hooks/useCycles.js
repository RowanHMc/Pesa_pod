
import { useCallback, useEffect, useState } from "react";
import { getActiveCycles } from "../api/cycles";

function useCycles() {
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchCycles = useCallback(async () => {
        setLoading(true);

        try {
            const data = await getActiveCycles();

            const cycleList = Array.isArray(data)
                ? data
                : data?.results || [];

            setCycles(cycleList);
            setError("");
        } catch (error) {
            setError(
                error.response?.data?.detail ||
                "Unable to load active cycles. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, []);

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
