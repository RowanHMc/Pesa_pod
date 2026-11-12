import api from "./axios";

export const getMyChamas = async () => {
    const response = await api.get("chamas/");
    return response.data;
};

export const createChama = async (chamaData) => {
    const response = await api.post("chamas/", chamaData);
    return response.data;
};