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
}