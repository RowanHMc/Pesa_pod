
import api from "./axios";

export const getActiveCycles = async () => {
    const response = await api.get("transactions/cycles/", {
        params: { status: "active" },
    });

    return response.data;
};

export const getChamaRounds = async (cycleId) => {
    const response = await api.get(
        `transactions/cycles/${cycleId}/rounds/`
    );

    return response.data;
};