
import api from "./axios";

// Fetch invitations addressed to the logged-in user.
export const getMyInvitations = async (status = "awaiting_acceptance") => {
    const response = await api.get("invitations/", {
        params: { status },
    });
    return response.data;
};

// Respond to an invitation by accepting or declining it.
export const respondToInvitation = async (invitationId, decision) => {
    const response = await api.post(
        `invitations/${invitationId}/respond/`,
        { decision }
    );
    return response.data;
};

// Fetch invitations belonging to a particular chama.
export const getChamaInvitations = async (chamaId, status = "open") => {
    const response = await api.get(
        `chamas/${chamaId}/invitations/`,
        {
            params: { status },
        }
    );
    return response.data;
};

// Propose a new invitation using the recipient's username.
export const proposeInvitation = async (chamaId, username) => {
    const response = await api.post(
        `chamas/${chamaId}/invitations/`,
        { username }
    );
    return response.data;
};

// Approve or reject a proposed invitation.
export const reviewInvitation = async (chamaId, invitationId, decision) => {
    const response = await api.post(
        `chamas/${chamaId}/invitations/${invitationId}/review/`,
        { decision }
    );
    return response.data;
};

// Cancel an open invitation.
export const cancelInvitation = async (chamaId, invitationId) => {
    const response = await api.post(
        `chamas/${chamaId}/invitations/${invitationId}/cancel/`
    );
    return response.data;
};
