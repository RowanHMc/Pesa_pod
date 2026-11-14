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

// Remove a member.
export const removeChamaMember = async (chamaId, membershipId) => {
    const response = await api.post(
        `chamas/${chamaId}/members/${membershipId}/remove/`
    );
    return response.data;
};

// Appoint a Treasurer.
export const appointTreasurer = async (chamaId, membershipId) => {
    const response = await api.post(
        `chamas/${chamaId}/appoint-treasurer/`,
        { membership_id: membershipId }
    );
    return response.data;
};

// Remove the current Treasurer.
export const removeTreasurer = async (chamaId) => {
    const response = await api.post(
        `chamas/${chamaId}/remove-treasurer/`
    );
    return response.data;
};

// Transfer Chairperson responsibilities.
export const transferChair = async (chamaId, membershipId) => {
    const response = await api.post(
        `chamas/${chamaId}/transfer-chair/`,
        { membership_id: membershipId }
    );
    return response.data;
};
