import api from "./axios";

// Request a password reset code
export const requestPasswordReset = async (email) => {
    const response = await api.post("accounts/auth/password-reset/", {
        email,
    });

    return response.data;
};

// Confirm the code and set a new password
export const confirmPasswordReset = async ({
    email,
    code,
    newPassword,
    confirmPassword,
}) => {
    const response = await api.post("accounts/auth/password-reset/confirm/", {
        email,
        code,
        new_password: newPassword,
        new_password2: confirmPassword,
    });

    return response.data;
};