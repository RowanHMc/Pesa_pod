import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import VerifyEmail from "./pages/auth/VerifyEmail";

function Dashboard() {
    return (
        <main className="min-h-screen bg-powder-light flex items-center justify-center">
            <h1 className="text-3xl font-bold text-ink">
                Welcome to Pesa Pod
            </h1>
        </main>
    );
}

function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
    );
}

export default App;


