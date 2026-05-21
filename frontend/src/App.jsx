import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import api from './services/api';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ─── Fonts ─────────────────────────────────────────────────────────────────── */
const injectFonts = () => {
  if (document.getElementById('rs-fonts')) return;
  const l = document.createElement('link');
  l.id = 'rs-fonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap';
  document.head.appendChild(l);
};

/* ─── Socket singleton ───────────────────────────────────────────────────────── */
let _sock = null;
const getSock = () => {
  if (!_sock) _sock = io('https://rideshare-pro.onrender.com', {
    transports: ['websocket', 'polling'],
    reconnection: true, reconnectionAttempts: 5,
  });
  return _sock;
};

/* ─── Design tokens — light surface, dark text, amber accent ─────────────────── */
const C = {
  bg:       '#F5F5F0',   // warm off-white page background
  surface:  '#FFFFFF',   // card surfaces
  border:   '#E2E2DC',   // subtle borders
  text:     '#111111',   // primary text
  muted:    '#6B6B6B',   // secondary text
  faint:    '#A0A0A0',
  accent:   '#F59E0B',   // amber yellow
  accentDk: '#D97706',
  green:    '#16A34A',
  red:      '#DC2626',
  blue:     '#2563EB',
  purple:   '#7C3AED',
  r:        14,
};

/* ─── Orgs — NCR Universities & Colleges ─────────────────────────────────────── */
const ORGS = [
  // Greater Noida
  'Galgotias University', 'Bennett University', 'Sharda University',
  'GL Bajaj Institute of Technology', 'GNIOT Greater Noida',
  'NIET Greater Noida', 'ITS Engineering College',
  'Gautam Buddha University', 'ABES Engineering College',
  // Noida
  'Amity University Noida', 'IIMT University Noida',
  'Jaypee Institute (JIIT Noida)', 'Symbiosis Noida',
  // Delhi
  'Delhi University', 'IIT Delhi', 'NSIT Dwarka', 'DTU Delhi',
  'Jamia Millia Islamia', 'JNU Delhi', 'IGDTUW Delhi', 'IP University Delhi',
  'IIIT Delhi', 'NIT Delhi', 'Ambedkar University Delhi',
  'Netaji Subhas University of Technology',
  // Gurugram
  'MDI Gurugram', 'GD Goenka University', 'Sushant University Gurugram',
  'NIIT University', 'Ashoka University Sonipat',
  // Faridabad / Other
  'Manav Rachna University', 'YMCA Faridabad',
  'Lingayas University Faridabad',
  // Meerut / Ghaziabad
  'Subharti University Meerut', 'KIET Ghaziabad',
  'IMS Ghaziabad', 'ABES IT Ghaziabad',
  'Ajay Kumar Garg Engineering College',
];

const isValidEmail = e => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return false;
  const blocked = ['test.com','fake.com','example.com','mailinator.com','tempmail.com'];
  return !blocked.includes(e.split('@')[1]?.toLowerCase());
};

