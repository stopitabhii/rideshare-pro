import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Car, Bike, MapPin, Users, Leaf, Star, Clock, Shield,
  Search, Plus, Bell, LogOut, ChevronLeft, TrendingUp,
  Award, Calendar, IndianRupee, Navigation, ArrowRight,
  Check, X, Home, User, Zap, Wind, BarChart2, Phone,
  Mail, Lock, Upload, AlertCircle, CheckCircle, Loader,
  MoreVertical, Trash2, MessageCircle, RefreshCw, Trophy,
  Eye, EyeOff, Info,
} from 'lucide-react';
import { io } from 'socket.io-client';
import api from './services/api';

// ─── Fonts injected once ──────────────────────────────────────────────────────
const injectFonts = () => {
  if (document.getElementById('rs-fonts')) return;
  const l = document.createElement('link');
  l.id = 'rs-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap';
  document.head.appendChild(l);
};

// ─── Socket singleton ─────────────────────────────────────────────────────────
let _socket = null;
const getSocket = () => {
  if (!_socket) {
    _socket = io('https://rideshare-pro.onrender.com', {
      transports: ['websocket', 'polling'],
      reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 1000,
    });
  }
  return _socket;
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0A0C14', surface: '#111827', surfaceHover: '#1a2234',
  border: 'rgba(255,255,255,0.07)', text: '#f9fafb',
  muted: '#9ca3af', faint: '#4b5563',
  accent: '#F59E0B', accentHover: '#d97706', accentFaint: 'rgba(245,158,11,0.12)',
  green: '#10b981', blue: '#60a5fa', purple: '#a78bfa', red: '#ef4444',
  r: 16, rs: 10, rxs: 8,
};

// ─── NCR organisations ────────────────────────────────────────────────────────
const ORGS = [
  'Galgotias University', 'Bennett University', 'Sharda University',
  'GNIOT Greater Noida', 'Lloyd Law College', 'Amity University Noida',
  'IIMT University Noida', 'Delhi University', 'IIT Delhi', 'NSIT Dwarka',
  'DTU Delhi', 'Jamia Millia Islamia', 'JNU Delhi', 'IGDTUW Delhi',
  'IP University Delhi', 'MDI Gurugram', 'GD Goenka University',
  'Manav Rachna University', 'Subharti University Meerut',
];

// ─── Email validator ──────────────────────────────────────────────────────────
const VALID_DOMAINS = [
  'gmail.com','googlemail.com','yahoo.com','yahoo.in','yahoo.co.in',
  'outlook.com','hotmail.com','live.com','icloud.com','me.com','mac.com',
  'proton.me','protonmail.com','rediffmail.com',
  // common edu/work patterns are allowed if they have a proper TLD
];
const isValidEmail = (email) => {
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(email)) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  // Block obviously fake/test domains
  const blocked = ['test.com','fake.com','example.com','mailinator.com','tempmail.com','throwaway.com','guerrillamail.com'];
  return !blocked.includes(domain);
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ n, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [n]);
  if (!n) return null;
  const bg = { success: C.green, error: C.red, info: C.blue, warning: C.accent }[n.type] || C.green;
  const Icon = { success: CheckCircle, error: X, info: Info, warning: AlertCircle }[n.type] || CheckCircle;
  return (
    <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', zIndex:9999,
      display:'flex', alignItems:'center', gap:8, padding:'11px 18px', borderRadius:50,
      background:bg, color:'#fff', fontSize:13, fontWeight:500, whiteSpace:'nowrap',
      boxShadow:'0 8px 32px rgba(0,0,0,0.5)', fontFamily:"'DM Sans',sans-serif",
      animation:'rsSlideDown 0.3s ease', maxWidth:'90vw' }}>
      <Icon size={15} />
      <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{n.message}</span>
    </div>
  );
};

// ─── Logo ─────────────────────────────────────────────────────────────────────
const Logo = () => (
  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
    <div style={{ width:36, height:36, borderRadius:10, background:C.accent,
      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <Car size={18} color="#000" />
    </div>
    <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:20, color:C.text, letterSpacing:'-0.3px' }}>
      rideshare
    </span>
  </div>
);

// ─── Input field ──────────────────────────────────────────────────────────────
const InputField = ({ placeholder, type='text', value, onChange, icon, required, disabled, error }) => {
  const [show, setShow] = useState(false);
  const isPass = type === 'password';
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10,
        background:'rgba(255,255,255,0.04)', border:`1px solid ${error ? C.red : C.border}`,
        borderRadius:C.rs, padding:'0 14px', transition:'border-color 0.2s' }}>
        <span style={{ color:C.faint, flexShrink:0, display:'flex', alignItems:'center' }}>{icon}</span>
        <input
          type={isPass ? (show ? 'text' : 'password') : type}
          placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          required={required} disabled={disabled}
          style={{ flex:1, background:'transparent', border:'none', outline:'none',
            color:C.text, fontFamily:"'DM Sans',sans-serif", fontSize:14, padding:'13px 0',
            opacity: disabled ? 0.5 : 1 }}
        />
        {isPass && (
          <button type="button" onClick={() => setShow(!show)}
            style={{ background:'none', border:'none', cursor:'pointer', color:C.faint, display:'flex', alignItems:'center' }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && <p style={{ color:C.red, fontSize:11, marginTop:4, fontFamily:"'DM Sans',sans-serif" }}>{error}</p>}
    </div>
  );
};

// ─── Btn ──────────────────────────────────────────────────────────────────────
const Btn = ({ children, onClick, type='button', disabled, variant='primary', style: extra={} }) => {
  const base = {
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
    borderRadius:50, fontFamily:"'DM Sans',sans-serif", fontWeight:700,
    fontSize:14, border:'none', cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1, transition:'all 0.2s ease',
    padding:'11px 22px', whiteSpace:'nowrap', ...extra,
  };
  const variants = {
    primary:  { background:C.accent, color:'#000' },
    ghost:    { background:'rgba(255,255,255,0.05)', color:C.muted, border:`1px solid ${C.border}` },
    danger:   { background:'rgba(239,68,68,0.12)', color:C.red, border:`1px solid rgba(239,68,68,0.25)` },
    success:  { background:'rgba(16,185,129,0.12)', color:C.green, border:`1px solid rgba(16,185,129,0.25)` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
};

// ─── Verification banner ──────────────────────────────────────────────────────
const VerifBanner = ({ user, onUpload }) => {
  if (user.verificationStatus === 'verified') return null;
  const cfg = {
    pending:      { msg:'Upload your org ID card to start riding', action:'Upload ID', color:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.3)', text:C.accent },
    under_review: { msg:'ID under review — we\'ll verify within 24 h', action:null,    color:'rgba(96,165,250,0.1)', border:'rgba(96,165,250,0.3)',   text:C.blue },
    rejected:     { msg:`ID rejected${user.verificationNote ? ': '+user.verificationNote : ''}. Please re-upload.`, action:'Re-upload', color:'rgba(239,68,68,0.1)', border:'rgba(239,68,68,0.3)', text:C.red },
  }[user.verificationStatus];
  if (!cfg) return null;
  return (
    <div style={{ margin:'10px 16px 0', padding:'10px 14px', borderRadius:C.rs,
      background:cfg.color, border:`1px solid ${cfg.border}`,
      display:'flex', alignItems:'center', gap:10 }}>
      <AlertCircle size={15} color={cfg.text} />
      <p style={{ flex:1, fontSize:12, color:cfg.text, fontFamily:"'DM Sans',sans-serif" }}>{cfg.msg}</p>
      {cfg.action && (
        <button onClick={onUpload} style={{ background:'none', border:'none', cursor:'pointer',
          color:cfg.text, fontSize:12, fontWeight:700, fontFamily:"'DM Sans',sans-serif", textDecoration:'underline' }}>
          {cfg.action}
        </button>
      )}
    </div>
  );
};

// ─── ID Upload modal ──────────────────────────────────────────────────────────
const IdUploadModal = ({ onClose, onSuccess, showNotif }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  const pick = (f) => { if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)); };

  const submit = async () => {
    if (!file) return showNotif('Select a file first', 'error');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('idCard', file);
      await api.post('/auth/verify-id', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showNotif('ID uploaded! Review within 24 h.', 'success');
      onSuccess(); onClose();
    } catch (err) {
      showNotif(err.response?.data?.error || 'Upload failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)',
      backdropFilter:'blur(6px)', display:'flex', alignItems:'flex-end', justifyContent:'center',
      padding:16, paddingBottom:'max(16px,env(safe-area-inset-bottom))' }}>
      <div style={{ width:'100%', maxWidth:400, background:C.surface, borderRadius:C.r+4,
        border:`1px solid ${C.border}`, padding:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18, color:C.text }}>Upload ID Card</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted }}><X size={20} /></button>
        </div>
        <div onClick={() => ref.current?.click()}
          style={{ height:160, border:`2px dashed ${file ? C.accent : C.border}`, borderRadius:C.r,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            cursor:'pointer', overflow:'hidden', marginBottom:16, transition:'border-color 0.2s' }}>
          {preview
            ? <img src={preview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <><Upload size={32} color={C.faint} /><p style={{ color:C.muted, fontSize:13, marginTop:8, fontFamily:"'DM Sans',sans-serif" }}>Tap to select</p><p style={{ color:C.faint, fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>JPG, PNG, PDF · max 10 MB</p></>}
        </div>
        <input ref={ref} type="file" accept="image/*,.pdf" style={{ display:'none' }} onChange={e => pick(e.target.files[0])} />
        <Btn onClick={submit} disabled={loading || !file} variant="primary" style={{ width:'100%', padding:'13px 0' }}>
          {loading ? <><Loader size={15} style={{ animation:'rsSpin 0.8s linear infinite' }} /> Uploading…</> : 'Submit for Review'}
        </Btn>
      </div>
    </div>
  );
};

// ─── Review modal ─────────────────────────────────────────────────────────────
const ReviewModal = ({ ride, onClose, showNotif }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const TAG_OPTS = ['punctual','safe_driver','friendly','clean_vehicle','good_conversation','on_time','reliable','recommended'];

  const submit = async () => {
    setLoading(true);
    try {
      await api.post(`/reviews/${ride._id}`, {
        revieweeId: ride.driver?._id || ride.driver,
        rating, comment, tags,
      });
      showNotif('Review submitted! ⭐', 'success');
      onClose();
    } catch (err) {
      showNotif(err.response?.data?.error || 'Failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)',
      backdropFilter:'blur(6px)', display:'flex', alignItems:'flex-end', justifyContent:'center',
      padding:16, paddingBottom:'max(16px,env(safe-area-inset-bottom))' }}>
      <div style={{ width:'100%', maxWidth:420, background:C.surface, borderRadius:C.r+4, border:`1px solid ${C.border}`, padding:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18, color:C.text }}>Rate your ride</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted }}><X size={20} /></button>
        </div>
        <p style={{ color:C.muted, fontSize:13, marginBottom:16, fontFamily:"'DM Sans',sans-serif" }}>
          {ride.from} → {ride.to}
        </p>
        {/* Stars */}
        <div style={{ display:'flex', gap:8, marginBottom:16, justifyContent:'center' }}>
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={() => setRating(s)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:32,
                filter: s <= rating ? 'none' : 'grayscale(1) opacity(0.3)', transition:'all 0.15s' }}>⭐</button>
          ))}
        </div>
        {/* Tags */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
          {TAG_OPTS.map(t => (
            <button key={t} onClick={() => setTags(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev,t])}
              style={{ padding:'5px 12px', borderRadius:50, fontSize:12, fontFamily:"'DM Sans',sans-serif",
                background: tags.includes(t) ? C.accentFaint : 'rgba(255,255,255,0.04)',
                border:`1px solid ${tags.includes(t) ? 'rgba(245,158,11,0.4)' : C.border}`,
                color: tags.includes(t) ? C.accent : C.muted, cursor:'pointer', transition:'all 0.15s' }}>
              {t.replace(/_/g,' ')}
            </button>
          ))}
        </div>
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Add a comment (optional)..." rows={3}
          style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.04)',
            border:`1px solid ${C.border}`, borderRadius:C.rs, color:C.text,
            fontFamily:"'DM Sans',sans-serif", fontSize:14, padding:'11px 14px',
            outline:'none', resize:'none', marginBottom:14 }} />
        <Btn onClick={submit} disabled={loading} variant="primary" style={{ width:'100%', padding:'13px 0' }}>
          {loading ? 'Submitting…' : 'Submit Review'}
        </Btn>
      </div>
    </div>
  );
};

