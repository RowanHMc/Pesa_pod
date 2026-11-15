
import api from "./axios";

// Fetch payouts belonging to a specific chama.
export const getChamaPayouts = async (chamaId) => {
    const response = await api.get("transactions/payouts/", {
        params: {
            chama: chamaId,
        },
    });

    return response.data;
};

// Record a payout for a savings round.
export const recordPayout = async (roundId, method, reference) => {
    const response = await api.post("transactions/payouts/", {
        round: roundId,
        method,
        reference,
    });

    return response.data;
};
// Recipient confirms receipt of a payout.
export const confirmPayout = async (payoutId) => {
    const response = await api.post(
        `transactions/payouts/${payoutId}/confirm/`
    );

    return response.data;
};

// Recipient rejects a payout.
export const rejectPayout = async (payoutId, rejectionReason) => {
    const response = await api.post(
        `transactions/payouts/${payoutId}/reject/`,
        {
            rejection_reason: rejectionReason,
        }
    );

    return response.data;
};