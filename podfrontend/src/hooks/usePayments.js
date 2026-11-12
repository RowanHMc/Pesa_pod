
import { useEffect, useState } from "react";
import { getMyPayments } from "../api/payments";

function usePayments() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        const fetchPayments = async () => {
            try {
                const data = await getMyPayments();

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
                        "Unable to load your payment reports. Please try again."
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

export default usePayments;
