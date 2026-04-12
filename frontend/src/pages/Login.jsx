import { useState } from "react";
import axios from "axios";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        "https://rideshare-pro.onrender.com/api/auth/login",
        formData
      );

      // Save token
      localStorage.setItem("token", res.data.token);

      alert("Login successful 🚀");
      window.location.href = "/dashboard";

    } catch (err) {
      console.log(err);
      setError(
        err.response?.data?.error || "Login failed"
      );
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-white text-xl mb-4">Login</h2>

        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          className="block mb-3 p-2 w-full"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          className="block mb-3 p-2 w-full"
        />

        <button className="bg-blue-500 px-4 py-2 text-white w-full">
          Login
        </button>

        {error && <p className="text-red-500 mt-2">{error}</p>}
      </form>
    </div>
  );
};

export default Login;