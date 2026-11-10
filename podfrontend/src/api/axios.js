import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
});

// access token attach to auth requests
api.interceptors.request.use((config) => {
    const accessToken = localStorage.getItem("access_token");

    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
});
//refresh expred token

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (
            error.response?.status !== 401 || 
            !originalRequest ||
            originalRequest._retry ||
            originalRequest.url?.includes("/auth/")
        ) {
            return Promise.reject(error);
        }

        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
            return Promise.reject(error);
        }
        originalRequest._retry = true;

        try{
            if (!refreshPromise) {
                refreshPromise = axios
                    .post(`${import.meta.env.VITE_API_BASE_URL}accounts/auth/token/refresh/`, 
                        {refresh: refreshToken}
                    )
                    .then((response) => {
                        localStorage.setItem(
                            "access_token",
                            response.data.access
                        );
                        if (response.data.refresh){
                            localStorage.setItem(
                                "refresh_token",
                                response.data.refresh 
                            );
                        }
                        return response.data.access;
                    })
                    .finally(() => {
                        refreshPromise = null;
                    });
            }
            const newAccessToken = await refreshPromise;
            originalRequest.headers.Authorization =`Bearer ${newAccessToken}`;
            return api(originalRequest);
        } catch (refresherror) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");

            window.dispatchEvent(new Event("auth:logout"));

            return Promise.reject(refresherror);
        }
    }
);

export default api;


