import { useState } from "react";
import API from "../services/api";

export default function CreateRide() {
  const [form, setForm] = useState({
    from: "",
    to: "",
    date: "",
    time: "",
    distance: "",
    seats: "",
    price: "",
    type: "carpool",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const createRide = async () => {
    try {
      const res = await API.post("/rides/create", form);
      alert("Ride created 🚀");
      console.log(res.data);
    } catch (err) {
      console.error(err);
      alert("Error creating ride");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1220] text-white">
      <div className="bg-[#111827] p-8 rounded-xl w-full max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-center">Create Ride</h2>

        <input name="from" placeholder="From" onChange={handleChange} className="w-full p-2 rounded bg-gray-800" />
        <input name="to" placeholder="To" onChange={handleChange} className="w-full p-2 rounded bg-gray-800" />
        <input type="date" name="date" onChange={handleChange} className="w-full p-2 rounded bg-gray-800" />
        <input name="time" placeholder="Time (10:00 AM)" onChange={handleChange} className="w-full p-2 rounded bg-gray-800" />
        <input name="distance" placeholder="Distance (km)" onChange={handleChange} className="w-full p-2 rounded bg-gray-800" />
        <input name="seats" placeholder="Seats" onChange={handleChange} className="w-full p-2 rounded bg-gray-800" />
        <input name="price" placeholder="Price" onChange={handleChange} className="w-full p-2 rounded bg-gray-800" />

        <select name="type" onChange={handleChange} className="w-full p-2 rounded bg-gray-800">
          <option value="carpool">Carpool</option>
          <option value="bikepool">Bikepool</option>
        </select>

        <button
          onClick={createRide}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 py-2 rounded font-semibold"
        >
          Create Ride
        </button>
      </div>
    </div>
  );
}