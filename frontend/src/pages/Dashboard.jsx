import { useEffect, useState } from "react";
import API from "../services/api";

export default function Dashboard() {
  const [rides, setRides] = useState([]);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const res = await API.get("/rides");
        setRides(res.data.rides);
      } catch (err) {
        console.error(err);
      }
    };

    fetchRides();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1220] text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Available Rides 🚗</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rides.map((ride) => (
          <div
            key={ride._id}
            className="bg-[#111827] p-5 rounded-xl shadow-md space-y-2"
          >
            <h2 className="text-xl font-semibold">
              {ride.from} → {ride.to}
            </h2>

            <p>📅 {new Date(ride.date).toDateString()}</p>
            <p>⏰ {ride.time}</p>
            <p>💺 Seats: {ride.seats}</p>
            <p>💰 ₹{ride.price}</p>
            <p>📏 {ride.distance} km</p>
            <p>🚘 {ride.type}</p>

            <p className="text-sm text-gray-400">
              Driver: {ride.driver?.name}
            </p>

            <button className="w-full mt-3 bg-gradient-to-r from-purple-500 to-blue-500 py-2 rounded">
              Join Ride
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}