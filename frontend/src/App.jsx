// Production Fix 1
import React, { useState, useEffect } from 'react';
import { Car, Bike, MapPin, Users, Leaf, Star, Clock, Shield, Search, Plus, Bell, LogOut, Menu, X, TrendingUp, Award, Calendar, IndianRupee } from 'lucide-react';
import api from './services/api';
const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState('landing');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await api.get('/auth/me');
        setCurrentUser(res.data.user);
        setPage('dashboard');
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setPage('landing');
    showNotification('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white animate-slide-in`}>
          {notification.message}
        </div>
      )}

      {page === 'landing' && <LandingPage setPage={setPage} />}
      {page === 'login' && <AuthPage type="login" setPage={setPage} setCurrentUser={setCurrentUser} showNotification={showNotification} />}
      {page === 'signup' && <AuthPage type="signup" setPage={setPage} setCurrentUser={setCurrentUser} showNotification={showNotification} />}
      {page === 'dashboard' && currentUser && <Dashboard user={currentUser} logout={logout} showNotification={showNotification} setCurrentUser={setCurrentUser} />}
    </div>
  );
};

const LandingPage = ({ setPage }) => {
  return (
    <div className="bg-gray-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-gray-900 to-blue-900/40"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}></div>
        
        <nav className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">RideShare</span>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => setPage('login')} className="px-6 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg text-white hover:bg-gray-700/50 transition-all border border-gray-700">
              Login
            </button>
            <button onClick={() => setPage('signup')} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/30">
              Sign Up
            </button>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-24 text-center">
          <h1 className="text-6xl font-bold text-white mb-6 animate-fade-in">
            Same Route.<br />
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Less Cost. Less Carbon.
            </span>
          </h1>
          <p className="text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Why ride alone when your classmate is going the same way?
          </p>
          <div className="flex justify-center gap-4">
            <button onClick={() => setPage('signup')} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-purple-500/30">
              Start Sharing Rides
            </button>
            <button className="px-8 py-4 bg-gray-800/50 backdrop-blur-sm rounded-xl text-white font-bold text-lg hover:bg-gray-700/50 transition-all border border-gray-700">
              Learn More
            </button>
          </div>
        </div>

        <div className="relative z-10 container mx-auto px-6 pb-24">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Leaf, title: '12.5K kg', subtitle: 'CO₂ Saved This Month', gradient: 'from-green-600 to-emerald-600' },
              { icon: Users, title: '2,847', subtitle: 'Active Commuters', gradient: 'from-blue-600 to-cyan-600' },
              { icon: TrendingUp, title: '₹8.2L', subtitle: 'Money Saved Together', gradient: 'from-purple-600 to-pink-600' },
            ].map((stat, i) => (
              <div key={i} className={`bg-gradient-to-br ${stat.gradient} p-6 rounded-2xl text-white shadow-xl transform hover:scale-105 transition-all`}>
                <stat.icon className="w-12 h-12 mb-4" />
                <div className="text-3xl font-bold mb-2">{stat.title}</div>
                <div className="text-white/80">{stat.subtitle}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-900">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16 text-white">How It Works</h2>
          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {[
              { num: 1, title: 'Join Your Organization', desc: 'Sign up with your college or company email. Connect with verified commuters.', color: 'bg-blue-600' },
              { num: 2, title: 'Find or Offer Rides', desc: 'Search for rides on your route or offer seats. Smart matching finds perfect buddies.', color: 'bg-purple-600' },
              { num: 3, title: 'Share & Track', desc: 'Real-time tracking, live location sharing with family, and safety features built-in.', color: 'bg-green-600' },
              { num: 4, title: 'Save Money & Planet', desc: 'Track carbon savings, compete on leaderboards, make real environmental impact.', color: 'bg-pink-600' },
            ].map((step, i) => (
              <div key={i} className="flex gap-4 bg-gray-800 p-6 rounded-xl hover:bg-gray-750 transition-all">
                <div className={`flex-shrink-0 w-12 h-12 ${step.color} rounded-full flex items-center justify-center text-white font-bold text-xl`}>
                  {step.num}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-white">{step.title}</h3>
                  <p className="text-gray-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quote Section */}
      <div className="py-24 bg-gradient-to-r from-purple-900/50 to-blue-900/50">
        <div className="container mx-auto px-6 text-center">
          <blockquote className="text-3xl font-bold text-white mb-6">
            "One ride can save money, fuel, and the planet."
          </blockquote>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Join thousands who've made carpooling their daily choice.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 border-t border-gray-800">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">RideShare</span>
          </div>
          <p className="text-gray-400">Making daily commutes smarter, cheaper, and greener.</p>
        </div>
      </footer>
    </div>
  );
};

const AuthPage = ({ type, setPage, setCurrentUser, showNotification }) => {
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', phone: '', organization: '', role: 'rider'
  });
  const [loading, setLoading] = useState(false);
  const [organizations] = useState(['Galgotias University','Delhi University', 'IIT Delhi', 'Amity University', 'InfoSys Noida']);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = type === 'login' ? '/auth/login' : '/auth/signup';
      const res = await api.post(endpoint, formData);
      
      localStorage.setItem('token', res.data.token);
      setCurrentUser(res.data.user);
      setPage('dashboard');
      showNotification(`Welcome ${res.data.user.name}!`);
    } catch (error) {
      showNotification(error.response?.data?.error || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gray-950">
      <div className="max-w-md w-full bg-gray-900 rounded-2xl shadow-2xl shadow-purple-500/20 p-8 border border-gray-800">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Car className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">RideShare</span>
          </div>
          <h2 className="text-2xl font-bold text-white">{type === 'login' ? 'Welcome Back' : 'Join RideShare'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'signup' && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                required
              />
              <select
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                value={formData.organization}
                onChange={e => setFormData({...formData, organization: e.target.value})}
                required
              >
                <option value="">Select Organization</option>
                {organizations.map(org => <option key={org} value={org}>{org}</option>)}
              </select>
              <div className="flex gap-4">
                <label className="flex items-center flex-1 cursor-pointer">
                  <input 
                    type="radio" 
                    name="role" 
                    value="rider" 
                    checked={formData.role === 'rider'} 
                    onChange={e => setFormData({...formData, role: e.target.value})} 
                    className="mr-2 accent-purple-600" 
                  />
                  <Users className="w-4 h-4 mr-1 text-gray-400" /> 
                  <span className="text-white">Rider</span>
                </label>
                <label className="flex items-center flex-1 cursor-pointer">
                  <input 
                    type="radio" 
                    name="role" 
                    value="driver" 
                    checked={formData.role === 'driver'} 
                    onChange={e => setFormData({...formData, role: e.target.value})} 
                    className="mr-2 accent-purple-600" 
                  />
                  <Car className="w-4 h-4 mr-1 text-gray-400" /> 
                  <span className="text-white">Driver</span>
                </label>
              </div>
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/30"
          >
            {loading ? 'Please wait...' : (type === 'login' ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setPage(type === 'login' ? 'signup' : 'login')}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            {type === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </button>
        </div>
        <div className="mt-4 text-center">
          <button onClick={() => setPage('landing')} className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ user, logout, showNotification, setCurrentUser }) => {
  const [tab, setTab] = useState('find');
  const [rides, setRides] = useState([]);
  const [filters, setFilters] = useState({ type: 'carpool', from: '', to: '' });
  const [loading, setLoading] = useState(false);

  
  const loadRides = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      //params.append('organization', user.organization);
      
      const res = await api.get(`/rides/search?${params}`);
      setRides(res.data.rides);
    } catch (error) {
      showNotification('Failed to load rides', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMyRides = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rides/my-rides');
      setRides([...res.data.offeredRides, ...res.data.bookedRides]);
    } catch (error) {
      showNotification('Failed to load your rides', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'find') {
      loadRides();
    } else if (tab === 'myrides') {
      loadMyRides();
    }
  }, [tab]);  


  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <nav className="bg-gray-900 border-b border-gray-800 shadow-lg">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">RideShare</span>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-lg hover:bg-gray-800 relative transition-colors">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700">
              <div className="font-semibold text-white">{user.name}</div>
              <div className="text-sm text-gray-400">{user.organization}</div>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Stats Bar */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-4 gap-6">
            <div className="flex items-center gap-3 bg-gray-800 p-4 rounded-xl border border-gray-700">
              <div className="p-3 bg-green-900/30 rounded-lg">
                <Leaf className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{user.carbonSaved} kg</div>
                <div className="text-sm text-gray-400">CO₂ Saved</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 p-4 rounded-xl border border-gray-700">
              <div className="p-3 bg-blue-900/30 rounded-lg">
                <Car className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{user.ridesCompleted}</div>
                <div className="text-sm text-gray-400">Rides Completed</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 p-4 rounded-xl border border-gray-700">
              <div className="p-3 bg-yellow-900/30 rounded-lg">
                <Star className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{user.rating}</div>
                <div className="text-sm text-gray-400">Rating</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 p-4 rounded-xl border border-gray-700">
              <div className="p-3 bg-purple-900/30 rounded-lg">
                <Award className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">#{Math.floor(Math.random() * 50) + 1}</div>
                <div className="text-sm text-gray-400">Rank</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setTab('find')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              tab === 'find' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            <Search className="w-5 h-5 inline mr-2" />
            Find Rides
          </button>
          <button
            onClick={() => setTab('offer')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              tab === 'offer' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Offer Ride
          </button>
          <button
            onClick={() => setTab('myrides')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              tab === 'myrides' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            <Calendar className="w-5 h-5 inline mr-2" />
            My Rides
          </button>
        </div>

        {tab === 'find' && <FindRides rides={rides} filters={filters} setFilters={setFilters} loadRides={loadRides} showNotification={showNotification} loading={loading} />}
        {tab === 'offer' && <OfferRide user={user} showNotification={showNotification} />}
        {tab === 'myrides' && <MyRides rides={rides} loading={loading} />}
      </div>
    </div>
  );
};

const FindRides = ({ rides, filters, setFilters, loadRides, showNotification, loading }) => {
  const handleBook = async (rideId) => {
    try {
      const res = await api.post(`/rides/book/${rideId}`);
      showNotification(`Ride booked! 🎉 You saved ${res.data.carbonSaved}kg CO₂!`);
      loadRides();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Booking failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="p-6 rounded-xl bg-gray-900 shadow-lg border border-gray-800">
        <div className="grid md:grid-cols-4 gap-4">
          <select
            value={filters.type}
            onChange={e => setFilters({...filters, type: e.target.value})}
            className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="carpool">🚗 Carpool</option>
            <option value="bikepool">🏍️ BikePool</option>
          </select>
          <input
            type="text"
            placeholder="From"
            value={filters.from}
            onChange={e => setFilters({...filters, from: e.target.value})}
            className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            placeholder="To"
            value={filters.to}
            onChange={e => setFilters({...filters, to: e.target.value})}
            className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button onClick={loadRides} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/30">
            Search
          </button>
        </div>
      </div>

      {/* Rides List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
        </div>
      ) : rides.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-gray-900 border border-gray-800">
          <Car className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-semibold mb-2 text-white">No rides found</h3>
          <p className="text-gray-400">Try adjusting your filters or check back later</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rides.map(ride => (// Ride Card Component (inside FindRides map)
            <div key={ride._id} className="p-6 rounded-xl bg-gray-900 shadow-lg hover:shadow-purple-500/20 transition-all border border-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    {ride.type === 'carpool' ? <Car className="w-6 h-6 text-white" /> : <Bike className="w-6 h-6 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-white">{ride.driver?.name}</h3>
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-semibold">{ride.driver?.rating}</span>
                      </div>
                      {ride.recurring && (
                        <span className="px-2 py-1 bg-blue-900/50 text-blue-400 text-xs rounded-full font-semibold border border-blue-700">
                          Recurring
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{ride.from} → {ride.to}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{ride.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{ride.seats - ride.bookings.length} seats left</span>
                      </div>
                    </div>
                    {ride.recurring && (
                      <div className="flex gap-1 mb-3">
                        {ride.days.map(day => (
                          <span key={day} className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-300 border border-gray-700">
                            {day}
                          </span>
                        ))}
                      </div>
                    )}
                    {ride.type === 'bikepool' && ride.helmetProvided && (
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <Shield className="w-4 h-4" />
                        <span>Helmet provided</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-400 mb-2 flex items-center">
                    <IndianRupee className="w-5 h-5" />
                    {ride.price}
                  </div>
                  <div className="text-xs text-gray-500 mb-3">{ride.distance} km</div>
                  <button
                    onClick={() => handleBook(ride._id)}
                    disabled={ride.bookings.length >= ride.seats}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
                  >
                    {ride.bookings.length >= ride.seats ? 'Full' : 'Book'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const OfferRide = ({ user, showNotification }) => {
  const [formData, setFormData] = useState({
    type: 'carpool',
    from: '',
    to: '',
    date: '',
    time: '',
    seats: 3,
    price: '',
    recurring: false,
    days: [],
    helmetProvided: false,
    distance: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/rides/create', formData);
      showNotification('Ride offered successfully! 🚗');
      setFormData({
        type: 'carpool',
        from: '',
        to: '',
        date: '',
        time: '',
        seats: 3,
        price: '',
        recurring: false,
        days: [],
        helmetProvided: false,
        distance: ''
      });
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to create ride', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
    }));
  };

  return (
    <div className="max-w-2xl mx-auto p-8 rounded-xl bg-gray-900 shadow-lg border border-gray-800">
      <h2 className="text-2xl font-bold mb-6 text-white">Offer a Ride</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Ride Type</label>
          <div className="flex gap-4">
            <label className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="carpool"
                checked={formData.type === 'carpool'}
                onChange={e => setFormData({...formData, type: e.target.value, seats: 3})}
                className="mr-2 accent-purple-600"
              />
              <Car className="w-5 h-5 inline mr-1 text-gray-400" />
              <span className="text-white">Carpool</span>
            </label>
            <label className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="bikepool"
                checked={formData.type === 'bikepool'}
                onChange={e => setFormData({...formData, type: e.target.value, seats: 1})}
                className="mr-2 accent-purple-600"
              />
              <Bike className="w-5 h-5 inline mr-1 text-gray-400" />
              <span className="text-white">BikePool</span>
            </label>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">From</label>
            <input
              type="text"
              required
              value={formData.from}
              onChange={e => setFormData({...formData, from: e.target.value})}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Starting point"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">To</label>
            <input
              type="text"
              required
              value={formData.to}
              onChange={e => setFormData({...formData, to: e.target.value})}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Destination"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Date</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Time</label>
            <input
              type="time"
              required
              value={formData.time}
              onChange={e => setFormData({...formData, time: e.target.value})}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Distance (km)</label>
            <input
              type="number"
              required
              value={formData.distance}
              onChange={e => setFormData({...formData, distance: e.target.value})}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Distance"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Available Seats</label>
            <input
              type="number"
              min="1"
              max={formData.type === 'bikepool' ? 1 : 6}
              required
              value={formData.seats}
              onChange={e => setFormData({...formData, seats: parseInt(e.target.value)})}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
              disabled={formData.type === 'bikepool'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Price per seat (₹)</label>
            <input
              type="number"
              required
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Price"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.recurring}
              onChange={e => setFormData({...formData, recurring: e.target.checked})}
              className="w-5 h-5 accent-purple-600"
            />
            <span className="font-medium text-white">Recurring ride (daily commute)</span>
          </label>
        </div>

        {formData.recurring && (
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Select Days</label>
            <div className="flex gap-2 flex-wrap">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    formData.days.includes(day)
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        {formData.type === 'bikepool' && (
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.helmetProvided}
                onChange={e => setFormData({...formData, helmetProvided: e.target.checked})}
                className="w-5 h-5 accent-purple-600"
              />
              <span className="font-medium text-white">I will provide a helmet</span>
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/30"
        >
          {loading ? 'Creating...' : 'Offer Ride'}
        </button>
      </form>
    </div>
  );
};

const MyRides = ({ rides, loading }) => {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl bg-gray-900 border border-gray-800">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h3 className="text-xl font-semibold mb-2 text-white">No rides yet</h3>
        <p className="text-gray-400">Start by offering or booking a ride</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rides.map(ride => (
        <div key={ride._id} className="p-6 rounded-xl bg-gray-900 shadow-lg border border-gray-800">
          <div className="flex items-start justify-between">
            <div className="flex gap-4 flex-1">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                {ride.type === 'carpool' ? <Car className="w-6 h-6 text-white" /> : <Bike className="w-6 h-6 text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg text-white">{ride.from} → {ride.to}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                    ride.status === 'scheduled' ? 'bg-blue-900/50 text-blue-400 border border-blue-700' :
                    ride.status === 'ongoing' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                    ride.status === 'completed' ? 'bg-gray-700 text-gray-400 border border-gray-600' :
                    'bg-red-900/50 text-red-400 border border-red-700'
                  }`}>
                    {ride.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(ride.date).toLocaleDateString()} at {ride.time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{ride.bookings?.length || 0} / {ride.seats} booked</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-400 flex items-center">
                <IndianRupee className="w-5 h-5" />
                {ride.price}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;