import { useEffect, useState } from "react";
import { getPendingPayments } from "../api/payments";

function usePendingPayments() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        let isMounted = true;
        const fetchPayments = async () => {
            try {
                const data = await getPendingPayments();
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
    }, []);
    return { payments, loading, error };
}

export default usePendingPayments;