import { useState } from "react";
import API from "../services/api";

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    organization: "",
    role: "rider"
  });

  const handleSubmit = async () => {
    try {
      const res = await API.post("/auth/signup", form);
      localStorage.setItem("token", res.data.token);
      alert("Signup successful");
    } catch (err) {
        setError(
            err.response?.data?.error || errr.message
        );
    }
  };

  return (
    <div>
      <input placeholder="Name" onChange={e => setForm({...form, name: e.target.value})}/>
      <input placeholder="Email" onChange={e => setForm({...form, email: e.target.value})}/>
      <input placeholder="Password" onChange={e => setForm({...form, password: e.target.value})}/>
      <button onClick={handleSubmit}>Signup</button>
    </div>
  );
}