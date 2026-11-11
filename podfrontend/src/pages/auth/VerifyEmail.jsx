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
    }


    
};

