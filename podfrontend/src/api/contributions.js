import api from "./axios";

export const getMyContributions = async (cycleId) => {
    const response = await api.get("transactions/contributions/", {
        params: cycleId ? { cycle: cycleId } : {},
    });

    return response.data;
};

export const getRoundContributions = async (roundId) => {
    const response = await api.get(
        `transactions/rounds/${roundId}/contributions/`
    );

    return response.data;
};
