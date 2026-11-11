import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Wallet, Mail } from "lucide-react";

import api from "../../api/axios";

function VerifyEmail(){
    const location = useLocation();
    const navigate = useNavigate();

    const [email] = useState(location.state?.email || "");
    const [code, setCodde] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        try{
            await api.post("accounts/auth/vertify-email",{
                email,
                code,
            });
            navigate("/login,", {
                replace:true,
                state:{message:"Email has been Verified. Login"},
            });
        } catch (error) {
            const data = error.response?.data;
            const message = data?.detail ||
            (data && Object.values(data).flat().join(" ")) ||
            "Verification failed. Check code or retry";
            setError(message);
        } finally {
            setLoading(false);
        }
    };
    if (!email) {
        return (
            <main className="min-h-screen bg-powder-light flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <h2 className="text-xl font-bold text-ink mb-3">
                        Verification email missing
                    </h2>

                    <p className="text-muted text-sm mb-6">
                        Please register first to receive a verification code.
                    </p>
                    <Link
                        to="/register"
                        className="text-orange font-semibold hover:underline"
                    >
                        Create an account
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-powder-light flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">

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

                <div className="bg-white border border-powder rounded-2xl shadow-lg p-7 sm:p-9">
                    <div className="text-center mb-7">
                        <div className="inline-flex items-center justify-center bg-orange-light p-4 rounded-full mb-4">
                            <Mail size={30} className="text-orange" />
                        </div>
                        <h2 className="text-2xl font-bold text-ink">
                            Verify your email
                        </h2>
                        <p className="text-muted text-sm mt-3">
                            We sent a six-digit verification code to:
                        </p>

                        <p className="text-ink font-semibold mt-2 break-all">
                            {email}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-5">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">

                        <div>
                            <label
                                htmlFor="code"
                                className="block text-sm font-semibold text-ink mb-2"
                            >
                                Verification code
                            </label>

                            <input
                                type="text"
                                id="code"
                                name="code"
                                value={code}
                                onChange={(event) =>
                                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                                }
                                required
                                maxLength={6}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="Enter your six-digit code"
                                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-center tracking-[0.5em] text-xl font-semibold text-ink outline-none focus:border-orange focus:ring-2 focus:ring-orange/10 transition"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || code.length !== 6}
                            className="w-full bg-orange hover:bg-orange/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
                        >
                            {loading ? "Verifying..." : "Verify email"}
                        </button>

                    </form>

                    <div className="border-t border-slate-100 mt-7 pt-6 text-center">
                        <p className="text-sm text-muted">
                            Already verified?{" "}
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

export default VerifyEmail;



