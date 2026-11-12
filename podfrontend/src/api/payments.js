import api from "./axios";

export const getPendingPayments = async () => {
    const response = await api.get("payments/", {
        params: { status: "pending" },
    });

    return response.data;
};