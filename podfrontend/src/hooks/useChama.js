
import { useEffect, useState } from "react";
import { getChama } from "../api/chamas";

function useChama(chamaId) {
    const [chama, setChama] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        const fetchChama = async () => {
            setLoading(true);

            try {
                const data = await getChama(chamaId);

                if (isMounted) {
                    setChama(data);
                    setError("");
                }
            } catch (error) {
                if (isMounted) {
                    setError(
                        error.response?.data?.detail ||
                        "Unable to load chama details. Please try again."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (chamaId) {
            fetchChama();
        }

        return () => {
            isMounted = false;
        };
    }, [chamaId]);

    return { chama, loading, error };
}

export default useChama;
