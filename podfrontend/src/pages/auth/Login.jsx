import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Wallet } from "lucide-react";

import { useAuth } from "../../context/AuthContext";

function Login() {
    const {login} =useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: "",
        "password": "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        const {name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }))
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            await login(formData.username, formData.password);
            navigate("/dashboard");
        } catch (error) {
            const response = error.response;

            if (
                response?.status === 403 &&
                response.data?.code === "email_not_verified"
            ) {
                setError(
                    "Please Verify Email Before Logging in"
                );
            } else {
                setError(
                    response?.data?.detail || 
                    "unable to log in. check your details"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-powder-light flex items-center justify-center px-4 py-10">

            <div className="w-full max-w-md">

                {/* Brand */}
                <div className="text-center mb-8">

                    <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="bg-powder p-3 rounded-xl">
                            <Wallet size={28} className="text-ink" />
                        </div>

                        <h1 className="text-3xl font-bold text-ink">
                            Pesa <span className="text-orange">Pod</span>
                        </h1>
                    </div>

                    <p className="text-muted text-sm">
                        Save together. Grow together.
                    </p>

                </div>

                {/* Login Card */}
                <div className="bg-white border border-powder rounded-2xl shadow-lg p-7 sm:p-9">

                    <div className="mb-7">
                        <h2 className="text-2xl font-bold text-ink">
                            Welcome back
                        </h2>

                        <p className="text-muted text-sm mt-2">
                            Sign in to manage your savings and stay connected
                            with your chama.
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-5">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Username */}
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-sm font-semibold text-ink mb-2"
                            >
                                Username
                            </label>

                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                autoComplete="username"
                                placeholder="Enter your username"
                                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-ink placeholder:text-slate-400 outline-none focus:border-orange focus:ring-2 focus:ring-orange/10 transition"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-semibold text-ink mb-2"
                            >
                                Password
                            </label>

                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className="w-full border border-slate-200 rounded-lg px-4 py-3 pr-12 text-ink placeholder:text-slate-400 outline-none focus:border-orange focus:ring-2 focus:ring-orange/10 transition"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <EyeOff size={19} />
                                    ) : (
                                        <Eye size={19} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Forgot Password */}
                        <div className="flex justify-end">
                            <Link
                                to="/forgot-password"
                                className="text-sm font-medium text-orange hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange hover:bg-orange/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>

                    </form>

                    {/* Registration Link */}
                    <div className="border-t border-slate-100 mt-7 pt-6 text-center">
                        <p className="text-sm text-muted">
                            Don't have an account?{" "}
                            <Link
                                to="/register"
                                className="text-orange font-semibold hover:underline"
                            >
                                Create an account
                            </Link>
                        </p>
                    </div>

                </div>

                {/* Footer */}
                <p className="text-center text-xs text-muted mt-7">
                    © 2026 Pesa Pod. All rights reserved.
                </p>

            </div>

        </main>
    );


}

export default Login;