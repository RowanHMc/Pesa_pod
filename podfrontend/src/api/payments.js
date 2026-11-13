import api from "./axios";

export const getPendingPayments = async (chamaId) => {
    const response = await api.get("transactions/payments/", {
        params: {
            status: "pending",
            chama: chamaId,
        },
    });

    return response.data;
};

export const getMyPayments = async () => {
    const response = await api.get("transactions/payments/");
    return response.data;
};

export const confirmPayment = async (paymentId) => {
    const response = await api.post(
        `transactions/payments/${paymentId}/confirm/`
    );

    return response.data;
};

export const rejectPayment = async (paymentId, rejectionReason) => {
    const response = await api.post(
        `transactions/payments/${paymentId}/reject/`,
        {
            rejection_reason: rejectionReason,
        }
    );

    return response.data;
};
