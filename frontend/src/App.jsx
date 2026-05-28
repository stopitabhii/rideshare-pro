import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import api from './services/api';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ─── Font injection ─────────────────────────────────────────────────────── */
const injectFonts = () => {
  if (document.getElementById('rs-fonts')) return;
  const l = document.createElement('link');
  l.id = 'rs-fonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300&display=swap';
  document.head.appendChild(l);
};

/* ─── Socket singleton ───────────────────────────────────────────────────── */
let _sock = null;
const getSock = () => {
  if (!_sock) _sock = io('https://rideshare-pro.onrender.com', {
    transports: ['websocket', 'polling'],
    reconnection: true, reconnectionAttempts: 5,
  });
  return _sock;
};

/* ─── Design tokens ──────────────────────────────────────────────────────── */
// Palette: warm slate ink + cream canvas + deep teal accent
const C = {
  bg:       '#F6F5F1',   // warm off-white canvas
  surface:  '#FFFFFF',
  surface2: '#EFEDE8',   // light warm grey for cards
  border:   '#DDD9D0',
  ink:      '#1C1C1E',   // near-black
  ink2:     '#48474A',   // secondary text
  faint:    '#9A9896',
  accent:   '#0D7A6B',   // deep teal
  accentLt: '#E6F4F2',
  accentDk: '#09614F',
  green:    '#1F7A4A',
  greenLt:  '#E8F5EE',
  red:      '#C0392B',
  redLt:    '#FDECEA',
  blue:     '#1D4ED8',
  blueLt:   '#EEF2FF',
  purple:   '#6D28D9',
  purpleLt: '#F0EAFF',
  gold:     '#B45309',
  goldLt:   '#FEF3C7',
  r:        12,
};

/* ─── NCR Orgs ──────────────────────────────────────────────────────────── */
const ORGS = [
  'Galgotias University','Bennett University','Sharda University',
  'GL Bajaj Institute of Technology','GNIOT Greater Noida',
  'NIET Greater Noida','ITS Engineering College','Gautam Buddha University',
  'ABES Engineering College','Amity University Noida','IIMT University Noida',
  'Jaypee Institute (JIIT Noida)','Symbiosis Noida','Delhi University',
  'IIT Delhi','NSIT Dwarka','DTU Delhi','Jamia Millia Islamia','JNU Delhi',
  'IGDTUW Delhi','IP University Delhi','IIIT Delhi','NIT Delhi',
  'Ambedkar University Delhi','Netaji Subhas University of Technology',
  'MDI Gurugram','GD Goenka University','Sushant University Gurugram',
  'NIIT University','Ashoka University Sonipat','Manav Rachna University',
  'YMCA Faridabad','Lingayas University Faridabad','Subharti University Meerut',
  'KIET Ghaziabad','IMS Ghaziabad','ABES IT Ghaziabad',
  'Ajay Kumar Garg Engineering College','InfoSys Noida','Wipro Noida','TCS Noida',
];

const isValidEmail = e => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return false;
  const blocked = ['test.com','fake.com','example.com','mailinator.com','tempmail.com'];
  return !blocked.includes(e.split('@')[1]?.toLowerCase());
};

