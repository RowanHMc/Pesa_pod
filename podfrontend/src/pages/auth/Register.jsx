import { useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, Eye, EyeOff } from "lucide-react";

import api from "../../api/axios";

function Register() {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        phone_number: "",
        password: "",
        password2: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (formData.password !== formData.password2) {
            setError("Your passwords do not match.");
            return;
        }
        setLoading(true);

        try {
            const response = await api.post(
                "accounts/auth/register/",
                formData
            );

            setSuccess(response.data.detail);

            setFormData({
                username: "",
                email: "",
                phone_number: "",
                password: "",
                password2: "",
            });
        } catch (error) {
            const data = error.response?.data;

            const message =
                data?.detail ||
                (data && Object.values(data)
                    .flat()
                    .join(" ")) ||
                "Registration failed. Please try again.";

            setError(message);
        } finally {
            setLoading(false);
        }
    };

     return (
        <main className="min-h-screen bg-powder-light flex items-center justify-center px-4 py-10">

            <div className="w-full max-w-lg">

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

                {/* Registration Card */}
                <div className="bg-white border border-powder rounded-2xl shadow-lg p-7 sm:p-9">

                    <div className="mb-7">
                        <h2 className="text-2xl font-bold text-ink">
                            Create your account
                        </h2>

                        <p className="text-muted text-sm mt-2">
                            Join Pesa Pod and start managing your chama
                            savings.
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-5">
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-5">
                            {success}
                            <p className="mt-2 font-medium">
                                Check your email for the six-digit
                                verification code.
                            </p>
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
                                placeholder="Choose a username"
                                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-ink outline-none focus:border-orange focus:ring-2 focus:ring-orange/10 transition"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-semibold text-ink mb-2"
                            >
                                Email address
                            </label>

                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                autoComplete="email"
                                placeholder="Enter your email address"
                                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-ink outline-none focus:border-orange focus:ring-2 focus:ring-orange/10 transition"
                            />
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label
                                htmlFor="phone_number"
                                className="block text-sm font-semibold text-ink mb-2"
                            >
                                Phone number
                            </label>

                            <input
                                type="tel"
                                id="phone_number"
                                name="phone_number"
                                value={formData.phone_number}
                                onChange={handleChange}
                                required
                                autoComplete="tel"
                                placeholder="Enter your phone number"
                                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-ink outline-none focus:border-orange focus:ring-2 focus:ring-orange/10 transition"
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
                                    autoComplete="new-password"
                                    placeholder="Create a password"
                                    className="w-full border border-slate-200 rounded-lg px-4 py-3 pr-12 text-ink outline-none focus:border-orange focus:ring-2 focus:ring-orange/10 transition"
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

                        {/* Confirm Password */}
                        <div>
                            <label
                                htmlFor="password2"
                                className="block text-sm font-semibold text-ink mb-2"
                            >
                                Confirm password
                            </label>

                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="password2"
                                    name="password2"
                                    value={formData.password2}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                    placeholder="Confirm your password"
                                    className="w-full border border-slate-200 rounded-lg px-4 py-3 pr-12 text-ink outline-none focus:border-orange focus:ring-2 focus:ring-orange/10 transition"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff size={19} />
                                    ) : (
                                        <Eye size={19} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange hover:bg-orange/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
                        >
                            {loading ? "Creating account..." : "Create account"}
                        </button>

                    </form>

                    {/* Login Link */}
                    <div className="border-t border-slate-100 mt-7 pt-6 text-center">
                        <p className="text-sm text-muted">
                            Already have an account?{" "}
                            <Link
                                to="/login"
                                className="text-orange font-semibold hover:underline"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>

                </div>

                <p className="text-center text-xs text-muted mt-7">
                    © 2026 Pesa Pod. All rights reserved.
                </p>

            </div>

        </main>
    );
}

export default Register;