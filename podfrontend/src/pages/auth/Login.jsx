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
    

}