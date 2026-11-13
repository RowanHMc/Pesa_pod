
import { useEffect, useState } from "react";
import { getPendingPayments } from "../api/payments";

function usePendingPayments(chamaId) {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    const refreshPayments = () => {
        setRefreshKey((previous) => previous + 1);
    };

    useEffect(() => {
        let isMounted = true;

        const fetchPayments = async () => {
            if (!chamaId) {
                setPayments([]);
                setLoading(false);
                setError("");
                return;
            }

            setLoading(true);

            try {
                const data = await getPendingPayments(chamaId);

                const paymentList = Array.isArray(data)
                    ? data
                    : data?.results || [];

                if (isMounted) {
                    setPayments(paymentList);
                    setError("");
                }
            } catch (error) {
                if (isMounted) {
                    setError(
                        error.response?.data?.detail ||
                        "Unable to load pending payments. Please try again."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchPayments();

        return () => {
            isMounted = false;
        };
    }, [chamaId, refreshKey]);

    return {
        payments,
        loading,
        error,
        refreshPayments,
    };
}

export default usePendingPayments;
