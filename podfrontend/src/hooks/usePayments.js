
import { useCallback, useEffect, useState } from "react";
import {
    getMyPayments,
    reportPayment,
} from "../api/payments";

function usePayments() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await getMyPayments();

            const paymentList = Array.isArray(data)
                ? data
                : data?.results || [];

            setPayments(paymentList);
        } catch (error) {
            setError(
                error.response?.data?.detail ||
                "Unable to load your payment reports. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const submitPaymentReport = async (
        contributionId,
        amount,
        method,
        reference
    ) => {
        setSubmitting(true);
        setError("");

        try {
            const result = await reportPayment(
                contributionId,
                amount,
                method,
                reference
            );

            await fetchPayments();

            return result;
        } catch (error) {
            setError(
                error.response?.data?.detail ||
                error.response?.data?.reference?.[0] ||
                error.response?.data?.contribution?.[0] ||
                "Unable to report your payment. Please try again."
            );

            throw error;
        } finally {
            setSubmitting(false);
        }
    };

    return {
        payments,
        loading,
        submitting,
        error,
        refetch: fetchPayments,
        submitPaymentReport,
    };
}

export default usePayments;
