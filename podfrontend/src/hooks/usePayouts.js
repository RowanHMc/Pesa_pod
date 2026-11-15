
import { useCallback, useEffect, useState } from "react";
import {
    getChamaPayouts,
    recordPayout,
    confirmPayout,
    rejectPayout,
} from "../api/payouts";

function usePayouts(chamaId) {
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [responding, setResponding] = useState(false);
    const [error, setError] = useState("");

    const refreshPayouts = useCallback(async () => {
        if (!chamaId) {
            setPayouts([]);
            setLoading(false);
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

    const respondToPayout = async (
        action,
        payoutId,
        rejectionReason = ""
    ) => {
        setResponding(true);
        setError("");

        try {
            let result;

            if (action === "confirm") {
                result = await confirmPayout(payoutId);
            } else {
                result = await rejectPayout(
                    payoutId,
                    rejectionReason
                );
            }

            await refreshPayouts();

            return result;
        } catch (error) {
            setError(
                error.response?.data?.detail ||
                error.response?.data?.rejection_reason?.[0] ||
                "Unable to respond to this payout. Please try again."
            );

            throw error;
        } finally {
            setResponding(false);
        }
    };

    return {
        payouts,
        loading,
        submitting,
        responding,
        error,
        refreshPayouts,
        createPayout,
        respondToPayout,
    };
}

export default usePayouts;