/* ─── Leaflet icon fix ───────────────────────────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
const makeIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);"></div>`,
  iconSize: [14,14], iconAnchor: [7,7],
});

/* ─── useDebounce ────────────────────────────────────────────────────────── */
function useDebounce(val, ms) {
  const [d, setD] = useState(val);
  useEffect(() => { const t = setTimeout(() => setD(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return d;
}

/* ─── Global CSS ─────────────────────────────────────────────────────────── */
const GLOBAL = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; -webkit-tap-highlight-color: transparent; }
  body { background: ${C.bg}; font-family: 'Plus Jakarta Sans', sans-serif; color: ${C.ink}; }
  input::placeholder, textarea::placeholder { color: ${C.faint}; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
  button:active:not(:disabled) { transform: scale(0.97); }

  @keyframes rsSpin    { to { transform: rotate(360deg); } }
  @keyframes rsFadeUp  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
  @keyframes rsSlide   { from { opacity:0; transform:translateX(-50%) translateY(-8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
  @keyframes rsPulse   { 0%,100% { opacity:1; } 50% { opacity:.4; } }
  @keyframes rsShake   { 0%,100% { transform:translateX(0); } 25%,75% { transform:translateX(-3px); } 50% { transform:translateX(3px); } }
  @keyframes sosPulse  { 0%,100% { box-shadow:0 0 0 0 rgba(201,53,53,.5); } 70% { box-shadow:0 0 0 14px rgba(201,53,53,0); } }
  @keyframes ticker    { from { transform:translateX(0); } to { transform:translateX(-50%); } }
  @keyframes shimmer   { from { background-position: -400px 0; } to { background-position: 400px 0; } }

  .rs-card { background:${C.surface}; border:1.5px solid ${C.border}; border-radius:${C.r}px; }
  .rs-card-warm { background:${C.surface2}; border:1.5px solid ${C.border}; border-radius:${C.r}px; }

  .rs-btn { font-family:'Plus Jakarta Sans',sans-serif; border:none; border-radius:50px;
    cursor:pointer; font-weight:700; transition:all .15s; display:inline-flex;
    align-items:center; justify-content:center; gap:6px; }
  .rs-btn-primary { background:${C.accent}; color:#fff; }
  .rs-btn-primary:hover:not(:disabled) { background:${C.accentDk}; }
  .rs-btn-ghost { background:transparent; color:${C.ink2}; border:1.5px solid ${C.border}; }
  .rs-btn-ghost:hover:not(:disabled) { border-color:${C.ink2}; background:${C.surface2}; }
  .rs-btn-danger { background:${C.red}; color:#fff; }
  .rs-btn-green  { background:${C.green}; color:#fff; }

  .rs-input { width:100%; padding:11px 14px; border:1.5px solid ${C.border}; border-radius:10px;
    font-family:'Plus Jakarta Sans',sans-serif; font-size:14px; color:${C.ink};
    background:#fff; outline:none; transition:border-color .15s; }
  .rs-input:focus { border-color:${C.accent}; }

  .rs-chip { padding:3px 10px; border-radius:50px; font-size:11px; font-weight:600;
    font-family:'Plus Jakarta Sans',sans-serif; border:1.5px solid transparent; }

  /* Sheet animation for mobile modals */
  @keyframes rsSheet { from { transform:translateY(100%); } to { transform:translateY(0); } }
  .rs-sheet { animation: rsSheet .28s cubic-bezier(.32,1,.36,1); }
  .rs-fadein { animation: rsFadeUp .22s ease; }

  /* Leaflet */
  .leaflet-container { border-radius:12px; font-family:'Plus Jakarta Sans',sans-serif; }

  @media (max-width:767px) { .rs-desk { display:none !important; } }
  @media (min-width:768px) { .rs-mob  { display:none !important; } }
`;

/* ─── Badge config ───────────────────────────────────────────────────────── */
const BADGE_CFG = {
  frequent_rider: { icon:'🏅', label:'Frequent Rider' },
  top_rated:      { icon:'⭐', label:'Top Rated' },
  eco_warrior:    { icon:'🌿', label:'Eco Warrior' },
  verified_pro:   { icon:'✓',  label:'Verified Pro' },
  early_adopter:  { icon:'🚀', label:'Early Adopter' },
  helpful:        { icon:'🤝', label:'Helpful' },
};

/* ─── Tiny helpers ───────────────────────────────────────────────────────── */
const Tag = ({ label, color, bg }) => (
  <span className="rs-chip" style={{ background: bg || `${color}18`, color, borderColor:`${color}30` }}>
    {label}
  </span>
);

const TrustBadge = ({ rating, totalRatings }) => {
  if (totalRatings < 3) return <Tag label="NEW" color={C.faint} />;
  const col = rating >= 4.5 ? C.green : rating >= 3.5 ? C.gold : C.red;
  const lbl = rating >= 4.5 ? 'TRUSTED' : rating >= 3.5 ? 'GOOD' : 'CAUTION';
  return <Tag label={lbl} color={col} />;
};

const BadgeChips = ({ badges }) => {
  if (!badges?.length) return null;
  return (
    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
      {badges.slice(0,3).map(b => {
        const cfg = BADGE_CFG[b]; if (!cfg) return null;
        return (
          <span key={b} title={cfg.label} style={{ padding:'1px 6px', borderRadius:4, fontSize:10,
            background:C.accentLt, border:`1px solid ${C.accent}30`, cursor:'default' }}>
            {cfg.icon}
          </span>
        );
      })}
    </div>
  );
};

const Spinner = ({ size=24 }) => (
  <div style={{ width:size, height:size, borderRadius:'50%', border:`2.5px solid ${C.border}`,
    borderTopColor:C.accent, animation:'rsSpin .8s linear infinite', flexShrink:0 }} />
);

const StatCard = ({ label, value, icon, accent }) => (
  <div className="rs-card" style={{ padding:'16px 18px', flex:1, minWidth:110 }}>
    <p style={{ fontSize:11, fontWeight:700, color:C.faint, textTransform:'uppercase',
      letterSpacing:'.07em', marginBottom:6 }}>{label}</p>
    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:22,
        color: accent || C.ink }}>{value}</span>
    </div>
  </div>
);

/* ─── Org search combobox ────────────────────────────────────────────────── */
const OrgSearch = ({ value, onChange, error }) => {
  const [q, setQ]       = useState(value || '');
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(false);
  const wrap = useRef(null);

  const filtered = q.length > 0
    ? ORGS.filter(o => o.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : ORGS.slice(0, 8);

  useEffect(() => {
    const h = e => { if (wrap.current && !wrap.current.contains(e.target)) { setOpen(false); setFocus(false); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pick = org => { setQ(org); onChange(org); setOpen(false); setFocus(false); };

  return (
    <div ref={wrap} style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <input
          type="text"
          placeholder="Search your university or company…"
          value={q}
          className="rs-input"
          style={{ borderColor: error ? C.red : focus ? C.accent : C.border,
            paddingRight:36 }}
          onFocus={() => { setFocus(true); setOpen(true); }}
          onChange={e => { setQ(e.target.value); onChange(''); setOpen(true); }}
        />
        <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
          fontSize:16, pointerEvents:'none' }}>🎓</span>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:9000,
          background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:12,
          boxShadow:'0 8px 32px rgba(0,0,0,.1)', maxHeight:240, overflowY:'auto' }}
          className="rs-fadein">
          {filtered.length === 0 ? (
            <p style={{ padding:'14px 16px', fontSize:13, color:C.faint }}>No match found</p>
          ) : filtered.map((org, i) => (
            <button key={org} onMouseDown={e => { e.preventDefault(); pick(org); }}
              style={{ width:'100%', padding:'11px 16px', background:'none', border:'none',
                textAlign:'left', cursor:'pointer', fontSize:13, fontWeight:600,
                color:C.ink, fontFamily:"'Plus Jakarta Sans',sans-serif",
                borderBottom: i < filtered.length-1 ? `1px solid ${C.border}` : 'none',
                transition:'background .1s' }}
              onMouseEnter={e => e.currentTarget.style.background=C.accentLt}
              onMouseLeave={e => e.currentTarget.style.background='none'}>
              {org}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Location autocomplete input ────────────────────────────────────────── */
const LocationInput = ({ placeholder, value, onChange, dotColor = C.green, required }) => {
  const [q, setQ]       = useState(value || '');
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
      .then(r => { const f = r.data.features || []; setSugs(f); setOpen(f.length > 0); })
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
    const label = parts.length ? parts.join(', ') : (p.label || '').split(',').slice(0,2).join(',').trim();
    setQ(label); setSugs([]); setOpen(false);
    onChange(label, feat);
  };

  const icon = p => {
    const n = (p.name || '').toLowerCase();
    if (n.includes('university') || n.includes('college')) return '🎓';
    if (n.includes('station') || n.includes('metro')) return '🚉';
    return ['locality','borough','neighbourhood'].includes(p.layer) ? '🏙️' : '📍';
  };

  return (
    <div ref={wrap} style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 14px',
        background: focus ? C.accentLt : 'transparent',
        borderRadius: open ? `${C.r}px ${C.r}px 0 0` : C.r,
        transition:'background .15s' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:dotColor, flexShrink:0,
          boxShadow: focus ? `0 0 0 3px ${dotColor}25` : 'none', transition:'box-shadow .2s' }} />
        <input type="text" placeholder={placeholder} value={q} required={required}
          onChange={e => setQ(e.target.value)}
          onFocus={() => { setFocus(true); if (sugs.length) setOpen(true); }}
          style={{ flex:1, border:'none', outline:'none', background:'transparent',
            fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, color:C.ink }} />
        {busy && <Spinner size={14} />}
      </div>
      {open && sugs.length > 0 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:9000,
          background:'#fff', border:`1.5px solid ${C.border}`, borderTop:'none',
          borderRadius:`0 0 ${C.r}px ${C.r}px`,
          boxShadow:'0 12px 32px rgba(0,0,0,.1)', maxHeight:240, overflowY:'auto' }}>
          {sugs.map((f, i) => {
            const p = f.properties || {};
            const name = p.name || p.street || (p.label || '').split(',')[0];
            const sub  = [p.locality, p.region].filter(Boolean).join(', ');
            return (
              <button key={i} onMouseDown={e => { e.preventDefault(); pick(f); }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10,
                  padding:'10px 14px', background:'none', border:'none', cursor:'pointer',
                  textAlign:'left', borderBottom: i < sugs.length-1 ? `1px solid ${C.border}` : 'none',
                  transition:'background .1s', fontFamily:"'Plus Jakarta Sans',sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.background=C.accentLt}
                onMouseLeave={e => e.currentTarget.style.background='none'}>
                <span style={{ fontSize:16, flexShrink:0 }}>{icon(p)}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:C.ink,
                    overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{name}</p>
                  {sub && <p style={{ fontSize:11, color:C.faint, marginTop:1 }}>{sub}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Toast ──────────────────────────────────────────────────────────────── */
const Toast = ({ n, onClose }) => {
  useEffect(() => { if (!n) return; const t = setTimeout(onClose, 3800); return () => clearTimeout(t); }, [n]);
  if (!n) return null;
  const styles = {
    success: { bg: C.green, icon: '✓' },
    error:   { bg: C.red,   icon: '!' },
    info:    { bg: C.blue,  icon: 'ℹ' },
    warning: { bg: C.gold,  icon: '⚠' },
  };
  const s = styles[n.type] || styles.success;
  return (
    <div style={{ position:'fixed', top:20, left:'50%', zIndex:9999,
      transform:'translateX(-50%)', background:s.bg, color:'#fff',
      padding:'10px 20px 10px 14px', borderRadius:50, fontSize:13, fontWeight:700,
      boxShadow:'0 4px 24px rgba(0,0,0,.18)', animation:'rsSlide .28s ease',
      maxWidth:'88vw', textAlign:'center', fontFamily:"'Plus Jakarta Sans',sans-serif",
      display:'flex', alignItems:'center', gap:8, letterSpacing:'-.01em' }}>
      <span style={{ width:20, height:20, borderRadius:'50%', background:'rgba(255,255,255,.25)',
        display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900 }}>
        {s.icon}
      </span>
      {n.message}
    </div>
  );
};

/* ─── Org ticker ─────────────────────────────────────────────────────────── */
const OrgTicker = () => {
  const items = [...ORGS, ...ORGS];
  return (
    <div style={{ background:C.ink, overflow:'hidden', padding:'9px 0' }}>
      <div style={{ display:'flex', gap:40, whiteSpace:'nowrap',
        animation:'ticker 30s linear infinite', width:'max-content' }}>
        {items.map((o, i) => (
          <span key={i} style={{ fontSize:12, color:C.accent, fontWeight:700,
            letterSpacing:'.03em' }}>
            ◆ {o}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ─── User Profile Modal ─────────────────────────────────────────────────── */
// Full trust profile — shown when tapping any driver/passenger name
const UserProfileModal = ({ userId, userName, onClose, notify, currentUser, onReport }) => {
  const [data, setData]       = useState(null);
  const [reviews, setReviews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overview'); // overview | reviews

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const r = await api.get(`/reviews/user/${userId}`);
        setData(r.data.user);
        setReviews(r.data);
      } catch { notify('Could not load profile', 'error'); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [userId]);

  const BAR_COLOR = { 5:C.green, 4:'#22C55E', 3:C.gold, 2:'#F97316', 1:C.red };

  const BADGE_LIST = [
    { k:'frequent_rider', icon:'🏅', label:'Frequent Rider', desc:'10+ rides completed' },
    { k:'top_rated',      icon:'⭐', label:'Top Rated',      desc:'4.5★ with 3+ reviews' },
    { k:'eco_warrior',    icon:'🌿', label:'Eco Warrior',    desc:'50+ kg CO₂ saved' },
    { k:'verified_pro',   icon:'✓',  label:'Verified',       desc:'ID verified by admin' },
    { k:'early_adopter',  icon:'🚀', label:'Early Adopter',  desc:'One of the first users' },
    { k:'helpful',        icon:'🤝', label:'Helpful',        desc:'10+ ratings received' },
  ];

  const uid = currentUser?.id || currentUser?._id;
  const isSelf = uid === userId;

  return (
    <ModalWrap onClose={onClose} maxWidth={480}>
      <ModalHeader title="Rider Profile" onClose={onClose} />

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}>
          <Spinner size={32} />
        </div>
      ) : !data ? (
        <p style={{ color:C.faint, textAlign:'center', padding:'20px 0' }}>
          Could not load profile
        </p>
      ) : (
        <>
          {/* ── Hero card ── */}
          <div style={{ display:'flex', gap:16, alignItems:'center', marginBottom:20,
            padding:16, background:C.surface2, borderRadius:12 }}>
            <div style={{ width:64, height:64, borderRadius:18, background:C.ink, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:28, color:'#fff' }}>
              {(userName || data.name || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:20,
                overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                {userName || data.name}
              </p>
              <p style={{ fontSize:12, color:C.faint, marginTop:2 }}>{data.organization || ''}</p>
              <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                {data.verificationStatus === 'verified'
                  ? <Tag label="✓ Verified" color={C.green} />
                  : <Tag label="Unverified" color={C.faint} />
                }
                {data.role && (
                  <Tag label={data.role.charAt(0).toUpperCase() + data.role.slice(1)}
                    color={C.ink2} />
                )}
              </div>
            </div>
            {/* Big rating */}
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <p style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:32,
                color: (data.rating||5) >= 4.5 ? C.green
                  : (data.rating||5) >= 3.5 ? C.gold : C.red, lineHeight:1 }}>
                {(data.rating || 5.0).toFixed(1)}
              </p>
              <p style={{ fontSize:10, color:C.faint, fontWeight:700 }}>
                ★ {data.totalRatings || 0} reviews
              </p>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
            {[
              { icon:'🚗', val: data.ridesCompleted || 0,                          label:'Rides' },
              { icon:'🌿', val: `${(data.carbonSaved || 0).toFixed?.(1) ?? 0}kg`,  label:'CO₂ Saved' },
              { icon:'⭐', val: (data.rating || 5.0).toFixed(1),                   label:'Avg Rating' },
            ].map((s, i) => (
              <div key={i} style={{ background:'#fff', border:`1.5px solid ${C.border}`,
                borderRadius:10, padding:'12px 10px', textAlign:'center' }}>
                <p style={{ fontSize:18, marginBottom:4 }}>{s.icon}</p>
                <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:18 }}>{s.val}</p>
                <p style={{ fontSize:10, color:C.faint, fontWeight:700,
                  textTransform:'uppercase', letterSpacing:'.05em' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── Badges ── */}
          {reviews?.reviews?.length > 0 && (() => {
            // Derive badges from stats same way backend does
            const earned = [];
            if ((data.ridesCompleted||0) >= 10)  earned.push('frequent_rider');
            if ((data.rating||5) >= 4.5 && (data.totalRatings||0) >= 3) earned.push('top_rated');
            if ((data.carbonSaved||0) >= 50)      earned.push('eco_warrior');
            if ((data.totalRatings||0) >= 10)     earned.push('helpful');
            if (data.verificationStatus === 'verified') earned.push('verified_pro');
            if (earned.length === 0) return null;
            return (
              <div style={{ marginBottom:16 }}>
                <p style={{ fontSize:11, fontWeight:800, color:C.faint, textTransform:'uppercase',
                  letterSpacing:'.07em', marginBottom:8 }}>Badges</p>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {BADGE_LIST.filter(b => earned.includes(b.k)).map(b => (
                    <div key={b.k} title={b.desc}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px',
                        background:C.accentLt, border:`1.5px solid ${C.accent}25`,
                        borderRadius:50, cursor:'default' }}>
                      <span style={{ fontSize:14 }}>{b.icon}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:C.accentDk }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── Tabs ── */}
          <div style={{ display:'flex', borderBottom:`1.5px solid ${C.border}`, marginBottom:16 }}>
            {[['overview','Overview'],['reviews','Reviews']].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)}
                style={{ flex:1, padding:'9px 0', background:'none', border:'none',
                  cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif",
                  fontWeight:700, fontSize:13,
                  color: tab===k ? C.accent : C.faint,
                  borderBottom: tab===k ? `2.5px solid ${C.accent}` : '2.5px solid transparent',
                  transition:'all .15s' }}>
                {l}
              </button>
            ))}
          </div>

          {/* ── Overview tab ── */}
          {tab === 'overview' && (
            <div>
              {/* Rating breakdown */}
              <p style={{ fontSize:11, fontWeight:800, color:C.faint, textTransform:'uppercase',
                letterSpacing:'.07em', marginBottom:10 }}>Rating Breakdown</p>
              {[5,4,3,2,1].map(star => {
                const count = reviews?.ratingBreakdown?.[star] || 0;
                const total = data.totalRatings || 1;
                const pct   = Math.round((count / total) * 100);
                return (
                  <div key={star} style={{ display:'flex', alignItems:'center',
                    gap:8, marginBottom:5 }}>
                    <span style={{ fontSize:11, color:C.faint, width:16, textAlign:'right',
                      fontWeight:700 }}>{star}★</span>
                    <div style={{ flex:1, height:6, background:C.surface2, borderRadius:3 }}>
                      <div style={{ width:`${pct}%`, height:'100%',
                        background:BAR_COLOR[star], borderRadius:3,
                        transition:'width .4s' }} />
                    </div>
                    <span style={{ fontSize:11, color:C.faint, width:22,
                      textAlign:'right' }}>{count}</span>
                  </div>
                );
              })}

              {/* Recent review tags */}
              {reviews?.reviews?.length > 0 && (() => {
                const allTags = reviews.reviews.flatMap(r => r.tags || []);
                const tagCounts = allTags.reduce((acc, t) => {
                  acc[t] = (acc[t] || 0) + 1; return acc;
                }, {});
                const sorted = Object.entries(tagCounts)
                  .sort((a,b) => b[1]-a[1]).slice(0,6);
                if (sorted.length === 0) return null;
                return (
                  <div style={{ marginTop:14 }}>
                    <p style={{ fontSize:11, fontWeight:800, color:C.faint,
                      textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>
                      Often Mentioned
                    </p>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {sorted.map(([tag, count]) => (
                        <span key={tag} style={{ padding:'4px 10px', borderRadius:50,
                          background:C.accentLt, border:`1.5px solid ${C.accent}25`,
                          fontSize:11, fontWeight:700, color:C.accentDk }}>
                          {tag.replace(/_/g,' ')} ×{count}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {data.totalRatings === 0 && (
                <p style={{ fontSize:13, color:C.faint, textAlign:'center',
                  padding:'20px 0' }}>No reviews yet</p>
              )}
            </div>
          )}

          {/* ── Reviews tab ── */}
          {tab === 'reviews' && (
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {!reviews?.reviews?.length ? (
                <p style={{ fontSize:13, color:C.faint, textAlign:'center',
                  padding:'20px 0' }}>No reviews yet</p>
              ) : reviews.reviews.slice(0, 8).map((r, i) => (
                <div key={i} style={{ padding:'14px 0',
                  borderBottom: i < reviews.reviews.length-1
                    ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', marginBottom:4 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:8, background:C.ink,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontWeight:700, fontSize:12, color:'#fff', flexShrink:0 }}>
                        {(r.reviewer?.name || '?')[0]}
                      </div>
                      <div>
                        <p style={{ fontSize:13, fontWeight:700 }}>
                          {r.reviewer?.name || 'Anonymous'}
                        </p>
                        {r.reviewer?.organization && (
                          <p style={{ fontSize:10, color:C.faint }}>
                            {r.reviewer.organization}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:1 }}>
                      {[1,2,3,4,5].map(s => (
                        <span key={s} style={{ fontSize:12,
                          color: s <= r.rating ? C.gold : C.border }}>★</span>
                      ))}
                    </div>
                  </div>
                  {r.comment && (
                    <p style={{ fontSize:13, color:C.ink2, lineHeight:1.55,
                      marginLeft:36 }}>{r.comment}</p>
                  )}
                  {r.tags?.length > 0 && (
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap',
                      marginTop:6, marginLeft:36 }}>
                      {r.tags.map(t => (
                        <span key={t} style={{ padding:'2px 8px', borderRadius:50,
                          fontSize:10, color:C.faint, background:C.surface2,
                          border:`1px solid ${C.border}` }}>
                          {t.replace(/_/g,' ')}
                        </span>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize:10, color:C.faint, marginTop:5, marginLeft:36 }}>
                    {new Date(r.createdAt).toLocaleDateString('en-IN',
                      { day:'numeric', month:'short', year:'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── Action buttons ── */}
          {!isSelf && (
            <div style={{ display:'flex', gap:8, marginTop:20,
              paddingTop:16, borderTop:`1.5px solid ${C.border}` }}>
              {onReport && (
                <button onClick={() => { onClose(); onReport(); }}
                  style={{ flex:1, padding:'10px', borderRadius:50,
                    border:`1.5px solid ${C.red}`, background:C.redLt,
                    color:C.red, fontWeight:700, fontSize:13, cursor:'pointer',
                    fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                  🚩 Report User
                </button>
              )}
            </div>
          )}
        </>
      )}
    </ModalWrap>
  );
};

/* ─── Verification banner ────────────────────────────────────────────────── */
const VerifBanner = ({ user, onUpload }) => {
  if (user.verificationStatus === 'verified') return null;
  const cfg = {
    pending:      { msg:'Upload your college ID to start booking rides.', color:'#7C4A00', bg:'#FEF3C7', border:C.gold, action:'Upload ID Card' },
    under_review: { msg:'ID under review — usually verified within 24 h.', color:C.blue, bg:'#EEF4FF', border:C.blue, action:null },
    rejected:     { msg:`ID rejected${user.verificationNote ? ': '+user.verificationNote : ''}. Please re-upload.`, color:C.red, bg:C.redLt, border:C.red, action:'Re-upload ID' },
  }[user.verificationStatus];
  if (!cfg) return null;
  return (
    <div style={{ background:cfg.bg, borderBottom:`2px solid ${cfg.border}`, padding:'10px 20px',
      display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
      <p style={{ flex:1, fontSize:13, fontWeight:600, color:cfg.color }}>{cfg.msg}</p>
      {cfg.action && (
        <button onClick={onUpload}
          style={{ padding:'6px 14px', background:cfg.color, color:'#fff', border:'none',
            borderRadius:8, fontWeight:700, fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
          {cfg.action}
        </button>
      )}
    </div>
  );
};

/* ─── ID upload modal ────────────────────────────────────────────────────── */
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
    <ModalWrap onClose={onClose}>
      <ModalHeader title="Upload College ID" onClose={onClose} />
      <div onClick={() => ref.current?.click()}
        style={{ border:`2px dashed ${C.border}`, borderRadius:12, height:150,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          cursor:'pointer', overflow:'hidden', marginBottom:14, background:C.surface2 }}>
        {prev
          ? <img src={prev} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <><span style={{ fontSize:32, marginBottom:6 }}>📎</span>
             <p style={{ fontSize:13, color:C.faint }}>JPG · PNG · PDF · max 10 MB</p></>}
      </div>
      <input ref={ref} type="file" accept="image/*,.pdf" style={{ display:'none' }}
        onChange={e => pick(e.target.files[0])} />
      <button className="rs-btn rs-btn-primary" onClick={submit} disabled={busy || !file}
        style={{ width:'100%', padding:'12px', fontSize:14, opacity: busy||!file ? .5 : 1 }}>
        {busy ? 'Uploading…' : 'Submit for Review'}
      </button>
    </ModalWrap>
  );
};

/* ─── Modal wrappers (bottom sheet on mobile, center on desktop) ─────────── */
const ModalWrap = ({ onClose, children, maxWidth=440 }) => (
  <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(20,16,14,.55)',
    display:'flex', alignItems:'flex-end', justifyContent:'center' }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="rs-card rs-sheet" style={{ width:'100%', maxWidth, padding:'24px 20px 28px',
      borderRadius:`${C.r*2}px ${C.r*2}px 0 0`, maxHeight:'90vh', overflowY:'auto',
      /* desktop: center */ marginBottom:0 }}>
      {/* handle */}
      <div style={{ width:40, height:4, background:C.border, borderRadius:4, margin:'0 auto 18px' }} />
      {children}
    </div>
  </div>
);
const ModalHeader = ({ title, onClose }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
    <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:20, color:C.ink }}>{title}</p>
    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
      fontSize:18, color:C.faint, lineHeight:1 }}>✕</button>
  </div>
);

/* ─── Notification panel ─────────────────────────────────────────────────── */
const NotifPanel = ({ notifs, onClose }) => (
  <div style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,.2)' }} onClick={onClose}>
    <div style={{ position:'absolute', top:64, right:12, width:300,
      background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:C.r,
      maxHeight:360, overflowY:'auto', boxShadow:'0 12px 40px rgba(0,0,0,.12)' }}
      className="rs-fadein" onClick={e => e.stopPropagation()}>
      <p style={{ padding:'14px 16px', fontFamily:"'Fraunces',serif", fontWeight:700,
        fontSize:16, borderBottom:`1.5px solid ${C.border}` }}>Notifications</p>
      {notifs.length === 0
        ? <p style={{ padding:'20px 16px', color:C.faint, fontSize:13 }}>Nothing yet</p>
        : notifs.map((n, i) => (
          <div key={i} style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}` }}>
            <p style={{ fontSize:13, fontWeight:700 }}>{n.title || 'Notification'}</p>
            <p style={{ fontSize:12, color:C.faint, marginTop:2 }}>{n.message}</p>
          </div>
        ))}
    </div>
  </div>
);

/* ─── Reviews modal ──────────────────────────────────────────────────────── */
const ReviewsModal = ({ userId, userName, onClose }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get(`/reviews/user/${userId}`).then(r => setData(r.data)).catch(()=>{}).finally(()=>setLoading(false));
  }, [userId]);
  const BAR = { 5:C.green, 4:'#22C55E', 3:C.gold, 2:'#F97316', 1:C.red };
  return (
    <ModalWrap onClose={onClose}>
      <ModalHeader title={`Reviews — ${userName}`} onClose={onClose} />
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}><Spinner /></div>
      : !data ? <p style={{ color:C.faint, textAlign:'center' }}>Could not load</p>
      : (
        <>
          <div style={{ display:'flex', gap:20, marginBottom:20 }}>
            <div style={{ textAlign:'center' }}>
              <p style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:40, lineHeight:1 }}>
                {data.user?.rating?.toFixed(1) || '5.0'}
              </p>
              <p style={{ fontSize:12, color:C.faint }}>{data.user?.totalRatings || 0} reviews</p>
            </div>
            <div style={{ flex:1 }}>
              {[5,4,3,2,1].map(star => {
                const count = data.ratingBreakdown?.[star] || 0;
                const total = data.user?.totalRatings || 1;
                const pct = Math.round((count/total)*100);
                return (
                  <div key={star} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <span style={{ fontSize:10, color:C.faint, width:10 }}>{star}★</span>
                    <div style={{ flex:1, height:5, background:C.surface2, borderRadius:3 }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:BAR[star], borderRadius:3 }} />
                    </div>
                    <span style={{ fontSize:10, color:C.faint, width:18 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {data.reviews?.map((r, i) => (
            <div key={i} style={{ padding:'14px 0', borderTop:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <p style={{ fontSize:13, fontWeight:700 }}>{r.reviewer?.name || 'Anonymous'}</p>
                <span style={{ fontSize:12 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
              </div>
              {r.comment && <p style={{ fontSize:13, color:C.ink2, lineHeight:1.5 }}>{r.comment}</p>}
              {r.tags?.length > 0 && (
                <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:6 }}>
                  {r.tags.map(t => <Tag key={t} label={t.replace(/_/g,' ')} color={C.faint} />)}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </ModalWrap>
  );
};

/* ─── Report modal ───────────────────────────────────────────────────────── */
const ReportModal = ({ reportedUserId, reportedUserName, rideId, onClose, notify }) => {
  const [reason, setReason] = useState('');
  const [desc, setDesc]     = useState('');
  const [busy, setBusy]     = useState(false);
  const REASONS = [
    { v:'harassment', l:'Harassment' }, { v:'fake_profile', l:'Fake Profile' },
    { v:'dangerous_driving', l:'Dangerous Driving' }, { v:'no_show', l:'No Show' },
    { v:'inappropriate_behavior', l:'Inappropriate Behavior' },
    { v:'fraud', l:'Fraud / Scam' }, { v:'other', l:'Other' },
  ];
  const submit = async () => {
    if (!reason) return notify('Select a reason', 'error');
    setBusy(true);
    try {
      await api.post('/reports', { reportedUserId, rideId, reason, description: desc });
      notify("Report submitted. We'll review within 24h.", 'success'); onClose();
    } catch (e) { notify(e.response?.data?.error || 'Failed to submit', 'error'); }
    finally { setBusy(false); }
  };
  return (
    <ModalWrap onClose={onClose}>
      <ModalHeader title={`Report ${reportedUserName}`} onClose={onClose} />
      <p style={{ fontSize:13, color:C.faint, marginBottom:14 }}>
        Reports are reviewed within 24 hours. Keep the community safe.
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
        {REASONS.map(r => (
          <button key={r.v} onClick={() => setReason(r.v)}
            style={{ padding:'10px 14px', borderRadius:10, textAlign:'left',
              border:`1.5px solid ${reason===r.v ? C.red : C.border}`,
              background: reason===r.v ? C.redLt : '#fff',
              color: reason===r.v ? C.red : C.ink,
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, fontSize:13, cursor:'pointer' }}>
            {r.l}
          </button>
        ))}
      </div>
      <textarea value={desc} onChange={e => setDesc(e.target.value)}
        placeholder="Additional details (optional)" maxLength={500}
        className="rs-input" style={{ resize:'vertical', minHeight:72, marginBottom:14 }} />
      <div style={{ display:'flex', gap:8 }}>
        <button className="rs-btn rs-btn-ghost" onClick={onClose} style={{ flex:1, padding:12 }}>Cancel</button>
        <button onClick={submit} disabled={busy || !reason}
          className="rs-btn rs-btn-danger" style={{ flex:1, padding:12, opacity: busy||!reason ? .5 : 1 }}>
          {busy ? 'Submitting…' : 'Submit Report'}
        </button>
      </div>
    </ModalWrap>
  );
};

/* ─── Feedback modal ─────────────────────────────────────────────────────── */
const FeedbackModal = ({ ride, currentUserId, onClose, notify }) => {
  const [rating, setRating]   = useState(5);
  const [comment, setComment] = useState('');
  const [tags, setTags]       = useState([]);
  const [busy, setBusy]       = useState(false);
  const TAGS = ['punctual','safe_driver','friendly','clean_vehicle','good_conversation','on_time','reliable','recommended'];
  const isDriver = (ride.driver?._id || ride.driver) === currentUserId;
  const revieweeId = isDriver
    ? (ride.bookings?.[0]?._id || ride.bookings?.[0])
    : (ride.driver?._id || ride.driver);
  const submit = async () => {
    if (!revieweeId) return notify('No one to review', 'warning');
    setBusy(true);
    try {
      await api.post(`/reviews/${ride._id}`, { revieweeId, rating, comment, tags });
      notify('Feedback submitted! ⭐', 'success'); onClose();
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'error'); }
    finally { setBusy(false); }
  };
  return (
    <ModalWrap onClose={onClose}>
      <ModalHeader title="Rate this ride" onClose={onClose} />
      <p style={{ fontSize:13, color:C.faint, marginBottom:18 }}>{ride.from} → {ride.to}</p>
      <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:18 }}>
        {[1,2,3,4,5].map(s => (
          <button key={s} onClick={() => setRating(s)}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:36,
              filter: s<=rating ? 'none' : 'grayscale(1) opacity(.3)', transition:'all .15s' }}>⭐</button>
        ))}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
        {TAGS.map(t => (
          <button key={t} onClick={() => setTags(p => p.includes(t) ? p.filter(x=>x!==t) : [...p,t])}
            style={{ padding:'5px 12px', borderRadius:50, fontSize:12,
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, cursor:'pointer',
              background: tags.includes(t) ? C.accent : C.surface2,
              border:`1.5px solid ${tags.includes(t) ? C.accentDk : C.border}`,
              color: tags.includes(t) ? '#fff' : C.ink2 }}>
            {t.replace(/_/g,' ')}
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Add a comment…" rows={3}
        className="rs-input" style={{ resize:'none', marginBottom:14 }} />
      <button className="rs-btn rs-btn-primary" onClick={submit} disabled={busy}
        style={{ width:'100%', padding:12, fontSize:14, opacity: busy?.5:1 }}>
        {busy ? 'Submitting…' : 'Submit Feedback'}
      </button>
    </ModalWrap>
  );
};

/* ─── FlyTo helper ───────────────────────────────────────────────────────── */
const FlyTo = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 14, { duration:1 }); }, [center, map]);
  return null;
};

/* ─── LIVE TRACKING + SOS (combined ride panel) ──────────────────────────── */
// This shows during an active/scheduled ride — full-screen map with SOS
const LiveRidePanel = ({ ride, currentUser, onClose, notify }) => {
  const [sharing, setSharing]     = useState(false);
  const [myLoc, setMyLoc]         = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [locError, setLocError]   = useState('');
  const [sosHolding, setSosHolding] = useState(false);
  const [sosProgress, setSosProgress] = useState(0);
  const [sosSent, setSosSent]     = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const [msgs, setMsgs]           = useState([]);
  const [chatText, setChatText]   = useState('');
  const [typing, setTyping]       = useState('');
  const watchRef  = useRef(null);
  const progRef   = useRef(null);
  const bottomRef = useRef(null);
  const typingRef = useRef(null);
  const sock = getSock();
  const rideId = ride._id;
  const uid = currentUser.id || currentUser._id;
  const isDriver = (ride.driver?._id || ride.driver)?.toString() === uid?.toString();

  // Best available map center — prefer live location, then ride's stored coords, then NCR default
  const NCR_CENTER = [28.4595, 77.0266]; // Greater Noida (more relevant default)
  const mapCenter = myLoc
    ? [myLoc.latitude, myLoc.longitude]
    : driverLoc
    ? [driverLoc.latitude, driverLoc.longitude]
    : ride.fromCoords?.lat
    ? [ride.fromCoords.lat, ride.fromCoords.lng]
    : NCR_CENTER;

  useEffect(() => {
    sock.emit('join-ride-tracking', rideId);
    sock.emit('join-chat', rideId);
    const onLoc  = d => setDriverLoc(d);
    const onMsg  = m => setMsgs(p => [...p, m]);
    const onTyp  = ({ userName }) => { if (userName !== currentUser.name) setTyping(`${userName} is typing…`); };
    const onStop = () => setTyping('');
    sock.on('location-update', onLoc);
    sock.on('new-message', onMsg);
    sock.on('user-typing', onTyp);
    sock.on('user-stopped-typing', onStop);
    return () => {
      sock.off('location-update', onLoc);
      sock.off('new-message', onMsg);
      sock.off('user-typing', onTyp);
      sock.off('user-stopped-typing', onStop);
      stopSharing();
    };
  }, [rideId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const startSharing = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported on this device');
      return;
    }
    setLocError('');
    setSharing(true);
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setMyLoc({ latitude, longitude });
        sock.emit('share-location', { rideId, latitude, longitude,
          driverId: uid, driverName: currentUser.name });
      },
      err => {
        const msg = err.code === 1 ? 'Location permission denied. Please allow in browser settings.'
          : err.code === 2 ? 'Location unavailable. Try again.'
          : 'Location request timed out.';
        setLocError(msg);
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };
  const stopSharing = () => {
    if (watchRef.current) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setSharing(false);
    setLocError('');
  };

  // SOS hold-to-activate
  const startSosHold = () => {
    if (sosSent) return;
    setSosHolding(true); setSosProgress(0);
    const start = Date.now(); const dur = 1500;
    progRef.current = setInterval(() => {
      const pct = Math.min(((Date.now()-start)/dur)*100, 100);
      setSosProgress(pct);
      if (pct >= 100) { clearInterval(progRef.current); fireSOS(); }
    }, 30);
  };
  const endSosHold = () => {
    setSosHolding(false); setSosProgress(0);
    if (progRef.current) clearInterval(progRef.current);
  };
  const fireSOS = () => {
    setSosHolding(false); setSosSent(true);
    if (progRef.current) clearInterval(progRef.current);
    const send = (lat, lng) => {
      sock.emit('emergency-sos', { rideId, userId: uid, userName: currentUser.name, latitude:lat, longitude:lng });
      notify('🆘 SOS sent! All ride members & admins alerted.', 'error');
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => send(pos.coords.latitude, pos.coords.longitude),
        () => send(null, null),
        { enableHighAccuracy:true, timeout:5000 }
      );
    } else { send(null, null); }
    if (currentUser.trustedContacts?.length > 0) {
      setTimeout(() => {
        if (window.confirm(`Call ${currentUser.trustedContacts[0].name}?`))
          window.location.href = `tel:${currentUser.trustedContacts[0].phone}`;
      }, 1500);
    }
    setTimeout(() => setSosSent(false), 10000);
  };

  // Chat
  const sendChat = () => {
    if (!chatText.trim()) return;
    sock.emit('send-message', { rideId, senderId: uid, senderName: currentUser.name, text: chatText.trim() });
    setChatText('');
    sock.emit('stop-typing', { rideId });
  };
  const handleChatType = e => {
    setChatText(e.target.value);
    sock.emit('typing', { rideId, userName: currentUser.name });
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => sock.emit('stop-typing', { rideId }), 1500);
  };

  const circumference = 2 * Math.PI * 26;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:C.bg,
      display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ background:'#fff', borderBottom:`1.5px solid ${C.border}`,
        padding:'12px 16px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <button onClick={onClose}
          style={{ width:36, height:36, borderRadius:10, border:`1.5px solid ${C.border}`,
            background:'#fff', cursor:'pointer', fontSize:18, display:'flex',
            alignItems:'center', justifyContent:'center' }}>←</button>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:16, color:C.ink,
            overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
            {ride.from} → {ride.to}
          </p>
          <p style={{ fontSize:11, color:C.faint }}>
            {isDriver ? 'You are driving' : `Driver: ${ride.driver?.name || 'Driver'}`}
            {' · '}{ride.time}
          </p>
        </div>
        {/* Live dot */}
        {sharing && (
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:C.green,
              animation:'rsPulse 1.5s infinite' }} />
            <span style={{ fontSize:11, color:C.green, fontWeight:700 }}>LIVE</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ background:'#fff', display:'flex', gap:0, borderBottom:`1.5px solid ${C.border}`,
        flexShrink:0 }}>
        {[['map','📍 Map'],['chat','💬 Chat']].map(([k,l]) => (
          <button key={k} onClick={() => setActiveTab(k)}
            style={{ flex:1, padding:'10px 0', background:'none', border:'none', cursor:'pointer',
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:13,
              color: activeTab===k ? C.accent : C.faint,
              borderBottom: activeTab===k ? `2.5px solid ${C.accent}` : '2.5px solid transparent',
              transition:'all .15s' }}>
            {l}
          </button>
        ))}
      </div>

      {/* MAP TAB */}
      {activeTab === 'map' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Map */}
          <div style={{ flex:1, position:'relative' }}>
            <MapContainer center={mapCenter} zoom={myLoc || driverLoc ? 15 : 13}
              style={{ height:'100%', width:'100%' }}
              scrollWheelZoom zoomControl={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              <FlyTo center={mapCenter} />
              {myLoc && (
                <Marker position={[myLoc.latitude, myLoc.longitude]} icon={makeIcon(C.blue)}>
                  <Popup>📍 You are here</Popup>
                </Marker>
              )}
              {driverLoc && !isDriver && (
                <Marker position={[driverLoc.latitude, driverLoc.longitude]} icon={makeIcon(C.green)}>
                  <Popup>🚗 {driverLoc.driverName || 'Driver'}</Popup>
                </Marker>
              )}
              {ride.fromCoords?.lat && (
                <Marker position={[ride.fromCoords.lat, ride.fromCoords.lng]} icon={makeIcon(C.accent)}>
                  <Popup>🟢 Pickup: {ride.from}</Popup>
                </Marker>
              )}
              {ride.toCoords?.lat && (
                <Marker position={[ride.toCoords.lat, ride.toCoords.lng]} icon={makeIcon(C.red)}>
                  <Popup>🏁 Drop-off: {ride.to}</Popup>
                </Marker>
              )}
            </MapContainer>

            {/* SOS button — floating over map */}
            <div style={{ position:'absolute', bottom:20, right:16, zIndex:600,
              display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <button
                onMouseDown={startSosHold} onMouseUp={endSosHold} onMouseLeave={endSosHold}
                onTouchStart={e => { e.preventDefault(); startSosHold(); }}
                onTouchEnd={e => { e.preventDefault(); endSosHold(); }}
                disabled={sosSent}
                style={{ width:60, height:60, borderRadius:'50%', border:'none', cursor:'pointer',
                  background: sosSent ? '#7F1D1D' : C.red, color:'#fff',
                  fontWeight:900, fontSize:12, letterSpacing:'.04em',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:`0 4px 20px rgba(201,53,53,.4)`,
                  animation: sosHolding ? 'rsShake .3s infinite'
                    : sosSent ? 'none' : 'sosPulse 2s infinite',
                  position:'relative', overflow:'hidden',
                  transition:'background .2s' }}>
                {sosHolding && (
                  <svg style={{ position:'absolute', inset:-3, transform:'rotate(-90deg)' }}
                    width={66} height={66} viewBox="0 0 66 66">
                    <circle cx={33} cy={33} r={26} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth={3} />
                    <circle cx={33} cy={33} r={26} fill="none" stroke="#fff" strokeWidth={3}
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference*(1-sosProgress/100)}
                      strokeLinecap="round" />
                  </svg>
                )}
                {sosSent ? '✓' : 'SOS'}
              </button>
              <span style={{ fontSize:9, fontWeight:800, color:'#fff',
                background:C.red, padding:'2px 8px', borderRadius:50,
                letterSpacing:'.05em', boxShadow:'0 2px 8px rgba(201,53,53,.3)' }}>
                {sosSent ? 'SENT' : 'HOLD'}
              </span>
            </div>

            {/* Driver loc waiting card */}
            {!isDriver && !driverLoc && (
              <div style={{ position:'absolute', top:12, left:'50%', transform:'translateX(-50%)',
                background:'rgba(255,255,255,.95)', borderRadius:50, padding:'8px 16px',
                boxShadow:'0 4px 16px rgba(0,0,0,.12)', zIndex:600,
                display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:C.faint,
                  animation:'rsPulse 1.5s infinite' }} />
                <span style={{ fontSize:12, fontWeight:600, color:C.ink2 }}>
                  Waiting for driver location…
                </span>
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div style={{ background:'#fff', padding:'14px 16px', borderTop:`1.5px solid ${C.border}`,
            display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
            {locError && (
              <div style={{ padding:'8px 12px', background:C.redLt, border:`1px solid ${C.red}30`,
                borderRadius:8, fontSize:12, color:C.red, fontWeight:600 }}>
                ⚠️ {locError}
              </div>
            )}
            <div style={{ display:'flex', gap:10 }}>
              {sharing ? (
                <button onClick={stopSharing}
                  style={{ flex:1, padding:'11px', borderRadius:50, background:C.redLt,
                    border:`1.5px solid ${C.red}`, color:C.red, fontWeight:700, fontSize:13,
                    cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                  Stop Sharing
                </button>
              ) : (
                <button className="rs-btn rs-btn-primary" onClick={startSharing}
                  style={{ flex:1, padding:11, fontSize:13 }}>
                  📍 Share My Location
                </button>
              )}
              {(myLoc || driverLoc) && (
                <a href={`https://www.google.com/maps?q=${(myLoc||driverLoc).latitude},${(myLoc||driverLoc).longitude}`}
                  target="_blank" rel="noreferrer"
                  style={{ padding:'11px 16px', borderRadius:50, border:`1.5px solid ${C.border}`,
                    background:'#fff', color:C.blue, fontWeight:700, fontSize:13,
                    textDecoration:'none', fontFamily:"'Plus Jakarta Sans',sans-serif",
                    display:'flex', alignItems:'center', gap:4 }}>
                  🗺 Maps
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHAT TAB */}
      {activeTab === 'chat' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ flex:1, overflowY:'auto', padding:'14px 16px',
            display:'flex', flexDirection:'column', gap:10 }}>
            {msgs.length === 0 && (
              <div style={{ textAlign:'center', marginTop:60, color:C.faint }}>
                <p style={{ fontSize:32, marginBottom:8 }}>💬</p>
                <p style={{ fontSize:13 }}>No messages yet. Say hi!</p>
              </div>
            )}
            {msgs.map((m, i) => {
              const me = m.senderId === uid;
              return (
                <div key={i} style={{ display:'flex', flexDirection:'column',
                  alignItems: me ? 'flex-end' : 'flex-start' }}>
                  {!me && <p style={{ fontSize:11, color:C.faint, marginBottom:3, fontWeight:600 }}>{m.senderName}</p>}
                  <div style={{ maxWidth:'78%', padding:'9px 13px', borderRadius:14,
                    background: me ? C.accent : '#fff',
                    border:`1.5px solid ${me ? C.accentDk : C.border}`,
                    borderBottomRightRadius: me ? 4 : 14,
                    borderBottomLeftRadius:  me ? 14 : 4 }}>
                    <p style={{ fontSize:14, color: me ? '#fff' : C.ink }}>{m.text}</p>
                  </div>
                  <p style={{ fontSize:10, color:C.faint, marginTop:3 }}>
                    {new Date(m.timestamp).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                  </p>
                </div>
              );
            })}
            {typing && <p style={{ fontSize:12, color:C.faint, fontStyle:'italic',
              animation:'rsPulse 1.5s infinite' }}>{typing}</p>}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding:'12px 14px', borderTop:`1.5px solid ${C.border}`,
            display:'flex', gap:8, background:'#fff', flexShrink:0 }}>
            <input value={chatText} onChange={handleChatType}
              onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendChat()}
              placeholder="Type a message…" className="rs-input"
              style={{ flex:1, borderRadius:50 }} />
            <button className="rs-btn rs-btn-primary" onClick={sendChat}
              style={{ padding:'10px 16px', fontSize:13, flexShrink:0 }}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Navbar ─────────────────────────────────────────────────────────────── */
const Navbar = ({ user, tab, setTab, logout, notifCount, onBell }) => {
  const NAV = [
    { k:'find', l:'Find Rides' }, { k:'offer', l:'Offer Ride' },
    { k:'myrides', l:'My Trips' }, { k:'leaderboard', l:'Leaderboard' },
  ];
  if (user?.isAdmin) NAV.push({ k:'admin', l:'Admin 🛡️' });

  return (
    <header style={{ position:'sticky', top:0, zIndex:100, background:'#fff',
      borderBottom:`1.5px solid ${C.border}` }}>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 20px', height:58,
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer', flexShrink:0 }}
          onClick={() => setTab('find')}>
          <div style={{ width:34, height:34, background:C.ink, borderRadius:9,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🚗</div>
          <span style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:20, color:C.ink,
            letterSpacing:'-.5px' }}>
            RideShare<span style={{ color:C.accent }}>.</span>
          </span>
        </div>
        {/* Desktop nav */}
        <nav className="rs-desk" style={{ display:'flex', gap:2 }}>
          {NAV.map(n => (
            <button key={n.k} onClick={() => setTab(n.k)}
              style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer',
                fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, fontSize:13,
                background: tab===n.k ? C.accentLt : 'transparent',
                color: tab===n.k ? C.accent : C.ink2,
                borderBottom: tab===n.k ? `2px solid ${C.accent}` : '2px solid transparent',
                transition:'all .15s' }}>
              {n.l}
            </button>
          ))}
        </nav>
        {/* Right */}
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
            style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 12px',
              border:`1.5px solid ${C.border}`, borderRadius:50, background:'#fff',
              cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:13 }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:C.ink,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>
              {user.name[0].toUpperCase()}
            </div>
            <span className="rs-desk">{user.name.split(' ')[0]}</span>
          </button>
          <button onClick={logout}
            style={{ width:36, height:36, border:`1.5px solid ${C.border}`, borderRadius:9,
              background:'#fff', cursor:'pointer', fontSize:15, color:C.faint }}>↪</button>
        </div>
      </div>
    </header>
  );
};

/* ─── Mobile bottom nav ──────────────────────────────────────────────────── */
const MobNav = ({ tab, setTab, user }) => {
  const ITEMS = [
    { k:'find',    icon:'🔍', l:'Find' },
    { k:'offer',   icon:'＋', l:'Offer', fab:true },
    { k:'myrides', icon:'📋', l:'Trips' },
    { k:'leaderboard', icon:'🏆', l:'Top' },
    { k:'profile', icon:'👤', l:'Me' },
  ];
  return (
    <nav className="rs-mob" style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100,
      background:'#fff', borderTop:`1.5px solid ${C.border}`, display:'flex',
      paddingBottom:'env(safe-area-inset-bottom,0)' }}>
      {ITEMS.map(n => (
        <button key={n.k} onClick={() => setTab(n.k)}
          style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
            gap:2, padding:n.fab ? '0' : '8px 0',
            background:'none', border:'none', cursor:'pointer',
            borderTop: tab===n.k && !n.fab ? `2.5px solid ${C.accent}` : '2.5px solid transparent',
            transition:'border-color .15s' }}>
          {n.fab ? (
            <div style={{ width:48, height:48, background:C.ink, borderRadius:14,
              display:'flex', alignItems:'center', justifyContent:'center',
              marginTop:-14, fontSize:22, color:'#fff',
              boxShadow:`0 4px 16px rgba(26,23,20,.3)` }}>
              {n.icon}
            </div>
          ) : (
            <>
              <span style={{ fontSize:20 }}>{n.icon}</span>
              <span style={{ fontSize:10, fontWeight:700,
                color: tab===n.k ? C.accent : C.faint }}>{n.l}</span>
            </>
          )}
        </button>
      ))}
    </nav>
  );
};

/* ─── Landing ────────────────────────────────────────────────────────────── */
const Landing = ({ setPage }) => (
  <div style={{ minHeight:'100vh', background:C.bg }}>
    <header style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, background:'#fff',
      borderBottom:`1.5px solid ${C.border}`, padding:'0 24px', height:58,
      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <div style={{ width:34, height:34, background:C.ink, borderRadius:9,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🚗</div>
        <span style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:20, color:C.ink }}>
          RideShare<span style={{ color:C.accent }}>.</span>
        </span>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => setPage('login')} className="rs-btn rs-btn-ghost"
          style={{ padding:'8px 18px', fontSize:13 }}>Login</button>
        <button onClick={() => setPage('signup')} className="rs-btn rs-btn-primary"
          style={{ padding:'8px 20px', fontSize:13 }}>Sign up</button>
      </div>
    </header>

    <section style={{ paddingTop:58 }}>
      {/* Hero */}
      <div style={{ padding:'80px 24px 60px', maxWidth:680, margin:'0 auto', textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 14px',
          background:C.accentLt, border:`1.5px solid ${C.accent}30`, borderRadius:50,
          fontSize:11, color:C.accent, fontWeight:800, marginBottom:24, letterSpacing:'.07em' }}>
          ◆ NCR UNIVERSITIES · VERIFIED ONLY
        </div>
        <h1 style={{ fontFamily:"'Fraunces',serif", fontWeight:900, lineHeight:1.05,
          fontSize:'clamp(40px,8vw,72px)', color:C.ink, marginBottom:20 }}>
          Your campus<br/>
          <em style={{ fontStyle:'italic', color:C.accent }}>commute, shared.</em>
        </h1>
        <p style={{ fontSize:17, color:C.ink2, lineHeight:1.7, maxWidth:460, margin:'0 auto 36px' }}>
          Match with verified classmates going your way. Save money, cut emissions, build community.
        </p>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={() => setPage('signup')} className="rs-btn rs-btn-primary"
            style={{ padding:'14px 32px', fontSize:16 }}>Get Started →</button>
          <button onClick={() => setPage('login')} className="rs-btn rs-btn-ghost"
            style={{ padding:'14px 26px', fontSize:16 }}>Login</button>
        </div>
      </div>

      <OrgTicker />

      {/* Stats */}
      <div style={{ background:'#fff', borderTop:`1.5px solid ${C.border}`,
        borderBottom:`1.5px solid ${C.border}`, padding:'28px 24px' }}>
        <div style={{ maxWidth:800, margin:'0 auto', display:'grid',
          gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:14 }}>
          {[
            { icon:'🌿', value:'12.5k kg', label:'CO₂ Saved', accent:C.green },
            { icon:'👥', value:'2,847',    label:'Commuters', accent:C.blue },
            { icon:'💰', value:'₹8.2L',   label:'Money Saved', accent:C.accentDk },
            { icon:'⭐', value:'4.8',     label:'Avg Rating', accent:C.gold },
          ].map((s,i) => <StatCard key={i} {...s} />)}
        </div>
      </div>

      {/* Features */}
      <section style={{ padding:'60px 24px', maxWidth:1000, margin:'0 auto' }}>
        <p style={{ fontSize:11, fontWeight:800, color:C.accent, letterSpacing:'.1em',
          textTransform:'uppercase', marginBottom:10 }}>Why RideShare</p>
        <h2 style={{ fontFamily:"'Fraunces',serif", fontWeight:700,
          fontSize:'clamp(26px,4vw,40px)', color:C.ink, marginBottom:36 }}>
          Built for Indian college commuters.
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:14 }}>
          {[
            { e:'🪪', t:'ID-Verified Only', b:'Upload college ID. Admin verifies. No strangers.' },
            { e:'🔒', t:'Public & Private Rides', b:'Public books instantly. Private needs approval.' },
            { e:'📍', t:'Live GPS Tracking', b:'Real-time map with SOS button during rides.' },
            { e:'💬', t:'In-App Chat', b:'Message your co-riders. Auto-deletes after 2 h.' },
            { e:'⭐', t:'Ratings & Trust', b:'Two-way feedback after every completed ride.' },
            { e:'🏆', t:'Leaderboard', b:'Org rankings by rides and CO₂ saved.' },
          ].map((f,i) => (
            <div key={i} className="rs-card" style={{ padding:'20px' }}>
              <span style={{ fontSize:28, marginBottom:10, display:'block' }}>{f.e}</span>
              <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:15,
                marginBottom:6, color:C.ink }}>{f.t}</p>
              <p style={{ fontSize:13, color:C.ink2, lineHeight:1.6 }}>{f.b}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop:`1.5px solid ${C.border}`, padding:'20px 24px', textAlign:'center' }}>
        <p style={{ fontSize:12, color:C.faint }}>Made for NCR · RideShare © 2026</p>
      </footer>
    </section>
  </div>
);

