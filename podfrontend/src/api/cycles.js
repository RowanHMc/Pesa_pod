
import api from "./axios";

// Fetch all active savings cycles.
export const getActiveCycles = async () => {
    const response = await api.get("transactions/cycles/", {
        params: { status: "active" },
    });

    return response.data;
};

// Fetch rounds belonging to a specific cycle.
export const getChamaRounds = async (cycleId) => {
    const response = await api.get(
        `transactions/cycles/${cycleId}/rounds/`
    );

    return response.data;
};

// Fetch cycles belonging to a specific chama.
export const getChamaCycles = async (chamaId, status) => {
    const response = await api.get("transactions/cycles/", {
        params: {
            chama: chamaId,
            ...(status && { status }),
        },
    });

    return response.data;
};

// Create a draft savings cycle.
export const createSavingsCycle = async (cycleData) => {
    const response = await api.post(
        "transactions/cycles/",
        cycleData
    );

    return response.data;
};

// Update a draft savings cycle.
export const updateSavingsCycle = async (cycleId, cycleData) => {
    const response = await api.patch(
        `transactions/cycles/${cycleId}/`,
        cycleData
    );

    return response.data;
};

// Activate a savings cycle.
export const activateSavingsCycle = async (cycleId) => {
    const response = await api.post(
        `transactions/cycles/${cycleId}/activate/`
    );

    return response.data;
};

// Cancel a savings cycle.
export const cancelSavingsCycle = async (cycleId, reason = "") => {
    const response = await api.post(
        `transactions/cycles/${cycleId}/cancel/`,
        { reason }
    );

    return response.data;
};
 // Fetch detailed information about a savings cycle.
export const getSavingsCycle = async (cycleId) => {
    const response = await api.get(
        `transactions/cycles/${cycleId}/`
    );
    return response.data;
};