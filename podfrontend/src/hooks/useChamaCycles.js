
import { useCallback, useEffect, useState } from "react";
import { getChamaCycles } from "../api/cycles";

function useChamaCycles(chamaId) {
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchCycles = useCallback(async () => {
        if (!chamaId) {
            setCycles([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data = await getChamaCycles(chamaId);

            const cycleList = Array.isArray(data)
                ? data
                : data?.results || [];

            setCycles(cycleList);
        } catch (error) {
            setError(
                error.response?.data?.detail ||
                "Unable to load savings cycles. Please try again."
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

export default useChamaCycles;
