
import { useEffect, useState } from "react";
import { getMyChamas } from "../api/chamas";

function useChamas() {
    const [chamas, setChamas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;
        const fetchChamas = async () => {
            try {
                const data = await getMyChamas();
                const chamaList = Array.isArray(data)
                    ? data
                    : data?.results || [];
                if (isMounted) {
                    setChamas(chamaList);
                    setError("");
                }
            } catch (error) {
                if (isMounted) {
                    setError(
                        error.response?.data?.detail ||
                        "Unable to load your chamas. Please try again."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchChamas();
        return () => {
            isMounted = false;
        };
    }, []);

    return { chamas, setChamas, loading, error };
}
export default useChamas;
