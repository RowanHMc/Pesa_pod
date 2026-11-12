
import api from "./axios";

export const getActiveCycles = async () => {
    const response = await api.get("cycles/", {
        params: { status: "active" },
    });

    return response.data;
};
