import api from "./axios";

export const getMyContributions = async () => {
    const response = await api.get("transactions/contributions/");
    return response.data;
};