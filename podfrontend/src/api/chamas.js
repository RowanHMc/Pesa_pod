import api from "./axios";

export const getMyChamas = async () => {
    const response = await api.get("chamas/");
    return response.data;
};
