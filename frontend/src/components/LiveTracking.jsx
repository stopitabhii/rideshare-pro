import React, { useEffect, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

const LiveTracking = ({ ride, currentUser }) => {
  const { socket, connected } = useSocket();
  const [driverLocation, setDriverLocation] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  
  const isDriver = currentUser._id === ride.driver._id;

  useEffect(() => {
    if (!socket || !connected) return;

    // Join ride tracking room
    socket.emit('join-ride-tracking', ride._id);

    // Listen for location updates
    socket.on('location-update', (data) => {
      console.log('📍 Location update received:', data);
      setDriverLocation(data);
    });

    return () => {
      socket.emit('leave-ride-tracking', ride._id);
      socket.off('location-update');
    };
  }, [socket, connected, ride._id]);

  // Driver shares location
  const startSharingLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }

    setIsSharing(true);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData = {
          rideId: ride._id,
          driverId: currentUser._id,
          driverName: currentUser.name,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        socket.emit('share-location', locationData);
        console.log('📤 Sharing location:', locationData);
      },
      (error) => {
        console.error('Location error:', error);
        setIsSharing(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    // Stop sharing when component unmounts
    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsSharing(false);
    };
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          Live Tracking
        </h3>
        
        {connected ? (
          <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded-full border border-green-700">
            🟢 Connected
          </span>
        ) : (
          <span className="px-2 py-1 bg-red-900/50 text-red-400 text-xs rounded-full border border-red-700">
            🔴 Disconnected
          </span>
        )}
      </div>

      {isDriver && (
        <button
          onClick={startSharingLocation}
          disabled={isSharing}
          className={`w-full py-3 rounded-lg font-semibold mb-4 ${
            isSharing
              ? 'bg-green-600 text-white'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {isSharing ? '📡 Sharing Location...' : '📍 Start Sharing Location'}
        </button>
      )}

      {!isDriver && (
        <div className="bg-gray-800 rounded-lg p-4">
          {driverLocation ? (
            <div>
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <MapPin className="w-5 h-5" />
                <span className="font-semibold">Driver Location Active</span>
              </div>
              <div className="text-sm text-gray-400">
                <div>Driver: {driverLocation.driverName}</div>
                <div>Lat: {driverLocation.latitude.toFixed(6)}</div>
                <div>Lng: {driverLocation.longitude.toFixed(6)}</div>
                <div className="text-xs mt-2">
                  Last update: {new Date(driverLocation.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Waiting for driver to share location...</p>
            </div>
          )}
        </div>
      )}

      {/* Simple map placeholder */}
      <div className="mt-4 bg-gray-800 rounded-lg p-8 text-center">
        <div className="text-gray-500">
          📍 Map View
          <div className="text-sm mt-2">
            (Install react-leaflet for interactive map)
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;