/* ─── useDebounce ─────────────────────────────────────────────────────────────── */
function useDebounce(val, ms) {
  const [d, setD] = useState(val);
  useEffect(() => { const t = setTimeout(() => setD(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return d;
}

/* ─── Global CSS ─────────────────────────────────────────────────────────────── */
const GLOBAL = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.bg}; font-family: 'DM Sans', sans-serif; color: ${C.text}; }
  input::placeholder, textarea::placeholder { color: ${C.faint}; }
  select option { background: #fff; color: ${C.text}; }
  input[type=date], input[type=time] { color-scheme: light; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
  button:active:not(:disabled) { transform: scale(0.97); }

  /* Animated org ticker */
  @keyframes rsTickerL { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  @keyframes rsTickerR { from { transform: translateX(-50%); } to { transform: translateX(0); } }

  @keyframes rsSpin   { to { transform: rotate(360deg); } }
  @keyframes rsFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
  @keyframes rsSlide  { from { opacity:0; transform:translateX(-50%) translateY(-10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
  @keyframes rsPulse  { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
  @keyframes rsShake  { 0%,100% { transform:translateX(0); } 20%,60% { transform:translateX(-4px); } 40%,80% { transform:translateX(4px); } }
  @keyframes rsSosPulse { 0% { box-shadow:0 0 0 0 rgba(220,38,38,0.6); } 70% { box-shadow:0 0 0 16px rgba(220,38,38,0); } 100% { box-shadow:0 0 0 0 rgba(220,38,38,0); } }
  @keyframes rsGlow   { 0%,100% { box-shadow:0 0 8px ${C.accent}40; } 50% { box-shadow:0 0 20px ${C.accent}80; } }

  .rs-card { background:${C.surface}; border:1.5px solid ${C.border}; border-radius:${C.r}px; }
  .rs-btn-primary { background:${C.accent}; color:#000; border:none; font-family:'DM Sans',sans-serif; font-weight:700; border-radius:50px; cursor:pointer; transition:all 0.15s; }
  .rs-btn-primary:hover:not(:disabled) { background:${C.accentDk}; }
  .rs-btn-ghost  { background:transparent; color:${C.muted}; border:1.5px solid ${C.border}; font-family:'DM Sans',sans-serif; border-radius:50px; cursor:pointer; transition:all 0.15s; }
  .rs-input { width:100%; padding:11px 14px; border:1.5px solid ${C.border}; border-radius:10px; font-family:'DM Sans',sans-serif; font-size:14px; color:${C.text}; background:#fff; outline:none; transition:border-color 0.15s; }
  .rs-input:focus { border-color:${C.accent}; }

  @media (max-width:767px) { .rs-desk { display:none !important; } }
  @media (min-width:768px) { .rs-mob  { display:none !important; } }

  /* Leaflet overrides */
  .leaflet-container { border-radius:12px; font-family:'DM Sans',sans-serif; }
`;

/* ─── Leaflet default icon fix (webpack strips asset paths) ─────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const makeIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/* ─── Badge config ──────────────────────────────────────────────────────────── */
const BADGE_CFG = {
  frequent_rider: { icon: '🏅', label: 'Frequent Rider' },
  top_rated:      { icon: '⭐', label: 'Top Rated' },
  eco_warrior:    { icon: '🌿', label: 'Eco Warrior' },
  verified_pro:   { icon: '✓',  label: 'Verified Pro' },
  early_adopter:  { icon: '🚀', label: 'Early Adopter' },
  helpful:        { icon: '🤝', label: 'Helpful' },
};

/* ─── Trust badge helper ────────────────────────────────────────────────────── */
const TrustBadge = ({ rating, totalRatings }) => {
  if (totalRatings < 3) return (
    <span style={{ padding:'2px 7px', borderRadius:4, fontSize:10, fontWeight:700,
      fontFamily:"'DM Sans',sans-serif", background:'#F3F4F6', color:C.muted, border:`1px solid ${C.border}` }}>
      NEW
    </span>
  );
  const col = rating >= 4.5 ? C.green : rating >= 3.5 ? '#EAB308' : C.red;
  const lbl = rating >= 4.5 ? 'TRUSTED' : rating >= 3.5 ? 'GOOD' : 'CAUTION';
  return (
    <span style={{ padding:'2px 7px', borderRadius:4, fontSize:10, fontWeight:700,
      fontFamily:"'DM Sans',sans-serif", background:`${col}15`, color:col, border:`1px solid ${col}40` }}>
      {lbl}
    </span>
  );
};

/* ─── Badge icon chips ──────────────────────────────────────────────────────── */
const BadgeChips = ({ badges }) => {
  if (!badges?.length) return null;
  return (
    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
      {badges.slice(0, 3).map(b => {
        const cfg = BADGE_CFG[b];
        if (!cfg) return null;
        return (
          <span key={b} title={cfg.label} style={{ padding:'1px 6px', borderRadius:4, fontSize:10,
            background:'#FFF8E7', border:`1px solid ${C.accent}40`, cursor:'default' }}>
            {cfg.icon}
          </span>
        );
      })}
    </div>
  );
};

/* ─── Reviews modal — view a user's review history ─────────────────────────── */
const ReviewsModal = ({ userId, userName, onClose }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/reviews/user/${userId}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const BAR_COLORS = { 5:C.green, 4:'#22C55E', 3:'#EAB308', 2:'#F97316', 1:C.red };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.5)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div className="rs-card" style={{ width:'100%', maxWidth:440, padding:28, maxHeight:'80vh',
        overflowY:'auto', animation:'rsFadeUp 0.2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18 }}>
            Reviews for {userName}
          </p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.muted }}>✕</button>
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', border:`3px solid ${C.border}`,
              borderTopColor:C.accent, animation:'rsSpin 0.8s linear infinite' }} />
          </div>
        ) : !data ? (
          <p style={{ color:C.muted, fontSize:14, textAlign:'center' }}>Could not load reviews</p>
        ) : (
          <>
            {/* Summary */}
            <div style={{ display:'flex', gap:20, marginBottom:20 }}>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:36, color:C.text }}>
                  {data.user?.rating?.toFixed(1) || '5.0'}
                </p>
                <p style={{ fontSize:12, color:C.muted }}>{data.user?.totalRatings || 0} reviews</p>
              </div>
              <div style={{ flex:1 }}>
                {[5,4,3,2,1].map(star => {
                  const count = data.ratingBreakdown?.[star] || 0;
                  const total = data.user?.totalRatings || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={star} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:11, color:C.muted, width:12, textAlign:'right' }}>{star}</span>
                      <span style={{ fontSize:11 }}>★</span>
                      <div style={{ flex:1, height:6, background:C.bg, borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background:BAR_COLORS[star], borderRadius:3, transition:'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize:10, color:C.faint, width:20 }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reviews list */}
            {data.reviews?.length === 0 ? (
              <p style={{ textAlign:'center', color:C.muted, fontSize:14 }}>No reviews yet</p>
            ) : data.reviews?.map((r, i) => (
              <div key={i} style={{ padding:'14px 0', borderTop:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <p style={{ fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>
                    {r.reviewer?.name || 'Anonymous'}
                  </p>
                  <div style={{ display:'flex', gap:2 }}>
                    {[1,2,3,4,5].map(s => (
                      <span key={s} style={{ fontSize:12, filter: s <= r.rating ? 'none' : 'grayscale(1) opacity(0.2)' }}>⭐</span>
                    ))}
                  </div>
                </div>
                {r.comment && <p style={{ fontSize:13, color:C.muted, lineHeight:1.5 }}>{r.comment}</p>}
                {r.tags?.length > 0 && (
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:6 }}>
                    {r.tags.map(t => (
                      <span key={t} style={{ padding:'2px 8px', background:C.bg, borderRadius:50,
                        fontSize:10, color:C.muted, border:`1px solid ${C.border}` }}>
                        {t.replace(/_/g,' ')}
                      </span>
                    ))}
                  </div>
                )}
                <p style={{ fontSize:10, color:C.faint, marginTop:4 }}>
                  {new Date(r.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

/* ─── SOS Button (floating, hold-to-activate) ─────────────────────────────── */
const SOSButton = ({ user, notify }) => {
  const [rides, setRides]       = useState([]);
  const [holding, setHolding]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [sosSent, setSosSent]   = useState(false);
  const timer   = useRef(null);
  const progRef = useRef(null);
  const sock    = getSock();

  // Fetch user's active rides
  useEffect(() => {
    const fetchRides = () => {
      api.get('/rides/my-rides').then(r => {
        const all = [...(r.data.offeredRides || []), ...(r.data.bookedRides || [])];
        setRides(all);
      }).catch(() => {});
    };
    fetchRides();
    const interval = setInterval(fetchRides, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Find the first active ride for this user
  const activeRide = rides.find(r => ['scheduled','ongoing'].includes(r.status));

  const startHold = () => {
    if (sosSent || !activeRide) return;
    setHolding(true);
    setProgress(0);
    const start = Date.now();
    const duration = 1500; // 1.5 seconds to activate
    progRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progRef.current);
        triggerSOS();
      }
    }, 30);
  };

  const endHold = () => {
    setHolding(false);
    setProgress(0);
    if (progRef.current) clearInterval(progRef.current);
  };

  const triggerSOS = () => {
    setHolding(false);
    setSosSent(true);
    if (progRef.current) clearInterval(progRef.current);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          sock.emit('emergency-sos', {
            rideId: activeRide._id,
            userId: user.id || user._id,
            userName: user.name,
            latitude, longitude,
          });
          notify('🆘 SOS sent! All ride members and admins have been alerted.', 'error');
        },
        () => {
          // Send SOS even without location
          sock.emit('emergency-sos', {
            rideId: activeRide._id,
            userId: user.id || user._id,
            userName: user.name,
            latitude: null, longitude: null,
          });
          notify('🆘 SOS sent! (Location unavailable)', 'error');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      sock.emit('emergency-sos', {
        rideId: activeRide._id,
        userId: user.id || user._id,
        userName: user.name,
        latitude: null, longitude: null,
      });
      notify('🆘 SOS sent!', 'error');
    }

    // Auto-call first trusted contact
    if (user.trustedContacts?.length > 0) {
      const phone = user.trustedContacts[0].phone;
      timer.current = setTimeout(() => {
        if (window.confirm(`Call emergency contact ${user.trustedContacts[0].name}?`)) {
          window.location.href = `tel:${phone}`;
        }
      }, 2000);
    }

    // Reset after 10 seconds
    setTimeout(() => setSosSent(false), 10000);
  };

  if (!activeRide) return null;

  return (
    <div style={{ position:'fixed', bottom:90, right:16, zIndex:200 }}>
      <button
        onMouseDown={startHold} onMouseUp={endHold} onMouseLeave={endHold}
        onTouchStart={startHold} onTouchEnd={endHold}
        disabled={sosSent}
        style={{
          width:56, height:56, borderRadius:'50%', border:'none', cursor:'pointer',
          background: sosSent ? '#991B1B' : C.red, color:'#fff',
          fontFamily:"'DM Sans',sans-serif", fontWeight:800, fontSize:13,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: `0 4px 20px rgba(220,38,38,0.4)`,
          animation: holding ? 'rsShake 0.3s infinite' : sosSent ? 'none' : 'rsSosPulse 2s infinite',
          position:'relative', overflow:'hidden',
          transition: 'background 0.2s',
        }}
      >
        {/* Progress ring overlay */}
        {holding && (
          <svg style={{ position:'absolute', inset:-2, transform:'rotate(-90deg)' }}
            width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="27" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
            <circle cx="30" cy="30" r="27" fill="none" stroke="#fff" strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 27}`}
              strokeDashoffset={`${2 * Math.PI * 27 * (1 - progress / 100)}`}
              strokeLinecap="round" />
          </svg>
        )}
        {sosSent ? '✓' : '🆘'}
      </button>
      <p style={{ textAlign:'center', fontSize:9, color:C.muted, marginTop:4, fontWeight:700,
        fontFamily:"'DM Sans',sans-serif", letterSpacing:'0.05em' }}>
        {sosSent ? 'SOS SENT' : 'HOLD SOS'}
      </p>
    </div>
  );
};

/* ─── FlyTo helper for Leaflet map ─────────────────────────────────────────── */
const FlyTo = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 14, { duration: 1 }); }, [center, map]);
  return null;
};

/* ─── Map Panel (replaces text-only LocationPanel) ────────────────────────── */
const MapPanel = ({ ride, currentUser, onClose, notify }) => {
  const [sharing, setSharing]     = useState(false);
  const [loc, setLoc]             = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const watchRef = useRef(null);
  const sock = getSock();
  const rideId = ride._id;
  const isDriver = (ride.driver?._id || ride.driver) === (currentUser.id || currentUser._id);

  // Default center: Delhi NCR
  const defaultCenter = [28.6139, 77.2090];

  useEffect(() => {
    sock.emit('join-ride-tracking', rideId);
    const onLocUpdate = d => setDriverLoc(d);
    sock.on('location-update', onLocUpdate);
    return () => {
      sock.off('location-update', onLocUpdate);
      stopSharing();
    };
  }, [rideId]);

  const startSharing = () => {
    if (!navigator.geolocation) return notify('Geolocation not supported', 'error');
    setSharing(true);
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setLoc({ latitude, longitude });
        sock.emit('share-location', {
          rideId, latitude, longitude,
          driverId: currentUser.id || currentUser._id,
          driverName: currentUser.name,
        });
      },
      () => notify('Could not get your location', 'error'),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  };

  const stopSharing = () => {
    if (watchRef.current) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setSharing(false);
  };

  const mapCenter = loc ? [loc.latitude, loc.longitude]
    : driverLoc ? [driverLoc.latitude, driverLoc.longitude]
    : (ride.fromCoords ? [ride.fromCoords.lat, ride.fromCoords.lng] : defaultCenter);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.5)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div className="rs-card" style={{ width:'100%', maxWidth:500, padding:0, animation:'rsFadeUp 0.2s ease',
        overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px',
          borderBottom:`1.5px solid ${C.border}` }}>
          <div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18 }}>📍 Live Tracking</p>
            <p style={{ fontSize:12, color:C.muted }}>{ride.from} → {ride.to}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.muted }}>✕</button>
        </div>

        {/* Map */}
        <div style={{ height:280 }}>
          <MapContainer center={mapCenter} zoom={13} style={{ height:'100%', width:'100%' }}
            scrollWheelZoom={true} zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyTo center={mapCenter} />
            {loc && (
              <Marker position={[loc.latitude, loc.longitude]} icon={makeIcon(C.blue)}>
                <Popup>📍 You are here</Popup>
              </Marker>
            )}
            {driverLoc && !isDriver && (
              <Marker position={[driverLoc.latitude, driverLoc.longitude]} icon={makeIcon(C.green)}>
                <Popup>🚗 Driver: {driverLoc.driverName || 'Driver'}</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Controls */}
        <div style={{ padding:16 }}>
          {/* Sharing status */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            {sharing ? (
              <>
                <div style={{ width:8, height:8, borderRadius:'50%', background:C.green,
                  animation:'rsPulse 1.5s infinite' }} />
                <span style={{ fontSize:13, color:C.green, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                  Sharing live location
                </span>
              </>
            ) : (
              <span style={{ fontSize:13, color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>
                {driverLoc && !isDriver ? '🟢 Driver is sharing location' : 'Not sharing location'}
              </span>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display:'flex', gap:8 }}>
            {sharing ? (
              <button onClick={stopSharing}
                style={{ flex:1, padding:'10px', borderRadius:50, background:'#FEE2E2',
                  border:`1.5px solid ${C.red}`, color:C.red, fontWeight:700, fontSize:13,
                  cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                Stop Sharing
              </button>
            ) : (
              <button className="rs-btn-primary" onClick={startSharing}
                style={{ flex:1, padding:'10px', fontSize:13 }}>
                Start Sharing
              </button>
            )}
            {/* Google Maps fallback */}
            {(loc || driverLoc) && (
              <a href={`https://www.google.com/maps?q=${
                (loc || driverLoc).latitude},${(loc || driverLoc).longitude}`}
                target="_blank" rel="noreferrer"
                style={{ padding:'10px 16px', borderRadius:50, border:`1.5px solid ${C.border}`,
                  background:'#fff', color:C.blue, fontWeight:700, fontSize:13,
                  textDecoration:'none', fontFamily:"'DM Sans',sans-serif", display:'flex',
                  alignItems:'center', gap:4 }}>
                🗺 Maps
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══ COMPONENTS ══════════════════════════════════════════════════════════════ */

/* ─── Toast ──────────────────────────────────────────────────────────────────── */
const Toast = ({ n, onClose }) => {
  useEffect(() => { if (!n) return; const t = setTimeout(onClose, 3800); return () => clearTimeout(t); }, [n]);
  if (!n) return null;
  const bg = { success: C.green, error: C.red, info: C.blue, warning: C.accent }[n.type] || C.green;
  return (
    <div style={{ position:'fixed', top:20, left:'50%', zIndex:9999,
      transform:'translateX(-50%)', background:bg, color:'#fff',
      padding:'11px 20px', borderRadius:50, fontSize:13, fontWeight:600,
      boxShadow:'0 4px 20px rgba(0,0,0,0.2)', animation:'rsSlide 0.3s ease',
      maxWidth:'88vw', textAlign:'center', fontFamily:"'DM Sans',sans-serif" }}>
      {n.message}
    </div>
  );
};

/* ─── Animated org ticker ────────────────────────────────────────────────────── */
const OrgTicker = () => {
  const items = [...ORGS, ...ORGS]; // doubled for seamless loop
  return (
    <div style={{ background: C.text, overflow:'hidden', padding:'10px 0',
      borderTop:`1.5px solid ${C.border}`, borderBottom:`1.5px solid ${C.border}` }}>
      <div style={{ display:'flex', gap:40, whiteSpace:'nowrap',
        animation:'rsTickerL 28s linear infinite', width:'max-content' }}>
        {items.map((o, i) => (
          <span key={i} style={{ fontSize:13, color:C.accent, fontWeight:600,
            fontFamily:"'DM Sans',sans-serif", letterSpacing:'0.02em' }}>
            ★ {o}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ─── LocationInput ──────────────────────────────────────────────────────────── */
const LocationInput = ({ placeholder, value, onChange, dotColor = C.green, required }) => {
  const [q, setQ]     = useState(value || '');
  const [sugs, setSugs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(false);
  const wrap = useRef(null);
  const ctrl = useRef(null);
  const db   = useDebounce(q, 300);

  useEffect(() => { setQ(value || ''); }, [value]);

  useEffect(() => {
    if (!db || db.length < 3 || !focus) { setSugs([]); setOpen(false); return; }
    if (ctrl.current) ctrl.current.abort();
    ctrl.current = new AbortController();
    setBusy(true);
    api.get('/rides/autocomplete', { params:{ q: db }, signal: ctrl.current.signal })
      .then(r => { const f = r.data.features||[]; setSugs(f); setOpen(f.length > 0); })
      .catch(() => {})
      .finally(() => setBusy(false));
  }, [db, focus]);

  useEffect(() => {
    const h = e => { if (wrap.current && !wrap.current.contains(e.target)) { setOpen(false); setFocus(false); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pick = feat => {
    const p = feat.properties || {};
    const parts = [p.name || p.street, p.locality || p.region].filter(Boolean);
    const label = parts.length ? parts.join(', ') : (p.label||'').split(',').slice(0,2).join(',').trim();
    setQ(label); setSugs([]); setOpen(false);
    onChange(label, feat);
  };

  const icon = p => {
    const n = (p.name||'').toLowerCase();
    if (n.includes('university')||n.includes('college')) return '🎓';
    if (n.includes('station')||n.includes('metro')) return '🚉';
    return ['locality','borough','neighbourhood'].includes(p.layer) ? '🏙️' : '📍';
  };

  return (
    <div ref={wrap} style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 16px',
        background: focus ? '#FFFBEB' : 'transparent', transition:'background 0.15s',
        borderRadius: open ? `${C.r}px ${C.r}px 0 0` : C.r }}>
        <div style={{ width:9, height:9, borderRadius:'50%', background:dotColor, flexShrink:0,
          boxShadow: focus ? `0 0 0 3px ${dotColor}30` : 'none', transition:'box-shadow 0.2s' }} />
        <input type="text" placeholder={placeholder} value={q} required={required}
          onChange={e => setQ(e.target.value)}
          onFocus={() => { setFocus(true); if (sugs.length) setOpen(true); }}
          style={{ flex:1, border:'none', outline:'none', background:'transparent',
            fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.text }} />
        {busy && <div style={{ width:13, height:13, borderRadius:'50%', flexShrink:0,
          border:`2px solid ${C.border}`, borderTopColor:C.accent,
          animation:'rsSpin 0.7s linear infinite' }} />}
      </div>
      {open && sugs.length > 0 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:9000,
          background:'#fff', border:`1.5px solid ${C.border}`, borderTop:'none',
          borderRadius:`0 0 ${C.r}px ${C.r}px`,
          boxShadow:'0 12px 32px rgba(0,0,0,0.12)', maxHeight:260, overflowY:'auto' }}>
          {sugs.map((f, i) => {
            const p = f.properties || {};
            const name = p.name || p.street || (p.label||'').split(',')[0];
            const sub  = [p.locality, p.region].filter(Boolean).join(', ');
            return (
              <button key={i} onMouseDown={e => { e.preventDefault(); pick(f); }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10,
                  padding:'10px 16px', background:'none', border:'none', cursor:'pointer',
                  textAlign:'left', borderBottom: i < sugs.length-1 ? `1px solid ${C.border}` : 'none',
                  transition:'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FFFBEB'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <span style={{ fontSize:17, flexShrink:0 }}>{icon(p)}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:"'DM Sans',sans-serif",
                    overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{name}</p>
                  {sub && <p style={{ fontSize:11, color:C.muted, fontFamily:"'DM Sans',sans-serif", marginTop:1 }}>{sub}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Verification banner ─────────────────────────────────────────────────────── */
const VerifBanner = ({ user, onUpload }) => {
  if (user.verificationStatus === 'verified') return null;
  const cfg = {
    pending:      { msg:'Your account is PENDING. Browse rides but you cannot book or offer until an admin verifies your college ID.', color:'#92400E', bg:'#FEF3C7', border:'#F59E0B', action:'Upload ID Card' },
    under_review: { msg:'Your ID is under review. You\'ll be notified once verified (usually within 24 h).', color:'#1E40AF', bg:'#DBEAFE', border:'#3B82F6', action:null },
    rejected:     { msg:`Your ID was rejected${user.verificationNote ? ': ' + user.verificationNote : ''}. Please re-upload a clear photo.`, color:'#991B1B', bg:'#FEE2E2', border:'#DC2626', action:'Re-upload ID' },
  }[user.verificationStatus];
  if (!cfg) return null;
  return (
    <div style={{ background:cfg.bg, borderBottom:`2px solid ${cfg.border}`, padding:'12px 20px',
      display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
      <p style={{ flex:1, fontSize:13, fontWeight:600, color:cfg.color, fontFamily:"'DM Sans',sans-serif" }}>{cfg.msg}</p>
      {cfg.action && (
        <button onClick={onUpload}
          style={{ padding:'7px 16px', background:cfg.color, color:'#fff', border:'none',
            borderRadius:8, fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
            whiteSpace:'nowrap' }}>
          {cfg.action}
        </button>
      )}
    </div>
  );
};

/* ─── ID upload modal ────────────────────────────────────────────────────────── */
const IdModal = ({ onClose, onSuccess, notify }) => {
  const [file, setFile] = useState(null);
  const [prev, setPrev] = useState(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef();
  const pick = f => { if (!f) return; setFile(f); setPrev(URL.createObjectURL(f)); };
  const submit = async () => {
    if (!file) return notify('Select a file first', 'error');
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('idCard', file);
      await api.post('/auth/verify-id', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      notify('ID uploaded! Admin will review within 24 h.', 'success');
      onSuccess(); onClose();
    } catch (e) { notify(e.response?.data?.error || 'Upload failed', 'error'); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.5)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div className="rs-card" style={{ width:'100%', maxWidth:400, padding:28, animation:'rsFadeUp 0.2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18 }}>Upload College ID</p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.muted }}>✕</button>
        </div>
        <div onClick={() => ref.current?.click()}
          style={{ border:`2px dashed ${C.border}`, borderRadius:12, height:140,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            cursor:'pointer', overflow:'hidden', marginBottom:14, background:'#FAFAFA' }}>
          {prev
            ? <img src={prev} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <><span style={{ fontSize:32, marginBottom:6 }}>📎</span>
               <p style={{ fontSize:13, color:C.muted }}>Tap to select · JPG, PNG, PDF · max 10 MB</p></>}
        </div>
        <input ref={ref} type="file" accept="image/*,.pdf" style={{ display:'none' }} onChange={e => pick(e.target.files[0])} />
        <button className="rs-btn-primary" onClick={submit} disabled={busy || !file}
          style={{ width:'100%', padding:'12px', fontSize:14, opacity: busy||!file ? 0.5 : 1 }}>
          {busy ? 'Uploading…' : 'Submit for Review'}
        </button>
      </div>
    </div>
  );
};

/* ─── Feedback / Review modal ────────────────────────────────────────────────── */
const FeedbackModal = ({ ride, currentUserId, onClose, notify }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState([]);
  const [busy, setBusy] = useState(false);
  const TAGS = ['punctual','safe_driver','friendly','clean_vehicle','good_conversation','on_time','reliable','recommended'];
  const isDriver = (ride.driver?._id || ride.driver) === currentUserId;
  // Driver reviews passengers; passenger reviews driver
  const revieweeId = isDriver
    ? (ride.bookings?.[0]?._id || ride.bookings?.[0])  // simplified: driver reviews first passenger
    : (ride.driver?._id || ride.driver);

  const submit = async () => {
    if (!revieweeId) return notify('No one to review on this ride', 'warning');
    setBusy(true);
    try {
      await api.post(`/reviews/${ride._id}`, { revieweeId, rating, comment, tags });
      notify('Feedback submitted! ⭐', 'success');
      onClose();
    } catch (e) { notify(e.response?.data?.error || 'Failed to submit', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.5)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div className="rs-card" style={{ width:'100%', maxWidth:420, padding:28, animation:'rsFadeUp 0.2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
          <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18 }}>Rate this ride</p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.muted }}>✕</button>
        </div>
        <p style={{ fontSize:13, color:C.muted, marginBottom:20, fontFamily:"'DM Sans',sans-serif" }}>
          {ride.from} → {ride.to}
        </p>
        {/* Stars */}
        <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:18 }}>
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={() => setRating(s)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:34,
                filter: s <= rating ? 'none' : 'grayscale(1) opacity(0.3)', transition:'all 0.15s' }}>⭐</button>
          ))}
        </div>
        {/* Tags */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
          {TAGS.map(t => (
            <button key={t} onClick={() => setTags(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev,t])}
              style={{ padding:'5px 12px', borderRadius:50, fontSize:12, fontFamily:"'DM Sans',sans-serif",
                fontWeight:600, cursor:'pointer', transition:'all 0.15s',
                background: tags.includes(t) ? C.accent : C.bg,
                border: `1.5px solid ${tags.includes(t) ? C.accentDk : C.border}`,
                color: tags.includes(t) ? '#000' : C.muted }}>
              {t.replace(/_/g,' ')}
            </button>
          ))}
        </div>
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Leave a comment (optional)…" rows={3}
          style={{ width:'100%', resize:'none', padding:'10px 13px', fontFamily:"'DM Sans',sans-serif",
            fontSize:13, border:`1.5px solid ${C.border}`, borderRadius:10,
            background:'#FAFAFA', outline:'none', marginBottom:14, color:C.text }} />
        <button className="rs-btn-primary" onClick={submit} disabled={busy}
          style={{ width:'100%', padding:'12px', fontSize:14, opacity: busy ? 0.5 : 1 }}>
          {busy ? 'Submitting…' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
};

/* ─── In-app Chat panel ───────────────────────────────────────────────────────── */
const ChatPanel = ({ ride, currentUser, onClose }) => {
  const [msgs, setMsgs]   = useState([]);
  const [text, setText]   = useState('');
  const [typing, setTyping] = useState('');
  const bottomRef = useRef(null);
  const sock = getSock();
  const rideId = ride._id;

  useEffect(() => {
    sock.emit('join-chat', rideId);
    const onMsg = m => setMsgs(prev => [...prev, m]);
    const onTyping = ({ userName }) => { if (userName !== currentUser.name) setTyping(`${userName} is typing…`); };
    const onStopTyping = () => setTyping('');
    sock.on('new-message', onMsg);
    sock.on('user-typing', onTyping);
    sock.on('user-stopped-typing', onStopTyping);
    return () => {
      sock.off('new-message', onMsg);
      sock.off('user-typing', onTyping);
      sock.off('user-stopped-typing', onStopTyping);
    };
  }, [rideId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const typingTimer = useRef(null);
  const handleTyping = e => {
    setText(e.target.value);
    sock.emit('typing', { rideId, userName: currentUser.name });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sock.emit('stop-typing', { rideId }), 1500);
  };

  const send = () => {
    if (!text.trim()) return;
    sock.emit('send-message', {
      rideId, senderId: currentUser.id || currentUser._id,
      senderName: currentUser.name, text: text.trim(),
    });
    setText('');
    sock.emit('stop-typing', { rideId });
  };

  const isMe = id => id === (currentUser.id || currentUser._id);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.5)',
      display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'0 0 0 0' }}>
      <div style={{ width:'100%', maxWidth:460, height:'72vh',
        background:'#fff', borderRadius:`${C.r*2}px ${C.r*2}px 0 0`,
        display:'flex', flexDirection:'column', animation:'rsFadeUp 0.25s ease',
        border:`1.5px solid ${C.border}`, borderBottom:'none' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px', borderBottom:`1.5px solid ${C.border}` }}>
          <div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16 }}>
              Ride Chat
            </p>
            <p style={{ fontSize:12, color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>
              {ride.from} → {ride.to} · messages auto-delete after 2h
            </p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:C.muted }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {msgs.length === 0 && (
            <div style={{ textAlign:'center', marginTop:40, color:C.muted, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
              <p style={{ fontSize:24, marginBottom:8 }}>💬</p>
              <p>No messages yet. Say hi to your co-riders!</p>
            </div>
          )}
          {msgs.map((m, i) => {
            const me = isMe(m.senderId);
            return (
              <div key={i} style={{ display:'flex', flexDirection:'column',
                alignItems: me ? 'flex-end' : 'flex-start' }}>
                {!me && <p style={{ fontSize:11, color:C.muted, marginBottom:3,
                  fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>{m.senderName}</p>}
                <div style={{ maxWidth:'75%', padding:'9px 13px', borderRadius:12,
                  background: me ? C.accent : C.bg,
                  borderBottomRightRadius: me ? 4 : 12,
                  borderBottomLeftRadius:  me ? 12 : 4,
                  border: `1px solid ${me ? C.accentDk : C.border}` }}>
                  <p style={{ fontSize:14, color: me ? '#000' : C.text, fontFamily:"'DM Sans',sans-serif" }}>{m.text}</p>
                </div>
                <p style={{ fontSize:10, color:C.faint, marginTop:3, fontFamily:"'DM Sans',sans-serif" }}>
                  {new Date(m.timestamp).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                </p>
              </div>
            );
          })}
          {typing && (
            <p style={{ fontSize:12, color:C.muted, fontStyle:'italic',
              fontFamily:"'DM Sans',sans-serif", animation:'rsPulse 1.5s infinite' }}>{typing}</p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding:'12px 16px', borderTop:`1.5px solid ${C.border}`,
          display:'flex', gap:10, alignItems:'center' }}>
          <input value={text} onChange={handleTyping}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Type a message…"
            style={{ flex:1, padding:'10px 14px', border:`1.5px solid ${C.border}`, borderRadius:50,
              fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:'none',
              background:'#FAFAFA', color:C.text }} />
          <button onClick={send} className="rs-btn-primary"
            style={{ padding:'10px 18px', fontSize:14, flexShrink:0 }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Live Location Panel ─────────────────────────────────────────────────────── */
const LocationPanel = ({ ride, currentUser, onClose, notify }) => {
  const [sharing, setSharing]   = useState(false);
  const [loc, setLoc]           = useState(null);       // my current location
  const [driverLoc, setDriverLoc] = useState(null);     // received from driver
  const watchRef = useRef(null);
  const sock = getSock();
  const rideId = ride._id;
  const isDriver = (ride.driver?._id || ride.driver) === (currentUser.id || currentUser._id);

  useEffect(() => {
    sock.emit('join-ride-tracking', rideId);
    const onLocUpdate = d => setDriverLoc(d);
    sock.on('location-update', onLocUpdate);
    return () => {
      sock.off('location-update', onLocUpdate);
      stopSharing();
    };
  }, [rideId]);

  const startSharing = () => {
    if (!navigator.geolocation) return notify('Geolocation not supported', 'error');
    setSharing(true);
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setLoc({ latitude, longitude });
        sock.emit('share-location', {
          rideId, latitude, longitude,
          driverId: currentUser.id || currentUser._id,
          driverName: currentUser.name,
        });
      },
      () => notify('Could not get your location', 'error'),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  };

  const stopSharing = () => {
    if (watchRef.current) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setSharing(false);
  };

  const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.5)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div className="rs-card" style={{ width:'100%', maxWidth:400, padding:28, animation:'rsFadeUp 0.2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18 }}>📍 Live Location</p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.muted }}>✕</button>
        </div>

        {/* My location sharing */}
        <div style={{ background:C.bg, borderRadius:12, padding:16, marginBottom:16, border:`1.5px solid ${C.border}` }}>
          <p style={{ fontSize:13, fontWeight:700, marginBottom:10, fontFamily:"'DM Sans',sans-serif" }}>
            Your location
          </p>
          {sharing ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:C.green,
                  animation:'rsPulse 1.5s infinite' }} />
                <span style={{ fontSize:13, color:C.green, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                  Sharing live location
                </span>
              </div>
              {loc && (
                <a href={mapsUrl(loc.latitude, loc.longitude)} target="_blank" rel="noreferrer"
                  style={{ fontSize:12, color:C.blue, fontFamily:"'DM Sans',sans-serif" }}>
                  📍 {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)} → Open in Maps
                </a>
              )}
              <button onClick={stopSharing}
                style={{ marginTop:12, width:'100%', padding:'9px', borderRadius:50,
                  background:'#FEE2E2', border:`1.5px solid ${C.red}`, color:C.red,
                  fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:13, cursor:'pointer' }}>
                Stop Sharing
              </button>
            </>
          ) : (
            <button className="rs-btn-primary" onClick={startSharing}
              style={{ width:'100%', padding:'10px', fontSize:14 }}>
              Start Sharing My Location
            </button>
          )}
        </div>

        {/* Driver/co-rider location */}
        {!isDriver && (
          <div style={{ background:C.bg, borderRadius:12, padding:16, border:`1.5px solid ${C.border}` }}>
            <p style={{ fontSize:13, fontWeight:700, marginBottom:10, fontFamily:"'DM Sans',sans-serif" }}>
              Driver location
            </p>
            {driverLoc ? (
              <>
                <p style={{ fontSize:12, color:C.muted, marginBottom:8, fontFamily:"'DM Sans',sans-serif" }}>
                  Last updated: {new Date(driverLoc.timestamp).toLocaleTimeString()}
                </p>
                <a href={mapsUrl(driverLoc.latitude, driverLoc.longitude)} target="_blank" rel="noreferrer"
                  style={{ fontSize:13, color:C.blue, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                  📍 Open driver location in Maps →
                </a>
              </>
            ) : (
              <p style={{ fontSize:13, color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>
                Waiting for driver to share location…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Notification panel ─────────────────────────────────────────────────────── */
const NotifPanel = ({ notifs, onClose }) => (
  <div style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.3)' }} onClick={onClose}>
    <div style={{ position:'absolute', top:64, right:12, width:300,
      background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:C.r,
      maxHeight:360, overflowY:'auto', boxShadow:'0 12px 40px rgba(0,0,0,0.15)' }}
      onClick={e => e.stopPropagation()}>
      <p style={{ padding:'14px 16px', fontFamily:"'Syne',sans-serif", fontWeight:700,
        fontSize:15, borderBottom:`1.5px solid ${C.border}` }}>Notifications</p>
      {notifs.length === 0
        ? <p style={{ padding:'20px 16px', color:C.muted, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
            Nothing yet
          </p>
        : notifs.map((n, i) => (
          <div key={i} style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}` }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:"'DM Sans',sans-serif" }}>{n.title || 'Notification'}</p>
            <p style={{ fontSize:12, color:C.muted, marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>{n.message}</p>
          </div>
        ))}
    </div>
  </div>
);

/* ─── Navbar ─────────────────────────────────────────────────────────────────── */
const Navbar = ({ user, tab, setTab, logout, notifCount, onBell }) => {
  const NAV = [
    { k:'find', l:'Find Rides' }, { k:'offer', l:'Offer Ride' },
    { k:'myrides', l:'Dashboard' }, { k:'leaderboard', l:'Leaderboard' },
  ];
  return (
    <header style={{ position:'sticky', top:0, zIndex:100, background:'#fff',
      borderBottom:`1.5px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 20px', height:60,
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer', flexShrink:0 }}
          onClick={() => setTab('find')}>
          <div style={{ width:34, height:34, background:C.accent, borderRadius:9,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>🚗</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:C.text,
            letterSpacing:'-0.4px' }}>RideShare</span>
        </div>
        {/* Desktop nav */}
        <nav className="rs-desk" style={{ display:'flex', gap:2 }}>
          {NAV.map(n => (
            <button key={n.k} onClick={() => setTab(n.k)}
              style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer',
                fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13,
                background: tab === n.k ? '#FFF8E7' : 'transparent',
                color: tab === n.k ? C.accentDk : C.muted,
                borderBottom: tab === n.k ? `2px solid ${C.accent}` : '2px solid transparent',
                transition:'all 0.15s' }}>
              {n.l}
            </button>
          ))}
        </nav>
        {/* Right actions */}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
          <button onClick={onBell}
            style={{ position:'relative', width:36, height:36, borderRadius:9,
              border:`1.5px solid ${C.border}`, background:'#fff', cursor:'pointer', fontSize:16 }}>
            🔔
            {notifCount > 0 && (
              <span style={{ position:'absolute', top:-4, right:-4, width:16, height:16,
                borderRadius:'50%', background:C.red, color:'#fff', fontSize:9, fontWeight:700,
                display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fff' }}>
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
          <button onClick={() => setTab('profile')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
              border:`1.5px solid ${C.border}`, borderRadius:50, background:'#fff',
              cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13 }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:C.accent,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>
              {user.name[0].toUpperCase()}
            </div>
            <span className="rs-desk">{user.name.split(' ')[0]}</span>
          </button>
          <button onClick={logout}
            style={{ width:36, height:36, border:`1.5px solid ${C.border}`, borderRadius:9,
              background:'#fff', cursor:'pointer', fontSize:15, color:C.muted }}>↪</button>
        </div>
      </div>
    </header>
  );
};

/* ─── Mobile bottom nav ───────────────────────────────────────────────────────── */
const MobNav = ({ tab, setTab }) => (
  <nav className="rs-mob" style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100,
    background:'#fff', borderTop:`1.5px solid ${C.border}`, display:'flex',
    paddingBottom:'env(safe-area-inset-bottom,0)' }}>
    {[
      { k:'find',        icon:'🔍', l:'Find' },
      { k:'offer',       icon:'➕', l:'Offer' },
      { k:'myrides',     icon:'📊', l:'Trips' },
      { k:'leaderboard', icon:'🏆', l:'Top'  },
      { k:'profile',     icon:'👤', l:'Me'   },
    ].map(n => (
      <button key={n.k} onClick={() => setTab(n.k)}
        style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
          gap:2, padding:'8px 0', background:'none', border:'none', cursor:'pointer',
          borderTop: tab===n.k ? `2.5px solid ${C.accent}` : '2.5px solid transparent',
          transition:'border-color 0.15s' }}>
        {n.k === 'offer' ? (
          <div style={{ width:40, height:40, background:C.accent, borderRadius:12,
            display:'flex', alignItems:'center', justifyContent:'center',
            marginTop:-12, fontSize:18, boxShadow:`0 4px 14px ${C.accent}80` }}>
            {n.icon}
          </div>
        ) : (
          <>
            <span style={{ fontSize:19 }}>{n.icon}</span>
            <span style={{ fontSize:10, fontWeight:600, color: tab===n.k ? C.accentDk : C.faint,
              fontFamily:"'DM Sans',sans-serif" }}>{n.l}</span>
          </>
        )}
      </button>
    ))}
  </nav>
);

/* ─── Stat card ──────────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, icon, accent }) => (
  <div className="rs-card" style={{ padding:'16px 18px', flex:1, minWidth:120 }}>
    <p style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase',
      letterSpacing:'0.07em', marginBottom:4, fontFamily:"'DM Sans',sans-serif" }}>{label}</p>
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ fontSize:20 }}>{icon}</span>
      <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22,
        color: accent || C.text }}>{value}</span>
    </div>
  </div>
);

/* ═══ PAGES ═══════════════════════════════════════════════════════════════════ */

/* ─── Landing ────────────────────────────────────────────────────────────────── */
const Landing = ({ setPage }) => (
  <div style={{ minHeight:'100vh', background:C.bg, fontFamily:"'DM Sans',sans-serif" }}>
    {/* Navbar */}
    <header style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, background:'#fff',
      borderBottom:`1.5px solid ${C.border}`, padding:'0 24px', height:60,
      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <div style={{ width:34, height:34, background:C.accent, borderRadius:9,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>🚗</div>
        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:C.text }}>RideShare</span>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => setPage('login')} className="rs-btn-ghost"
          style={{ padding:'8px 18px', fontSize:14 }}>Login</button>
        <button onClick={() => setPage('signup')} className="rs-btn-primary"
          style={{ padding:'8px 20px', fontSize:14 }}>Sign up</button>
      </div>
    </header>

    {/* Hero */}
    <section style={{ paddingTop:80, padding:'120px 24px 60px', maxWidth:700, margin:'0 auto', textAlign:'center' }}>
      <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px',
        background:'#FFF8E7', border:`1.5px solid ${C.accent}`, borderRadius:50,
        fontSize:12, color:C.accentDk, fontWeight:700, marginBottom:24, letterSpacing:'0.06em' }}>
        ★ NCR UNIVERSITIES ONLY · VERIFIED RIDES
      </div>
      <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800,
        fontSize:'clamp(38px,7vw,68px)', lineHeight:1.05, color:C.text, marginBottom:18 }}>
        Your commute,{' '}
        <span style={{ background:C.accent, padding:'2px 10px', borderRadius:6, display:'inline-block' }}>
          shared smarter.
        </span>
      </h1>
      <p style={{ fontSize:17, color:C.muted, lineHeight:1.7, maxWidth:480, margin:'0 auto 36px' }}>
        Match with verified classmates going your way. Save money, cut emissions, build community.
      </p>
      <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
        <button onClick={() => setPage('signup')} className="rs-btn-primary"
          style={{ padding:'14px 30px', fontSize:16 }}>Get Started →</button>
        <button onClick={() => setPage('login')} className="rs-btn-ghost"
          style={{ padding:'14px 26px', fontSize:16 }}>Login</button>
      </div>
    </section>

    {/* Org ticker */}
    <OrgTicker />

    {/* Stats strip */}
    <div style={{ background:'#fff', borderTop:`1.5px solid ${C.border}`,
      borderBottom:`1.5px solid ${C.border}`, padding:'28px 24px' }}>
      <div style={{ maxWidth:800, margin:'0 auto', display:'grid',
        gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16 }}>
        {[
          { icon:'🌿', val:'12.5k kg', label:'CO₂ Saved', accent:C.green },
          { icon:'👥', val:'2,847',    label:'Commuters', accent:C.blue },
          { icon:'💰', val:'₹8.2L',   label:'Saved',     accent:C.accentDk },
          { icon:'⭐', val:'4.8',     label:'Avg Rating', accent:C.accent },
        ].map((s, i) => <StatCard key={i} {...s} />)}
      </div>
    </div>

    {/* Features */}
    <section style={{ padding:'60px 24px', maxWidth:1000, margin:'0 auto' }}>
      <p style={{ fontSize:12, fontWeight:700, color:C.accent, letterSpacing:'0.1em',
        textTransform:'uppercase', marginBottom:8 }}>Why RideShare</p>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'clamp(26px,4vw,40px)',
        color:C.text, marginBottom:36 }}>Built for Indian commuters.</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
        {[
          { emoji:'🪪', t:'ID-Verified Only', b:'Upload college ID. Admin verifies. No strangers.' },
          { emoji:'🔒', t:'Public & Private Rides', b:'Public books instantly. Private needs approval.' },
          { emoji:'📍', t:'Live Tracking', b:'Share your GPS location with co-riders in real time.' },
          { emoji:'💬', t:'In-App Chat', b:'Chat with your ride group. Messages auto-delete after 2h.' },
          { emoji:'⭐', t:'Ratings & Trust', b:'Two-way feedback after every completed ride.' },
          { emoji:'🏆', t:'Leaderboard', b:'Org rankings by rides completed and CO₂ saved.' },
        ].map((f, i) => (
          <div key={i} className="rs-card" style={{ padding:20 }}>
            <span style={{ fontSize:28, marginBottom:10, display:'block' }}>{f.emoji}</span>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14,
              marginBottom:6, color:C.text }}>{f.t}</p>
            <p style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>{f.b}</p>
          </div>
        ))}
      </div>
    </section>

    <footer style={{ borderTop:`1.5px solid ${C.border}`, padding:'20px 24px', textAlign:'center' }}>
      <p style={{ fontSize:12, color:C.muted }}>Made for NCR · RideShare © 2026</p>
    </footer>
  </div>
);

/* ─── Auth pages ─────────────────────────────────────────────────────────────── */
const AuthPage = ({ type, setPage, onLogin }) => {
  const isLogin = type === 'login';
  const [f, setF] = useState({ name:'', email:'', password:'', phone:'', organization:'', role:'both' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!isLogin) {
      if (!f.name.trim())    e.name = 'Required';
      if (!f.organization)   e.organization = 'Select your university';
    }
    if (!isValidEmail(f.email)) e.email = 'Enter a valid email (Gmail, Outlook, edu, etc.)';
    if (f.password.length < 8 || !/[0-9]/.test(f.password))
      e.password = 'Min 8 characters, must include a number';
    return e;
  };

  const submit = async e => {
    e.preventDefault();
    const errs = validate(); setErrs(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const res = await api.post(`/auth/${isLogin ? 'login' : 'signup'}`, f);
      localStorage.setItem('token', res.data.token);
      onLogin(res.data.user);
    } catch (ex) {
      setErrs({ api: ex.response?.data?.error || 'Something went wrong' });
    } finally { setBusy(false); }
  };

  const Inp = ({ label, fkey, type = 'text', placeholder }) => (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase',
        letterSpacing:'0.07em', color:C.muted, marginBottom:5, fontFamily:"'DM Sans',sans-serif" }}>
        {label}
      </label>
      <input type={type} placeholder={placeholder} value={f[fkey]}
        onChange={e => set(fkey, e.target.value)} required
        className="rs-input"
        style={{ borderColor: errs[fkey] ? C.red : C.border }} />
      {errs[fkey] && <p style={{ color:C.red, fontSize:11, marginTop:3, fontFamily:"'DM Sans',sans-serif" }}>{errs[fkey]}</p>}
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center',
      justifyContent:'center', padding:24 }}>
      <div className="rs-card" style={{ width:'100%', maxWidth:420, padding:36,
        boxShadow:'0 4px 32px rgba(0,0,0,0.08)', animation:'rsFadeUp 0.25s ease' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:28 }}>
          <div style={{ width:34, height:34, background:C.accent, borderRadius:9,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>🚗</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18 }}>RideShare</span>
        </div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:24, marginBottom:4 }}>
          {isLogin ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ color:C.muted, fontSize:14, marginBottom:24 }}>
          {isLogin ? 'Sign in to continue' : 'Verified students only'}
        </p>

        {errs.api && (
          <div style={{ background:'#FEE2E2', border:`1.5px solid ${C.red}`, borderRadius:8,
            padding:'10px 14px', marginBottom:14, color:C.red, fontSize:13, fontWeight:600 }}>
            {errs.api}
          </div>
        )}

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {!isLogin && <>
            <Inp label="Full Name" fkey="name" placeholder="Your full name" />
            <Inp label="Phone" fkey="phone" type="tel" placeholder="+91 99999 99999" />
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.07em', color:C.muted, marginBottom:5, fontFamily:"'DM Sans',sans-serif" }}>
                University
              </label>
              <select value={f.organization} onChange={e => set('organization', e.target.value)}
                required className="rs-input" style={{ borderColor: errs.organization ? C.red : C.border }}>
                <option value="">Select your university…</option>
                {ORGS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {errs.organization && <p style={{ color:C.red, fontSize:11, marginTop:3 }}>{errs.organization}</p>}
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.07em', color:C.muted, marginBottom:5 }}>Role</label>
              <div style={{ display:'flex', gap:6 }}>
                {[{v:'rider',l:'🧑 Rider'},{v:'driver',l:'🚗 Driver'},{v:'both',l:'↔ Both'}].map(r => (
                  <button key={r.v} type="button" onClick={() => set('role', r.v)}
                    style={{ flex:1, padding:'9px 0', borderRadius:8, border:`1.5px solid ${f.role===r.v ? C.accent : C.border}`,
                      background: f.role===r.v ? '#FFF8E7' : '#fff', color: f.role===r.v ? C.accentDk : C.muted,
                      fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13, cursor:'pointer' }}>
                    {r.l}
                  </button>
                ))}
              </div>
            </div>
          </>}
          <Inp label="Email" fkey="email" type="email" placeholder="you@university.edu" />
          <Inp label="Password" fkey="password" type="password" placeholder="Min 8 chars, incl. a number" />
          {!isLogin && (
            <div style={{ padding:'10px 14px', background:'#EFF6FF', border:`1.5px solid #BFDBFE`,
              borderRadius:8, fontSize:12, color:C.blue }}>
              📌 After signing up, upload your college ID card from your Profile tab to activate booking.
            </div>
          )}
          <button type="submit" className="rs-btn-primary" disabled={busy}
            style={{ padding:'13px', fontSize:15, opacity: busy ? 0.5 : 1, marginTop:4 }}>
            {busy ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop:18, textAlign:'center', fontSize:13, color:C.muted }}>
          {isLogin ? 'New here? ' : 'Already have an account? '}
          <button onClick={() => setPage(isLogin ? 'signup' : 'login')}
            style={{ background:'none', border:'none', color:C.accentDk, fontWeight:700,
              cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13, textDecoration:'underline' }}>
            {isLogin ? 'Create account' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

/* ─── Find Rides (real-time via socket) ──────────────────────────────────────── */
const FindRides = ({ user, notify }) => {
  const [rides, setRides] = useState([]);
  const [from, setFrom]   = useState('');
  const [to, setTo]       = useState('');
  const [type, setType]   = useState('all');
  const [loading, setLoading] = useState(false);
  const [reviewUser, setReviewUser] = useState(null); // { id, name }
  const uid = user.id || user._id;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (from) p.append('from', from);
      if (to)   p.append('to', to);
      if (type !== 'all') p.append('type', type);
      const r = await api.get(`/rides/search?${p}`);
      setRides(r.data.rides || []);
    } catch { notify('Failed to load rides', 'error'); }
    finally { setLoading(false); }
  }, [from, to, type]);

  // Initial load + real-time updates via socket
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const sock = getSock();
    // Re-fetch whenever any ride is created or updated
    const onUpdate = () => load();
    sock.on('ride-updated', onUpdate);
    sock.on('new-ride', onUpdate);
    return () => { sock.off('ride-updated', onUpdate); sock.off('new-ride', onUpdate); };
  }, [load]);

  const book = async (ride) => {
    if (user.verificationStatus !== 'verified') return notify('Verify your account first', 'error');
    try {
      if (ride.visibility === 'private') {
        await api.post(`/rides/request/${ride._id}`);
        notify('Request sent! Waiting for driver approval.', 'info');
      } else {
        const r = await api.post(`/rides/book/${ride._id}`);
        notify(`Booked! 🎉 Saved ${r.data.carbonSaved?.toFixed?.(2) || 0} kg CO₂`, 'success');
        load();
      }
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'error'); }
  };

  return (
    <div>
      <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:32, marginBottom:4 }}>Find a ride</h1>
      <p style={{ color:C.muted, fontSize:14, marginBottom:20 }}>
        Showing rides from {user.organization}
      </p>

      {/* Search box */}
      <div className="rs-card" style={{ marginBottom:16, overflow:'visible' }}>
        <LocationInput placeholder="From — pickup point" value={from} dotColor={C.green}
          onChange={name => setFrom(name)} />
        <div style={{ height:1, background:C.border, marginLeft:35 }} />
        <LocationInput placeholder="To — destination" value={to} dotColor={C.red}
          onChange={name => setTo(name)} />
        <div style={{ padding:'10px 14px', borderTop:`1px solid ${C.border}`,
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', gap:6 }}>
            {[['all','All'],['carpool','🚗 Car'],['bikepool','🏍 Bike']].map(([v,l]) => (
              <button key={v} onClick={() => setType(v)}
                style={{ padding:'6px 13px', borderRadius:50, border:`1.5px solid ${type===v ? C.accent : C.border}`,
                  background: type===v ? '#FFF8E7' : '#fff', color: type===v ? C.accentDk : C.muted,
                  fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:12, cursor:'pointer' }}>
                {l}
              </button>
            ))}
          </div>
          <button className="rs-btn-primary" onClick={load} style={{ padding:'8px 20px', fontSize:13 }}>
            Search
          </button>
        </div>
      </div>

      {user.verificationStatus !== 'verified' && (
        <div style={{ background:'#FEF3C7', border:`1.5px solid ${C.accent}`, borderRadius:10,
          padding:'12px 16px', marginBottom:14, fontSize:13, fontWeight:600, color:'#92400E' }}>
          Your account is PENDING. You can browse but cannot book until your college ID is verified.
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
          <div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid ${C.border}`,
            borderTopColor:C.accent, animation:'rsSpin 0.8s linear infinite' }} />
        </div>
      ) : rides.length === 0 ? (
        <div className="rs-card" style={{ padding:'48px', textAlign:'center' }}>
          <p style={{ fontSize:40, marginBottom:12 }}>🚗</p>
          <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18, marginBottom:6 }}>No rides found</p>
          <p style={{ color:C.muted, fontSize:14 }}>Be the first to offer a ride!</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {rides.map(ride => {
            const isOwn  = (ride.driver?._id || ride.driver) === uid;
            const seatsL = ride.seats - (ride.bookings?.length || 0);
            const isFull = seatsL <= 0;
            const isBooked = ride.bookings?.some(b => (b._id || b) === uid);
            const isPrivate = ride.visibility === 'private';
            const driverRating = ride.driver?.rating || 5.0;
            const driverReviews = ride.driver?.totalRatings || 0;

            return (
              <div key={ride._id} className="rs-card" style={{ padding:18, transition:'transform 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform='none'}>
                {/* Top row */}
                <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:12 }}>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:'#FFF8E7',
                      border:`1.5px solid ${C.accent}`, display:'flex', alignItems:'center',
                      justifyContent:'center', fontWeight:800, fontSize:16, flexShrink:0 }}>
                      {ride.driver?.name?.[0] || '?'}
                    </div>
                    <div>
                      <p style={{ fontWeight:700, fontSize:14, fontFamily:"'DM Sans',sans-serif" }}>
                        {ride.driver?.name}
                      </p>
                      <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap', marginTop:2 }}>
                        <button onClick={() => setReviewUser({ id: ride.driver?._id, name: ride.driver?.name })}
                          style={{ background:'none', border:'none', cursor:'pointer', padding:0,
                            fontSize:11, color:C.accent, fontFamily:"'DM Sans',sans-serif" }}>
                          ★ {driverRating.toFixed(1)} ({driverReviews})
                        </button>
                        <TrustBadge rating={driverRating} totalRatings={driverReviews} />
                        {isPrivate && <Tag label="PRIVATE" color={C.purple} />}
                        {ride.recurring && <Tag label="RECURRING" color={C.blue} />}
                        {ride.type === 'bikepool' && ride.helmetProvided && <Tag label="⛑️ HELMET" color={C.green} />}
                        {ride.type === 'bikepool' && <Tag label="BIKEPOOL" color={C.muted} />}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:C.text }}>
                      ₹{ride.price}
                    </p>
                    <p style={{ fontSize:11, color:C.faint }}>per seat</p>
                    {/* Payment badges */}
                    {ride.acceptedPayments?.length > 0 && (
                      <div style={{ display:'flex', gap:3, justifyContent:'flex-end', marginTop:3 }}>
                        {ride.acceptedPayments.includes('cash') && (
                          <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:'#F0FDF4',
                            color:C.green, fontWeight:700, border:`1px solid ${C.green}30` }}>CASH</span>
                        )}
                        {ride.acceptedPayments.includes('upi') && (
                          <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:'#EFF6FF',
                            color:C.blue, fontWeight:700, border:`1px solid ${C.blue}30` }}>UPI</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Route */}
                <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, paddingTop:3 }}>
                    <div style={{ width:9, height:9, borderRadius:'50%', background:C.green, border:`1.5px solid #fff`, boxShadow:`0 0 0 1.5px ${C.green}` }} />
                    <div style={{ width:1.5, height:22, background:C.border }} />
                    <div style={{ width:9, height:9, borderRadius:'50%', background:C.red, border:`1.5px solid #fff`, boxShadow:`0 0 0 1.5px ${C.red}` }} />
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <p style={{ fontSize:14, fontWeight:600 }}>{ride.from}</p>
                    <p style={{ fontSize:14, fontWeight:600 }}>{ride.to}</p>
                  </div>
                </div>

                {/* Meta */}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                  {[
                    `🕐 ${ride.time}`,
                    `📅 ${new Date(ride.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}`,
                    `💺 ${seatsL} left`,
                    `📍 ${ride.distance} km`,
                    ride.duration && `⏱ ~${ride.duration} min`,
                  ].filter(Boolean).map((c, j) => (
                    <span key={j} style={{ padding:'3px 10px', border:`1px solid ${C.border}`, borderRadius:50,
                      fontSize:11, color:C.muted, fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>{c}</span>
                  ))}
                </div>

                {/* Action */}
                {isBooked ? (
                  <div style={{ display:'flex', alignItems:'center', gap:6, color:C.green, fontSize:13, fontWeight:700 }}>
                    ✓ Booked
                  </div>
                ) : isOwn ? (
                  <span style={{ fontSize:13, color:C.muted }}>Your ride</span>
                ) : isFull ? (
                  <span style={{ fontSize:13, color:C.faint }}>Full</span>
                ) : (
                  <button className="rs-btn-primary" onClick={() => book(ride)}
                    disabled={user.verificationStatus !== 'verified'}
                    style={{ padding:'9px 22px', fontSize:13,
                      opacity: user.verificationStatus !== 'verified' ? 0.4 : 1,
                      background: isPrivate ? C.purple : C.accent,
                      color: isPrivate ? '#fff' : '#000' }}>
                    {isPrivate ? '🔒 Request to Join' : 'Book Now'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reviews modal */}
      {reviewUser && (
        <ReviewsModal userId={reviewUser.id} userName={reviewUser.name}
          onClose={() => setReviewUser(null)} />
      )}
    </div>
  );
};

const Tag = ({ label, color }) => (
  <span style={{ padding:'2px 7px', borderRadius:4, fontSize:10, fontWeight:700,
    fontFamily:"'DM Sans',sans-serif", background:`${color}15`, color, border:`1px solid ${color}40` }}>
    {label}
  </span>
);

/* ─── Offer Ride ─────────────────────────────────────────────────────────────── */
const OfferRide = ({ user, notify, onSuccess }) => {
  const [f, setF] = useState({
    type:'carpool', visibility:'public', from:'', to:'',
    date:'', time:'', seats:3, price:'', distance:'',
    recurring:false, days:[], helmetProvided:false,
    acceptedPayments:['cash'], driverUpiId:'',
  });
  const [busy, setBusy] = useState(false);
  const [distBusy, setDistBusy] = useState(false);
  const [distAuto, setDistAuto] = useState(false);
  const [estDuration, setEstDuration] = useState(null);
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const set  = (k, v) => setF(p => ({ ...p, [k]: v }));

  const calcDistance = useCallback(async (fromVal, toVal) => {
    if (!fromVal || fromVal.length < 3 || !toVal || toVal.length < 3) return;
    setDistBusy(true);
    try {
      const r = await api.get('/rides/distance', { params: { from: fromVal, to: toVal } });
      if (r.data.distance) {
        set('distance', r.data.distance);
        setEstDuration(r.data.duration || null);
        setDistAuto(true);
        notify(`📍 Distance: ${r.data.distance} km (~${r.data.duration} min)`, 'success');
      }
    } catch { /* user can enter manually */ }
    finally { setDistBusy(false); }
  }, []);

  const handleLocChange = (key, name, feat) => {
    set(key, name);
    const other = key === 'from' ? f.to : f.from;
    if (name && other && feat) setTimeout(() => calcDistance(
      key === 'from' ? name : other, key === 'to' ? name : other), 300);
  };

  const togglePay = (m) => {
    const cur = f.acceptedPayments || [];
    const next = cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m];
    if (next.length === 0) return;
    set('acceptedPayments', next);
  };

  const submit = async e => {
    e.preventDefault();
    if (user.verificationStatus !== 'verified') return notify('Verify your account first', 'error');
    if (!f.from || !f.to) return notify('Enter pickup and destination', 'error');
    if (!f.distance) return notify('Distance required. Click "Calculate" or enter manually.', 'error');
    if (f.acceptedPayments.includes('upi') && !f.driverUpiId) return notify('Enter your UPI ID', 'error');
    setBusy(true);
    try {
      await api.post('/rides/create', f);
      notify('Ride listed! 🚗', 'success');
      getSock().emit('new-ride', { org: user.organization });
      setF({ type:'carpool', visibility:'public', from:'', to:'', date:'', time:'',
        seats:3, price:'', distance:'', recurring:false, days:[], helmetProvided:false,
        acceptedPayments:['cash'], driverUpiId:'' });
      setDistAuto(false); setEstDuration(null);
      onSuccess?.();
    } catch (e) { notify(e.response?.data?.error || 'Failed to create ride', 'error'); }
    finally { setBusy(false); }
  };

  const Toggle = ({ on, onClick, label }) => (
    <label onClick={onClick} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
      <div style={{ width:42, height:22, borderRadius:11,
        background: on ? C.accent : C.border, position:'relative', transition:'background 0.2s', flexShrink:0 }}>
        <div style={{ position:'absolute', top:2, left: on ? 22 : 2, width:18, height:18,
          borderRadius:9, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 0.2s' }} />
      </div>
      <span style={{ fontSize:14, color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>{label}</span>
    </label>
  );

  if (user.verificationStatus !== 'verified') return (
    <div>
      <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:32, marginBottom:24 }}>Offer a Ride</h1>
      <div className="rs-card" style={{ padding:32, textAlign:'center', borderColor:C.accent }}>
        <p style={{ fontSize:32, marginBottom:12 }}>🔒</p>
        <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18, marginBottom:6 }}>Account not verified</p>
        <p style={{ color:C.muted, fontSize:14 }}>Upload your college ID from Profile and wait for admin approval.</p>
      </div>
    </div>
  );

  return (
    <div>
      <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:32, marginBottom:24 }}>Offer a ride</h1>
      <div className="rs-card" style={{ padding:24, maxWidth:640 }}>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
          {/* Type */}
          <div>
            <Label>Ride Type</Label>
            <SegControl
              options={[{v:'carpool',l:'🚗 Carpool'},{v:'bikepool',l:'🏍️ Bikepool'}]}
              value={f.type}
              onChange={v => { set('type', v); set('seats', v === 'bikepool' ? 1 : 3); }}
            />
          </div>
          {/* Visibility */}
          <div>
            <Label>Who can book?</Label>
            <SegControl
              options={[{v:'public',l:'🌐 Public (instant)'},{v:'private',l:'🔒 Private (approval)'}]}
              value={f.visibility}
              onChange={v => set('visibility', v)}
              accentColor={f.visibility === 'private' ? C.purple : C.accent}
            />
            <p style={{ fontSize:12, color:C.muted, marginTop:5, fontFamily:"'DM Sans',sans-serif" }}>
              {f.visibility === 'public'
                ? 'Any verified org member can book instantly.'
                : 'Passengers must request — you approve or decline each.'}
            </p>
          </div>
          {/* Route */}
          <div>
            <Label>Route</Label>
            <div className="rs-card" style={{ overflow:'visible', borderRadius:12 }}>
              <LocationInput placeholder="From — pickup point" value={f.from}
                dotColor={C.green} required onChange={(name, feat) => handleLocChange('from', name, feat)} />
              <div style={{ height:1, background:C.border, marginLeft:35 }} />
              <LocationInput placeholder="To — destination" value={f.to}
                dotColor={C.red} required onChange={(name, feat) => handleLocChange('to', name, feat)} />
            </div>
          </div>
          {/* Date / Time */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><Label>Date</Label>
              <input type="date" required value={f.date} onChange={e => set('date', e.target.value)} className="rs-input" /></div>
            <div><Label>Time</Label>
              <input type="time" required value={f.time} onChange={e => set('time', e.target.value)} className="rs-input" /></div>
          </div>
          {/* Distance — auto-calc + manual */}
          <div>
            <Label>Distance (km)</Label>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input type="number" required value={f.distance} placeholder="e.g. 8.5" step="0.1"
                readOnly={distAuto}
                onChange={e => { set('distance', e.target.value); setDistAuto(false); }}
                className="rs-input"
                style={{ flex:1, background: distAuto ? '#F0FDF4' : '#fff',
                  borderColor: distAuto ? C.green : C.border }} />
              <button type="button" onClick={() => calcDistance(f.from, f.to)}
                disabled={distBusy || !f.from || !f.to}
                style={{ padding:'10px 16px', borderRadius:10, border:`1.5px solid ${C.accent}`,
                  background:'#FFF8E7', color:C.accentDk, fontWeight:700, fontSize:12,
                  cursor:'pointer', whiteSpace:'nowrap', fontFamily:"'DM Sans',sans-serif",
                  opacity: (distBusy || !f.from || !f.to) ? 0.5 : 1, display:'flex', alignItems:'center', gap:6 }}>
                {distBusy ? (
                  <div style={{ width:14, height:14, borderRadius:'50%', border:`2px solid ${C.border}`,
                    borderTopColor:C.accent, animation:'rsSpin 0.7s linear infinite' }} />
                ) : '📍'}
                {distBusy ? 'Calculating...' : 'Calculate'}
              </button>
            </div>
            {distAuto && estDuration && (
              <div style={{ display:'flex', gap:8, marginTop:6, alignItems:'center' }}>
                <span style={{ fontSize:12, color:C.green, fontWeight:600 }}>
                  ✓ Auto-calculated · ~{estDuration} min drive
                </span>
                <button type="button" onClick={() => { setDistAuto(false); set('distance',''); setEstDuration(null); }}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:11,
                    color:C.muted, textDecoration:'underline' }}>✏️ Edit</button>
              </div>
            )}
            {!distAuto && !distBusy && (
              <p style={{ fontSize:11, color:C.faint, marginTop:4 }}>
                💡 Select locations from suggestions for auto-calculation
              </p>
            )}
          </div>
          {/* Seats / Price */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><Label>Seats</Label>
              <input type="number" min={1} max={f.type==='bikepool'?1:6} value={f.seats}
                disabled={f.type === 'bikepool'}
                onChange={e => set('seats', parseInt(e.target.value)||1)}
                className="rs-input" style={{ opacity: f.type==='bikepool' ? 0.5 : 1 }} /></div>
            <div><Label>Price / seat (₹)</Label>
              <input type="number" min={0} required value={f.price} placeholder="0"
                onChange={e => set('price', e.target.value)} className="rs-input" /></div>
          </div>
          {/* Payment methods */}
          <div>
            <Label>Accepted Payments</Label>
            <div style={{ display:'flex', gap:8 }}>
              {[{ v:'cash', l:'💵 Cash', color:C.green }, { v:'upi', l:'📱 UPI', color:C.blue }].map(pm => (
                <button key={pm.v} type="button" onClick={() => togglePay(pm.v)}
                  style={{ flex:1, padding:'9px 0', borderRadius:8,
                    border:`1.5px solid ${f.acceptedPayments.includes(pm.v) ? pm.color : C.border}`,
                    background: f.acceptedPayments.includes(pm.v) ? `${pm.color}10` : '#fff',
                    color: f.acceptedPayments.includes(pm.v) ? pm.color : C.muted,
                    fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13, cursor:'pointer' }}>
                  {pm.l}
                </button>
              ))}
            </div>
            {f.acceptedPayments.includes('upi') && (
              <div style={{ marginTop:8 }}>
                <input type="text" placeholder="Your UPI ID (e.g. name@upi)"
                  value={f.driverUpiId} onChange={e => set('driverUpiId', e.target.value)}
                  className="rs-input" />
                <p style={{ fontSize:11, color:C.faint, marginTop:3 }}>
                  🔒 Direct UPI payment coming soon. Passengers will see your UPI ID to pay directly.
                </p>
              </div>
            )}
          </div>
          <Toggle on={f.recurring} onClick={() => set('recurring', !f.recurring)} label="Daily recurring commute" />
          {f.recurring && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {DAYS.map(d => (
                <button key={d} type="button"
                  onClick={() => set('days', f.days.includes(d) ? f.days.filter(x=>x!==d) : [...f.days,d])}
                  style={{ padding:'5px 12px', borderRadius:50,
                    border:`1.5px solid ${f.days.includes(d) ? C.accent : C.border}`,
                    background: f.days.includes(d) ? '#FFF8E7' : '#fff',
                    color: f.days.includes(d) ? C.accentDk : C.muted,
                    fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:12, cursor:'pointer' }}>
                  {d}
                </button>
              ))}
            </div>
          )}
          {f.type === 'bikepool' && (
            <Toggle on={f.helmetProvided} onClick={() => set('helmetProvided', !f.helmetProvided)}
              label="I'll provide a helmet" />
          )}
          <button type="submit" className="rs-btn-primary" disabled={busy}
            style={{ padding:'13px', fontSize:15, opacity: busy ? 0.5 : 1 }}>
            {busy ? 'Creating…' : 'List My Ride'}
          </button>
        </form>
      </div>
    </div>
  );
};

const Label = ({ children }) => (
  <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase',
    letterSpacing:'0.07em', color:C.muted, marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>
    {children}
  </label>
);

const SegControl = ({ options, value, onChange, accentColor }) => {
  const ac = accentColor || C.accent;
  return (
    <div style={{ display:'flex', background:C.bg, borderRadius:10, padding:3,
      border:`1.5px solid ${C.border}` }}>
      {options.map(o => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          style={{ flex:1, padding:'8px 0', borderRadius:8, border:'none', cursor:'pointer',
            fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13, transition:'all 0.15s',
            background: value===o.v ? '#fff' : 'transparent',
            color: value===o.v ? ac : C.muted,
            boxShadow: value===o.v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
          {o.l}
        </button>
      ))}
    </div>
  );
};

/* ─── My Rides Dashboard ─────────────────────────────────────────────────────── */
const MyRides = ({ user, notify }) => {
  const [view, setView]   = useState('offered');
  const [data, setData]   = useState({ offered:[], booked:[] });
  const [loading, setLoading] = useState(true);
  const [chatRide, setChatRide]         = useState(null);
  const [locRide, setLocRide]           = useState(null);
  const [feedbackRide, setFeedbackRide] = useState(null);
  const uid = user.id || user._id;

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/rides/my-rides');
      setData({ offered: r.data.offeredRides || [], booked: r.data.bookedRides || [] });
    } catch { notify('Failed to load rides', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Real-time updates
  useEffect(() => {
    const sock = getSock();
    const refresh = () => load();
    sock.on('ride-updated', refresh);
    sock.on('booking-approved', refresh);
    return () => { sock.off('ride-updated', refresh); sock.off('booking-approved', refresh); };
  }, []);

  const doComplete = async id => {
    try { await api.put(`/rides/complete/${id}`); notify('Ride completed! 🎉', 'success'); load(); }
    catch (e) { notify(e.response?.data?.error || 'Failed', 'error'); }
  };

  const doCancel = async (id, type) => {
    if (!window.confirm(type==='ride' ? 'Cancel this ride? All passengers will be notified.' : 'Cancel your booking?')) return;
    try {
      if (type === 'ride') await api.delete(`/rides/cancel-ride/${id}`);
      else await api.delete(`/rides/cancel-booking/${id}`);
      notify('Cancelled', 'success'); load();
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'error'); }
  };

  const doApprove = async (rideId, userId) => {
    try { await api.put(`/rides/approve/${rideId}/${userId}`); notify('Approved! ✅', 'success'); load(); }
    catch (e) { notify(e.response?.data?.error || 'Failed', 'error'); }
  };

  const doDecline = async (rideId, userId) => {
    try { await api.put(`/rides/decline/${rideId}/${userId}`); notify('Declined', 'info'); load(); }
    catch (e) { notify(e.response?.data?.error || 'Failed', 'error'); }
  };

  const STATUS_STYLE = {
    scheduled: { bg:'#DBEAFE', color:'#1D4ED8' },
    ongoing:   { bg:'#DCFCE7', color:'#166534' },
    completed: { bg:'#F3F4F6', color:'#374151' },
    cancelled: { bg:'#FEE2E2', color:'#991B1B' },
  };

  const rides = view === 'offered' ? data.offered : data.booked;

  return (
    <div>
      {/* Header stats */}
      <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
        <StatCard icon="👤" label="Name" value={user.name.split(' ')[0]} />
        <StatCard icon="🚗" label="Rides Offered"  value={data.offered.length} accent={C.blue} />
        <StatCard icon="🏍" label="Rides Taken"    value={data.booked.length}  accent={C.green} />
        <StatCard icon="⭐" label="Rating"         value={(user.rating || 5.0).toFixed(1)} accent={C.accent} />
      </div>

      {/* Tab row */}
      <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        {[['offered','🚗 Offered'],['booked','🏍 Booked']].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)}
            style={{ padding:'8px 18px', borderRadius:50,
              border:`1.5px solid ${view===k ? C.accent : C.border}`,
              background: view===k ? '#FFF8E7' : '#fff',
              color: view===k ? C.accentDk : C.muted,
              fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:13, cursor:'pointer' }}>
            {l}
          </button>
        ))}
        <button onClick={load}
          style={{ padding:'8px 12px', borderRadius:50, border:`1.5px solid ${C.border}`,
            background:'#fff', cursor:'pointer', fontSize:15 }}>🔄</button>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
          <div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid ${C.border}`,
            borderTopColor:C.accent, animation:'rsSpin 0.8s linear infinite' }} />
        </div>
      ) : rides.length === 0 ? (
        <div className="rs-card" style={{ padding:'48px', textAlign:'center' }}>
          <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18, color:C.muted }}>
            No {view} rides yet
          </p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {rides.map(ride => {
            const isDriver = view === 'offered';
            const ss = STATUS_STYLE[ride.status] || STATUS_STYLE.scheduled;
            return (
              <div key={ride._id} className="rs-card" style={{ padding:18, animation:'rsFadeUp 0.2s ease' }}>
                {/* Top */}
                <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:10 }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:15, fontFamily:"'DM Sans',sans-serif" }}>
                      {ride.from} → {ride.to}
                    </p>
                    <p style={{ fontSize:12, color:C.muted, marginTop:3 }}>
                      {isDriver ? "You're driving" : `Driver: ${ride.driver?.name || 'N/A'}`}
                    </p>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'flex-start', flexWrap:'wrap' }}>
                    <span style={{ padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:700,
                      background:ss.bg, color:ss.color, textTransform:'uppercase' }}>
                      {ride.status}
                    </span>
                    {ride.visibility === 'private' && <Tag label="PRIVATE" color={C.purple} />}
                  </div>
                </div>

                {/* Meta chips */}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                  {[
                    `🕐 ${ride.time}`,
                    `📅 ${new Date(ride.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}`,
                    `💺 ${ride.bookings?.length||0}/${ride.seats}`,
                    `₹${ride.price}`,
                    `📍 ${ride.distance} km`,
                  ].map((c, i) => (
                    <span key={i} style={{ padding:'3px 10px', border:`1px solid ${C.border}`, borderRadius:50,
                      fontSize:11, color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>{c}</span>
                  ))}
                </div>

                {/* Action buttons */}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {/* Chat — available if ride is scheduled or ongoing */}
                  {['scheduled','ongoing'].includes(ride.status) && (
                    <button onClick={() => setChatRide(ride)}
                      style={{ padding:'7px 14px', borderRadius:50, border:`1.5px solid ${C.blue}`,
                        background:'#EFF6FF', color:C.blue, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      💬 Chat
                    </button>
                  )}
                  {/* Live location */}
                  {['scheduled','ongoing'].includes(ride.status) && (
                    <button onClick={() => setLocRide(ride)}
                      style={{ padding:'7px 14px', borderRadius:50, border:`1.5px solid ${C.green}`,
                        background:'#F0FDF4', color:C.green, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      📍 Location
                    </button>
                  )}
                  {/* Complete (driver only) */}
                  {isDriver && ride.status === 'scheduled' && (
                    <button onClick={() => doComplete(ride._id)}
                      style={{ padding:'7px 14px', borderRadius:50, border:`1.5px solid ${C.green}`,
                        background:'#F0FDF4', color:C.green, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      ✓ Complete
                    </button>
                  )}
                  {/* Cancel */}
                  {isDriver && ['scheduled','ongoing'].includes(ride.status) && (
                    <button onClick={() => doCancel(ride._id, 'ride')}
                      style={{ padding:'7px 14px', borderRadius:50, border:`1.5px solid ${C.red}`,
                        background:'#FEF2F2', color:C.red, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      Cancel Ride
                    </button>
                  )}
                  {!isDriver && ride.status === 'scheduled' && (
                    <button onClick={() => doCancel(ride._id, 'booking')}
                      style={{ padding:'7px 14px', borderRadius:50, border:`1.5px solid ${C.red}`,
                        background:'#FEF2F2', color:C.red, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      Cancel Booking
                    </button>
                  )}
                  {/* Feedback — completed rides */}
                  {ride.status === 'completed' && !ride.reviewsGiven?.includes(uid) && (
                    <button onClick={() => setFeedbackRide(ride)}
                      style={{ padding:'7px 14px', borderRadius:50, border:`1.5px solid ${C.accent}`,
                        background:'#FFF8E7', color:C.accentDk, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      ⭐ Give Feedback
                    </button>
                  )}
                </div>

                {/* Pending booking requests (driver sees) */}
                {isDriver && ride.pendingBookings?.length > 0 && (
                  <div style={{ marginTop:12, padding:14, background:'#FFF8E7',
                    border:`1.5px solid ${C.accent}`, borderRadius:10 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:C.accentDk, marginBottom:10,
                      textTransform:'uppercase', letterSpacing:'0.07em' }}>
                      Pending Requests ({ride.pendingBookings.length})
                    </p>
                    {ride.pendingBookings.map(p => (
                      <div key={p.user?._id || p.user}
                        style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'space-between',
                          padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:28, height:28, borderRadius:8, background:'#FFF8E7',
                            border:`1.5px solid ${C.accent}`, display:'flex', alignItems:'center',
                            justifyContent:'center', fontWeight:700, fontSize:12 }}>
                            {(p.user?.name || '?')[0]}
                          </div>
                          <div>
                            <p style={{ fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>{p.user?.name || 'User'}</p>
                            {p.message && <p style={{ fontSize:11, color:C.muted }}>{p.message}</p>}
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => doApprove(ride._id, p.user?._id || p.user)}
                            style={{ padding:'5px 12px', borderRadius:50, border:`1.5px solid ${C.green}`,
                              background:'#F0FDF4', color:C.green, fontWeight:700, fontSize:12, cursor:'pointer' }}>
                            ✓ Approve
                          </button>
                          <button onClick={() => doDecline(ride._id, p.user?._id || p.user)}
                            style={{ padding:'5px 12px', borderRadius:50, border:`1.5px solid ${C.red}`,
                              background:'#FEF2F2', color:C.red, fontWeight:700, fontSize:12, cursor:'pointer' }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Passengers list for driver */}
                {isDriver && ride.bookings?.length > 0 && typeof ride.bookings[0] === 'object' && (
                  <div style={{ marginTop:10, padding:'10px 14px', background:C.bg,
                    borderRadius:10, border:`1px solid ${C.border}` }}>
                    <p style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8,
                      textTransform:'uppercase', letterSpacing:'0.07em' }}>
                      Passengers
                    </p>
                    {ride.bookings.map(p => (
                      <div key={p._id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                        <div style={{ width:26, height:26, borderRadius:7, background:'#FFF8E7',
                          border:`1.5px solid ${C.accent}`, display:'flex', alignItems:'center',
                          justifyContent:'center', fontSize:12, fontWeight:700 }}>{p.name?.[0]}</div>
                        <span style={{ fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>{p.name}</span>
                        {p.phone && (
                          <a href={`tel:${p.phone}`} style={{ marginLeft:'auto', color:C.green, fontSize:13 }}>📞</a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {chatRide    && <ChatPanel     ride={chatRide}    currentUser={user} onClose={() => setChatRide(null)} />}
      {locRide     && <MapPanel ride={locRide}     currentUser={user} onClose={() => setLocRide(null)} notify={notify} />}
      {feedbackRide && <FeedbackModal ride={feedbackRide} currentUserId={uid} onClose={() => setFeedbackRide(null)} notify={notify} />}
    </div>
  );
};

/* ─── Leaderboard ────────────────────────────────────────────────────────────── */
const Leaderboard = ({ user, notify }) => {
  const [org, setOrg] = useState(user.organization);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/rides/leaderboard/${encodeURIComponent(org)}`)
      .then(r => setData(r.data))
      .catch(() => notify('Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [org]);

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
        marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:32, marginBottom:2 }}>
            🏆 Leaderboard
          </h1>
          <p style={{ color:C.muted, fontSize:14 }}>Top campus carpoolers</p>
        </div>
        <select value={org} onChange={e => setOrg(e.target.value)} className="rs-input"
          style={{ width:'auto', minWidth:220 }}>
          {ORGS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
          <div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid ${C.border}`,
            borderTopColor:C.accent, animation:'rsSpin 0.8s linear infinite' }} />
        </div>
      ) : !data?.leaderboard?.length ? (
        <div className="rs-card" style={{ padding:'48px', textAlign:'center' }}>
          <p style={{ color:C.muted, fontSize:16 }}>No data yet for this university</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {data.leaderboard.map((e, i) => (
            <div key={i} className="rs-card"
              style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14,
                background: i === 0 ? '#FFF8E7' : i === 1 ? '#F9FAFB' : '#fff',
                borderColor: i === 0 ? C.accent : C.border,
                animation:'rsFadeUp 0.25s ease' }}>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18,
                color: i === 0 ? C.accent : i === 1 ? '#6B7280' : C.muted, minWidth:36 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${e.rank}`}
              </span>
              <div style={{ width:38, height:38, borderRadius:10, background:'#FFF8E7',
                border:`1.5px solid ${i === 0 ? C.accent : C.border}`, display:'flex', alignItems:'center',
                justifyContent:'center', fontWeight:800, fontSize:16, flexShrink:0 }}>
                {e.name[0]}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <p style={{ fontWeight:700, fontSize:15, fontFamily:"'DM Sans',sans-serif" }}>{e.name}</p>
                  <TrustBadge rating={e.rating || 5} totalRatings={e.totalRatings || 0} />
                </div>
                <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                  {(e.rating||5).toFixed(1)} ★ · {e.ridesCompleted} rides · {(e.carbonSaved||0).toFixed(1)} kg CO₂
                </p>
                {e.badges?.length > 0 && (
                  <div style={{ marginTop:4 }}><BadgeChips badges={e.badges} /></div>
                )}
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, color:C.accent }}>
                  {e.trustScore || e.ridesCompleted}
                </p>
                <p style={{ fontSize:9, color:C.faint, fontWeight:700, letterSpacing:'0.05em',
                  textTransform:'uppercase' }}>SCORE</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Profile ────────────────────────────────────────────────────────────────── */
const Profile = ({ user, logout, notify, onUploadId, refreshUser }) => {
  const [contacts, setContacts] = useState(user.trustedContacts || []);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);

  const saveContacts = async () => {
    if (!contacts.every(c => c.name && c.phone)) return notify('Each contact needs name & phone', 'error');
    setSaving(true);
    try {
      await api.put('/auth/trusted-contacts', { trustedContacts: contacts });
      notify('Saved!', 'success'); setEditing(false); refreshUser();
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  const VER_BADGE = {
    verified:     { label:'✓ Verified',     bg:'#DCFCE7', color:C.green },
    pending:      { label:'⏳ Pending',     bg:'#FEF3C7', color:'#92400E' },
    under_review: { label:'👁 Under Review', bg:'#DBEAFE', color:C.blue },
    rejected:     { label:'✕ Rejected',     bg:'#FEE2E2', color:C.red },
  }[user.verificationStatus] || { label:'Unknown', bg:C.bg, color:C.muted };

  return (
    <div style={{ maxWidth:560 }}>
      <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:32, marginBottom:20 }}>Profile</h1>

      {/* Avatar card */}
      <div className="rs-card" style={{ padding:20, display:'flex', gap:16, marginBottom:14 }}>
        <div style={{ width:56, height:56, borderRadius:14, background:'#FFF8E7',
          border:`2px solid ${C.accent}`, display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, flexShrink:0 }}>
          {user.name[0].toUpperCase()}
        </div>
        <div>
          <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18 }}>{user.name}</p>
          <p style={{ fontSize:13, color:C.muted, marginTop:2 }}>{user.email}</p>
          <div style={{ display:'flex', gap:6, marginTop:7, flexWrap:'wrap' }}>
            <span style={{ padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:700,
              background:VER_BADGE.bg, color:VER_BADGE.color }}>{VER_BADGE.label}</span>
            <span style={{ padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:600,
              background:C.bg, color:C.muted, border:`1px solid ${C.border}`,
              textTransform:'capitalize' }}>{user.role}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        {[{v:user.ridesCompleted||0,l:'Rides'},{v:`${(user.carbonSaved||0).toFixed?.(1)??0}kg`,l:'CO₂'},{v:user.rating||'5.0',l:'Rating'}].map((s,i) => (
          <div key={i} className="rs-card" style={{ flex:1, minWidth:90, padding:'14px', textAlign:'center' }}>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22 }}>{s.v}</p>
            <p style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase',
              letterSpacing:'0.07em', marginTop:2 }}>{s.l}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="rs-card" style={{ marginBottom:14, overflow:'hidden' }}>
        {[['Organisation', user.organization], ['Phone', user.phone]].map(([l, v], i) => (
          <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'13px 18px',
            borderBottom: i === 0 ? `1px solid ${C.border}` : 'none' }}>
            <span style={{ fontSize:13, color:C.muted, fontWeight:600 }}>{l}</span>
            <span style={{ fontSize:13, fontWeight:600 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* ID upload button */}
      {user.verificationStatus !== 'verified' && (
        <button onClick={onUploadId}
          style={{ width:'100%', padding:'13px 18px', border:`1.5px solid ${C.accent}`,
            borderRadius:10, background:'#FFF8E7', color:'#92400E', fontWeight:700, fontSize:14,
            cursor:'pointer', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>📎 {user.verificationStatus==='pending' ? 'Upload College ID Card' : 'Re-upload ID Card'}</span>
          <span>→</span>
        </button>
      )}

      {/* Trusted contacts */}
      <div className="rs-card" style={{ padding:18, marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15 }}>🛡️ Emergency Contacts</p>
            <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>Up to 3 contacts for SOS alerts</p>
          </div>
          <button onClick={() => setEditing(!editing)}
            style={{ padding:'6px 14px', borderRadius:50, border:`1.5px solid ${C.border}`,
              background:'#fff', fontWeight:700, fontSize:12, cursor:'pointer' }}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editing ? (
          <div>
            {contacts.map((c, i) => (
              <div key={i} style={{ background:C.bg, borderRadius:10, padding:12, marginBottom:8,
                border:`1px solid ${C.border}` }}>
                {['name','phone'].map(k => (
                  <input key={k} placeholder={k.charAt(0).toUpperCase()+k.slice(1)} value={c[k]}
                    onChange={e => { const nc=[...contacts]; nc[i]={...nc[i],[k]:e.target.value}; setContacts(nc); }}
                    className="rs-input" style={{ marginBottom:6 }} />
                ))}
                <button onClick={() => setContacts(contacts.filter((_,j)=>j!==i))}
                  style={{ background:'none', border:'none', cursor:'pointer', color:C.red,
                    fontSize:12, fontWeight:700 }}>✕ Remove</button>
              </div>
            ))}
            <div style={{ display:'flex', gap:8 }}>
              {contacts.length < 3 && (
                <button onClick={() => setContacts([...contacts, { name:'', phone:'', relation:'Emergency Contact' }])}
                  style={{ flex:1, padding:'10px', borderRadius:50, border:`1.5px dashed ${C.border}`,
                    background:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', color:C.muted }}>
                  + Add
                </button>
              )}
              <button onClick={saveContacts} disabled={saving} className="rs-btn-primary"
                style={{ flex:1, padding:'10px', fontSize:13, opacity: saving ? 0.5 : 1 }}>
                {saving ? '…' : 'Save'}
              </button>
            </div>
          </div>
        ) : contacts.length === 0 ? (
          <p style={{ fontSize:13, color:C.faint }}>No contacts added yet</p>
        ) : contacts.map((c, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'#DBEAFE',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>📞</div>
            <div>
              <p style={{ fontSize:13, fontWeight:600 }}>{c.name}</p>
              <p style={{ fontSize:12, color:C.muted }}>{c.phone}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon */}
      <div style={{ background:'#EFF6FF', border:`1.5px solid #BFDBFE`, borderRadius:10,
        padding:'13px 16px', marginBottom:14 }}>
        <p style={{ fontSize:11, fontWeight:700, color:C.blue, marginBottom:4,
          textTransform:'uppercase', letterSpacing:'0.07em' }}>🚀 Coming Soon</p>
        <p style={{ fontSize:13, color:'#1E40AF' }}>
          OTP login via mobile/email · UPI payment gateway · Admin ID approval dashboard
        </p>
      </div>

      <button onClick={logout}
        style={{ width:'100%', padding:'12px', border:`1.5px solid ${C.red}`, borderRadius:10,
          background:'#FEF2F2', color:C.red, fontWeight:700, fontSize:14, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
        ↪ Sign Out
      </button>
    </div>
  );
};

/* ═══ APP ROOT ═════════════════════════════════════════════════════════════════ */
const App = () => {
  const [user, setUser]   = useState(null);
  const [page, setPage]   = useState('landing');
  const [tab, setTab]     = useState('find');
  const [notif, setNotif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sockNotifs, setSockNotifs]   = useState([]);
  const [showIdUpload, setShowIdUpload] = useState(false);
  const [showNotifs, setShowNotifs]     = useState(false);

  useEffect(() => { injectFonts(); checkAuth(); }, []);

  const notify = useCallback((message, type = 'success') => setNotif({ message, type }), []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const r = await api.get('/auth/me');
        setUser(r.data.user); setPage('app');
      } catch { localStorage.removeItem('token'); }
    }
    setLoading(false);
  };

  const refreshUser = async () => {
    try { const r = await api.get('/auth/me'); setUser(r.data.user); } catch {}
  };

  const logout = () => {
    localStorage.removeItem('token'); setUser(null); setPage('landing'); setSockNotifs([]);
    notify('Logged out');
  };

  const handleLogin = u => {
    setUser(u); setPage('app'); notify(`Welcome, ${u.name}! 👋`);
    // Auto-open ID upload for unverified users (mandatory verification)
    if (u.verificationStatus === 'pending' || u.verificationStatus === 'rejected') {
      setTimeout(() => setShowIdUpload(true), 800);
    }
  };

  // Socket setup
  useEffect(() => {
    if (!user) return;
    const sock = getSock();
    sock.emit('join-user-room', user.id || user._id);

    const add = d => setSockNotifs(p => [{ ...d, timestamp: new Date().toISOString() }, ...p].slice(0, 20));

    sock.on('booking-notification',    add);
    sock.on('booking-request', d => { add(d); notify(`${d.userName} wants to join your ride!`, 'info'); });
    sock.on('booking-approved', d => { add(d); notify(d.message, 'success'); });
    sock.on('booking-declined', d => { add(d); notify(d.message, 'warning'); });
    sock.on('booking-cancelled',       add);
    sock.on('ride-cancelled-by-driver', d => { add(d); notify(d.message || 'Your ride was cancelled', 'error'); });
    sock.on('review-reminder', d => { add({ title:'⭐ Rate your ride', ...d }); notify('Your ride is complete! Give feedback.', 'info'); });
    sock.on('sos-alert', d => { add({ title:'🆘 SOS Alert', ...d }); notify(`SOS: ${d.message}`, 'error'); });

    return () => {
      ['booking-notification','booking-request','booking-approved','booking-declined',
        'booking-cancelled','ride-cancelled-by-driver','review-reminder','sos-alert']
        .forEach(e => sock.off(e));
    };
  }, [user]);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center',
      justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:44, height:44, background:C.accent, borderRadius:11,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🚗</div>
      <div style={{ width:28, height:28, borderRadius:'50%', border:`3px solid ${C.border}`,
        borderTopColor:C.accent, animation:'rsSpin 0.8s linear infinite' }} />
      <style>{GLOBAL}</style>
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", minHeight:'100vh', background:C.bg }}>
      <style>{GLOBAL}</style>
      <Toast n={notif} onClose={() => setNotif(null)} />
      {showNotifs   && <NotifPanel notifs={sockNotifs} onClose={() => setShowNotifs(false)} />}
      {showIdUpload && <IdModal onClose={() => setShowIdUpload(false)} onSuccess={refreshUser} notify={notify} />}

      {page === 'landing' && <Landing setPage={setPage} />}
      {page === 'login'   && <AuthPage type="login"  setPage={setPage} onLogin={handleLogin} />}
      {page === 'signup'  && <AuthPage type="signup" setPage={setPage} onLogin={handleLogin} />}

      {page === 'app' && user && (
        <>
          <Navbar user={user} tab={tab} setTab={setTab} logout={logout}
            notifCount={sockNotifs.length} onBell={() => setShowNotifs(v => !v)} />
          <VerifBanner user={user} onUpload={() => setShowIdUpload(true)} />
          <SOSButton user={user} notify={notify} />

          <main style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px 110px',
            animation:'rsFadeUp 0.25s ease' }}>
            {tab === 'find'        && <FindRides   user={user} notify={notify} />}
            {tab === 'offer'       && <OfferRide   user={user} notify={notify} onSuccess={() => setTab('myrides')} />}
            {tab === 'myrides'     && <MyRides     user={user} notify={notify} />}
            {tab === 'leaderboard' && <Leaderboard user={user} notify={notify} />}
            {tab === 'profile'     && <Profile     user={user} logout={logout} notify={notify}
              onUploadId={() => setShowIdUpload(true)} refreshUser={refreshUser} />}
          </main>

          <MobNav tab={tab} setTab={setTab} />
        </>
      )}
    </div>
  );
};

export default App;