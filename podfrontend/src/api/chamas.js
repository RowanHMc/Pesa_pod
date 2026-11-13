import api from "./axios";

export const getMyChamas = async () => {
    const response = await api.get("chamas/");
    return response.data;
};

export const getChama = async (chamaId) => {
    const response = await api.get(`chamas/${chamaId}/`);
    return response.data;
};

export const createChama = async (chamaData) => {
    const response = await api.post("chamas/", chamaData);
    return response.data;
};

export const getChamaMembers = async (chamaId, includeLeft = false) => {
    const response = await api.get(`chamas/${chamaId}/members/`, {
        params: includeLeft ? { include_left: "true" } : {},
    });
    return response.data;
};
