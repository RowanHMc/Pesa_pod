import api from "./axios";

export const getMyContributions = async () => {
    const response = await api.get("transactions/contributions/");
    return response.data;
};
export const getRoundContributions = async (roundId) => {
    const response = await api.get(
        `transactions/rounds/${roundId}/contributions/`
    );

    return response.data;
};