import { requestPasswordReset, confirmPasswordReset } from "../../api/auth";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Wallet,
    Mail,
    LockKeyhole,
    ArrowLeft,
    Eye,
    EyeOff,
    CheckCircle2,
    Send,
} from "lucide-react";

function ForgotPassword() {
    const [step, setStep] = useState(1);

    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
        const response = await requestPasswordReset(email);
        setSuccess(response.detail);
        setStep(2);
    } catch (error) {
        setError(
            error.response?.data?.detail ||
            "Unable to request a password reset code. Please try again."
        );
    } finally {
        setLoading(false);
    }
};

const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
    }

    try {
        const response = await confirmPasswordReset({
            email,
            code,
            newPassword,
            confirmPassword,
        });

        setSuccess(response.detail);
        setStep(3);
    } catch (error) {
        const data = error.response?.data;

        setError(
            data?.detail ||
            data?.code?.[0] ||
            data?.new_password?.[0] ||
            data?.new_password2?.[0] ||
            "Password reset failed. Please check your details and try again."
        );
    } finally {
        setLoading(false);
    }
};

    return (
        <div className="min-h-screen bg-powder-light flex items-center justify-center px-5 py-12">

            <div className="w-full max-w-md">

                {/* Logo */}
                <Link to="/" className="flex items-center justify-center gap-2 mb-8">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                        <Wallet size={26} className="text-ink" />
                    </div>

                    <span className="text-2xl font-bold text-ink">
                        Pesa <span className="text-orange">Pod</span>
                    </span>
                </Link>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-7 sm:p-9">

                    {/* Request Reset Code */}
                    {step === 1 && (
                        <>
                            <div className="bg-orange-light w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                                <Mail size={27} className="text-orange" />
                            </div>

                            <h1 className="text-2xl font-bold text-ink">
                                Forgot Your Password?
                            </h1>

                            <p className="text-muted text-sm leading-relaxed mt-3 mb-7">
                                Enter your registered email address and
                                we'll send you a code to reset your password.
                            </p>

                            <form onSubmit={handleRequestCode} className="space-y-5">

                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-semibold mb-2"
                                    >
                                        Email Address
                                    </label>

                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder="Enter your email address"
                                        required
                                        autoComplete="email"
                                        className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/10 transition"
                                    />
                                </div>

                                {error && (
                                    <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                                        {error}
                                    </p>
                                )}

                                {success && (
                                    <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
                                        {success}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 bg-orange hover:bg-orange/90 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition"
                                >
                                    <Send size={18} />
                                    {loading ? "Sending..." : "Send Reset Code"}
                                </button>

                            </form>
                        </>
                    )}

                    {/* Verify Code and Set New Password */}
                    {step === 2 && (
                        <>
                            <div className="bg-orange-light w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                                <LockKeyhole size={27} className="text-orange" />
                            </div>

                            <h1 className="text-2xl font-bold text-ink">
                                Reset Your Password
                            </h1>

                            <p className="text-muted text-sm leading-relaxed mt-3 mb-7">
                                Enter the reset code sent to{" "}
                                <span className="font-semibold text-ink">{email}</span>
                                {" "}and choose a new password.
                            </p>

                            <form onSubmit={handleResetPassword} className="space-y-5">

                                <div>
                                    <label
                                        htmlFor="code"
                                        className="block text-sm font-semibold mb-2"
                                    >
                                        Reset Code
                                    </label>

                                    <input
                                        type="text"
                                        id="code"
                                        value={code}
                                        onChange={(event) => setCode(event.target.value)}
                                        placeholder="Enter your reset code"
                                        required
                                        autoComplete="one-time-code"
                                        className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/10 transition"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="new-password"
                                        className="block text-sm font-semibold mb-2"
                                    >
                                        New Password
                                    </label>

                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="new-password"
                                            value={newPassword}
                                            onChange={(event) => setNewPassword(event.target.value)}
                                            placeholder="Enter your new password"
                                            required
                                            autoComplete="new-password"
                                            className="w-full border border-slate-200 rounded-lg px-4 py-3 pr-12 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/10 transition"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="confirm-password"
                                        className="block text-sm font-semibold mb-2"
                                    >
                                        Confirm New Password
                                    </label>

                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            id="confirm-password"
                                            value={confirmPassword}
                                            onChange={(event) => setConfirmPassword(event.target.value)}
                                            placeholder="Confirm your new password"
                                            required
                                            autoComplete="new-password"
                                            className="w-full border border-slate-200 rounded-lg px-4 py-3 pr-12 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/10 transition"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                        >
                                            {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-orange hover:bg-orange/90 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition"
                                >
                                    {loading ? "Resetting Password..." : "Reset Password"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep(1);
                                        setCode("");
                                        setError("");
                                        setSuccess("");
                                    }}
                                    className="w-full text-sm text-muted hover:text-orange transition"
                                >
                                    Change Email Address
                                </button>

                            </form>
                        </>
                    )}

                    {/* Successful Reset */}
                    {step === 3 && (
                        <div className="text-center py-5">

                            <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={34} className="text-green-600" />
                            </div>

                            <h1 className="text-2xl font-bold text-ink">
                                Password Reset Successful!
                            </h1>

                            <p className="text-muted text-sm leading-relaxed mt-4 mb-8">
                                Your password has been updated.
                                You can now sign in using your new password.
                            </p>

                            <Link
                                to="/login"
                                className="block w-full bg-orange hover:bg-orange/90 text-white font-semibold py-3 rounded-lg transition"
                            >
                                Back to Login
                            </Link>

                        </div>
                    )}

                    {step !== 3 && (
                        <div className="mt-7 text-center">
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-orange transition"
                            >
                                <ArrowLeft size={16} />
                                Back to Login
                            </Link>
                        </div>
                    )}

                </div>

                <p className="text-center text-xs text-muted mt-7">
                    © {new Date().getFullYear()} Pesa Pod. All rights reserved.
                </p>

            </div>
        </div>
    );
}

export default ForgotPassword;
