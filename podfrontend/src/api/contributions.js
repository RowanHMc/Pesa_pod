import api from "./axios";

export const getMyContributions = async () => {
    const response = await api.get("contributions/");
    return response.data;
};