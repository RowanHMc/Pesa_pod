
import { useEffect, useState } from "react";
import { getMyContributions } from "../api/contributions";

function useContributions() {
    const [contributions, setContributions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        const fetchContributions = async () => {
            try {
                const data = await getMyContributions();

                const contributionList = Array.isArray(data)
                    ? data
                    : data?.results || [];

                if (isMounted) {
                    setContributions(contributionList);
                    setError("");
                }
            } catch (error) {
                if (isMounted) {
                    setError(
                        error.response?.data?.detail ||
                        "Unable to load your contributions. Please try again."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchContributions();

        return () => {
            isMounted = false;
        };
    }, []);

    return { contributions, loading, error };
}

export default useContributions;
