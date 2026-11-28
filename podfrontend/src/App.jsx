import {  Route, Routes } from "react-router-dom";

import Home from "./pages/public/Home";
// import Dashboard from "./pages/Dashboard";
import PublicLayout from "./pages/public/PublicLayout";
import About from "./pages/public/About";
import Features from "./pages/public/Features";
import Contact from "./pages/public/Contact"
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import VerifyEmail from "./pages/auth/VerifyEmail";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import ForgotPassword from "./pages/auth/ForgotPassword";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import Payments from "./pages/transactions/Payments";
import Chamas from "./pages/chamas/Chamas";
import Invitations from "./pages/invitations/Invitations";
import ChamaInvitations from "./pages/chamas/ChamaInvitations";
import ChamaMembers from "./pages/chamas/ChamaMembers";
import ChamaDetails from "./pages/chamas/ChamaDetails";
import ActiveCycles from "./pages/cycles/ActiveCycles";
import MemberManagement from "./pages/chamas/MemberManagement";

function App() {
    return (
        <Routes>
            <Route path="/" element={<PublicLayout />}>
                <Route index element={<Home />} />
                <Route path="about" element={<About />} />
                <Route path="features" element={<Features />} />
                <Route path="contact" element={<Contact />} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={< DashboardOverview/>} />
                <Route path="cycles" element={<ActiveCycles/>} />
                <Route path="payments" element={<Payments/>} />
                <Route path="chamas" element={<Chamas/>} />
                <Route path="invitations" element={<Invitations/>} />
                <Route path="chamas/:chamaId/invitations" element={<ChamaInvitations/>} />
                <Route path="chamas/:chamaId/members" element={<ChamaMembers/>} />
                <Route path="chamas/:chamaId" element={<ChamaDetails/>} />
                <Route path="chamas/:chamaId/member-management" element={<MemberManagement/>} />

            </Route>
        </Routes>
    );
}

export default App;