// ─── Notif panel ──────────────────────────────────────────────────────────────
const NotifPanel = ({ notifs, onClose }) => (
  <div style={{ position:'fixed', inset:0, zIndex:150, background:'rgba(0,0,0,0.5)' }} onClick={onClose}>
    <div style={{ position:'absolute', top:60, right:12, width:300,
      background:C.surface, border:`1px solid ${C.border}`, borderRadius:C.r,
      maxHeight:360, overflowY:'auto', boxShadow:'0 16px 48px rgba(0,0,0,0.5)' }}
      onClick={e => e.stopPropagation()}>
      <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`,
        fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:C.text }}>
        Notifications
      </div>
      {notifs.length === 0
        ? <p style={{ padding:'24px 16px', color:C.muted, fontSize:13, fontFamily:"'DM Sans',sans-serif", textAlign:'center' }}>No notifications yet</p>
        : notifs.map((n,i) => (
          <div key={i} style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}` }}>
            <p style={{ color:C.text, fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>{n.title}</p>
            <p style={{ color:C.muted, fontSize:12, marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>{n.message}</p>
          </div>
        ))}
    </div>
  </div>
);

// ─── Mini stat ────────────────────────────────────────────────────────────────
const MiniStat = ({ icon, val, lbl }) => (
  <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
    {icon}
    <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:C.text }}>{val}</span>
    <span style={{ fontSize:10, color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>{lbl}</span>
  </div>
);

// ─── Ride card (find rides) ───────────────────────────────────────────────────
const RideCard = ({ ride, onBook, onRequest, currentUserId }) => {
  const isOwn = ride.driver?._id === currentUserId || ride.driver === currentUserId;
  const seatsLeft = ride.seats - ride.bookings.length;
  const isFull = seatsLeft <= 0;
  const isBooked = ride.bookings.some(b => (b._id || b) === currentUserId);
  const isPrivate = ride.visibility === 'private';

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:C.r, padding:16, marginBottom:12 }}>
      {/* Top row */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:C.accentFaint,
            border:`1px solid rgba(245,158,11,0.2)`, display:'flex', alignItems:'center',
            justifyContent:'center', color:C.accent, flexShrink:0, fontFamily:"'Syne',sans-serif",
            fontWeight:700, fontSize:15 }}>
            {ride.driver?.name?.[0] || '?'}
          </div>
          <div>
            <p style={{ color:C.text, fontSize:14, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>{ride.driver?.name}</p>
            <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
              <Star size={11} color={C.accent} fill={C.accent} />
              <span style={{ color:C.muted, fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>{ride.driver?.rating || '5.0'}</span>
              {isPrivate && <span style={{ marginLeft:4, padding:'2px 7px', borderRadius:50, fontSize:10,
                background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.25)', color:C.purple,
                fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>Private</span>}
              {ride.recurring && <span style={{ padding:'2px 7px', borderRadius:50, fontSize:10,
                background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.25)', color:C.blue,
                fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>Recurring</span>}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:2 }}>
          <IndianRupee size={14} color={C.accent} />
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, color:C.accent }}>{ride.price}</span>
        </div>
      </div>

      {/* Route */}
      <div style={{ display:'flex', gap:10, marginBottom:12 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, paddingTop:4 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:C.green }} />
          <div style={{ width:1.5, height:20, background:C.border }} />
          <div style={{ width:8, height:8, borderRadius:'50%', background:C.accent }} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <span style={{ color:C.text, fontSize:13, fontWeight:500, fontFamily:"'DM Sans',sans-serif" }}>{ride.from}</span>
          <span style={{ color:C.text, fontSize:13, fontWeight:500, fontFamily:"'DM Sans',sans-serif" }}>{ride.to}</span>
        </div>
      </div>

      {/* Meta chips */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
        {[
          { icon:<Clock size={11} />, val: ride.time },
          { icon:<Users size={11} />, val: `${seatsLeft} left` },
          { icon:<MapPin size={11} />, val: `${ride.distance} km` },
          ride.duration && { icon:<Navigation size={11} />, val: `~${ride.duration} min` },
          ride.type === 'bikepool' && ride.helmetProvided && { icon:<Shield size={11} />, val:'Helmet', color:C.green },
        ].filter(Boolean).map((c, i) => (
          <span key={i} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 9px',
            borderRadius:50, background:'rgba(255,255,255,0.04)', color: c.color || C.muted,
            fontSize:11, fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>
            {c.icon}{c.val}
          </span>
        ))}
      </div>

      {/* Recurring days */}
      {ride.recurring && ride.days?.length > 0 && (
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
          {ride.days.map(d => (
            <span key={d} style={{ padding:'3px 8px', borderRadius:4, background:'rgba(255,255,255,0.04)',
              color:C.muted, fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>{d}</span>
          ))}
        </div>
      )}

      {/* Book / Request button */}
      {isBooked ? (
        <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center',
          padding:'9px 0', color:C.green, fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>
          <CheckCircle size={15} /> Booked
        </div>
      ) : isOwn ? (
        <div style={{ textAlign:'center', color:C.muted, fontSize:13, fontFamily:"'DM Sans',sans-serif", padding:'9px 0' }}>Your ride</div>
      ) : isFull ? (
        <div style={{ textAlign:'center', color:C.faint, fontSize:13, fontFamily:"'DM Sans',sans-serif", padding:'9px 0' }}>Full</div>
      ) : isPrivate ? (
        <Btn onClick={() => onRequest(ride._id)} variant="ghost" style={{ width:'100%', padding:'10px 0', borderColor:'rgba(167,139,250,0.3)', color:C.purple }}>
          Request to Join
        </Btn>
      ) : (
        <Btn onClick={() => onBook(ride._id)} variant="primary" style={{ width:'100%', padding:'10px 0' }}>
          Book Now
        </Btn>
      )}
    </div>
  );
};

// ─── My ride card ─────────────────────────────────────────────────────────────
const MyRideCard = ({ ride, currentUserId, onRefresh, showNotif, onReview }) => {
  const isDriver = (ride.driver?._id || ride.driver) === currentUserId;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [cancelModal, setCancelModal] = useState(null); // 'booking' | 'ride'
  const [loading, setLoading] = useState(false);

  const STATUS = { scheduled:'#1e3a5f', ongoing:'#064e3b', completed:'#1f2937', cancelled:'#3b1010' };
  const STATUS_TEXT = { scheduled:C.blue, ongoing:C.green, completed:C.muted, cancelled:C.red };

  const doComplete = async () => {
    setLoading(true);
    try {
      await api.put(`/rides/complete/${ride._id}`);
      showNotif('Ride marked complete! 🎉', 'success');
      onRefresh();
    } catch (err) { showNotif(err.response?.data?.error || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  const doCancel = async () => {
    setLoading(true);
    try {
      const ep = cancelModal === 'ride' ? `/rides/cancel-ride/${ride._id}` : `/rides/cancel-booking/${ride._id}`;
      await api.delete(ep, { data: { reason } });
      showNotif('Cancelled successfully', 'success');
      setCancelModal(null); onRefresh();
    } catch (err) { showNotif(err.response?.data?.error || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  const doApprove = async (userId) => {
    try {
      await api.put(`/rides/approve/${ride._id}/${userId}`);
      showNotif('Booking approved!', 'success');
      onRefresh();
    } catch (err) { showNotif(err.response?.data?.error || 'Failed', 'error'); }
  };

  const doDecline = async (userId) => {
    try {
      await api.put(`/rides/decline/${ride._id}/${userId}`);
      showNotif('Request declined', 'info');
      onRefresh();
    } catch (err) { showNotif(err.response?.data?.error || 'Failed', 'error'); }
  };

  const driverName = ride.driver?.name || 'Driver';

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:C.r, padding:16, marginBottom:12 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <div>
          <p style={{ color:C.text, fontWeight:600, fontSize:15, fontFamily:"'DM Sans',sans-serif" }}>
            {ride.from} → {ride.to}
          </p>
          <p style={{ color:C.muted, fontSize:12, marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>
            {isDriver ? "You're driving" : `Driver: ${driverName}`} · {new Date(ride.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} · {ride.time}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:600,
            fontFamily:"'DM Sans',sans-serif", background:STATUS[ride.status], color:STATUS_TEXT[ride.status] }}>
            {ride.status}
          </span>
          {['scheduled','ongoing'].includes(ride.status) && (
            <button onClick={() => setOpen(!open)}
              style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, display:'flex', alignItems:'center' }}>
              <MoreVertical size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Meta */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom: open ? 12 : 0 }}>
        <span style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:50,
          background:'rgba(255,255,255,0.04)', color:C.muted, fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>
          <Users size={11} />{(ride.bookings?.length||0)}/{ride.seats}
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:50,
          background:'rgba(255,255,255,0.04)', color:C.muted, fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>
          <IndianRupee size={11} />{ride.price}
        </span>
        {ride.visibility === 'private' && (
          <span style={{ padding:'3px 9px', borderRadius:50, fontSize:11,
            background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.2)',
            color:C.purple, fontFamily:"'DM Sans',sans-serif" }}>Private</span>
        )}
      </div>

      {/* Actions dropdown */}
      {open && (
        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, display:'flex', flexDirection:'column', gap:8 }}>
          {isDriver && ride.status === 'scheduled' && (
            <Btn onClick={doComplete} disabled={loading} variant="success" style={{ width:'100%', padding:'10px 0' }}>
              <CheckCircle size={15} /> Mark Complete
            </Btn>
          )}
          {isDriver && (
            <Btn onClick={() => { setCancelModal('ride'); setOpen(false); }} variant="danger" style={{ width:'100%', padding:'10px 0' }}>
              <Trash2 size={15} /> Cancel Ride
            </Btn>
          )}
          {!isDriver && ride.status === 'scheduled' && (
            <Btn onClick={() => { setCancelModal('booking'); setOpen(false); }} variant="danger" style={{ width:'100%', padding:'10px 0' }}>
              <X size={15} /> Cancel Booking
            </Btn>
          )}
        </div>
      )}

      {/* Pending booking requests (driver sees) */}
      {isDriver && ride.pendingBookings?.length > 0 && (
        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, marginTop:12 }}>
          <p style={{ color:C.muted, fontSize:11, fontWeight:600, textTransform:'uppercase',
            letterSpacing:'0.08em', marginBottom:8, fontFamily:"'DM Sans',sans-serif" }}>
            Pending Requests ({ride.pendingBookings.length})
          </p>
          {ride.pendingBookings.map(p => (
            <div key={p.user?._id || p.user} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:C.accentFaint,
                  display:'flex', alignItems:'center', justifyContent:'center', color:C.accent,
                  fontSize:12, fontFamily:"'Syne',sans-serif", fontWeight:700 }}>
                  {(p.user?.name || '?')[0]}
                </div>
                <div>
                  <p style={{ color:C.text, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>{p.user?.name || 'User'}</p>
                  {p.message && <p style={{ color:C.muted, fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>{p.message}</p>}
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <Btn onClick={() => doApprove(p.user?._id || p.user)} variant="success" style={{ padding:'5px 12px', fontSize:12 }}>
                  <Check size={12} /> OK
                </Btn>
                <Btn onClick={() => doDecline(p.user?._id || p.user)} variant="danger" style={{ padding:'5px 12px', fontSize:12 }}>
                  <X size={12} />
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Passengers list (driver sees) */}
      {isDriver && ride.bookings?.length > 0 && typeof ride.bookings[0] === 'object' && (
        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, marginTop:4 }}>
          <p style={{ color:C.muted, fontSize:11, fontWeight:600, textTransform:'uppercase',
            letterSpacing:'0.08em', marginBottom:8, fontFamily:"'DM Sans',sans-serif" }}>Passengers</p>
          {ride.bookings.map(p => (
            <div key={p._id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:C.accentFaint,
                display:'flex', alignItems:'center', justifyContent:'center', color:C.accent,
                fontSize:12, fontFamily:"'Syne',sans-serif", fontWeight:700 }}>
                {p.name?.[0]}
              </div>
              <span style={{ flex:1, color:C.text, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>{p.name}</span>
              {p.phone && (
                <a href={`tel:${p.phone}`} style={{ color:C.green, display:'flex', alignItems:'center' }}>
                  <Phone size={14} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review button for completed rides */}
      {ride.status === 'completed' && !isDriver && (
        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, marginTop:4 }}>
          <Btn onClick={() => onReview(ride)} variant="ghost" style={{ width:'100%', padding:'10px 0', fontSize:13 }}>
            <Star size={14} /> Rate this Ride
          </Btn>
        </div>
      )}

      {/* Cancel confirm modal */}
      {cancelModal && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)',
          backdropFilter:'blur(6px)', display:'flex', alignItems:'flex-end', justifyContent:'center',
          padding:16, paddingBottom:'max(16px,env(safe-area-inset-bottom))' }}>
          <div style={{ width:'100%', maxWidth:400, background:C.surface, borderRadius:C.r+4, border:`1px solid ${C.border}`, padding:24 }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18, color:C.text, marginBottom:8 }}>
              {cancelModal === 'ride' ? 'Cancel this ride?' : 'Cancel your booking?'}
            </h3>
            <p style={{ color:C.muted, fontSize:13, marginBottom:14, fontFamily:"'DM Sans',sans-serif" }}>
              {cancelModal === 'ride' ? 'All passengers will be notified.' : 'Note: cancellations within 30 min of departure are blocked.'}
            </p>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Reason (optional)" rows={3}
              style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.04)',
                border:`1px solid ${C.border}`, borderRadius:C.rs, color:C.text,
                fontFamily:"'DM Sans',sans-serif", fontSize:14, padding:'11px 14px',
                outline:'none', resize:'none', marginBottom:14 }} />
            <div style={{ display:'flex', gap:10 }}>
              <Btn onClick={() => setCancelModal(null)} variant="ghost" style={{ flex:1, padding:'12px 0' }}>Keep it</Btn>
              <Btn onClick={doCancel} disabled={loading} variant="danger" style={{ flex:1, padding:'12px 0' }}>
                {loading ? '…' : 'Yes, Cancel'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Offer Ride form ──────────────────────────────────────────────────────────
const OfferRide = ({ user, showNotif, onSuccess }) => {
  const [form, setForm] = useState({
    type:'carpool', from:'', to:'', date:'', time:'',
    seats:3, price:'', recurring:false, days:[],
    helmetProvided:false, distance:'', visibility:'public',
  });
  const [loading, setLoading] = useState(false);
  const [distLoading, setDistLoading] = useState(false);
  const [distInfo, setDistInfo] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const fetchDist = async () => {
    if (!form.from || !form.to) return showNotif('Enter from & to first', 'warning');
    setDistLoading(true);
    try {
      const res = await api.get('/rides/distance', { params:{ from:form.from, to:form.to } });
      setDistInfo(res.data);
      set('distance', res.data.distance);
      showNotif(`${res.data.distance} km · ~${res.data.duration} min`, 'info');
    } catch {
      showNotif('Could not auto-calculate. Enter manually.', 'warning');
    } finally { setDistLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (user.verificationStatus !== 'verified') return showNotif('Verify your account first', 'error');
    setLoading(true);
    try {
      await api.post('/rides/create', form);
      showNotif('Ride listed! 🚗', 'success');
      setForm({ type:'carpool', from:'', to:'', date:'', time:'', seats:3, price:'', recurring:false, days:[], helmetProvided:false, distance:'', visibility:'public' });
      setDistInfo(null);
      onSuccess?.();
    } catch (err) { showNotif(err.response?.data?.error || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  const Toggle = ({ on, onClick, label }) => (
    <label onClick={onClick} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
      <div style={{ width:44, height:24, borderRadius:12, background: on ? C.accent : C.border,
        position:'relative', transition:'background 0.2s', flexShrink:0 }}>
        <div style={{ position:'absolute', top:2, left: on ? 22 : 2, width:20, height:20,
          borderRadius:10, background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,0.3)', transition:'left 0.2s' }} />
      </div>
      <span style={{ fontSize:14, color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>{label}</span>
    </label>
  );

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:C.r, padding:'20px 16px' }}>
      {user.verificationStatus !== 'verified' && (
        <div style={{ padding:'10px 14px', borderRadius:C.rs, background:'rgba(245,158,11,0.1)',
          border:'1px solid rgba(245,158,11,0.3)', marginBottom:16,
          display:'flex', alignItems:'center', gap:8 }}>
          <AlertCircle size={15} color={C.accent} />
          <p style={{ fontSize:12, color:C.accent, fontFamily:"'DM Sans',sans-serif" }}>
            Verify your account to offer rides.
          </p>
        </div>
      )}
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:20, color:C.text, marginBottom:18 }}>
        Offer a ride
      </h2>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Type */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.03)', borderRadius:C.rs, padding:4, border:`1px solid ${C.border}` }}>
          {[{v:'carpool',l:'🚗 Carpool'},{v:'bikepool',l:'🏍️ Bikepool'}].map(t => (
            <button key={t.v} type="button" onClick={() => { set('type',t.v); set('seats',t.v==='bikepool'?1:3); }}
              style={{ flex:1, padding:'9px 0', borderRadius:C.rxs, border:'none', cursor:'pointer',
                fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13, transition:'all 0.2s',
                background: form.type===t.v ? C.accentFaint : 'transparent',
                color: form.type===t.v ? C.accent : C.muted,
                outline: form.type===t.v ? `1px solid rgba(245,158,11,0.3)` : 'none' }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Visibility */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.03)', borderRadius:C.rs, padding:4, border:`1px solid ${C.border}` }}>
          {[{v:'public',l:'🌐 Public'},{v:'private',l:'🔒 Private'}].map(t => (
            <button key={t.v} type="button" onClick={() => set('visibility',t.v)}
              style={{ flex:1, padding:'9px 0', borderRadius:C.rxs, border:'none', cursor:'pointer',
                fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13, transition:'all 0.2s',
                background: form.visibility===t.v ? 'rgba(167,139,250,0.1)' : 'transparent',
                color: form.visibility===t.v ? C.purple : C.muted,
                outline: form.visibility===t.v ? '1px solid rgba(167,139,250,0.3)' : 'none' }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* From / To */}
        <div style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${C.border}`, borderRadius:C.r, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px' }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:C.green, flexShrink:0 }} />
            <input placeholder="From — Pickup point" value={form.from} onChange={e => set('from',e.target.value)} required
              style={{ flex:1, background:'transparent', border:'none', outline:'none', color:C.text, fontFamily:"'DM Sans',sans-serif", fontSize:14 }} />
          </div>
          <div style={{ height:1, background:C.border, marginLeft:38 }} />
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px' }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:C.accent, flexShrink:0 }} />
            <input placeholder="To — Destination" value={form.to} onChange={e => set('to',e.target.value)} required
              style={{ flex:1, background:'transparent', border:'none', outline:'none', color:C.text, fontFamily:"'DM Sans',sans-serif", fontSize:14 }} />
          </div>
        </div>

        {/* Auto distance */}
        <button type="button" onClick={fetchDist} disabled={distLoading}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            padding:'9px 0', borderRadius:50, border:`1px dashed rgba(245,158,11,0.4)`,
            background:'transparent', color:C.accent, fontSize:13, fontWeight:600,
            fontFamily:"'DM Sans',sans-serif", cursor:'pointer', opacity: distLoading ? 0.6 : 1 }}>
          {distLoading ? <Loader size={14} style={{ animation:'rsSpin 0.8s linear infinite' }} /> : <Zap size={14} />}
          {distLoading ? 'Calculating…' : 'Auto-calculate Distance'}
        </button>

        {distInfo && (
          <div style={{ padding:'10px 14px', borderRadius:C.rs, background:'rgba(96,165,250,0.08)',
            border:'1px solid rgba(96,165,250,0.2)', display:'flex', alignItems:'center', gap:8 }}>
            <Navigation size={14} color={C.blue} />
            <span style={{ color:C.blue, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
              {distInfo.distance} km · ~{distInfo.duration} min
            </span>
          </div>
        )}

        {/* Date / Time / Distance */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {[
            { label:'Date', type:'date', key:'date' },
            { label:'Time', type:'time', key:'time' },
            { label:'Dist (km)', type:'number', key:'distance', placeholder:'0' },
          ].map(({ label, type, key, placeholder }) => (
            <div key={key}>
              <p style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>{label}</p>
              <input type={type} required value={form[key]} placeholder={placeholder}
                onChange={e => set(key, e.target.value)}
                style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.04)',
                  border:`1px solid ${C.border}`, borderRadius:C.rs, color:C.text,
                  fontFamily:"'DM Sans',sans-serif", fontSize:14, padding:'10px 12px', outline:'none', colorScheme:'dark' }} />
            </div>
          ))}
        </div>

        {/* Seats / Price */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { label:'Seats', key:'seats', type:'number', min:1, max: form.type==='bikepool'?1:6, disabled: form.type==='bikepool' },
            { label:'Price / seat (₹)', key:'price', type:'number', placeholder:'0' },
          ].map(({ label, key, type, min, max, disabled, placeholder }) => (
            <div key={key}>
              <p style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>{label}</p>
              <input type={type} min={min} max={max} required value={form[key]} disabled={disabled} placeholder={placeholder}
                onChange={e => set(key, type==='number' ? parseInt(e.target.value)||'' : e.target.value)}
                style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.04)',
                  border:`1px solid ${C.border}`, borderRadius:C.rs, color:C.text,
                  fontFamily:"'DM Sans',sans-serif", fontSize:14, padding:'10px 12px', outline:'none',
                  opacity: disabled ? 0.4 : 1 }} />
            </div>
          ))}
        </div>

        <Toggle on={form.recurring} onClick={() => set('recurring',!form.recurring)} label="Daily recurring commute" />

        {form.recurring && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {DAYS.map(d => (
              <button key={d} type="button"
                onClick={() => set('days', form.days.includes(d) ? form.days.filter(x=>x!==d) : [...form.days,d])}
                style={{ padding:'6px 12px', borderRadius:50, fontSize:12, fontWeight:600,
                  fontFamily:"'DM Sans',sans-serif", cursor:'pointer', transition:'all 0.15s',
                  background: form.days.includes(d) ? C.accentFaint : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${form.days.includes(d) ? 'rgba(245,158,11,0.4)' : C.border}`,
                  color: form.days.includes(d) ? C.accent : C.muted }}>
                {d}
              </button>
            ))}
          </div>
        )}

        {form.type === 'bikepool' && (
          <Toggle on={form.helmetProvided} onClick={() => set('helmetProvided',!form.helmetProvided)} label="I'll provide a helmet" />
        )}

        <button type="submit" disabled={loading || user.verificationStatus!=='verified'}
          style={{ padding:'14px 0', borderRadius:50, background:C.accent, color:'#000', border:'none',
            fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:15, cursor: (loading || user.verificationStatus!=='verified') ? 'default' : 'pointer',
            opacity: (loading || user.verificationStatus!=='verified') ? 0.45 : 1, transition:'all 0.2s',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {loading ? <><Loader size={15} style={{ animation:'rsSpin 0.8s linear infinite' }} /> Creating…</> : 'List My Ride'}
        </button>
      </form>
    </div>
  );
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────
const Leaderboard = ({ user, showNotif }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/rides/leaderboard/${encodeURIComponent(user.organization)}`)
      .then(r => setData(r.data))
      .catch(() => showNotif('Failed to load leaderboard','error'))
      .finally(() => setLoading(false));
  }, [user.organization]);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}><div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid ${C.border}`, borderTopColor:C.accent, animation:'rsSpin 0.8s linear infinite' }} /></div>;
  if (!data) return null;

  const medals = ['🥇','🥈','🥉'];

  return (
    <div>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:20, color:C.text, marginBottom:4 }}>Leaderboard</h2>
      <p style={{ color:C.muted, fontSize:13, marginBottom:20, fontFamily:"'DM Sans',sans-serif" }}>{user.organization}</p>

      {/* Org stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
        {[
          { icon:<Leaf size={18} color={C.green} />, val:`${(data.orgStats.totalCarbon||0).toFixed(1)} kg`, lbl:'CO₂ Saved Together', bg:'rgba(16,185,129,0.08)', border:'rgba(16,185,129,0.2)' },
          { icon:<Car size={18} color={C.blue} />, val:data.orgStats.totalRides||0, lbl:'Total Rides', bg:'rgba(96,165,250,0.08)', border:'rgba(96,165,250,0.2)' },
        ].map((s,i) => (
          <div key={i} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:C.r, padding:16 }}>
            {s.icon}
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:C.text, margin:'6px 0 2px' }}>{s.val}</p>
            <p style={{ fontSize:12, color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>{s.lbl}</p>
          </div>
        ))}
      </div>

      {/* Podium top 3 */}
      {data.leaderboard.length >= 3 && (
        <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'flex-end' }}>
          {[1,0,2].map(i => {
            const e = data.leaderboard[i];
            if (!e) return <div key={i} style={{ flex:1 }} />;
            return (
              <div key={i} style={{ flex:1, background:C.surface, border:`1px solid ${i===0?'rgba(245,158,11,0.35)':C.border}`,
                borderRadius:C.r, padding:'12px 8px', textAlign:'center',
                transform: i===0 ? 'scale(1.04)' : 'none', transition:'transform 0.2s' }}>
                <div style={{ fontSize:24, marginBottom:6 }}>{medals[i]}</div>
                <div style={{ width:36, height:36, borderRadius:10, background:C.accentFaint,
                  display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 6px',
                  color:C.accent, fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15 }}>
                  {e.name[0]}
                </div>
                <p style={{ color:C.text, fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.name}</p>
                <p style={{ color:C.accent, fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif", marginTop:2 }}>{e.ridesCompleted}</p>
                <p style={{ color:C.green, fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>{(e.carbonSaved||0).toFixed(1)} kg</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {data.leaderboard.map((e,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, background:C.surface,
            border:`1px solid ${C.border}`, borderRadius:C.rs, padding:'12px 14px' }}>
            <span style={{ width:24, textAlign:'center', color:C.muted, fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>#{e.rank}</span>
            <div style={{ width:32, height:32, borderRadius:9, background:C.accentFaint,
              display:'flex', alignItems:'center', justifyContent:'center', color:C.accent,
              fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif", flexShrink:0 }}>
              {e.name[0]}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ color:C.text, fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.name}</p>
              <p style={{ color:C.muted, fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>{e.role}</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ color:C.accent, fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>{e.ridesCompleted}</p>
              <p style={{ color:C.green, fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>{(e.carbonSaved||0).toFixed(1)} kg</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Profile tab ──────────────────────────────────────────────────────────────
const ProfileTab = ({ user, logout, showNotif, onUploadId, onRefreshUser }) => {
  const [contacts, setContacts] = useState(user.trustedContacts || []);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveContacts = async () => {
    if (!contacts.every(c => c.name && c.phone)) return showNotif('Each contact needs name & phone','error');
    setSaving(true);
    try {
      await api.put('/auth/trusted-contacts', { trustedContacts: contacts });
      showNotif('Contacts saved!','success');
      setEditing(false); onRefreshUser();
    } catch (err) { showNotif(err.response?.data?.error||'Failed','error'); }
    finally { setSaving(false); }
  };

  const verBadge = {
    verified:     { label:'Verified', bg:'rgba(16,185,129,0.12)', color:C.green, border:'rgba(16,185,129,0.3)' },
    pending:      { label:'Unverified', bg:'rgba(255,255,255,0.04)', color:C.muted, border:C.border },
    under_review: { label:'Under Review', bg:'rgba(96,165,250,0.1)', color:C.blue, border:'rgba(96,165,250,0.3)' },
    rejected:     { label:'Rejected', bg:'rgba(239,68,68,0.1)', color:C.red, border:'rgba(239,68,68,0.3)' },
  }[user.verificationStatus] || { label:'Unknown', bg:C.surface, color:C.muted, border:C.border };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Avatar card */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:C.r, padding:20,
        display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:56, height:56, borderRadius:14, background:C.accent,
          display:'flex', alignItems:'center', justifyContent:'center', color:'#000',
          fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, flexShrink:0 }}>
          {user.name?.[0]}
        </div>
        <div>
          <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:17, color:C.text }}>{user.name}</p>
          <p style={{ color:C.muted, fontSize:13, fontFamily:"'DM Sans',sans-serif", marginTop:2 }}>{user.email}</p>
          <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
            <span style={{ padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:600,
              fontFamily:"'DM Sans',sans-serif", background:verBadge.bg, color:verBadge.color, border:`1px solid ${verBadge.border}` }}>
              {verBadge.label}
            </span>
            <span style={{ padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:500,
              fontFamily:"'DM Sans',sans-serif", background:'rgba(255,255,255,0.04)', color:C.muted, border:`1px solid ${C.border}` }}>
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', background:C.surface, border:`1px solid ${C.border}`, borderRadius:C.r, overflow:'hidden' }}>
        {[
          { val:user.ridesCompleted||0, lbl:'Rides' },
          { val:`${(user.carbonSaved||0).toFixed?.(1)??0}kg`, lbl:'CO₂' },
          { val:user.rating||'5.0', lbl:'Rating' },
        ].map((s,i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
            padding:'14px 8px', borderRight: i<2 ? `1px solid ${C.border}` : 'none' }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18, color:C.text }}>{s.val}</span>
            <span style={{ fontSize:11, color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>{s.lbl}</span>
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:C.r, padding:'4px 0' }}>
        {[
          { label:'Organisation', value:user.organization },
          { label:'Phone', value:user.phone },
        ].map(({ label, value }) => (
          <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'12px 16px',
            borderBottom:`1px solid ${C.border}` }}>
            <span style={{ color:C.muted, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>{label}</span>
            <span style={{ color:C.text, fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* ID Verification */}
      {user.verificationStatus !== 'verified' && (
        <button onClick={onUploadId}
          style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)',
            borderRadius:C.r, padding:'14px 16px', cursor:'pointer', width:'100%', boxSizing:'border-box' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Upload size={16} color={C.accent} />
            <span style={{ fontSize:14, fontWeight:600, color:C.accent, fontFamily:"'DM Sans',sans-serif" }}>
              {user.verificationStatus === 'pending' ? 'Upload Organisation ID' : 'Re-upload ID Card'}
            </span>
          </div>
          <ArrowRight size={16} color={C.accent} />
        </button>
      )}

      {/* Trusted contacts */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:C.r, padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Shield size={15} color={C.blue} />
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:C.text }}>Trusted Contacts</span>
          </div>
          <button onClick={() => setEditing(!editing)}
            style={{ background:'none', border:'none', cursor:'pointer', color:C.accent, fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
        <p style={{ color:C.muted, fontSize:12, marginBottom:12, fontFamily:"'DM Sans',sans-serif" }}>
          Up to 3 emergency contacts for SOS alerts
        </p>
        {editing ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {contacts.map((c,i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.03)', borderRadius:C.rs, padding:12, border:`1px solid ${C.border}` }}>
                <input placeholder="Name" value={c.name}
                  onChange={e => { const nc=[...contacts]; nc[i]={...nc[i],name:e.target.value}; setContacts(nc); }}
                  style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`,
                    borderRadius:C.rxs, color:C.text, fontFamily:"'DM Sans',sans-serif", fontSize:13,
                    padding:'9px 12px', outline:'none', marginBottom:6 }} />
                <input placeholder="Phone" value={c.phone}
                  onChange={e => { const nc=[...contacts]; nc[i]={...nc[i],phone:e.target.value}; setContacts(nc); }}
                  style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`,
                    borderRadius:C.rxs, color:C.text, fontFamily:"'DM Sans',sans-serif", fontSize:13,
                    padding:'9px 12px', outline:'none', marginBottom:6 }} />
                <button onClick={() => setContacts(contacts.filter((_,j)=>j!==i))}
                  style={{ background:'none', border:'none', cursor:'pointer', color:C.red, fontSize:12,
                    display:'flex', alignItems:'center', gap:4, fontFamily:"'DM Sans',sans-serif" }}>
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            ))}
            <div style={{ display:'flex', gap:8 }}>
              {contacts.length < 3 && (
                <button onClick={() => setContacts([...contacts,{name:'',phone:'',relation:'Emergency Contact'}])}
                  style={{ flex:1, padding:'11px 0', borderRadius:50, border:`1px dashed ${C.border}`,
                    background:'transparent', color:C.muted, fontSize:13, cursor:'pointer',
                    fontFamily:"'DM Sans',sans-serif" }}>
                  + Add
                </button>
              )}
              <button onClick={saveContacts} disabled={saving}
                style={{ flex:1, padding:'11px 0', borderRadius:50, background:C.accent, color:'#000',
                  border:'none', fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:13, cursor:'pointer',
                  opacity: saving ? 0.5 : 1 }}>
                {saving ? '…' : 'Save'}
              </button>
            </div>
          </div>
        ) : contacts.length === 0 ? (
          <p style={{ color:C.faint, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>No contacts added yet</p>
        ) : (
          contacts.map((c,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:'rgba(96,165,250,0.1)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Phone size={14} color={C.blue} />
              </div>
              <div>
                <p style={{ color:C.text, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>{c.name}</p>
                <p style={{ color:C.muted, fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>{c.phone}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Future features notice */}
      <div style={{ background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)',
        borderRadius:C.r, padding:'14px 16px' }}>
        <p style={{ color:C.purple, fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif", marginBottom:4 }}>
          🚀 Coming Soon
        </p>
        <p style={{ color:C.muted, fontSize:12, fontFamily:"'DM Sans',sans-serif", lineHeight:1.6 }}>
          OTP login via mobile/email · UPI payment gateway · Live GPS map · In-app chat (auto-deleted after 2h)
        </p>
      </div>

      {/* Logout */}
      <Btn onClick={logout} variant="danger" style={{ width:'100%', padding:'14px 0', fontSize:14 }}>
        <LogOut size={15} /> Sign Out
      </Btn>
    </div>
  );
};

// ─── App root ─────────────────────────────────────────────────────────────────
const App = () => {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('landing');
  const [notif, setNotif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketNotifs, setSocketNotifs] = useState([]);

  useEffect(() => { injectFonts(); checkAuth(); }, []);

  const showNotif = useCallback((message, type='success') => {
    setNotif({ message, type });
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        setPage('dashboard');
      } catch { localStorage.removeItem('token'); }
    }
    setLoading(false);
  };

  const refreshUser = async () => {
    try { const r = await api.get('/auth/me'); setUser(r.data.user); } catch {}
  };

  useEffect(() => {
    if (!user) return;
    const s = getSocket();
    s.emit('join-user-room', user.id || user._id);
    const add = (d) => setSocketNotifs(p => [{ ...d, timestamp: new Date().toISOString() }, ...p].slice(0,20));
    s.on('booking-notification', add);
    s.on('booking-request', d => { add(d); showNotif(`${d.userName} wants to join your ride!`, 'info'); });
    s.on('booking-approved', d => { add(d); showNotif(d.message, 'success'); });
    s.on('booking-declined', d => { add(d); showNotif(d.message, 'warning'); });
    s.on('booking-cancelled', d => add({ title:'Booking Cancelled', ...d }));
    s.on('ride-cancelled-by-driver', d => add(d));
    s.on('review-reminder', d => add({ title:'Rate your ride', ...d }));
    s.on('sos-alert', d => { add({ title:'🆘 SOS Alert', ...d }); showNotif(`SOS from ${d.userName}!`, 'error'); });
    return () => {
      ['booking-notification','booking-request','booking-approved','booking-declined',
       'booking-cancelled','ride-cancelled-by-driver','review-reminder','sos-alert'].forEach(e => s.off(e));
    };
  }, [user]);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null); setPage('landing'); setSocketNotifs([]);
    showNotif('See you soon! 👋');
  };

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Car size={22} color="#000" />
          </div>
          <div style={{ display:'flex', gap:7 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:C.accent,
                animation:`rsDot 1.2s ease-in-out ${i*0.2}s infinite` }} />
            ))}
          </div>
        </div>
        <style>{GLOBAL_CSS}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.bg, color:C.text, minHeight:'100vh', overflowX:'hidden' }}>
      <style>{GLOBAL_CSS}</style>
      <Toast n={notif} onClose={() => setNotif(null)} />
      {page === 'landing'   && <LandingPage setPage={setPage} />}
      {page === 'login'     && <AuthPage type="login"  setPage={setPage} setUser={setUser} showNotif={showNotif} />}
      {page === 'signup'    && <AuthPage type="signup" setPage={setPage} setUser={setUser} showNotif={showNotif} />}
      {page === 'dashboard' && user && (
        <Dashboard user={user} logout={logout} showNotif={showNotif} setUser={setUser}
          socketNotifs={socketNotifs} refreshUser={refreshUser} />
      )}
    </div>
  );
};

// ─── Landing page ─────────────────────────────────────────────────────────────
const LandingPage = ({ setPage }) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <div style={{ background:C.bg, minHeight:'100vh' }}>
      {/* Nav */}
      <nav style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:1200,
        zIndex:100, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px',
        background: scrolled ? 'rgba(10,12,20,0.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.border}` : 'none', transition:'all 0.3s' }}>
        <Logo />
        <div style={{ display:'flex', gap:8 }}>
          <Btn onClick={() => setPage('login')} variant="ghost" style={{ padding:'9px 18px' }}>Login</Btn>
          <Btn onClick={() => setPage('signup')} variant="primary" style={{ padding:'9px 18px' }}>Get Started</Btn>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', padding:'100px 24px 60px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,158,11,0.1) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:640, width:'100%' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px',
            borderRadius:50, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)',
            fontSize:12, color:C.accent, fontWeight:500, marginBottom:24 }}>
            <Zap size={12} />
            <span>India's Smartest Carpool Network</span>
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800,
            fontSize:'clamp(38px, 7vw, 68px)', lineHeight:1.08, color:C.text, marginBottom:20 }}>
            Your commute,<br />
            <span style={{ color:C.accent }}>shared smarter.</span>
          </h1>
          <p style={{ fontSize:'clamp(15px, 2vw, 18px)', color:C.muted, lineHeight:1.7, marginBottom:36, maxWidth:480, margin:'0 auto 36px' }}>
            Match with verified classmates & colleagues going your way. Save money, cut emissions, build community.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <Btn onClick={() => setPage('signup')} variant="primary" style={{ padding:'14px 28px', fontSize:16 }}>
              Start Sharing <ArrowRight size={18} />
            </Btn>
            <Btn onClick={() => setPage('login')} variant="ghost" style={{ padding:'14px 28px', fontSize:16 }}>
              Sign In
            </Btn>
          </div>
        </div>
        {/* Stats card */}
        <div style={{ position:'relative', zIndex:1, marginTop:48, background:C.surface,
          border:`1px solid ${C.border}`, borderRadius:C.r, padding:'20px 28px',
          width:'100%', maxWidth:480 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            {[
              { val:'12.5k kg', lbl:'CO₂ saved', color:C.green },
              { val:'2,847', lbl:'Commuters', color:C.blue },
              { val:'₹8.2L', lbl:'Saved', color:C.accent },
            ].map(({ val, lbl, color }) => (
              <div key={lbl} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18, color }}>{val}</span>
                <span style={{ fontSize:11, color:C.faint, fontFamily:"'DM Sans',sans-serif" }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding:'clamp(48px,8vw,96px) 24px', maxWidth:1100, margin:'0 auto' }}>
        <p style={{ fontSize:12, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:C.accent, marginBottom:12, fontFamily:"'DM Sans',sans-serif" }}>Simple process</p>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'clamp(26px,4vw,40px)', color:C.text, marginBottom:40 }}>How RideShare works</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:20 }}>
          {[
            { n:'01', icon:<User size={20} />, t:'Join your org', b:'Sign up with your college or company. Every commuter is verified with their ID card.' },
            { n:'02', icon:<Search size={20} />, t:'Find your match', b:'Smart search connects you with org members going the exact same way.' },
            { n:'03', icon:<Car size={20} />, t:'Ride together', b:'Public or private rides, live tracking, SOS alerts, and in-app chat.' },
            { n:'04', icon:<Leaf size={20} />, t:'Track impact', b:'Leaderboards, CO₂ dashboards, and ratings build community trust.' },
          ].map((s,i) => (
            <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:C.r, padding:24 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:36, color:'rgba(245,158,11,0.15)', lineHeight:1, marginBottom:12 }}>{s.n}</div>
              <div style={{ color:C.accent, marginBottom:12 }}>{s.icon}</div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:17, color:C.text, marginBottom:8 }}>{s.t}</h3>
              <p style={{ fontSize:14, color:C.muted, lineHeight:1.6, fontFamily:"'DM Sans',sans-serif" }}>{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding:'clamp(48px,8vw,96px) 24px', background:C.surface }}>
        <p style={{ fontSize:12, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:C.accent, marginBottom:12, fontFamily:"'DM Sans',sans-serif", textAlign:'center' }}>Why RideShare</p>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'clamp(26px,4vw,40px)', color:C.text, marginBottom:40, textAlign:'center' }}>Built for Indian commuters</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, maxWidth:1100, margin:'0 auto' }}>
          {[
            { icon:<Shield size={22} />, t:'Verified only', b:'Org ID verification for every user.' },
            { icon:<Lock size={22} />, t:'Public & Private', b:'Choose who can book your ride.' },
            { icon:<Navigation size={22} />, t:'Live tracking', b:'Share location with family in real time.' },
            { icon:<Wind size={22} />, t:'CO₂ savings', b:'Know your environmental impact.' },
            { icon:<Bike size={22} />, t:'Bikepool too', b:'Not just cars — match with bike riders.' },
            { icon:<BarChart2 size={22} />, t:'Leaderboards', b:'Compete with your org on carbon.' },
          ].map((f,i) => (
            <div key={i} style={{ padding:20, borderRadius:C.rs, border:`1px solid ${C.border}`, background:C.bg }}>
              <div style={{ color:C.accent, marginBottom:10 }}>{f.icon}</div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:C.text, marginBottom:6 }}>{f.t}</h3>
              <p style={{ fontSize:13, color:C.muted, lineHeight:1.5, fontFamily:"'DM Sans',sans-serif" }}>{f.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'clamp(48px,8vw,96px) 24px', textAlign:'center',
        background:'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(245,158,11,0.08) 0%, transparent 70%)' }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'clamp(26px,4vw,40px)', color:C.text, marginBottom:14 }}>
          Ready to share your first ride?
        </h2>
        <p style={{ fontSize:16, color:C.muted, marginBottom:28 }}>Join thousands of students and professionals already saving.</p>
        <Btn onClick={() => setPage('signup')} variant="primary" style={{ padding:'14px 32px', fontSize:16 }}>
          Create free account <ArrowRight size={18} />
        </Btn>
      </section>

      <footer style={{ padding:'40px 24px', borderTop:`1px solid ${C.border}`, textAlign:'center',
        display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
        <Logo />
        <p style={{ fontSize:14, color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>Making Indian commutes smarter, cheaper & greener.</p>
        <p style={{ fontSize:12, color:C.faint, fontFamily:"'DM Sans',sans-serif" }}>© 2025 RideShare. All rights reserved.</p>
      </footer>
    </div>
  );
};

// ─── Auth page ────────────────────────────────────────────────────────────────
const AuthPage = ({ type, setPage, setUser, showNotif }) => {
  const [form, setForm] = useState({ email:'', password:'', name:'', phone:'', organization:'', role:'rider' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const isLogin = type === 'login';

  const validate = () => {
    const e = {};
    if (!isLogin) {
      if (!form.name.trim()) e.name = 'Name is required';
      if (!form.phone.trim()) e.phone = 'Phone is required';
      if (!form.organization) e.organization = 'Select your organisation';
    }
    if (!isValidEmail(form.email)) e.email = 'Enter a valid email (Gmail, Outlook, college email, etc.)';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      e.password = 'Password must contain letters and numbers';
    }
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await api.post(`/auth/${isLogin ? 'login' : 'signup'}`, form);
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      setPage('dashboard');
      showNotif(`Welcome${isLogin?' back':''}, ${res.data.user.name}! 🎉`);
    } catch (err) {
      showNotif(err.response?.data?.error || 'Something went wrong', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center',
      justifyContent:'center', padding:24, position:'relative' }}>
      <button onClick={() => setPage('landing')}
        style={{ position:'absolute', top:20, left:20, display:'flex', alignItems:'center', gap:4,
          background:'none', border:'none', color:C.muted, cursor:'pointer',
          fontFamily:"'DM Sans',sans-serif", fontSize:14, padding:'8px 12px' }}>
        <ChevronLeft size={18} /> Back
      </button>

      <div style={{ width:'100%', maxWidth:420, background:C.surface, border:`1px solid ${C.border}`,
        borderRadius:C.r+4, padding:'clamp(24px,5vw,40px)', boxShadow:'0 24px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ marginBottom:28 }}>
          <Logo />
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:24, color:C.text, marginTop:20, marginBottom:4 }}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ fontSize:14, color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>
            {isLogin ? 'Sign in to continue' : "Join your org's commute network"}
          </p>
        </div>

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:13 }}>
          {!isLogin && (
            <>
              <InputField placeholder="Full name" value={form.name} onChange={v => setForm({...form,name:v})}
                icon={<User size={15} />} required error={errors.name} />
              <InputField placeholder="Phone number" type="tel" value={form.phone} onChange={v => setForm({...form,phone:v})}
                icon={<Phone size={15} />} required error={errors.phone} />
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.04)',
                  border:`1px solid ${errors.organization ? C.red : C.border}`, borderRadius:C.rs, padding:'0 14px' }}>
                  <Users size={15} color={C.faint} />
                  <select value={form.organization} onChange={e => setForm({...form,organization:e.target.value})} required
                    style={{ flex:1, background:'transparent', border:'none', outline:'none', color: form.organization ? C.text : C.faint,
                      fontFamily:"'DM Sans',sans-serif", fontSize:14, padding:'13px 0', cursor:'pointer' }}>
                    <option value="" disabled>Select organisation</option>
                    {ORGS.map(o => <option key={o} value={o} style={{ background:'#111827', color:C.text }}>{o}</option>)}
                  </select>
                </div>
                {errors.organization && <p style={{ color:C.red, fontSize:11, marginTop:4, fontFamily:"'DM Sans',sans-serif" }}>{errors.organization}</p>}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {[{v:'rider',l:'Rider',i:<Users size={14}/>},{v:'driver',l:'Driver',i:<Car size={14}/>},{v:'both',l:'Both',i:<ArrowRight size={14}/>}].map(r => (
                  <button key={r.v} type="button" onClick={() => setForm({...form,role:r.v})}
                    style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                      padding:'10px 0', borderRadius:C.rxs, border:`1px solid ${form.role===r.v?'rgba(245,158,11,0.4)':C.border}`,
                      background: form.role===r.v ? C.accentFaint : 'rgba(255,255,255,0.03)',
                      color: form.role===r.v ? C.accent : C.muted,
                      fontFamily:"'DM Sans',sans-serif", fontWeight:500, fontSize:13, cursor:'pointer' }}>
                    {r.i}{r.l}
                  </button>
                ))}
              </div>
            </>
          )}
          <InputField placeholder="Email address" type="email" value={form.email} onChange={v => setForm({...form,email:v})}
            icon={<Mail size={15} />} required error={errors.email} />
          <div>
            <InputField placeholder="Password (min 8 chars, letters + numbers)" type="password" value={form.password}
              onChange={v => setForm({...form,password:v})} icon={<Lock size={15} />} required error={errors.password} />
            {!isLogin && !errors.password && (
              <p style={{ color:C.faint, fontSize:11, marginTop:4, fontFamily:"'DM Sans',sans-serif" }}>
                Min. 8 characters · must include letters and numbers
              </p>
            )}
          </div>
          {!isLogin && (
            <div style={{ padding:'10px 14px', borderRadius:C.rxs, background:'rgba(96,165,250,0.08)', border:'1px solid rgba(96,165,250,0.15)' }}>
              <p style={{ color:C.blue, fontSize:11, fontFamily:"'DM Sans',sans-serif", lineHeight:1.5 }}>
                📌 After signing up, upload your organisation ID card to activate your account. OTP verification via email/mobile coming soon.
              </p>
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{ padding:'14px 0', borderRadius:50, background:C.accent, color:'#000', border:'none',
              fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:15,
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:4 }}>
            {loading ? <><Loader size={15} style={{ animation:'rsSpin 0.8s linear infinite' }} />Please wait…</> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p style={{ marginTop:20, textAlign:'center', fontSize:13, color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>
          {isLogin ? "New here? " : "Already have an account? "}
          <button onClick={() => setPage(isLogin ? 'signup' : 'login')}
            style={{ background:'none', border:'none', color:C.accent, cursor:'pointer',
              fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600 }}>
            {isLogin ? 'Create account' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = ({ user, logout, showNotif, setUser, socketNotifs, refreshUser }) => {
  const [tab, setTab] = useState('find');
  const [rides, setRides] = useState([]);
  const [myRides, setMyRides] = useState({ offered:[], booked:[] });
  const [filters, setFilters] = useState({ type:'carpool', from:'', to:'' });
  const [ridesLoading, setRidesLoading] = useState(false);
  const [showIdUpload, setShowIdUpload] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [reviewRide, setReviewRide] = useState(null);

  const currentUserId = user.id || user._id;

  const loadRides = useCallback(async () => {
    setRidesLoading(true);
    try {
      const p = new URLSearchParams();
      if (filters.type) p.append('type', filters.type);
      if (filters.from) p.append('from', filters.from);
      if (filters.to) p.append('to', filters.to);
      const res = await api.get(`/rides/search?${p}`);
      setRides(res.data.rides);
    } catch { showNotif('Failed to load rides','error'); }
    finally { setRidesLoading(false); }
  }, [filters]);

  const loadMyRides = useCallback(async () => {
    setRidesLoading(true);
    try {
      const res = await api.get('/rides/my-rides');
      setMyRides({ offered: res.data.offeredRides, booked: res.data.bookedRides });
    } catch { showNotif('Failed to load rides','error'); }
    finally { setRidesLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'find') loadRides();
    if (tab === 'myrides') loadMyRides();
  }, [tab]);

  const handleBook = async (rideId) => {
    try {
      const res = await api.post(`/rides/book/${rideId}`);
      showNotif(`Booked! 🎉 Saved ${res.data.carbonSaved}kg CO₂`);
      loadRides();
    } catch (err) { showNotif(err.response?.data?.error || 'Booking failed','error'); }
  };

  const handleRequest = async (rideId) => {
    try {
      await api.post(`/rides/request/${rideId}`);
      showNotif('Request sent! Waiting for driver approval.','info');
    } catch (err) { showNotif(err.response?.data?.error || 'Request failed','error'); }
  };

  const NAV = [
    { k:'find', icon:<Search size={20} />, label:'Find' },
    { k:'offer', icon:<Plus size={20} />, label:'Offer' },
    { k:'myrides', icon:<Car size={20} />, label:'Trips' },
    { k:'leaderboard', icon:<Trophy size={20} />, label:'Top' },
    { k:'profile', icon:<User size={20} />, label:'Profile' },
  ];

  return (
    <div style={{ background:C.bg, minHeight:'100vh', display:'flex', flexDirection:'column', maxWidth:768, margin:'0 auto' }}>
      {/* Header */}
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'18px 16px 14px', borderBottom:`1px solid ${C.border}`,
        position:'sticky', top:0, background:C.bg, zIndex:50, backdropFilter:'blur(8px)' }}>
        <div>
          <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:17, color:C.text }}>
            Hello, {user.name.split(' ')[0]} 👋
          </p>
          <p style={{ fontSize:12, color:C.muted, fontFamily:"'DM Sans',sans-serif", marginTop:1 }}>{user.organization}</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={() => setShowNotifPanel(!showNotifPanel)}
            style={{ position:'relative', background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:10, width:38, height:38, display:'flex', alignItems:'center',
              justifyContent:'center', cursor:'pointer' }}>
            <Bell size={18} color={C.muted} />
            {socketNotifs.length > 0 && (
              <span style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%',
                background:C.red, border:`1.5px solid ${C.bg}` }} />
            )}
          </button>
          <div style={{ width:38, height:38, borderRadius:11, background:C.accent,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#000', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16 }}>
            {user.name[0]}
          </div>
        </div>
      </header>

      {/* Verification banner */}
      <VerifBanner user={user} onUpload={() => setShowIdUpload(true)} />

      {/* Stats strip */}
      <div style={{ display:'flex', padding:'12px 16px', background:C.surface,
        borderBottom:`1px solid ${C.border}`, gap:0 }}>
        <MiniStat icon={<Leaf size={13} color={C.green} />} val={`${(user.carbonSaved||0).toFixed?.(1)??0}kg`} lbl="CO₂" />
        <div style={{ width:1, background:C.border, alignSelf:'stretch', margin:'0 4px' }} />
        <MiniStat icon={<Car size={13} color={C.blue} />} val={user.ridesCompleted||0} lbl="Rides" />
        <div style={{ width:1, background:C.border, alignSelf:'stretch', margin:'0 4px' }} />
        <MiniStat icon={<Star size={13} color={C.accent} />} val={user.rating||'5.0'} lbl="Rating" />
        <div style={{ width:1, background:C.border, alignSelf:'stretch', margin:'0 4px' }} />
        <MiniStat icon={<Award size={13} color={C.purple} />} val={`#${Math.floor(Math.random()*50)+1}`} lbl="Rank" />
      </div>

      {/* Scrollable content */}
      <main style={{ flex:1, overflowY:'auto', padding:'16px 16px 100px' }}>
        {/* Tab pills (visible on all sizes) */}
        <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
          {[{k:'find',l:'Find Ride'},{k:'offer',l:'Offer Ride'},{k:'myrides',l:'My Rides'}].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:50,
                whiteSpace:'nowrap', border:`1px solid ${tab===t.k?'rgba(245,158,11,0.35)':C.border}`,
                background: tab===t.k ? C.accentFaint : C.surface,
                color: tab===t.k ? C.accent : C.muted,
                fontFamily:"'DM Sans',sans-serif", fontWeight:500, fontSize:13, cursor:'pointer', transition:'all 0.2s' }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Find rides */}
        {tab === 'find' && (
          <div>
            {/* Search box */}
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:C.r, overflow:'hidden', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px' }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:C.green, flexShrink:0 }} />
                <input placeholder="From — Pickup point" value={filters.from}
                  onChange={e => setFilters(f => ({...f,from:e.target.value}))}
                  style={{ flex:1, background:'transparent', border:'none', outline:'none', color:C.text, fontFamily:"'DM Sans',sans-serif", fontSize:14 }} />
              </div>
              <div style={{ height:1, background:C.border, marginLeft:38 }} />
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px' }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:C.accent, flexShrink:0 }} />
                <input placeholder="To — Destination" value={filters.to}
                  onChange={e => setFilters(f => ({...f,to:e.target.value}))}
                  style={{ flex:1, background:'transparent', border:'none', outline:'none', color:C.text, fontFamily:"'DM Sans',sans-serif", fontSize:14 }} />
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'10px 16px', borderTop:`1px solid ${C.border}`, background:'rgba(255,255,255,0.02)' }}>
                <div style={{ display:'flex', gap:6 }}>
                  {[{v:'carpool',l:'🚗 Car'},{v:'bikepool',l:'🏍️ Bike'}].map(t => (
                    <button key={t.v} onClick={() => setFilters(f=>({...f,type:t.v}))}
                      style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', borderRadius:50,
                        border:`1px solid ${filters.type===t.v?'rgba(245,158,11,0.35)':C.border}`,
                        background: filters.type===t.v ? C.accentFaint : 'transparent',
                        color: filters.type===t.v ? C.accent : C.muted,
                        fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                      {t.l}
                    </button>
                  ))}
                </div>
                <button onClick={loadRides}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:50,
                    background:C.accent, color:'#000', border:'none', cursor:'pointer',
                    fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:13 }}>
                  <Search size={14} />Search
                </button>
              </div>
            </div>

            {ridesLoading
              ? <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}><div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid ${C.border}`, borderTopColor:C.accent, animation:'rsSpin 0.8s linear infinite' }} /></div>
              : rides.length === 0
                ? <div style={{ textAlign:'center', padding:'60px 0' }}>
                    <Car size={40} color={C.faint} style={{ marginBottom:12 }} />
                    <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:C.text, fontSize:17, marginBottom:6 }}>No rides found</p>
                    <p style={{ color:C.muted, fontSize:14, fontFamily:"'DM Sans',sans-serif" }}>Try different locations or check back soon</p>
                  </div>
                : rides.map(r => <RideCard key={r._id} ride={r} onBook={handleBook} onRequest={handleRequest} currentUserId={currentUserId} />)
            }
          </div>
        )}

        {tab === 'offer' && <OfferRide user={user} showNotif={showNotif} onSuccess={() => setTab('myrides')} />}

        {tab === 'myrides' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:20, color:C.text }}>My Rides</h2>
              <button onClick={loadMyRides} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:8, cursor:'pointer', display:'flex', alignItems:'center' }}>
                <RefreshCw size={15} color={C.muted} />
              </button>
            </div>
            {ridesLoading
              ? <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}><div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid ${C.border}`, borderTopColor:C.accent, animation:'rsSpin 0.8s linear infinite' }} /></div>
              : myRides.offered.length === 0 && myRides.booked.length === 0
                ? <div style={{ textAlign:'center', padding:'60px 0' }}>
                    <Calendar size={40} color={C.faint} style={{ marginBottom:12 }} />
                    <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:C.text, fontSize:17, marginBottom:6 }}>No rides yet</p>
                    <p style={{ color:C.muted, fontSize:14, fontFamily:"'DM Sans',sans-serif" }}>Offer or book your first ride</p>
                  </div>
                : <>
                    {myRides.offered.length > 0 && (
                      <>
                        <p style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, fontFamily:"'DM Sans',sans-serif" }}>Rides You're Driving</p>
                        {myRides.offered.map(r => <MyRideCard key={r._id} ride={r} currentUserId={currentUserId} onRefresh={loadMyRides} showNotif={showNotif} onReview={setReviewRide} />)}
                      </>
                    )}
                    {myRides.booked.length > 0 && (
                      <>
                        <p style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', margin:'16px 0 10px', fontFamily:"'DM Sans',sans-serif" }}>Rides You've Booked</p>
                        {myRides.booked.map(r => <MyRideCard key={r._id} ride={r} currentUserId={currentUserId} onRefresh={loadMyRides} showNotif={showNotif} onReview={setReviewRide} />)}
                      </>
                    )}
                  </>
            }
          </div>
        )}

        {tab === 'leaderboard' && <Leaderboard user={user} showNotif={showNotif} />}

        {tab === 'profile' && (
          <ProfileTab user={user} logout={logout} showNotif={showNotif}
            onUploadId={() => setShowIdUpload(true)} onRefreshUser={refreshUser} />
        )}
      </main>

      {/* Bottom nav */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:768, background:C.surface, borderTop:`1px solid ${C.border}`,
        display:'flex', zIndex:50, paddingBottom:'max(8px,env(safe-area-inset-bottom))' }}>
        {NAV.map(({ k, icon, label }) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              gap:3, padding:'8px 0', background:'none', border:'none', cursor:'pointer',
              position:'relative' }}>
            {k === 'offer'
              ? <div style={{ width:42, height:42, borderRadius:13, background:C.accent,
                  display:'flex', alignItems:'center', justifyContent:'center', marginTop:-10,
                  color:'#000', boxShadow:`0 4px 16px rgba(245,158,11,0.4)` }}>
                  {icon}
                </div>
              : <>
                  <span style={{ color: tab===k ? C.accent : C.faint, transition:'color 0.15s' }}>{icon}</span>
                  <span style={{ fontSize:10, fontFamily:"'DM Sans',sans-serif", fontWeight: tab===k ? 600 : 400,
                    color: tab===k ? C.accent : C.faint, transition:'color 0.15s' }}>{label}</span>
                  {tab===k && <div style={{ position:'absolute', bottom:0, width:20, height:2,
                    background:C.accent, borderRadius:2 }} />}
                </>
            }
          </button>
        ))}
      </nav>

      {/* Modals */}
      {showIdUpload && <IdUploadModal onClose={() => setShowIdUpload(false)} onSuccess={refreshUser} showNotif={showNotif} />}
      {reviewRide && <ReviewModal ride={reviewRide} onClose={() => setReviewRide(null)} showNotif={showNotif} />}
      {showNotifPanel && <NotifPanel notifs={socketNotifs} onClose={() => setShowNotifPanel(false)} />}
    </div>
  );
};

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0A0C14; -webkit-tap-highlight-color: transparent; }
  input, textarea, select { color-scheme: dark; }
  input::placeholder, textarea::placeholder { color: #4b5563; }
  select option { background: #111827; color: #f9fafb; }

  @keyframes rsSpin { to { transform: rotate(360deg); } }
  @keyframes rsSlideDown {
    from { transform: translateX(-50%) translateY(-16px); opacity: 0; }
    to   { transform: translateX(-50%) translateY(0);     opacity: 1; }
  }
  @keyframes rsDot {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%           { transform: scale(1);   opacity: 1;   }
  }

  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(0.5);
    cursor: pointer;
  }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }

  button:active:not(:disabled) { transform: scale(0.97); }
  a { -webkit-tap-highlight-color: transparent; }
`;

export default App;