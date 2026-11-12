import { Navigate, Route, Routes } from "react-router-dom";

import Home from "./pages/Home";
// import Dashboard from "./pages/Dashboard";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import VerifyEmail from "./pages/auth/VerifyEmail";
import DashboardLayout from "./components/layout/DashboardLayout";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import Payments from "./pages/transactions/Payments";
import Chamas from "./pages/chamas/Chamas";
import Invitations from "./pages/invitations/Invitations";
import ChamaInvitations from "./pages/chamas/ChamaInvitations";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={< DashboardOverview/>} />
                <Route path="payments" element={<Payments/>} />
                <Route path="chamas" element={<Chamas/>} />
                <Route path="invitations" element={<Invitations/>} />
                <Route path="chamas/:chamaId/invitations" element={<ChamaInvitations/>} />
            </Route>
        </Routes>
    );
}

export default App;


