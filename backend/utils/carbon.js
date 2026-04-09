// CO₂ emission calculations
// Average car emits 120g CO₂ per km
// Bike emits 0g CO₂ (not considering fuel bikes)

function calculateCarbonSaved(distance, passengers, vehicleType = 'car') {
    const co2PerKm = vehicleType === 'car' ? 0.12 : 0.05; // kg per km
    const totalEmissions = distance * co2PerKm;
    const sharedEmissions = totalEmissions / (passengers + 1); // +1 for driver
    const saved = (totalEmissions - sharedEmissions) * passengers;
    return parseFloat(saved.toFixed(2));
  }
  
  function getTotalCarbonSaved(rides) {
    return rides.reduce((total, ride) => {
      const saved = calculateCarbonSaved(
        ride.distance, 
        ride.bookings.length,
        ride.type === 'bikepool' ? 'bike' : 'car'
      );
      return total + saved;
    }, 0);
  }
  
  module.exports = { calculateCarbonSaved, getTotalCarbonSaved };