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

  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      console.log(form);
      
      const res = await API.post("/auth/register", form);
      localStorage.setItem("token", res.data.token);
      alert("Signup successful");
    } catch (err) {
        console.log(err.response?.data);
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <div>
      <input placeholder="Name" onChange={e => setForm({...form, name: e.target.value})}/>
      <input placeholder="Phone" onChange={e => setForm({...form, phone: e.target.value})}/>
      <input placeholder="Organization" onChange={e => setForm({...form, organization: e.target.value})}/>
      <select onChange={e => setForm({...form, role: e.target.value})}>
      <option value="rider">Rider</option>
      <option value="driver">Driver</option>
      </select>

      <input placeholder="Email" onChange={e => setForm({...form, email: e.target.value})}/>
      <input placeholder="Password" onChange={e => setForm({...form, password: e.target.value})}/>

      <button onClick={handleSubmit}>Signup</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}