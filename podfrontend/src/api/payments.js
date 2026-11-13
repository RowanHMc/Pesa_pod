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