/* ─── Auth pages ─────────────────────────────────────────────────────────── */
const AuthPage = ({ type, setPage, onLogin }) => {
  const isLogin = type === 'login';
  const [f, setF] = useState({ name:'', email:'', password:'', phone:'', organization:'', role:'both', gender:'' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!isLogin) {
      if (!f.name.trim())  e.name = 'Required';
      if (!f.organization) e.organization = 'Select your university';
      if (!f.gender)       e.gender = 'Select your gender';
    }
    if (!isValidEmail(f.email)) e.email = 'Enter a valid email';
    // Only enforce complexity on signup — login just needs non-empty
    if (isLogin) {
      if (!f.password) e.password = 'Enter your password';
    } else {
      if (f.password.length < 8 || !/[0-9]/.test(f.password))
        e.password = 'Min 8 chars, must include a number';
    }
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
    } catch (ex) { setErrs({ api: ex.response?.data?.error || 'Something went wrong' }); }
    finally { setBusy(false); }
  };

  // fieldStyle — stable reference, avoids re-creating on every render
  const fieldLbl = { display:'block', fontSize:11, fontWeight:800, textTransform:'uppercase',
    letterSpacing:'.07em', color:C.faint, marginBottom:5 };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center',
      justifyContent:'center', padding:24 }}>
      <div className="rs-card rs-fadein" style={{ width:'100%', maxWidth:420, padding:32,
        boxShadow:'0 4px 40px rgba(28,28,30,.07)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:26 }}>
          <div style={{ width:32, height:32, background:C.ink, borderRadius:8,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🚗</div>
          <span style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:18 }}>
            RideShare<span style={{ color:C.accent }}>.</span>
          </span>
        </div>
        <h2 style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:26, marginBottom:4 }}>
          {isLogin ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ color:C.faint, fontSize:14, marginBottom:24 }}>
          {isLogin ? 'Sign in to continue' : 'Verified students & professionals only'}
        </p>

        {errs.api && (
          <div style={{ background:C.redLt, border:`1.5px solid ${C.red}`, borderRadius:8,
            padding:'10px 14px', marginBottom:14, color:C.red, fontSize:13, fontWeight:600 }}>
            {errs.api}
          </div>
        )}

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {!isLogin && (
            <>
              {/* Name */}
              <div>
                <label style={fieldLbl}>Full Name</label>
                <input type="text" placeholder="Your full name" value={f.name} required
                  className="rs-input" style={{ borderColor: errs.name ? C.red : C.border }}
                  onChange={e => set('name', e.target.value)} />
                {errs.name && <p style={{ color:C.red, fontSize:11, marginTop:3 }}>{errs.name}</p>}
              </div>
              {/* Phone */}
              <div>
                <label style={fieldLbl}>Phone</label>
                <input type="tel" placeholder="+91 99999 99999" value={f.phone} required
                  className="rs-input" style={{ borderColor: C.border }}
                  onChange={e => set('phone', e.target.value)} />
              </div>
              {/* Org */}
              <div>
                <label style={fieldLbl}>University / Company</label>
                <OrgSearch value={f.organization} onChange={v => set('organization', v)}
                  error={errs.organization} />
                {errs.organization && <p style={{ color:C.red, fontSize:11, marginTop:3 }}>{errs.organization}</p>}
              </div>
              {/* Role */}
              <div>
                <label style={fieldLbl}>Role</label>
                <div style={{ display:'flex', gap:6 }}>
                  {[{v:'rider',l:'🧑 Rider'},{v:'driver',l:'🚗 Driver'},{v:'both',l:'↔ Both'}].map(r => (
                    <button key={r.v} type="button" onClick={() => set('role', r.v)}
                      style={{ flex:1, padding:'9px 0', borderRadius:9,
                        border:`1.5px solid ${f.role===r.v ? C.accent : C.border}`,
                        background: f.role===r.v ? C.accentLt : '#fff',
                        color: f.role===r.v ? C.accent : C.ink2,
                        fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      {r.l}
                    </button>
                  ))}
                </div>
              </div>
              {/* Gender */}
              <div>
                <label style={fieldLbl}>Gender</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[{v:'female',l:'👩 Female'},{v:'male',l:'👨 Male'},{v:'other',l:'Other'},{v:'prefer_not_to_say',l:'Skip'}].map(g => (
                    <button key={g.v} type="button" onClick={() => set('gender', g.v)}
                      style={{ flex:1, minWidth:80, padding:'9px 4px', borderRadius:9,
                        border:`1.5px solid ${f.gender===g.v ? C.accent : C.border}`,
                        background: f.gender===g.v ? C.accentLt : '#fff',
                        color: f.gender===g.v ? C.accent : C.ink2,
                        fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      {g.l}
                    </button>
                  ))}
                </div>
                {errs.gender && <p style={{ color:C.red, fontSize:11, marginTop:3 }}>{errs.gender}</p>}
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label style={fieldLbl}>Email</label>
            <input type="email" placeholder="you@university.edu" value={f.email} required
              className="rs-input" style={{ borderColor: errs.email ? C.red : C.border }}
              onChange={e => set('email', e.target.value)} />
            {errs.email && <p style={{ color:C.red, fontSize:11, marginTop:3 }}>{errs.email}</p>}
          </div>
          {/* Password */}
          <div>
            <label style={fieldLbl}>Password</label>
            <input type="password" placeholder={isLogin ? "Your password" : "Min 8 chars, incl. a number"} value={f.password} required
              className="rs-input" style={{ borderColor: errs.password ? C.red : C.border }}
              onChange={e => set('password', e.target.value)} />
            {errs.password && <p style={{ color:C.red, fontSize:11, marginTop:3 }}>{errs.password}</p>}
          </div>

          {!isLogin && (
            <div style={{ padding:'10px 14px', background:C.accentLt,
              border:`1.5px solid ${C.accent}30`, borderRadius:8,
              fontSize:12, color:C.accentDk, fontWeight:600 }}>
              📌 After signing up, upload your college ID from the Profile tab to activate booking.
            </div>
          )}

          <button type="submit" className="rs-btn rs-btn-primary" disabled={busy}
            style={{ padding:13, fontSize:15, opacity: busy ? .5 : 1, width:'100%', marginTop:4 }}>
            {busy ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop:18, textAlign:'center', fontSize:13, color:C.faint }}>
          {isLogin ? 'New here? ' : 'Already have an account? '}
          <button onClick={() => setPage(isLogin ? 'signup' : 'login')}
            style={{ background:'none', border:'none', color:C.accent, fontWeight:700,
              cursor:'pointer', fontSize:13, textDecoration:'underline' }}>
            {isLogin ? 'Create account' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

/* ─── Ride expiry helpers ────────────────────────────────────────────────── */
const isRideExpired = ride => {
  try {
    const d = new Date(ride.date);
    const [h, m] = (ride.time || '00:00').split(':').map(Number);
    d.setHours(h, m, 0, 0);
    return d < new Date();
  } catch { return false; }
};

const getRideCountdown = ride => {
  try {
    const d = new Date(ride.date);
    const [h, m] = (ride.time || '00:00').split(':').map(Number);
    d.setHours(h, m, 0, 0);
    const diff = d - new Date();
    if (diff <= 0) return 'Departed';
    if (diff > 24 * 60 * 60 * 1000) return null;
    const hrs  = Math.floor(diff / (60 * 60 * 1000));
    const mins = Math.floor((diff % (60 * 60 * 1000)) / 60000);
    if (hrs > 0) return `in ${hrs}h ${mins}m`;
    return `in ${mins}m`;
  } catch { return null; }
};

/* ─── Seat fill bar ──────────────────────────────────────────────────────── */
const SeatBar = ({ booked, total }) => {
  const pct   = Math.min((booked / total) * 100, 100);
  const full  = booked >= total;
  const color = full ? C.red : pct >= 75 ? C.gold : C.green;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ flex:1, height:4, background:C.surface2, borderRadius:2, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:2, transition:'width .3s' }} />
      </div>
      <span style={{ fontSize:10, fontWeight:700, color, whiteSpace:'nowrap' }}>
        {full ? 'FULL' : `${total - booked} left`}
      </span>
    </div>
  );
};

/* ─── Find Rides ─────────────────────────────────────────────────────────── */
const FindRides = ({ user, notify }) => {
  const [rides, setRides]         = useState([]);
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');
  const [type, setType]           = useState('all');
  const [loading, setLoading]     = useState(false);
  const [womenOnly, setWomenOnly] = useState(false);
  const [profileTarget, setProfileTarget] = useState(null); // { id, name, rideId }
  const [reportTarget, setReportTarget]   = useState(null);
  const [, forceUpdate] = useState(0);
  const uid = user.id || user._id;

  // Tick every 30s so countdowns refresh without a full reload
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (from) p.append('from', from);
      if (to)   p.append('to', to);
      if (type !== 'all') p.append('type', type);
      if (womenOnly) p.append('womenOnly', 'true');
      const r = await api.get(`/rides/search?${p}`);
      // Client-side expiry guard on top of backend cron
      const valid = (r.data.rides || []).filter(ride => !isRideExpired(ride));
      setRides(valid);
    } catch { notify('Failed to load rides', 'error'); }
    finally { setLoading(false); }
  }, [from, to, type, womenOnly]);

  useEffect(() => { load(); }, [womenOnly]);
  useEffect(() => {
    const sock = getSock();
    const onUpd = () => load();
    sock.on('ride-updated', onUpd);
    sock.on('new-ride', onUpd);
    return () => { sock.off('ride-updated', onUpd); sock.off('new-ride', onUpd); };
  }, [load]);

  const book = async ride => {
    if (user.verificationStatus !== 'verified') return notify('Verify your account first', 'error');
    if (isRideExpired(ride)) return notify('This ride has already departed', 'error');
    const seatsLeft = ride.seats - (ride.bookings?.length || 0);
    if (seatsLeft <= 0) return notify('No seats available', 'error');
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
      <h1 style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:30, marginBottom:4 }}>Find a ride</h1>
      <p style={{ color:C.faint, fontSize:14, marginBottom:18 }}>Showing rides from {user.organization}</p>

      <div className="rs-card" style={{ marginBottom:14, overflow:'visible' }}>
        <LocationInput placeholder="From — pickup point" value={from} dotColor={C.green}
          onChange={name => setFrom(name)} />
        <div style={{ height:1, background:C.border, marginLeft:30 }} />
        <LocationInput placeholder="To — destination" value={to} dotColor={C.red}
          onChange={name => setTo(name)} />
        <div style={{ padding:'10px 14px', borderTop:`1px solid ${C.border}`,
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[['all','All'],['carpool','🚗 Car'],['bikepool','🏍 Bike']].map(([v,l]) => (
              <button key={v} onClick={() => setType(v)}
                style={{ padding:'5px 12px', borderRadius:50,
                  border:`1.5px solid ${type===v ? C.accent : C.border}`,
                  background: type===v ? C.accentLt : '#fff',
                  color: type===v ? C.accent : C.ink2,
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:12, cursor:'pointer' }}>
                {l}
              </button>
            ))}
            {user.gender === 'female' && (
              <button onClick={() => setWomenOnly(!womenOnly)}
                style={{ padding:'5px 12px', borderRadius:50,
                  border:`1.5px solid ${womenOnly ? '#BE185D' : C.border}`,
                  background: womenOnly ? '#FDF2F8' : '#fff',
                  color: womenOnly ? '#BE185D' : C.ink2,
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:12, cursor:'pointer' }}>
                👩 Women Only
              </button>
            )}
          </div>
          <button className="rs-btn rs-btn-primary" onClick={load} style={{ padding:'8px 20px', fontSize:13 }}>
            Search
          </button>
        </div>
      </div>

      {user.verificationStatus !== 'verified' && (
        <div style={{ background:C.goldLt, border:`1.5px solid ${C.gold}30`, borderRadius:10,
          padding:'11px 16px', marginBottom:14, fontSize:13, fontWeight:600, color:C.gold }}>
          ⏳ Your account is pending verification. You can browse but cannot book yet.
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}><Spinner size={32} /></div>
      ) : rides.length === 0 ? (
        <div className="rs-card" style={{ padding:'48px', textAlign:'center' }}>
          <p style={{ fontSize:40, marginBottom:12 }}>🚗</p>
          <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:20, marginBottom:6 }}>No rides found</p>
          <p style={{ color:C.faint, fontSize:14 }}>Try a different route, or be the first to offer one!</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {rides.map(ride => {
            const isOwn    = (ride.driver?._id || ride.driver) === uid;
            const booked   = ride.bookings?.length || 0;
            const seatsL   = ride.seats - booked;
            const isFull   = seatsL <= 0;
            const isBooked = ride.bookings?.some(b => (b._id || b) === uid);
            const isPrivate = ride.visibility === 'private';
            const dr = ride.driver?.rating || 5.0;
            const dt = ride.driver?.totalRatings || 0;
            const countdown = getRideCountdown(ride);
            const soonish   = countdown !== null;
            return (
              <div key={ride._id} className="rs-card"
                style={{ padding:18, transition:'transform .15s, box-shadow .15s',
                  borderLeft: ride.womenOnly ? '4px solid #BE185D'
                    : soonish ? `4px solid ${C.accent}` : undefined,
                  opacity: isFull ? .85 : 1 }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(28,28,30,.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>

                {countdown && (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:5,
                    padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:700,
                    background: countdown === 'Departed' ? C.redLt : C.accentLt,
                    color: countdown === 'Departed' ? C.red : C.accentDk,
                    marginBottom:10 }}>
                    🕐 Departing {countdown}
                  </div>
                )}

                <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:10 }}>
                  <div style={{ width:40, height:40, borderRadius:11, background:C.ink,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontWeight:800, fontSize:16, color:'#fff', flexShrink:0 }}>
                    {ride.driver?.name?.[0] || '?'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:14 }}>{ride.driver?.name}</p>
                    <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap', marginTop:3 }}>
                      <button onClick={() => setProfileTarget({ id: ride.driver?._id, name: ride.driver?.name, rideId: ride._id })}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:0,
                          fontSize:11, color:C.gold, fontWeight:700,
                          textDecoration:'underline', textUnderlineOffset:2 }}>
                        ★ {dr.toFixed(1)} ({dt}) · View Profile
                      </button>
                      <TrustBadge rating={dr} totalRatings={dt} />
                      {ride.womenOnly && <Tag label="👩 Women Only" color="#BE185D" />}
                      {isPrivate && <Tag label="🔒 Private" color={C.purple} />}
                      {ride.recurring && <Tag label="↻ Daily" color={C.blue} />}
                      {ride.type === 'bikepool' && <Tag label="🏍 Bikepool" color={C.ink2} />}
                      {ride.type === 'bikepool' && ride.helmetProvided && <Tag label="⛑️ Helmet" color={C.green} />}
                      {isFull && <Tag label="FULL" color={C.red} />}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:24 }}>₹{ride.price}</p>
                    <p style={{ fontSize:10, color:C.faint }}>per seat</p>
                  </div>
                </div>

                <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, paddingTop:3 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:C.green, boxShadow:`0 0 0 2px ${C.green}25` }} />
                    <div style={{ width:1.5, height:20, background:C.border }} />
                    <div style={{ width:8, height:8, borderRadius:'50%', background:C.red, boxShadow:`0 0 0 2px ${C.red}25` }} />
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <p style={{ fontSize:14, fontWeight:600 }}>{ride.from}</p>
                    <p style={{ fontSize:14, fontWeight:600 }}>{ride.to}</p>
                  </div>
                </div>

                <div style={{ marginBottom:10 }}>
                  <SeatBar booked={booked} total={ride.seats} />
                </div>

                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:12 }}>
                  {[
                    `🕐 ${ride.time}`,
                    `📅 ${new Date(ride.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}`,
                    `📍 ${ride.distance} km`,
                    ride.duration && `⏱ ~${ride.duration} min`,
                  ].filter(Boolean).map((c, j) => (
                    <span key={j} style={{ padding:'3px 9px', border:`1px solid ${C.border}`,
                      borderRadius:50, fontSize:11, color:C.ink2, fontWeight:500 }}>{c}</span>
                  ))}
                </div>

                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  {isBooked ? (
                    <span style={{ fontSize:13, color:C.green, fontWeight:700 }}>✓ You're booked</span>
                  ) : isOwn ? (
                    <span style={{ fontSize:13, color:C.faint }}>Your ride</span>
                  ) : isFull ? (
                    <span style={{ fontSize:13, color:C.red, fontWeight:600 }}>No seats left</span>
                  ) : (
                    <button className="rs-btn rs-btn-primary" onClick={() => book(ride)}
                      disabled={user.verificationStatus !== 'verified'}
                      style={{ padding:'9px 20px', fontSize:13,
                        opacity: user.verificationStatus !== 'verified' ? .4 : 1,
                        background: isPrivate ? C.purple : C.accent }}>
                      {isPrivate ? '🔒 Request to Join' : 'Book Now'}
                    </button>
                  )}
                  {!isOwn && (
                    <button onClick={() => setReportTarget({ id: ride.driver?._id, name: ride.driver?.name, rideId: ride._id })}
                      style={{ background:'none', border:'none', cursor:'pointer',
                        fontSize:12, color:C.faint, fontWeight:600,
                        fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                      🚩 Report
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {profileTarget && (
        <UserProfileModal
          userId={profileTarget.id}
          userName={profileTarget.name}
          currentUser={user}
          onClose={() => setProfileTarget(null)}
          notify={notify}
          onReport={() => setReportTarget({ id: profileTarget.id, name: profileTarget.name, rideId: profileTarget.rideId })}
        />
      )}
      {reportTarget && (
        <ReportModal
          reportedUserId={reportTarget.id}
          reportedUserName={reportTarget.name}
          rideId={reportTarget.rideId}
          onClose={() => setReportTarget(null)}
          notify={notify}
        />
      )}
    </div>
  );
};

/* ─── Offer Ride ─────────────────────────────────────────────────────────── */
const Label = ({ children }) => (
  <label style={{ display:'block', fontSize:11, fontWeight:800, textTransform:'uppercase',
    letterSpacing:'.07em', color:C.faint, marginBottom:6 }}>{children}</label>
);
const SegControl = ({ options, value, onChange, accentColor }) => {
  const ac = accentColor || C.accent;
  return (
    <div style={{ display:'flex', background:C.surface2, borderRadius:10, padding:3,
      border:`1.5px solid ${C.border}` }}>
      {options.map(o => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          style={{ flex:1, padding:'8px 0', borderRadius:8, border:'none', cursor:'pointer',
            fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:13,
            background: value===o.v ? '#fff' : 'transparent',
            color: value===o.v ? ac : C.faint,
            boxShadow: value===o.v ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            transition:'all .15s' }}>
          {o.l}
        </button>
      ))}
    </div>
  );
};
const Toggle = ({ on, onClick, label }) => (
  <label onClick={onClick} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none' }}>
    <div style={{ width:42, height:22, borderRadius:11,
      background: on ? C.accent : C.border, position:'relative', transition:'background .2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:2, left: on ? 22 : 2, width:18, height:18,
        borderRadius:9, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)', transition:'left .2s' }} />
    </div>
    <span style={{ fontSize:14, color:C.ink2 }}>{label}</span>
  </label>
);

const OfferRide = ({ user, notify, onSuccess }) => {
  const [f, setF] = useState({
    type:'carpool', visibility:'public', from:'', to:'',
    datetime:'', date:'', time:'', seats:3, price:'', distance:'',
    recurring:false, days:[], helmetProvided:false,
    acceptedPayments:['cash'], driverUpiId:'', womenOnly:false,
  });
  const [busy, setBusy]       = useState(false);
  const [distBusy, setDistBusy] = useState(false);
  const [distAuto, setDistAuto] = useState(false);
  const [estDuration, setEstDuration] = useState(null);
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  // Use a ref so calcDistance always reads latest from/to without stale closure
  const fRef = useRef(f);
  useEffect(() => { fRef.current = f; }, [f]);

  const calcDistance = useCallback(async (fromVal, toVal) => {
    const from = fromVal || fRef.current.from;
    const to   = toVal   || fRef.current.to;
    if (!from || from.length < 3 || !to || to.length < 3) return;
    setDistBusy(true);
    try {
      const r = await api.get('/rides/distance', { params:{ from, to } });
      if (r.data.distance) {
        set('distance', r.data.distance);
        setEstDuration(r.data.duration || null);
        setDistAuto(true);
      }
    } catch (err) {
      console.warn('Distance calc failed:', err?.response?.data?.error || err.message);
    } finally { setDistBusy(false); }
  }, []);

  const handleLocChange = (key, name) => {
    set(key, name);
    // After state update, read from ref which will have latest values
    setTimeout(() => {
      const cur = fRef.current;
      const from = key === 'from' ? name : cur.from;
      const to   = key === 'to'   ? name : cur.to;
      if (from && from.length >= 3 && to && to.length >= 3) {
        calcDistance(from, to);
      }
    }, 50);
  };

  const togglePay = m => {
    const cur = f.acceptedPayments || [];
    const next = cur.includes(m) ? cur.filter(x=>x!==m) : [...cur,m];
    if (next.length === 0) return;
    set('acceptedPayments', next);
  };

  const submit = async e => {
    e.preventDefault();
    if (user.verificationStatus !== 'verified') return notify('Verify your account first', 'error');
    if (!f.from || !f.to) return notify('Enter pickup and destination', 'error');
    if (!f.distance) return notify('Distance required', 'error');
    if (f.acceptedPayments.includes('upi') && !f.driverUpiId) return notify('Enter your UPI ID', 'error');
    setBusy(true);
    try {
      await api.post('/rides/create', f);
      notify('Ride listed! 🚗', 'success');
      getSock().emit('new-ride', { org: user.organization });
      setF({ type:'carpool', visibility:'public', from:'', to:'', datetime:'', date:'', time:'',
        seats:3, price:'', distance:'', recurring:false, days:[], helmetProvided:false,
        acceptedPayments:['cash'], driverUpiId:'', womenOnly:false });
      setDistAuto(false); setEstDuration(null);
      onSuccess?.();
    } catch (e) { notify(e.response?.data?.error || 'Failed to create ride', 'error'); }
    finally { setBusy(false); }
  };

  if (user.verificationStatus !== 'verified') return (
    <div>
      <h1 style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:30, marginBottom:24 }}>Offer a Ride</h1>
      <div className="rs-card" style={{ padding:32, textAlign:'center', borderColor:C.accent }}>
        <p style={{ fontSize:32, marginBottom:12 }}>🔒</p>
        <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:20, marginBottom:6 }}>
          Account not verified
        </p>
        <p style={{ color:C.faint, fontSize:14 }}>Upload your college ID from Profile and wait for admin approval.</p>
      </div>
    </div>
  );

  return (
    <div>
      <h1 style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:30, marginBottom:24 }}>Offer a ride</h1>
      <div className="rs-card" style={{ padding:24, maxWidth:640 }}>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <div>
            <Label>Ride Type</Label>
            <SegControl options={[{v:'carpool',l:'🚗 Carpool'},{v:'bikepool',l:'🏍️ Bikepool'}]}
              value={f.type} onChange={v => { set('type',v); set('seats', v==='bikepool'?1:3); }} />
          </div>
          <div>
            <Label>Who can book?</Label>
            <SegControl options={[{v:'public',l:'🌐 Public (instant)'},{v:'private',l:'🔒 Private (approval)'}]}
              value={f.visibility} onChange={v => set('visibility',v)}
              accentColor={f.visibility==='private' ? C.purple : C.accent} />
            <p style={{ fontSize:12, color:C.faint, marginTop:5 }}>
              {f.visibility==='public' ? 'Any verified org member can book instantly.'
                : 'Passengers must request — you approve or decline each.'}
            </p>
          </div>
          <div>
            <Label>Route</Label>
            <div className="rs-card" style={{ overflow:'visible', borderRadius:12 }}>
              <LocationInput placeholder="From — pickup" value={f.from} dotColor={C.green} required
                onChange={(n) => handleLocChange('from', n)} />
              <div style={{ height:1, background:C.border, marginLeft:30 }} />
              <LocationInput placeholder="To — destination" value={f.to} dotColor={C.red} required
                onChange={(n) => handleLocChange('to', n)} />
            </div>
          </div>
          <div>
            <Label>Date & Time</Label>
            <input
              type="datetime-local"
              required
              value={f.datetime || ''}
              min={new Date(Date.now() + 30*60*1000).toISOString().slice(0,16)}
              onChange={e => {
                const val = e.target.value; // "2026-05-27T08:30"
                const [datePart, timePart] = val.split('T');
                set('datetime', val);
                set('date', datePart);
                set('time', timePart);
              }}
              className="rs-input"
            />
            <p style={{ fontSize:11, color:C.faint, marginTop:4 }}>
              Pick date and time together — must be at least 30 min from now
            </p>
          </div>
          <div>
            <Label>Distance (km)</Label>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input type="number" required value={f.distance} placeholder="e.g. 8.5" step="0.1"
                readOnly={distAuto}
                onChange={e => { set('distance', e.target.value); setDistAuto(false); }}
                className="rs-input"
                style={{ flex:1,
                  background: distBusy ? '#FFFBF0' : distAuto ? C.greenLt : '#fff',
                  borderColor: distAuto ? C.green : distBusy ? C.gold : C.border }} />
              <button type="button" onClick={() => calcDistance()}
                disabled={distBusy || !f.from || !f.to}
                style={{ padding:'10px 14px', borderRadius:10,
                  border:`1.5px solid ${C.accent}`,
                  background: C.accentLt, color: C.accentDk, fontWeight:700, fontSize:12,
                  cursor:'pointer', whiteSpace:'nowrap',
                  opacity:(distBusy || !f.from || !f.to) ? .5 : 1,
                  display:'flex', alignItems:'center', gap:6 }}>
                {distBusy ? <Spinner size={14} /> : '📍'}
                {distBusy ? 'Calculating…' : 'Auto-fill'}
              </button>
            </div>
            {distBusy && (
              <p style={{ fontSize:12, color:C.gold, fontWeight:600, marginTop:5 }}>
                ⏳ Calculating route via ORS…
              </p>
            )}
            {distAuto && estDuration && !distBusy && (
              <div style={{ display:'flex', gap:8, marginTop:6, alignItems:'center' }}>
                <span style={{ fontSize:12, color:C.green, fontWeight:700 }}>
                  ✓ {f.distance} km · ~{estDuration} min drive
                </span>
                <button type="button"
                  onClick={() => { setDistAuto(false); set('distance',''); setEstDuration(null); }}
                  style={{ background:'none', border:'none', cursor:'pointer',
                    fontSize:11, color:C.faint, textDecoration:'underline' }}>
                  Edit manually
                </button>
              </div>
            )}
            {!distAuto && !distBusy && f.from && f.to && (
              <p style={{ fontSize:11, color:C.faint, marginTop:4 }}>
                💡 Select both locations from the dropdown suggestions, then click Auto-fill
              </p>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><Label>Seats</Label>
              <input type="number" min={1} max={f.type==='bikepool'?1:6} value={f.seats}
                disabled={f.type==='bikepool'}
                onChange={e => set('seats',parseInt(e.target.value)||1)}
                className="rs-input" style={{ opacity:f.type==='bikepool'?.5:1 }} /></div>
            <div><Label>Price / seat (₹)</Label>
              <input type="number" min={0} required value={f.price} placeholder="0"
                onChange={e => set('price',e.target.value)} className="rs-input" /></div>
          </div>
          <div>
            <Label>Accepted Payments</Label>
            <div style={{ display:'flex', gap:8 }}>
              {[{v:'cash',l:'💵 Cash',c:C.green},{v:'upi',l:'📱 UPI',c:C.blue}].map(pm => (
                <button key={pm.v} type="button" onClick={() => togglePay(pm.v)}
                  style={{ flex:1, padding:'9px 0', borderRadius:9,
                    border:`1.5px solid ${f.acceptedPayments.includes(pm.v)?pm.c:C.border}`,
                    background:f.acceptedPayments.includes(pm.v)?`${pm.c}12`:'#fff',
                    color:f.acceptedPayments.includes(pm.v)?pm.c:C.ink2,
                    fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  {pm.l}
                </button>
              ))}
            </div>
            {f.acceptedPayments.includes('upi') && (
              <div style={{ marginTop:8 }}>
                <input type="text" placeholder="Your UPI ID (e.g. name@upi)" value={f.driverUpiId}
                  onChange={e => set('driverUpiId',e.target.value)} className="rs-input" />
              </div>
            )}
          </div>
          <Toggle on={f.recurring} onClick={() => set('recurring',!f.recurring)} label="Daily recurring commute" />
          {f.recurring && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {DAYS.map(d => (
                <button key={d} type="button"
                  onClick={() => set('days', f.days.includes(d)?f.days.filter(x=>x!==d):[...f.days,d])}
                  style={{ padding:'5px 12px', borderRadius:50,
                    border:`1.5px solid ${f.days.includes(d)?C.accent:C.border}`,
                    background:f.days.includes(d)?C.accentLt:'#fff',
                    color:f.days.includes(d)?C.accent:C.ink2,
                    fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:12, cursor:'pointer' }}>
                  {d}
                </button>
              ))}
            </div>
          )}
          {user.gender === 'female' && (
            <Toggle on={f.womenOnly} onClick={() => set('womenOnly',!f.womenOnly)} label="👩 Women-only ride" />
          )}
          {f.type === 'bikepool' && (
            <Toggle on={f.helmetProvided} onClick={() => set('helmetProvided',!f.helmetProvided)}
              label="I'll provide a helmet" />
          )}
          <button type="submit" className="rs-btn rs-btn-primary" disabled={busy}
            style={{ padding:13, fontSize:15, opacity:busy?.5:1 }}>
            {busy ? 'Creating…' : 'List My Ride'}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ─── My Rides ───────────────────────────────────────────────────────────── */
const MyRides = ({ user, notify }) => {
  const [view, setView]     = useState('offered');
  const [data, setData]     = useState({ offered:[], booked:[] });
  const [loading, setLoading] = useState(true);
  const [liveRide, setLiveRide]         = useState(null);
  const [feedbackRide, setFeedbackRide] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null); // { id, name }
  const uid = user.id || user._id;

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/rides/my-rides');
      setData({ offered:r.data.offeredRides||[], booked:r.data.bookedRides||[] });
    } catch { notify('Failed to load rides', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
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
    if (!window.confirm(type==='ride' ? 'Cancel this ride? All passengers notified.' : 'Cancel your booking?')) return;
    try {
      if (type==='ride') await api.delete(`/rides/cancel-ride/${id}`);
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

  const SS = {
    scheduled: { bg:'#EEF4FF', color:C.blue },
    ongoing:   { bg:C.greenLt, color:C.green },
    completed: { bg:C.surface2, color:C.ink2 },
    cancelled: { bg:C.redLt,   color:C.red },
  };

  const allRides  = view === 'offered' ? data.offered : data.booked;
  // Split into active (upcoming/ongoing) and past (completed/cancelled/expired)
  const activeRides = allRides.filter(r => ['scheduled','ongoing'].includes(r.status) && !isRideExpired(r));
  const pastRides   = allRides.filter(r => ['completed','cancelled'].includes(r.status) || isRideExpired(r));
  const [showPast, setShowPast] = useState(false);

  if (liveRide) return (
    <LiveRidePanel ride={liveRide} currentUser={user}
      onClose={() => setLiveRide(null)} notify={notify} />
  );

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
        <StatCard icon="🚗" label="Offered"  value={data.offered.length} accent={C.blue} />
        <StatCard icon="🧳" label="Booked"   value={data.booked.length}  accent={C.green} />
        <StatCard icon="⭐" label="Rating"   value={(user.rating||5.0).toFixed(1)} accent={C.gold} />
        <StatCard icon="🌿" label="kg CO₂"   value={(user.carbonSaved||0).toFixed?.(0)||0} accent={C.green} />
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        {[['offered','🚗 Offered'],['booked','🧳 Booked']].map(([k,l]) => (
          <button key={k} onClick={() => setView(k)}
            style={{ padding:'8px 18px', borderRadius:50,
              border:`1.5px solid ${view===k ? C.accent : C.border}`,
              background: view===k ? C.accentLt : '#fff',
              color: view===k ? C.accent : C.ink2,
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:13, cursor:'pointer' }}>
            {l}
          </button>
        ))}
        <button onClick={load}
          style={{ padding:'8px 12px', borderRadius:50, border:`1.5px solid ${C.border}`,
            background:'#fff', cursor:'pointer', fontSize:15 }}>🔄</button>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}><Spinner size={32} /></div>
      ) : activeRides.length === 0 && pastRides.length === 0 ? (
        <div className="rs-card" style={{ padding:'48px', textAlign:'center' }}>
          <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:20, color:C.faint }}>
            No {view} rides yet
          </p>
        </div>
      ) : (
        <>
          {/* ── Active rides ── */}
          {activeRides.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
              {activeRides.map(ride => {
                const isDriver = view === 'offered';
                const ss = SS[ride.status] || SS.scheduled;
                const countdown = getRideCountdown(ride);
                return (
                  <div key={ride._id} className="rs-card" style={{ padding:18 }}>
                    {/* Countdown pill */}
                    {countdown && (
                      <div style={{ display:'inline-flex', alignItems:'center', gap:5,
                        padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:700,
                        background: C.accentLt, color: C.accentDk, marginBottom:10 }}>
                        🕐 Departing {countdown}
                      </div>
                    )}

                    <div style={{ display:'flex', justifyContent:'space-between', gap:12,
                      flexWrap:'wrap', marginBottom:10 }}>
                      <div>
                        <p style={{ fontWeight:700, fontSize:15 }}>{ride.from} → {ride.to}</p>
                        <p style={{ fontSize:12, color:C.faint, marginTop:3 }}>
                          {isDriver ? "You're driving" : `Driver: ${ride.driver?.name || 'N/A'}`}
                        </p>
                      </div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'flex-start' }}>
                        <span className="rs-chip" style={{ background:ss.bg, color:ss.color,
                          textTransform:'uppercase', borderColor:`${ss.color}30` }}>
                          {ride.status}
                        </span>
                        {ride.visibility === 'private' && <Tag label="🔒 Private" color={C.purple} />}
                      </div>
                    </div>

                    {/* Seat bar for driver */}
                    {isDriver && (
                      <div style={{ marginBottom:10 }}>
                        <SeatBar booked={ride.bookings?.length || 0} total={ride.seats} />
                      </div>
                    )}

                    <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:12 }}>
                      {[
                        `🕐 ${ride.time}`,
                        `📅 ${new Date(ride.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}`,
                        `💺 ${ride.bookings?.length || 0}/${ride.seats}`,
                        `₹${ride.price}`,
                        `📍 ${ride.distance} km`,
                      ].map((c, i) => (
                        <span key={i} style={{ padding:'3px 9px', border:`1px solid ${C.border}`,
                          borderRadius:50, fontSize:11, color:C.ink2 }}>{c}</span>
                      ))}
                    </div>

                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <button onClick={() => setLiveRide(ride)}
                        style={{ padding:'8px 16px', borderRadius:50,
                          background: ride.status === 'ongoing' ? C.green : C.ink,
                          border:'none', color:'#fff', fontWeight:700, fontSize:12,
                          cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif",
                          display:'flex', alignItems:'center', gap:6,
                          boxShadow: ride.status === 'ongoing' ? `0 2px 10px ${C.green}40` : 'none' }}>
                        {ride.status === 'ongoing' ? (
                          <>
                            <span style={{ width:6, height:6, borderRadius:'50%', background:'#fff',
                              animation:'rsPulse 1.5s infinite' }} />
                            LIVE
                          </>
                        ) : '📍 Track & Chat'}
                      </button>
                      {isDriver && ride.status === 'scheduled' && (
                        <button onClick={() => doComplete(ride._id)}
                          style={{ padding:'8px 14px', borderRadius:50, border:`1.5px solid ${C.green}`,
                            background:C.greenLt, color:C.green, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                          ✓ Complete
                        </button>
                      )}
                      {isDriver && (
                        <button onClick={() => doCancel(ride._id, 'ride')}
                          style={{ padding:'8px 14px', borderRadius:50, border:`1.5px solid ${C.red}`,
                            background:C.redLt, color:C.red, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                          Cancel Ride
                        </button>
                      )}
                      {!isDriver && ride.status === 'scheduled' && (
                        <button onClick={() => doCancel(ride._id, 'booking')}
                          style={{ padding:'8px 14px', borderRadius:50, border:`1.5px solid ${C.red}`,
                            background:C.redLt, color:C.red, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                          Cancel Booking
                        </button>
                      )}
                    </div>

                    {/* Pending booking requests */}
                    {isDriver && ride.pendingBookings?.length > 0 && (
                      <div style={{ marginTop:12, padding:14, background:C.accentLt,
                        border:`1.5px solid ${C.accent}30`, borderRadius:10 }}>
                        <p style={{ fontSize:11, fontWeight:800, color:C.accent, marginBottom:10,
                          textTransform:'uppercase', letterSpacing:'.07em' }}>
                          Pending Requests ({ride.pendingBookings.length})
                        </p>
                        {ride.pendingBookings.map(p => (
                          <div key={p.user?._id || p.user}
                            style={{ display:'flex', alignItems:'center', gap:10,
                              justifyContent:'space-between', padding:'8px 0',
                              borderBottom:`1px solid ${C.border}` }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:28, height:28, borderRadius:8, background:C.ink,
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontWeight:700, fontSize:12, color:'#fff' }}>
                                {(p.user?.name || '?')[0]}
                              </div>
                              <div>
                                <p style={{ fontSize:13, fontWeight:600 }}>{p.user?.name || 'User'}</p>
                                {p.message && <p style={{ fontSize:11, color:C.faint }}>{p.message}</p>}
                              </div>
                            </div>
                            <div style={{ display:'flex', gap:6 }}>
                              <button onClick={() => doApprove(ride._id, p.user?._id || p.user)}
                                style={{ padding:'5px 12px', borderRadius:50, border:`1.5px solid ${C.green}`,
                                  background:C.greenLt, color:C.green, fontWeight:700, fontSize:12, cursor:'pointer' }}>✓</button>
                              <button onClick={() => doDecline(ride._id, p.user?._id || p.user)}
                                style={{ padding:'5px 12px', borderRadius:50, border:`1.5px solid ${C.red}`,
                                  background:C.redLt, color:C.red, fontWeight:700, fontSize:12, cursor:'pointer' }}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Driver profile link — visible to passengers */}
                    {!isDriver && ride.driver && typeof ride.driver === 'object' && (
                      <div style={{ marginTop:10, padding:'10px 14px', background:C.surface2,
                        borderRadius:10, border:`1px solid ${C.border}` }}>
                        <p style={{ fontSize:11, fontWeight:800, color:C.faint,
                          marginBottom:8, textTransform:'uppercase' }}>Your Driver</p>
                        <div style={{ display:'flex', alignItems:'center', gap:10,
                          justifyContent:'space-between' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:32, height:32, borderRadius:9, background:C.ink,
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
                              {ride.driver.name?.[0]}
                            </div>
                            <div>
                              <p style={{ fontSize:13, fontWeight:700 }}>{ride.driver.name}</p>
                              <p style={{ fontSize:11, color:C.faint }}>
                                ★ {(ride.driver.rating||5).toFixed(1)} · {ride.driver.organization||''}
                              </p>
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:6 }}>
                            {ride.driver.phone && (
                              <a href={`tel:${ride.driver.phone}`}
                                style={{ padding:'5px 10px', borderRadius:50,
                                  border:`1.5px solid ${C.green}`, background:C.greenLt,
                                  color:C.green, fontSize:12, fontWeight:700,
                                  textDecoration:'none' }}>📞</a>
                            )}
                            <button
                              onClick={() => setProfileTarget({ id: ride.driver._id, name: ride.driver.name })}
                              style={{ padding:'5px 12px', borderRadius:50,
                                border:`1.5px solid ${C.accent}`, background:C.accentLt,
                                color:C.accent, fontSize:12, fontWeight:700, cursor:'pointer',
                                fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                              View Profile
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Passengers list — tappable for driver */}
                    {isDriver && ride.bookings?.length > 0 && typeof ride.bookings[0] === 'object' && (
                      <div style={{ marginTop:10, padding:'10px 14px', background:C.surface2,
                        borderRadius:10, border:`1px solid ${C.border}` }}>
                        <p style={{ fontSize:11, fontWeight:800, color:C.faint,
                          marginBottom:8, textTransform:'uppercase' }}>
                          Passengers ({ride.bookings.length}/{ride.seats})
                        </p>
                        {ride.bookings.map(p => (
                          <div key={p._id}
                            style={{ display:'flex', alignItems:'center', gap:8,
                              marginBottom:8, padding:'8px 0',
                              borderBottom:`1px solid ${C.border}` }}>
                            <div style={{ width:32, height:32, borderRadius:9, background:C.ink,
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
                              {p.name?.[0]}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ fontSize:13, fontWeight:700 }}>{p.name}</p>
                              <p style={{ fontSize:11, color:C.faint }}>
                                ★ {(p.rating||5).toFixed(1)} · {p.organization||''}
                              </p>
                            </div>
                            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                              {p.phone && (
                                <a href={`tel:${p.phone}`}
                                  style={{ padding:'5px 10px', borderRadius:50,
                                    border:`1.5px solid ${C.green}`, background:C.greenLt,
                                    color:C.green, fontSize:12, fontWeight:700,
                                    textDecoration:'none' }}>📞</a>
                              )}
                              <button
                                onClick={() => setProfileTarget({ id: p._id, name: p.name })}
                                style={{ padding:'5px 12px', borderRadius:50,
                                  border:`1.5px solid ${C.accent}`, background:C.accentLt,
                                  color:C.accent, fontSize:12, fontWeight:700,
                                  cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                                Profile
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Past rides collapsible section ── */}
          {pastRides.length > 0 && (
            <div>
              <button onClick={() => setShowPast(p => !p)}
                style={{ display:'flex', alignItems:'center', gap:8, width:'100%',
                  padding:'12px 16px', borderRadius:10, border:`1.5px solid ${C.border}`,
                  background:'#fff', cursor:'pointer', marginBottom: showPast ? 12 : 0,
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:13,
                  color:C.ink2, justifyContent:'space-between' }}>
                <span>🕘 Past Rides ({pastRides.length})</span>
                <span style={{ fontSize:12, color:C.faint }}>{showPast ? '▲ Hide' : '▼ Show'}</span>
              </button>

              {showPast && (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {pastRides.map(ride => {
                    const isDriver = view === 'offered';
                    const ss = SS[ride.status] || SS.completed;
                    const expired = isRideExpired(ride) && ride.status === 'scheduled';
                    return (
                      <div key={ride._id} className="rs-card"
                        style={{ padding:16, opacity:.75 }}>
                        <div style={{ display:'flex', justifyContent:'space-between',
                          gap:12, flexWrap:'wrap', marginBottom:8 }}>
                          <div>
                            <p style={{ fontWeight:700, fontSize:14 }}>{ride.from} → {ride.to}</p>
                            <p style={{ fontSize:12, color:C.faint, marginTop:2 }}>
                              {isDriver ? "You drove" : `Driver: ${ride.driver?.name || 'N/A'}`}
                            </p>
                          </div>
                          <span className="rs-chip"
                            style={{ background: expired ? C.redLt : ss.bg,
                              color: expired ? C.red : ss.color, textTransform:'uppercase' }}>
                            {expired ? 'Expired' : ride.status}
                          </span>
                        </div>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
                          {[
                            `🕐 ${ride.time}`,
                            `📅 ${new Date(ride.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}`,
                            `₹${ride.price}`,
                            `📍 ${ride.distance} km`,
                          ].map((c, i) => (
                            <span key={i} style={{ padding:'2px 8px', border:`1px solid ${C.border}`,
                              borderRadius:50, fontSize:11, color:C.faint }}>{c}</span>
                          ))}
                        </div>
                        {/* Rate button for completed rides */}
                        {ride.status === 'completed' && !ride.reviewsGiven?.includes(uid) && (
                          <button onClick={() => setFeedbackRide(ride)}
                            style={{ padding:'7px 14px', borderRadius:50, border:`1.5px solid ${C.gold}`,
                              background:C.goldLt, color:C.gold, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                            ⭐ Rate this ride
                          </button>
                        )}
                        {ride.status === 'completed' && ride.reviewsGiven?.includes(uid) && (
                          <span style={{ fontSize:12, color:C.faint }}>✓ Reviewed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {feedbackRide && <FeedbackModal ride={feedbackRide} currentUserId={uid}
        onClose={() => setFeedbackRide(null)} notify={notify} />}
      {profileTarget && (
        <UserProfileModal
          userId={profileTarget.id}
          userName={profileTarget.name}
          currentUser={user}
          onClose={() => setProfileTarget(null)}
          notify={notify}
        />
      )}
    </div>
  );
};

/* ─── Leaderboard ────────────────────────────────────────────────────────── */
const Leaderboard = ({ user, notify }) => {
  const [org, setOrg]       = useState(user.organization);
  const [orgQ, setOrgQ]     = useState(user.organization);
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const filteredOrgs = orgQ.length > 0 ? ORGS.filter(o => o.toLowerCase().includes(orgQ.toLowerCase())) : ORGS;

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
          <h1 style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:30, marginBottom:2 }}>Leaderboard</h1>
          <p style={{ color:C.faint, fontSize:14 }}>Top campus carpoolers</p>
        </div>
        <div style={{ position:'relative' }}>
          <button onClick={() => setShowOrgPicker(!showOrgPicker)}
            style={{ padding:'9px 16px', borderRadius:10, border:`1.5px solid ${C.border}`,
              background:'#fff', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600,
              fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:8,
              maxWidth:240 }}>
            <span style={{ overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis',
              flex:1, textAlign:'left' }}>{org}</span>
            <span style={{ fontSize:12 }}>▾</span>
          </button>
          {showOrgPicker && (
            <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:200,
              background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:12,
              width:280, boxShadow:'0 8px 32px rgba(0,0,0,.1)', overflow:'hidden' }}>
              <div style={{ padding:'10px 12px', borderBottom:`1px solid ${C.border}` }}>
                <input type="text" placeholder="Search university…" value={orgQ}
                  onChange={e => setOrgQ(e.target.value)} className="rs-input"
                  style={{ padding:'8px 12px', fontSize:13 }} autoFocus />
              </div>
              <div style={{ maxHeight:220, overflowY:'auto' }}>
                {filteredOrgs.map((o,i) => (
                  <button key={o} onMouseDown={() => { setOrg(o); setOrgQ(o); setShowOrgPicker(false); }}
                    style={{ width:'100%', padding:'10px 14px', background:o===org?C.accentLt:'none',
                      border:'none', borderBottom: i<filteredOrgs.length-1?`1px solid ${C.border}`:'none',
                      textAlign:'left', cursor:'pointer', fontSize:13, fontWeight:600,
                      color:o===org?C.accent:C.ink,
                      fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}><Spinner size={32} /></div>
      ) : !data?.leaderboard?.length ? (
        <div className="rs-card" style={{ padding:'48px', textAlign:'center' }}>
          <p style={{ color:C.faint, fontSize:16 }}>No data yet for this university</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {data.leaderboard.map((e, i) => (
            <div key={i} className="rs-card"
              style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14,
                background: i===0 ? C.accentLt : '#fff',
                borderColor: i===0 ? C.accent : C.border }}>
              <span style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:20,
                color: i===0?C.accent:i===1?C.ink2:C.faint, minWidth:34 }}>
                {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${e.rank}`}
              </span>
              <div style={{ width:40, height:40, borderRadius:12, background:C.ink,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:800, fontSize:16, color:'#fff', flexShrink:0 }}>{e.name[0]}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <p style={{ fontWeight:700, fontSize:15 }}>{e.name}</p>
                  <TrustBadge rating={e.rating||5} totalRatings={e.totalRatings||0} />
                </div>
                <p style={{ fontSize:12, color:C.faint, marginTop:2 }}>
                  {(e.rating||5).toFixed(1)} ★ · {e.ridesCompleted} rides · {(e.carbonSaved||0).toFixed(1)} kg CO₂
                </p>
                {e.badges?.length > 0 && <div style={{ marginTop:4 }}><BadgeChips badges={e.badges} /></div>}
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:22, color:C.accent }}>
                  {e.trustScore||e.ridesCompleted}
                </p>
                <p style={{ fontSize:9, color:C.faint, fontWeight:800, textTransform:'uppercase', letterSpacing:'.05em' }}>pts</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Profile ────────────────────────────────────────────────────────────── */
const Profile = ({ user, logout, notify, onUploadId, refreshUser }) => {
  const [contacts, setContacts] = useState(user.trustedContacts || []);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);

  const fetchBlocked = useCallback(async () => {
    try { const r = await api.get('/reports/blocked'); setBlockedUsers(r.data.blockedUsers||[]); } catch {}
  }, []);
  useEffect(() => { fetchBlocked(); }, [fetchBlocked]);

  const handleUnblock = async userId => {
    try { await api.delete(`/reports/block/${userId}`); notify('Unblocked', 'success'); fetchBlocked(); }
    catch (e) { notify(e.response?.data?.error || 'Failed', 'error'); }
  };
  const saveContacts = async () => {
    if (!contacts.every(c => c.name && c.phone)) return notify('Each contact needs name & phone', 'error');
    setSaving(true);
    try {
      await api.put('/auth/trusted-contacts', { trustedContacts: contacts });
      notify('Saved!', 'success'); setEditing(false); refreshUser();
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  const VB = {
    verified:     { label:'✓ Verified',      bg:C.greenLt,  color:C.green },
    pending:      { label:'⏳ Pending',      bg:'#FEF3C7',  color:'#7C4A00' },
    under_review: { label:'👁 Under Review', bg:C.blueLt,   color:C.blue },
    rejected:     { label:'✕ Rejected',      bg:C.redLt,    color:C.red },
  }[user.verificationStatus] || { label:'Unknown', bg:C.surface2, color:C.faint };

  return (
    <div style={{ maxWidth:560 }}>
      <h1 style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:30, marginBottom:20 }}>Profile</h1>

      {/* Avatar */}
      <div className="rs-card" style={{ padding:20, display:'flex', gap:16, marginBottom:14 }}>
        <div style={{ width:58, height:58, borderRadius:16, background:C.ink,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:24, color:'#fff', flexShrink:0 }}>
          {user.name[0].toUpperCase()}
        </div>
        <div>
          <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:20 }}>{user.name}</p>
          <p style={{ fontSize:13, color:C.faint, marginTop:2 }}>{user.email}</p>
          <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
            <span className="rs-chip" style={{ background:VB.bg, color:VB.color }}>{VB.label}</span>
            <span className="rs-chip" style={{ background:C.surface2, color:C.ink2,
              textTransform:'capitalize' }}>{user.role}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        {[
          { v:user.ridesCompleted||0, l:'Rides' },
          { v:`${(user.carbonSaved||0).toFixed?.(1)??0}kg`, l:'CO₂' },
          { v:user.rating||'5.0', l:'Rating' },
        ].map((s,i) => (
          <div key={i} className="rs-card" style={{ flex:1, minWidth:90, padding:14, textAlign:'center' }}>
            <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:22 }}>{s.v}</p>
            <p style={{ fontSize:11, color:C.faint, fontWeight:800, textTransform:'uppercase',
              letterSpacing:'.07em', marginTop:2 }}>{s.l}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="rs-card" style={{ marginBottom:14, overflow:'hidden' }}>
        {[['Organisation', user.organization], ['Phone', user.phone]].map(([l,v],i) => (
          <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'13px 18px',
            borderBottom: i===0 ? `1px solid ${C.border}` : 'none' }}>
            <span style={{ fontSize:13, color:C.faint, fontWeight:600 }}>{l}</span>
            <span style={{ fontSize:13, fontWeight:600 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* ID upload */}
      {user.verificationStatus !== 'verified' && (
        <button onClick={onUploadId}
          style={{ width:'100%', padding:'13px 18px', border:`1.5px solid ${C.accent}`,
            borderRadius:10, background:C.accentLt, color:C.accent, fontWeight:700,
            fontSize:14, cursor:'pointer', marginBottom:14,
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>📎 {user.verificationStatus==='pending' ? 'Upload College ID Card' : 'Re-upload ID Card'}</span>
          <span>→</span>
        </button>
      )}

      {/* Emergency contacts */}
      <div className="rs-card" style={{ padding:18, marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div>
            <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:16 }}>🛡️ Emergency Contacts</p>
            <p style={{ fontSize:12, color:C.faint, marginTop:2 }}>Up to 3 contacts for SOS alerts</p>
          </div>
          <button onClick={() => setEditing(!editing)}
            style={{ padding:'6px 14px', borderRadius:50, border:`1.5px solid ${C.border}`,
              background:'#fff', fontWeight:700, fontSize:12, cursor:'pointer' }}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editing ? (
          <div>
            {contacts.map((c,i) => (
              <div key={i} style={{ background:C.surface2, borderRadius:10, padding:12,
                marginBottom:8, border:`1px solid ${C.border}` }}>
                {['name','phone'].map(k => (
                  <input key={k} placeholder={k.charAt(0).toUpperCase()+k.slice(1)} value={c[k]}
                    onChange={e => { const nc=[...contacts]; nc[i]={...nc[i],[k]:e.target.value}; setContacts(nc); }}
                    className="rs-input" style={{ marginBottom:6 }} />
                ))}
                <button onClick={() => setContacts(contacts.filter((_,j)=>j!==i))}
                  style={{ background:'none', border:'none', cursor:'pointer',
                    color:C.red, fontSize:12, fontWeight:700 }}>✕ Remove</button>
              </div>
            ))}
            <div style={{ display:'flex', gap:8 }}>
              {contacts.length < 3 && (
                <button onClick={() => setContacts([...contacts, { name:'', phone:'', relation:'Emergency Contact' }])}
                  style={{ flex:1, padding:10, borderRadius:50, border:`1.5px dashed ${C.border}`,
                    background:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', color:C.faint }}>
                  + Add
                </button>
              )}
              <button onClick={saveContacts} disabled={saving} className="rs-btn rs-btn-primary"
                style={{ flex:1, padding:10, fontSize:13, opacity:saving?.5:1 }}>
                {saving ? '…' : 'Save'}
              </button>
            </div>
          </div>
        ) : contacts.length === 0 ? (
          <p style={{ fontSize:13, color:C.faint }}>No contacts added yet</p>
        ) : contacts.map((c,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:C.blueLt,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>📞</div>
            <div>
              <p style={{ fontSize:13, fontWeight:600 }}>{c.name}</p>
              <p style={{ fontSize:12, color:C.faint }}>{c.phone}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Blocked users */}
      <div className="rs-card" style={{ padding:18, marginBottom:14 }}>
        <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:16, marginBottom:4 }}>🚫 Blocked Users</p>
        {blockedUsers.length === 0 ? (
          <p style={{ fontSize:13, color:C.faint }}>No blocked users</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {blockedUsers.map(bu => (
              <div key={bu._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                background:C.surface2, padding:'10px 14px', borderRadius:8 }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:600 }}>{bu.name}</p>
                  <p style={{ fontSize:11, color:C.faint }}>{bu.organization}</p>
                </div>
                <button onClick={() => handleUnblock(bu._id)}
                  style={{ padding:'4px 12px', borderRadius:50, border:`1.5px solid ${C.border}`,
                    background:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', color:C.red }}>
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={logout}
        style={{ width:'100%', padding:12, border:`1.5px solid ${C.red}`, borderRadius:10,
          background:C.redLt, color:C.red, fontWeight:700, fontSize:14, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
        ↪ Sign Out
      </button>
    </div>
  );
};

/* ─── Admin Dashboard ────────────────────────────────────────────────────── */
const AdminDashboard = ({ user, notify }) => {
  const [subTab, setSubTab]   = useState('overview');
  const [stats, setStats]     = useState(null);
  const [users, setUsers]     = useState([]);
  const [reports, setReports] = useState([]);
  const [rides, setRides]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [userPage, setUserPage] = useState(1); const [userPages, setUserPages] = useState(1);
  const [reportPage, setReportPage] = useState(1); const [reportPages, setReportPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showIdCard, setShowIdCard]     = useState(false);
  const [verifying, setVerifying]       = useState(false);
  const [reason, setReason]             = useState('');
  const [banReason, setBanReason]       = useState('');
  const [resolvingReport, setResolvingReport] = useState(null);
  const [resolutionText, setResolutionText]   = useState('');

  const fetchStats   = useCallback(async () => { try { const r = await api.get('/admin/stats'); setStats(r.data); } catch (e) { notify(e.response?.data?.error||'Failed','error'); } }, []);
  const fetchUsers   = useCallback(async (page=1,search='') => { setLoading(true); try { const r = await api.get(`/admin/users?page=${page}&limit=10${search?`&search=${search}`:''}`); setUsers(r.data.users); setUserPages(r.data.pages); setUserPage(r.data.page); } catch (e) { notify(e.response?.data?.error||'Failed','error'); } finally { setLoading(false); } }, []);
  const fetchReports = useCallback(async (page=1) => { setLoading(true); try { const r = await api.get(`/admin/reports?page=${page}&limit=10`); setReports(r.data.reports); setReportPages(r.data.pages); setReportPage(r.data.page); } catch (e) { notify(e.response?.data?.error||'Failed','error'); } finally { setLoading(false); } }, []);
  const fetchRides   = useCallback(async () => { setLoading(true); try { const r = await api.get('/admin/rides?page=1&limit=15'); setRides(r.data.rides); } catch (e) { notify(e.response?.data?.error||'Failed','error'); } finally { setLoading(false); } }, []);

  useEffect(() => {
    if (subTab==='overview') fetchStats();
    else if (subTab==='users') fetchUsers(1);
    else if (subTab==='reports') fetchReports(1);
    else if (subTab==='rides') fetchRides();
  }, [subTab]);

  const handleVerify = async (userId, action) => {
    setVerifying(true);
    try {
      await api.post(`/admin/verifications/${userId}`, { action, note:reason });
      notify(`User ${action==='approve'?'verified':'rejected'}`, 'success');
      setSelectedUser(null); setShowIdCard(false); setReason('');
      if (subTab==='users') fetchUsers(userPage); fetchStats();
    } catch (e) { notify(e.response?.data?.error||'Failed','error'); }
    finally { setVerifying(false); }
  };
  const handleBan = async (userId, ban) => {
    try { await api.put(`/admin/users/${userId}/ban`,{ban,reason:banReason}); notify(`User ${ban?'banned':'unbanned'}`, 'success'); setBanReason(''); setSelectedUser(null); if (subTab==='users') fetchUsers(userPage); }
    catch (e) { notify(e.response?.data?.error||'Failed','error'); }
  };
  const handleResolveReport = async action => {
    if (!resolvingReport) return;
    try { await api.put(`/admin/reports/${resolvingReport._id}/resolve`,{action,resolution:resolutionText}); notify('Report resolved','success'); setResolvingReport(null); setResolutionText(''); fetchReports(reportPage); fetchStats(); }
    catch (e) { notify(e.response?.data?.error||'Failed','error'); }
  };

  return (
    <div style={{ maxWidth:1040, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
        marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:30 }}>Admin 🛡️</h1>
          <p style={{ fontSize:14, color:C.faint }}>NCR RideShare Moderation</p>
        </div>
        <div style={{ display:'flex', gap:4, background:C.surface2, padding:4, borderRadius:10,
          border:`1.5px solid ${C.border}` }}>
          {['overview','users','reports','rides'].map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              style={{ padding:'7px 14px', borderRadius:8, border:'none',
                background: subTab===t ? '#fff' : 'transparent',
                color: subTab===t ? C.ink : C.faint,
                fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:12,
                cursor:'pointer', textTransform:'capitalize' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign:'center', padding:24 }}><Spinner /></div>}

      {!loading && subTab==='overview' && stats && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginBottom:24 }}>
            {[
              { l:'Total Users', v:stats.totalUsers, accent:C.ink },
              { l:'Active Rides', v:stats.activeRides||0, accent:C.green },
              { l:'Pending Approvals', v:stats.pendingVerifications, accent:C.gold },
              { l:'Open Reports', v:stats.openReports, accent:C.red },
            ].map((s,i) => (
              <div key={i} className="rs-card" style={{ padding:20,
                borderLeft: i>=2 ? `4px solid ${s.accent}` : undefined }}>
                <p style={{ fontSize:11, fontWeight:800, color:C.faint, textTransform:'uppercase', letterSpacing:'.07em' }}>{s.l}</p>
                <p style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:32,
                  color:s.accent, margin:'8px 0 0' }}>{s.v}</p>
              </div>
            ))}
          </div>
          <div className="rs-card" style={{ padding:24 }}>
            <h2 style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:18, marginBottom:16 }}>Recent Registrations</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {stats.recentUsers?.map(u => (
                <div key={u._id} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', paddingBottom:10, borderBottom:`1px solid ${C.border}` }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:700 }}>{u.name}</p>
                    <p style={{ fontSize:11, color:C.faint }}>{u.email} · {u.organization}</p>
                  </div>
                  <span className="rs-chip" style={{
                    background: u.verificationStatus==='verified'?C.greenLt:u.verificationStatus==='under_review'?'#FEF3C7':C.surface2,
                    color: u.verificationStatus==='verified'?C.green:u.verificationStatus==='under_review'?'#7C4A00':C.ink2 }}>
                    {u.verificationStatus.replace('_',' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && subTab==='users' && (
        <div className="rs-card" style={{ padding:24, overflowX:'auto' }}>
          <input type="text" placeholder="Search by name or email…"
            onChange={e => fetchUsers(1, e.target.value)}
            className="rs-input" style={{ maxWidth:300, marginBottom:16 }} />
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:`2px solid ${C.border}`, textAlign:'left' }}>
                {['User','College','Role','Reports','Status','Actions'].map(h => (
                  <th key={h} style={{ padding:10, fontWeight:800, color:C.faint,
                    fontSize:11, textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} style={{ borderBottom:`1px solid ${C.border}`,
                  background:u.isBanned?C.redLt:'transparent' }}>
                  <td style={{ padding:10 }}>
                    <p style={{ fontWeight:700 }}>{u.name} {u.isBanned&&'🚫'}</p>
                    <p style={{ fontSize:11, color:C.faint }}>{u.email}</p>
                  </td>
                  <td style={{ padding:10, fontSize:12 }}>{u.organization}</td>
                  <td style={{ padding:10, textTransform:'capitalize', fontSize:12 }}>{u.role}</td>
                  <td style={{ padding:10, fontWeight:u.reportCount>0?700:400,
                    color:u.reportCount>0?C.red:C.ink }}>{u.reportCount||0}</td>
                  <td style={{ padding:10 }}>
                    <span className="rs-chip" style={{
                      background:u.verificationStatus==='verified'?C.greenLt:u.verificationStatus==='under_review'?'#FEF3C7':C.surface2,
                      color:u.verificationStatus==='verified'?C.green:u.verificationStatus==='under_review'?'#7C4A00':C.ink2 }}>
                      {u.verificationStatus.replace('_',' ')}
                    </span>
                  </td>
                  <td style={{ padding:10 }}>
                    <button className="rs-btn rs-btn-ghost" onClick={() => setSelectedUser(u)}
                      style={{ padding:'6px 12px', fontSize:12 }}>Inspect 🔍</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {selectedUser && (
            <div style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(20,16,14,.55)',
              display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
              <div className="rs-card" style={{ width:'100%', maxWidth:500, padding:28,
                maxHeight:'90vh', overflowY:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                  <h3 style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:20 }}>
                    Moderation: {selectedUser.name}
                  </h3>
                  <button onClick={() => { setSelectedUser(null); setShowIdCard(false); }}
                    style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.faint }}>✕</button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20, fontSize:13 }}>
                  {[['Phone',selectedUser.phone||'N/A'],['Gender',selectedUser.gender||'N/A'],
                    ['Status',selectedUser.verificationStatus.toUpperCase()],['Role',selectedUser.role]].map(([l,v]) => (
                    <div key={l}><p style={{ color:C.faint }}>{l}</p><p style={{ fontWeight:700 }}>{v}</p></div>
                  ))}
                </div>
                {selectedUser.verificationStatus==='under_review' && (
                  <div style={{ border:`1.5px dashed ${C.accent}`, borderRadius:10, padding:16, marginBottom:16 }}>
                    <p style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>ID Verification</p>
                    {!showIdCard ? (
                      <button className="rs-btn rs-btn-primary" onClick={() => setShowIdCard(true)}
                        style={{ width:'100%', padding:10, fontSize:13, marginBottom:8 }}>
                        👁️ View ID Card
                      </button>
                    ) : (
                      <div style={{ marginBottom:14 }}>
                        <div style={{ width:'100%', height:200, border:`1px solid ${C.border}`,
                          borderRadius:8, background:C.surface2, overflow:'hidden',
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <img src={`https://rideshare-pro.onrender.com/api/admin/verifications/id-card/${selectedUser._id}`}
                            alt="College ID" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />
                        </div>
                      </div>
                    )}
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => handleVerify(selectedUser._id,'approve')} disabled={verifying}
                        className="rs-btn rs-btn-green" style={{ flex:1, padding:10 }}>Approve</button>
                      <button onClick={() => { if(!reason) return notify('Provide rejection reason','error'); handleVerify(selectedUser._id,'reject'); }}
                        disabled={verifying} className="rs-btn rs-btn-danger" style={{ flex:1, padding:10 }}>Reject</button>
                    </div>
                    <input type="text" placeholder="Rejection note (required)" value={reason}
                      onChange={e => setReason(e.target.value)} className="rs-input" style={{ marginTop:10 }} />
                  </div>
                )}
                <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16 }}>
                  <p style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Account Status</p>
                  {selectedUser.isBanned ? (
                    <button onClick={() => handleBan(selectedUser._id,false)}
                      className="rs-btn rs-btn-green" style={{ width:'100%', padding:10 }}>
                      🟢 Lift Suspension
                    </button>
                  ) : (
                    <div>
                      <input type="text" placeholder="Reason for ban…" value={banReason}
                        onChange={e => setBanReason(e.target.value)} className="rs-input" style={{ marginBottom:8 }} />
                      <button onClick={() => handleBan(selectedUser._id,true)}
                        className="rs-btn rs-btn-danger" style={{ width:'100%', padding:10 }}>
                        🚫 Suspend Account
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'center', gap:10, marginTop:16, alignItems:'center' }}>
            <button onClick={() => fetchUsers(userPage-1)} disabled={userPage<=1}
              className="rs-btn rs-btn-ghost" style={{ padding:'6px 14px' }}>Prev</button>
            <span style={{ fontSize:13, color:C.faint }}>Page {userPage} of {userPages}</span>
            <button onClick={() => fetchUsers(userPage+1)} disabled={userPage>=userPages}
              className="rs-btn rs-btn-ghost" style={{ padding:'6px 14px' }}>Next</button>
          </div>
        </div>
      )}

      {!loading && subTab==='reports' && (
        <div className="rs-card" style={{ padding:24 }}>
          <h2 style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:20, marginBottom:16 }}>
            🚩 Open Reports
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {reports.length===0 ? (
              <p style={{ fontSize:13, color:C.faint }}>No active reports.</p>
            ) : reports.map(r => (
              <div key={r._id} style={{ border:`1.5px solid ${r.status==='pending'?C.red:C.border}`,
                borderRadius:10, padding:18, background:r.status==='pending'?C.redLt:'#fff' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8,
                  flexWrap:'wrap', gap:8 }}>
                  <span className="rs-chip" style={{ background:C.redLt, color:C.red }}>
                    {r.reason.replace('_',' ')}
                  </span>
                  <span style={{ fontSize:11, color:C.faint }}>{new Date(r.createdAt).toLocaleString('en-IN')}</span>
                </div>
                {r.description && <p style={{ fontSize:13, color:C.ink2, marginBottom:8, fontStyle:'italic' }}>
                  "{r.description}"</p>}
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12,
                  alignItems:'center', flexWrap:'wrap', gap:12,
                  borderTop:`1px solid ${C.border}`, paddingTop:10, marginTop:8 }}>
                  <div>
                    <p><strong>Reporter:</strong> {r.reporter?.name}</p>
                    <p><strong>Reported:</strong> {r.reportedUser?.name} {r.reportedUser?.isBanned&&'🚫'}</p>
                  </div>
                  {r.status==='pending' && (
                    <button onClick={() => setResolvingReport(r)}
                      className="rs-btn rs-btn-danger" style={{ padding:'7px 14px', fontSize:12 }}>
                      Take Action 🛠️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {resolvingReport && (
            <div style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(20,16,14,.55)',
              display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
              <div className="rs-card" style={{ width:'100%', maxWidth:420, padding:28 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                  <h3 style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:18 }}>
                    Resolve Report
                  </h3>
                  <button onClick={() => setResolvingReport(null)}
                    style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.faint }}>✕</button>
                </div>
                <input type="text" placeholder="Resolution notes…" value={resolutionText}
                  onChange={e => setResolutionText(e.target.value)} className="rs-input" style={{ marginBottom:16 }} />
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <button onClick={() => handleResolveReport('dismiss')} className="rs-btn rs-btn-ghost"
                    style={{ padding:10 }}>⚪ Dismiss</button>
                  <button onClick={() => handleResolveReport('warn')}
                    style={{ padding:10, borderRadius:50, border:'none', background:C.gold,
                      color:'#fff', fontWeight:700, cursor:'pointer' }}>🟡 Warn User</button>
                  <button onClick={() => handleResolveReport('ban')} className="rs-btn rs-btn-danger"
                    style={{ padding:10 }}>🚫 Suspend Account</button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'center', gap:10, marginTop:16, alignItems:'center' }}>
            <button onClick={() => fetchReports(reportPage-1)} disabled={reportPage<=1}
              className="rs-btn rs-btn-ghost" style={{ padding:'6px 14px' }}>Prev</button>
            <span style={{ fontSize:13, color:C.faint }}>Page {reportPage} of {reportPages}</span>
            <button onClick={() => fetchReports(reportPage+1)} disabled={reportPage>=reportPages}
              className="rs-btn rs-btn-ghost" style={{ padding:'6px 14px' }}>Next</button>
          </div>
        </div>
      )}

      {!loading && subTab==='rides' && (
        <div className="rs-card" style={{ padding:24, overflowX:'auto' }}>
          <h2 style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:20, marginBottom:16 }}>
            🚗 Active Rides Oversight
          </h2>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:`2px solid ${C.border}`, textAlign:'left' }}>
                {['Driver','Route','Date & Time','Status'].map(h => (
                  <th key={h} style={{ padding:10, fontWeight:800, color:C.faint,
                    fontSize:11, textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rides.map(r => (
                <tr key={r._id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:10 }}>
                    <p style={{ fontWeight:700 }}>{r.driver?.name}</p>
                    <p style={{ fontSize:11, color:C.faint }}>{r.driver?.organization}</p>
                  </td>
                  <td style={{ padding:10, fontSize:12 }}>{r.from} → {r.to}</td>
                  <td style={{ padding:10, fontSize:12 }}>{new Date(r.date).toLocaleDateString('en-IN')} · {r.time}</td>
                  <td style={{ padding:10, textTransform:'capitalize', fontWeight:600,
                    color:r.status==='cancelled'?C.red:C.green }}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ═══ APP ROOT ══════════════════════════════════════════════════════════════ */
const App = () => {
  const [user, setUser]     = useState(null);
  const [page, setPage]     = useState('landing');
  const [tab, setTab]       = useState('find');
  const [notif, setNotif]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [sockNotifs, setSockNotifs]   = useState([]);
  const [showIdUpload, setShowIdUpload] = useState(false);
  const [showNotifs, setShowNotifs]     = useState(false);

  useEffect(() => { injectFonts(); checkAuth(); }, []);

  const notify = useCallback((message, type='success') => setNotif({ message, type }), []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try { const r = await api.get('/auth/me'); setUser(r.data.user); setPage('app'); }
      catch { localStorage.removeItem('token'); }
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
    if (u.verificationStatus==='pending' || u.verificationStatus==='rejected') {
      setTimeout(() => setShowIdUpload(true), 800);
    }
  };

  useEffect(() => {
    if (!user) return;
    const sock = getSock();
    sock.emit('join-user-room', user.id || user._id);
    const add = d => setSockNotifs(p => [{ ...d, timestamp:new Date().toISOString() }, ...p].slice(0,20));
    sock.on('booking-notification',    add);
    sock.on('booking-request', d => { add(d); notify(`${d.userName} wants to join your ride!`, 'info'); });
    sock.on('booking-approved', d => { add(d); notify(d.message, 'success'); });
    sock.on('booking-declined', d => { add(d); notify(d.message, 'warning'); });
    sock.on('booking-cancelled',       add);
    sock.on('ride-cancelled-by-driver', d => { add(d); notify(d.message||'Your ride was cancelled', 'error'); });
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
      justifyContent:'center', flexDirection:'column', gap:20 }}>
      <div style={{ width:48, height:48, background:C.ink, borderRadius:12,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🚗</div>
      <Spinner size={28} />
      <style>{GLOBAL}</style>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:C.bg }}>
      <style>{GLOBAL}</style>
      <Toast n={notif} onClose={() => setNotif(null)} />
      {showNotifs    && <NotifPanel notifs={sockNotifs} onClose={() => setShowNotifs(false)} />}
      {showIdUpload  && <IdModal onClose={() => setShowIdUpload(false)} onSuccess={refreshUser} notify={notify} />}

      {page==='landing' && <Landing setPage={setPage} />}
      {page==='login'   && <AuthPage type="login"  setPage={setPage} onLogin={handleLogin} />}
      {page==='signup'  && <AuthPage type="signup" setPage={setPage} onLogin={handleLogin} />}

      {page==='app' && user && (
        <>
          <Navbar user={user} tab={tab} setTab={setTab} logout={logout}
            notifCount={sockNotifs.length} onBell={() => setShowNotifs(v=>!v)} />
          <VerifBanner user={user} onUpload={() => setShowIdUpload(true)} />

          <main style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px 100px' }}>
            {tab==='find'        && <FindRides   user={user} notify={notify} />}
            {tab==='offer'       && <OfferRide   user={user} notify={notify} onSuccess={() => setTab('myrides')} />}
            {tab==='myrides'     && <MyRides     user={user} notify={notify} />}
            {tab==='leaderboard' && <Leaderboard user={user} notify={notify} />}
            {tab==='profile'     && <Profile     user={user} logout={logout} notify={notify}
              onUploadId={() => setShowIdUpload(true)} refreshUser={refreshUser} />}
            {tab==='admin' && user.isAdmin && <AdminDashboard user={user} notify={notify} />}
          </main>

          <MobNav tab={tab} setTab={setTab} user={user} />
        </>
      )}
    </div>
  );
};

export default App;