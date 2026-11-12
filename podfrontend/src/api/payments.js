import api from "./axios";

export const getPendingPayments = async () => {
    const response = await api.get("transactions/payments/", {
        params: { status: "pending" },
    });

    return response.data;
};

export const getMyPayments = async () => {
    const response = await api.get("transactions/payments/");
    return response.data;
};