import { useEffect, useState } from "react";
import { getActiveCycles } from "../api/cycles";

function useCycles() {
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;
        const fetchCycles = async () => {
            try {
                const data = await getActiveCycles();
                const cycleList = Array.isArray(data)
                    ? data
                    : data?.results || [];

                if (isMounted) {
                    setCycles(cycleList);
                    setError("");
                }
            } catch (error) {
                if (isMounted) {
                    setError(
                        error.response?.data?.detail ||
                        "Unable to load active cycles. Please try again."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        fetchCycles();
        return () => {
            isMounted = false;
        };
    }, []);
    return { cycles, loading, error };
}
export default useCycles;
