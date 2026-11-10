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

    
}