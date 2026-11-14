
import { useCallback, useEffect, useState } from "react";
import {
    getChamaPayouts,
    recordPayout,
} from "../api/payouts";

function usePayouts(chamaId) {
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const refreshPayouts = useCallback(async () => {
        if (!chamaId) {
            setPayouts([]);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data = await getChamaPayouts(chamaId);

            const payoutList = Array.isArray(data)
                ? data
                : data?.results || [];

            setPayouts(payoutList);
        } catch (error) {
            setError(
                error.response?.data?.detail ||
                "Unable to load payouts. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, [chamaId]);

    useEffect(() => {
        refreshPayouts();
    }, [refreshPayouts]);

    const createPayout = async (roundId, method, reference) => {
        setSubmitting(true);
        setError("");

        try {
            const result = await recordPayout(
                roundId,
                method,
                reference
            );

            await refreshPayouts();

            return result;
        } catch (error) {
            setError(
                error.response?.data?.detail ||
                error.response?.data?.round?.[0] ||
                "Unable to record payout. Please try again."
            );

            throw error;
        } finally {
            setSubmitting(false);
        }
    };

    return {
        payouts,
        loading,
        submitting,
        error,
        refreshPayouts,
        createPayout,
    };
}

export default usePayouts;
