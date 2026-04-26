import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import api from './services/api';

/* ─── Google Fonts ─────────────────────────────────────────────────────────── */
const injectFonts = () => {
  if (document.getElementById('cp-fonts')) return;
  const l = document.createElement('link');
  l.id = 'cp-fonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap';
  document.head.appendChild(l);
};

/* ─── Socket ───────────────────────────────────────────────────────────────── */
let _sock = null;
const getSock = () => {
  if (!_sock) _sock = io('https://rideshare-pro.onrender.com', { transports: ['websocket','polling'] });
  return _sock;
};

/* ─── Constants ────────────────────────────────────────────────────────────── */
const ORGS = [
  'Galgotias University','Bennett University','Sharda University',
  'GL Bajaj Institute of Technology','GNIOT Greater Noida',
  'Amity University Noida','IIMT University Noida',
  'Delhi University','IIT Delhi','NSIT Dwarka','DTU Delhi',
  'Jamia Millia Islamia','JNU Delhi','IGDTUW Delhi','IP University Delhi',
  'MDI Gurugram','GD Goenka University','Manav Rachna University',
  'Subharti University Meerut',
];

const isValidEmail = (e) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return false;
  const blocked = ['test.com','fake.com','example.com','mailinator.com','tempmail.com','throwaway.com'];
  return !blocked.includes(e.split('@')[1]?.toLowerCase());
};

/* ─── useDebounce ──────────────────────────────────────────────────────────── */
function useDebounce(val, ms) {
  const [d, setD] = useState(val);
  useEffect(() => { const t = setTimeout(() => setD(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return d;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOCATION INPUT  — proxy through backend /rides/autocomplete
   ═══════════════════════════════════════════════════════════════════════════ */
const LocationInput = ({ placeholder, value, onChange, dotColor = '#16a34a', required }) => {
  const [q, setQ]         = useState(value || '');
  const [sugs, setSugs]   = useState([]);
  const [busy, setBusy]   = useState(false);
  const [open, setOpen]   = useState(false);
  const [focus, setFocus] = useState(false);
  const wrap = useRef(null);
  const ctrl = useRef(null);
  const db   = useDebounce(q, 280);

  useEffect(() => { setQ(value || ''); }, [value]);

  useEffect(() => {
    if (!db || db.length < 3 || !focus) { setSugs([]); setOpen(false); return; }
    if (ctrl.current) ctrl.current.abort();
    ctrl.current = new AbortController();
    setBusy(true);
    api.get('/rides/autocomplete', { params: { q: db }, signal: ctrl.current.signal })
      .then(r => { setSugs(r.data.features || []); setOpen((r.data.features||[]).length > 0); })
      .catch(() => {})
      .finally(() => setBusy(false));
  }, [db, focus]);

  useEffect(() => {
    const h = (e) => { if (wrap.current && !wrap.current.contains(e.target)) { setOpen(false); setFocus(false); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pick = (feat) => {
    const p = feat.properties || {};
    const parts = [p.name || p.street, p.locality || p.region].filter(Boolean);
    const label = parts.length ? parts.join(', ') : (p.label||'').split(',').slice(0,2).join(',').trim();
    setQ(label); setSugs([]); setOpen(false);
    onChange(label, feat);
  };

  const placeIcon = (p) => {
    const n = (p.name||'').toLowerCase();
    if (n.includes('university')||n.includes('college')||n.includes('school')) return '🎓';
    if (n.includes('station')||n.includes('metro')) return '🚉';
    if (n.includes('hospital')) return '🏥';
    if (n.includes('mall')||n.includes('market')) return '🛍️';
    if (['locality','borough','localadmin','neighbourhood'].includes(p.layer)) return '🏙️';
    return '📍';
  };

  return (
    <div ref={wrap} style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px',
        background: focus ? '#fffbeb' : 'transparent', transition:'background 0.15s' }}>
        <div style={{ width:10, height:10, borderRadius:'50%', background:dotColor,
          boxShadow: focus ? `0 0 0 3px ${dotColor}30` : 'none',
          transition:'box-shadow 0.2s', flexShrink:0 }} />
        <input type="text" placeholder={placeholder} value={q} required={required}
          onChange={e => setQ(e.target.value)}
          onFocus={() => { setFocus(true); if (sugs.length) setOpen(true); }}
          style={{ flex:1, border:'none', outline:'none', background:'transparent',
            fontFamily:"'Space Grotesk',sans-serif", fontSize:15, color:'#111' }} />
        {busy && <div style={{ width:14,height:14,borderRadius:'50%',
          border:'2px solid #fbbf24',borderTopColor:'#d97706',
          animation:'cpSpin 0.7s linear infinite',flexShrink:0 }} />}
      </div>

      {open && sugs.length > 0 && (
        <div style={{ position:'absolute',top:'100%',left:0,right:0,zIndex:9999,
          background:'#fff',border:'2px solid #111',borderTop:'1px solid #e5e7eb',
          borderRadius:'0 0 12px 12px',boxShadow:'4px 8px 0 #111',
          maxHeight:280,overflowY:'auto' }}>
          {sugs.map((f,i) => {
            const p = f.properties||{};
            const name = p.name||p.street||(p.label||'').split(',')[0];
            const sub  = [p.locality,p.region].filter(Boolean).join(', ');
            return (
              <button key={i} onMouseDown={e=>{e.preventDefault();pick(f);}}
                style={{ width:'100%',display:'flex',alignItems:'center',gap:12,
                  padding:'11px 16px',background:'none',border:'none',cursor:'pointer',
                  textAlign:'left',borderBottom: i<sugs.length-1 ? '1px solid #f3f4f6':'none',
                  transition:'background 0.1s' }}
                onMouseEnter={e=>e.currentTarget.style.background='#fffbeb'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <span style={{fontSize:18,flexShrink:0}}>{placeIcon(p)}</span>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:600,
                    color:'#111',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</p>
                  {sub && <p style={{fontSize:11,color:'#6b7280',marginTop:1,
                    fontFamily:"'Space Grotesk',sans-serif"}}>{sub}</p>}
                </div>
              </button>
            );
          })}
          <div style={{padding:'6px 16px',borderTop:'1px solid #f3f4f6'}}>
            <span style={{fontSize:10,color:'#9ca3af',fontFamily:"'Space Grotesk',sans-serif"}}>
              © OpenRouteService · OpenStreetMap
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════════════════════ */
const Toast = ({ n, onClose }) => {
  useEffect(() => { if (!n) return; const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [n]);
  if (!n) return null;
  const bg = { success:'#16a34a', error:'#dc2626', info:'#2563eb', warning:'#d97706' }[n.type]||'#16a34a';
  return (
    <div style={{ position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,
      display:'flex',alignItems:'center',gap:8,padding:'12px 20px',borderRadius:8,
      background:bg,color:'#fff',fontSize:14,fontWeight:600,fontFamily:"'Space Grotesk',sans-serif",
      boxShadow:'4px 4px 0 rgba(0,0,0,0.3)',animation:'cpSlide 0.3s ease',whiteSpace:'nowrap',
      border:'2px solid rgba(0,0,0,0.15)',maxWidth:'90vw' }}>
      {n.message}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════════════════════ */
const Navbar = ({ user, tab, setTab, logout, notifCount, onBell }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const NAVS = [
    { k:'find',  l:'Find Rides',   icon:'🔍' },
    { k:'offer', l:'Offer Ride',   icon:'+' },
    { k:'myrides',l:'Dashboard',   icon:'📊' },
    { k:'leaderboard',l:'Leaderboard',icon:'🏆' },
  ];

  return (
    <header style={{ position:'sticky',top:0,zIndex:100,background:'#fff',
      borderBottom:'2px solid #111',fontFamily:"'Space Grotesk',sans-serif" }}>
      <div style={{ maxWidth:1200,margin:'0 auto',padding:'0 24px',
        display:'flex',alignItems:'center',justifyContent:'space-between',height:64 }}>
        {/* Logo */}
        <div style={{ display:'flex',alignItems:'center',gap:10,cursor:'pointer' }}
          onClick={() => setTab('find')}>
          <div style={{ width:36,height:36,background:'#FACC15',borderRadius:10,
            border:'2px solid #111',display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'2px 2px 0 #111',fontSize:18 }}>🚗</div>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:20,color:'#111',
            letterSpacing:'-0.5px' }}>CampusPool</span>
        </div>

        {/* Desktop nav */}
        <nav style={{ display:'flex',gap:4,alignItems:'center' }} className="cp-desk-nav">
          {NAVS.map(n => (
            <button key={n.k} onClick={() => setTab(n.k)}
              style={{ padding:'8px 16px',borderRadius:8,border:'2px solid transparent',
                fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:14,cursor:'pointer',
                background: tab===n.k ? '#FACC15' : 'transparent',
                borderColor: tab===n.k ? '#111' : 'transparent',
                color:'#111',boxShadow: tab===n.k ? '2px 2px 0 #111' : 'none',
                transition:'all 0.15s' }}>
              {n.l}
            </button>
          ))}
        </nav>

        {/* User area */}
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <button onClick={onBell} style={{ position:'relative',width:38,height:38,borderRadius:8,
            border:'2px solid #111',background:'#fff',cursor:'pointer',fontSize:16,
            boxShadow:'2px 2px 0 #111' }}>
            🔔
            {notifCount > 0 && (
              <span style={{ position:'absolute',top:-6,right:-6,width:18,height:18,
                borderRadius:'50%',background:'#dc2626',color:'#fff',fontSize:10,
                fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',
                border:'2px solid #fff' }}>{notifCount > 9 ? '9+' : notifCount}</span>
            )}
          </button>
          <button onClick={() => setTab('profile')}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',
              border:'2px solid #111',borderRadius:8,background:'#fff',cursor:'pointer',
              fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:14,
              boxShadow:'2px 2px 0 #111' }}>
            <div style={{ width:26,height:26,borderRadius:'50%',background:'#FACC15',
              border:'2px solid #111',display:'flex',alignItems:'center',justifyContent:'center',
              fontWeight:700,fontSize:12 }}>{user.name[0].toUpperCase()}</div>
            {user.name.split(' ')[0]}
          </button>
          <button onClick={logout}
            style={{ width:38,height:38,border:'2px solid #111',borderRadius:8,
              background:'#fff',cursor:'pointer',fontSize:16,boxShadow:'2px 2px 0 #111' }}>
            ↪
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <style>{`
        @media(min-width:768px){ .cp-mob-nav{display:none!important;} }
        @media(max-width:767px){ .cp-desk-nav{display:none!important;} }
        @keyframes cpSpin { to { transform:rotate(360deg); } }
        @keyframes cpSlide { from { opacity:0;transform:translateX(-50%) translateY(-12px); } to { opacity:1;transform:translateX(-50%) translateY(0); } }
        @keyframes cpFade { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:translateY(0); } }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#f9fafb;}
        input::placeholder{color:#9ca3af;}
        select option{background:#fff;color:#111;}
        input[type=date],input[type=time]{color-scheme:light;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:4px;}
        button:active:not(:disabled){transform:scale(0.97);}
        .cp-ride-card:hover{transform:translateY(-2px);box-shadow:6px 6px 0 #111!important;}
        .cp-nav-btn.active span{color:#111!important;}
      `}</style>
    </header>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
const LandingPage = ({ setPage }) => (
  <div style={{ minHeight:'100vh',fontFamily:"'Space Grotesk',sans-serif" }}>
    {/* Nav */}
    <header style={{ position:'fixed',top:0,left:0,right:0,zIndex:100,
      background:'#fff',borderBottom:'2px solid #111',padding:'0 24px',
      display:'flex',alignItems:'center',justifyContent:'space-between',height:64 }}>
      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
        <div style={{ width:36,height:36,background:'#FACC15',borderRadius:10,
          border:'2px solid #111',display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'2px 2px 0 #111',fontSize:18 }}>🚗</div>
        <span style={{ fontWeight:700,fontSize:20,color:'#111',letterSpacing:'-0.5px' }}>CampusPool</span>
      </div>
      <div style={{ display:'flex',gap:8 }}>
        <button onClick={() => setPage('login')}
          style={{ padding:'8px 20px',border:'2px solid #111',borderRadius:8,
            background:'#fff',fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,
            fontSize:14,cursor:'pointer',boxShadow:'2px 2px 0 #111' }}>Login</button>
        <button onClick={() => setPage('signup')}
          style={{ padding:'8px 20px',border:'2px solid #111',borderRadius:8,
            background:'#FACC15',fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,
            fontSize:14,cursor:'pointer',boxShadow:'2px 2px 0 #111' }}>Sign up</button>
      </div>
    </header>

    {/* Hero — split layout */}
    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:'100vh',paddingTop:64 }}>
      {/* Left — blue hero */}
      <div style={{ background:'#38bdf8',padding:'60px 48px',display:'flex',
        flexDirection:'column',justifyContent:'center',position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:-60,right:-60,width:300,height:300,
          borderRadius:'50%',background:'rgba(255,255,255,0.1)' }} />
        <p style={{ fontSize:13,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',
          color:'rgba(0,0,0,0.6)',marginBottom:12 }}>NCR UNIVERSITIES ONLY · VERIFIED RIDES</p>
        <h1 style={{ fontFamily:"'Instrument Serif',serif",fontSize:'clamp(42px,5vw,72px)',
          lineHeight:1.05,color:'#111',marginBottom:24 }}>
          Carpool with your<br />
          <span style={{ background:'#FACC15',padding:'2px 8px',
            borderRadius:4,display:'inline-block',marginTop:4 }}>campus.</span><br />
          Not strangers.
        </h1>
        <p style={{ fontSize:16,color:'rgba(0,0,0,0.7)',lineHeight:1.6,maxWidth:420,marginBottom:32 }}>
          CampusPool connects verified students from NCR universities for safe carpools and bike rides.
          Live tracking, ratings, and a built-in SOS — all in one place.
        </p>
        <div style={{ display:'flex',gap:12 }}>
          <button onClick={() => setPage('signup')}
            style={{ padding:'14px 28px',border:'2px solid #111',borderRadius:8,
              background:'#111',color:'#fff',fontFamily:"'Space Grotesk',sans-serif",
              fontWeight:700,fontSize:15,cursor:'pointer',boxShadow:'4px 4px 0 rgba(0,0,0,0.3)' }}>
            GET STARTED
          </button>
          <button onClick={() => setPage('login')}
            style={{ padding:'14px 28px',border:'2px solid #111',borderRadius:8,
              background:'#fff',fontFamily:"'Space Grotesk',sans-serif",
              fontWeight:700,fontSize:15,cursor:'pointer',boxShadow:'4px 4px 0 #111' }}>
            LOGIN
          </button>
        </div>

        {/* Scrolling orgs ticker */}
        <div style={{ position:'absolute',bottom:0,left:0,right:0,background:'#111',
          padding:'10px 0',overflow:'hidden' }}>
          <div style={{ display:'flex',gap:32,whiteSpace:'nowrap',
            animation:'cpTicker 20s linear infinite' }}>
            {[...ORGS,...ORGS].map((o,i) => (
              <span key={i} style={{ fontSize:13,color:'#FACC15',fontWeight:600 }}>★ {o}</span>
            ))}
          </div>
        </div>
        <style>{`@keyframes cpTicker{from{transform:translateX(0);}to{transform:translateX(-50%);}}`}</style>
      </div>

      {/* Right — sign up card */}
      <div style={{ background:'#f9fafb',display:'flex',alignItems:'center',justifyContent:'center',
        padding:'40px 48px' }}>
        <div style={{ width:'100%',maxWidth:440 }}>
          <SignupCard setPage={setPage} />
        </div>
      </div>
    </div>

    {/* Features strip */}
    <div style={{ background:'#fff',borderTop:'2px solid #111',borderBottom:'2px solid #111',
      padding:'64px 24px' }}>
      <div style={{ maxWidth:1100,margin:'0 auto' }}>
        <p style={{ fontSize:12,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',
          color:'#6b7280',marginBottom:8 }}>Built for students.</p>
        <h2 style={{ fontFamily:"'Instrument Serif',serif",fontSize:'clamp(32px,4vw,52px)',
          color:'#111',marginBottom:48,lineHeight:1.1 }}>Safe by design.</h2>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:20 }}>
          {[
            { emoji:'🪪', t:'ID-Verified Only',    b:'Upload college ID. Admin approves. No strangers — just classmates.' },
            { emoji:'🚗', t:'Carpool & BikePool',  b:'Multi-seat car rides for long routes, single-seat bike rides for quick hops.' },
            { emoji:'📍', t:'Live Tracking',       b:'Real-time GPS. Share a link. Always know where the ride is.' },
            { emoji:'🏆', t:'University Leaderboard', b:'Earn points per ride. Climb your campus rank. Bragging rights unlocked.' },
            { emoji:'⭐', t:'Ratings & Trust',     b:'Two-way ratings after each ride. Driver and rider both held accountable.' },
            { emoji:'⛑️', t:'Helmet Indicator',    b:'BikePool listings show helmet availability. No surprises.' },
          ].map((f,i) => (
            <div key={i} style={{ background:'#f9fafb',border:'2px solid #111',borderRadius:12,
              padding:24,boxShadow:'4px 4px 0 #111',transition:'transform 0.15s,box-shadow 0.15s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='6px 6px 0 #111';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='4px 4px 0 #111';}}>
              <div style={{ fontSize:32,marginBottom:12 }}>{f.emoji}</div>
              <h3 style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,
                color:'#111',marginBottom:8 }}>{f.t}</h3>
              <p style={{ fontSize:14,color:'#4b5563',lineHeight:1.6 }}>{f.b}</p>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Footer */}
    <footer style={{ background:'#111',padding:'24px',textAlign:'center' }}>
      <p style={{ color:'#6b7280',fontSize:13,fontFamily:"'Space Grotesk',sans-serif" }}>
        Made for NCR · CampusPool © 2026
      </p>
    </footer>
  </div>
);

/* ─── Signup card used in landing hero + standalone page ─────────────────── */
const SignupCard = ({ setPage, embedded = false }) => {
  const [f, setF] = useState({ name:'',email:'',password:'',phone:'',organization:'',role:'both' });
  const [errs, setErrs] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Required';
    if (!isValidEmail(f.email)) e.email = 'Enter a valid email';
    if (f.password.length < 8 || !/[0-9]/.test(f.password)) e.password = 'Min 8 chars, include a number';
    if (!f.phone.trim()) e.phone = 'Required';
    if (!f.organization) e.organization = 'Select your university';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate(); setErrs(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', f);
      localStorage.setItem('token', res.data.token);
      window.location.reload();
    } catch (err) {
      setErrs({ api: err.response?.data?.error || 'Signup failed' });
    } finally { setLoading(false); }
  };

  const inp = (label, key, type='text', placeholder='') => (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block',fontSize:11,fontWeight:700,letterSpacing:'0.08em',
        textTransform:'uppercase',color:'#374151',marginBottom:6,
        fontFamily:"'Space Grotesk',sans-serif" }}>{label}</label>
      <input type={type} placeholder={placeholder} value={f[key]}
        onChange={e => setF(p=>({...p,[key]:e.target.value}))}
        style={{ width:'100%',padding:'12px 14px',border:`2px solid ${errs[key]?'#dc2626':'#111'}`,
          borderRadius:8,fontFamily:"'Space Grotesk',sans-serif",fontSize:14,
          outline:'none',background:'#fff',boxShadow:'2px 2px 0 #111' }} />
      {errs[key] && <p style={{ color:'#dc2626',fontSize:11,marginTop:4 }}>{errs[key]}</p>}
    </div>
  );

  return (
    <div style={{ background:'#fff',border:'2px solid #111',borderRadius:16,padding:32,
      boxShadow:'6px 6px 0 #111',fontFamily:"'Space Grotesk',sans-serif" }}>
      <h2 style={{ fontSize:28,fontWeight:700,color:'#111',marginBottom:4 }}>Sign up</h2>
      <p style={{ color:'#6b7280',fontSize:14,marginBottom:24 }}>Verified students only.</p>

      {errs.api && (
        <div style={{ background:'#fef2f2',border:'2px solid #dc2626',borderRadius:8,
          padding:'10px 14px',marginBottom:16,color:'#dc2626',fontSize:13,fontWeight:600 }}>
          {errs.api}
        </div>
      )}

      <form onSubmit={submit}>
        {inp('Full Name','name','text','Your name')}
        {inp('Email','email','email','you@university.edu')}
        {inp('Password','password','password','Min 8 chars, include a number')}
        {inp('Phone (optional)','phone','tel','+91 9999 999 999')}

        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block',fontSize:11,fontWeight:700,letterSpacing:'0.08em',
            textTransform:'uppercase',color:'#374151',marginBottom:6 }}>University</label>
          <select value={f.organization} onChange={e=>setF(p=>({...p,organization:e.target.value}))}
            style={{ width:'100%',padding:'12px 14px',border:`2px solid ${errs.organization?'#dc2626':'#111'}`,
              borderRadius:8,fontFamily:"'Space Grotesk',sans-serif",fontSize:14,
              background:'#fff',cursor:'pointer',boxShadow:'2px 2px 0 #111' }}>
            <option value="">Select university…</option>
            {ORGS.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
          {errs.organization && <p style={{ color:'#dc2626',fontSize:11,marginTop:4 }}>{errs.organization}</p>}
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block',fontSize:11,fontWeight:700,letterSpacing:'0.08em',
            textTransform:'uppercase',color:'#374151',marginBottom:6 }}>Role</label>
          <select value={f.role} onChange={e=>setF(p=>({...p,role:e.target.value}))}
            style={{ width:'100%',padding:'12px 14px',border:'2px solid #111',borderRadius:8,
              fontFamily:"'Space Grotesk',sans-serif",fontSize:14,
              background:'#fff',cursor:'pointer',boxShadow:'2px 2px 0 #111' }}>
            <option value="both">Both (Driver & Rider)</option>
            <option value="driver">Driver only</option>
            <option value="rider">Rider only</option>
          </select>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block',fontSize:11,fontWeight:700,letterSpacing:'0.08em',
            textTransform:'uppercase',color:'#374151',marginBottom:6 }}>College ID Card</label>
          <div style={{ border:'2px dashed #111',borderRadius:8,padding:'20px',
            textAlign:'center',background:'#f9fafb',color:'#6b7280',fontSize:13 }}>
            📎 Upload after signing up from your profile
          </div>
        </div>

        <button type="submit" disabled={loading}
          style={{ width:'100%',padding:'14px',border:'2px solid #111',borderRadius:8,
            background:'#111',color:'#fff',fontFamily:"'Space Grotesk',sans-serif",
            fontWeight:700,fontSize:15,cursor:loading?'default':'pointer',
            opacity:loading?0.6:1,boxShadow:'4px 4px 0 rgba(0,0,0,0.2)' }}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p style={{ marginTop:16,textAlign:'center',fontSize:13,color:'#6b7280' }}>
        Already have an account?{' '}
        <button onClick={()=>setPage('login')} style={{ background:'none',border:'none',
          color:'#111',fontWeight:700,cursor:'pointer',fontFamily:"'Space Grotesk',sans-serif",
          textDecoration:'underline',fontSize:13 }}>Login</button>
      </p>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
const LoginPage = ({ setPage, onLogin }) => {
  const [f, setF] = useState({ email:'', password:'' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const res = await api.post('/auth/login', f);
      localStorage.setItem('token', res.data.token);
      onLogin(res.data.user);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh',background:'#f9fafb',display:'flex',alignItems:'center',
      justifyContent:'center',padding:24,fontFamily:"'Space Grotesk',sans-serif" }}>
      <div style={{ width:'100%',maxWidth:420,background:'#fff',border:'2px solid #111',
        borderRadius:16,padding:40,boxShadow:'6px 6px 0 #111' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:32 }}>
          <div style={{ width:36,height:36,background:'#FACC15',borderRadius:10,
            border:'2px solid #111',display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'2px 2px 0 #111',fontSize:18 }}>🚗</div>
          <span style={{ fontWeight:700,fontSize:20,color:'#111' }}>CampusPool</span>
        </div>
        <h2 style={{ fontSize:28,fontWeight:700,color:'#111',marginBottom:4 }}>Welcome back</h2>
        <p style={{ color:'#6b7280',fontSize:14,marginBottom:28 }}>Sign in to your account</p>

        {err && <div style={{ background:'#fef2f2',border:'2px solid #dc2626',borderRadius:8,
          padding:'10px 14px',marginBottom:16,color:'#dc2626',fontSize:13,fontWeight:600 }}>{err}</div>}

        <form onSubmit={submit} style={{ display:'flex',flexDirection:'column',gap:14 }}>
          {[['Email','email','email'],['Password','password','password']].map(([lbl,key,type]) => (
            <div key={key}>
              <label style={{ display:'block',fontSize:11,fontWeight:700,letterSpacing:'0.08em',
                textTransform:'uppercase',color:'#374151',marginBottom:6 }}>{lbl}</label>
              <input type={type} value={f[key]} onChange={e=>setF(p=>({...p,[key]:e.target.value}))}
                required style={{ width:'100%',padding:'12px 14px',border:'2px solid #111',
                  borderRadius:8,fontFamily:"'Space Grotesk',sans-serif",fontSize:14,
                  outline:'none',background:'#fff',boxShadow:'2px 2px 0 #111' }} />
            </div>
          ))}
          <button type="submit" disabled={loading}
            style={{ padding:'14px',border:'2px solid #111',borderRadius:8,background:'#111',
              color:'#fff',fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15,
              cursor:loading?'default':'pointer',opacity:loading?0.6:1,boxShadow:'4px 4px 0 rgba(0,0,0,0.2)',marginTop:6 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p style={{ marginTop:20,textAlign:'center',fontSize:13,color:'#6b7280' }}>
          New here?{' '}
          <button onClick={()=>setPage('signup')} style={{ background:'none',border:'none',
            color:'#111',fontWeight:700,cursor:'pointer',textDecoration:'underline',
            fontFamily:"'Space Grotesk',sans-serif",fontSize:13 }}>Create account</button>
        </p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   VERIFICATION BANNER
   ═══════════════════════════════════════════════════════════════════════════ */
const VerifBanner = ({ user, onUpload }) => {
  if (user.verificationStatus === 'verified') return null;
  const cfg = {
    pending:      { msg:'Your account is PENDING. You can browse rides but cannot book or offer until an admin verifies your college ID.', bg:'#fef3c7',border:'#f59e0b',color:'#92400e', action:'Upload ID Card' },
    under_review: { msg:'Your ID is under review. We\'ll notify you once verified (usually within 24 hours).', bg:'#dbeafe',border:'#3b82f6',color:'#1e40af', action:null },
    rejected:     { msg:`Your ID was rejected${user.verificationNote?': '+user.verificationNote:''}. Please re-upload a clear photo of your college ID.`, bg:'#fee2e2',border:'#dc2626',color:'#991b1b', action:'Re-upload ID' },
  }[user.verificationStatus];
  if (!cfg) return null;
  return (
    <div style={{ background:cfg.bg,border:`2px solid ${cfg.border}`,borderRadius:0,
      padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',
      gap:16,flexWrap:'wrap',fontFamily:"'Space Grotesk',sans-serif" }}>
      <p style={{ color:cfg.color,fontSize:14,fontWeight:600,flex:1 }}>{cfg.msg}</p>
      {cfg.action && (
        <button onClick={onUpload} style={{ padding:'8px 16px',border:`2px solid ${cfg.border}`,
          borderRadius:8,background:cfg.color,color:'#fff',fontFamily:"'Space Grotesk',sans-serif",
          fontWeight:700,fontSize:13,cursor:'pointer',whiteSpace:'nowrap' }}>
          {cfg.action}
        </button>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   ID UPLOAD MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
const IdModal = ({ onClose, onSuccess, notify }) => {
  const [file, setFile] = useState(null);
  const [prev, setPrev] = useState(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef();

  const pick = (f) => { if (!f) return; setFile(f); setPrev(URL.createObjectURL(f)); };

  const submit = async () => {
    if (!file) return notify('Select a file first','error');
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('idCard', file);
      await api.post('/auth/verify-id', fd, { headers:{'Content-Type':'multipart/form-data'} });
      notify('ID uploaded! Admin will review within 24 hours.','success');
      onSuccess(); onClose();
    } catch (e) { notify(e.response?.data?.error||'Upload failed','error'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.6)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div style={{ background:'#fff',border:'2px solid #111',borderRadius:16,
        padding:32,width:'100%',maxWidth:420,boxShadow:'8px 8px 0 #111',
        fontFamily:"'Space Grotesk',sans-serif" }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h3 style={{ fontSize:20,fontWeight:700,color:'#111' }}>Upload College ID</h3>
          <button onClick={onClose} style={{ border:'2px solid #111',borderRadius:8,width:32,height:32,
            background:'#fff',cursor:'pointer',fontSize:16,boxShadow:'2px 2px 0 #111' }}>✕</button>
        </div>
        <div onClick={()=>ref.current?.click()}
          style={{ border:'2px dashed #111',borderRadius:12,height:160,
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
            cursor:'pointer',overflow:'hidden',marginBottom:16,background:'#f9fafb',
            transition:'background 0.15s' }}
          onMouseEnter={e=>e.currentTarget.style.background='#fffbeb'}
          onMouseLeave={e=>e.currentTarget.style.background='#f9fafb'}>
          {prev
            ? <img src={prev} alt="preview" style={{ width:'100%',height:'100%',objectFit:'cover' }} />
            : <>
                <span style={{ fontSize:40,marginBottom:8 }}>📎</span>
                <p style={{ fontSize:13,color:'#6b7280',fontWeight:500 }}>Click to select image or PDF</p>
                <p style={{ fontSize:11,color:'#9ca3af' }}>JPG, PNG, PDF · max 10MB</p>
              </>}
        </div>
        <input ref={ref} type="file" accept="image/*,.pdf" style={{ display:'none' }}
          onChange={e=>pick(e.target.files[0])} />
        <button onClick={submit} disabled={busy||!file}
          style={{ width:'100%',padding:'13px',border:'2px solid #111',borderRadius:8,
            background: busy||!file ? '#e5e7eb' : '#111',color: busy||!file ? '#9ca3af':'#fff',
            fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,
            cursor: busy||!file ? 'default':'pointer',boxShadow: busy||!file?'none':'4px 4px 0 rgba(0,0,0,0.2)' }}>
          {busy ? 'Uploading…' : 'Submit for Review'}
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   FIND RIDES
   ═══════════════════════════════════════════════════════════════════════════ */
const FindRides = ({ user, notify }) => {
  const [rides, setRides]     = useState([]);
  const [q, setQ]             = useState('');
  const [type, setType]       = useState('all');
  const [loading, setLoading] = useState(false);
  const [booked, setBooked]   = useState(new Set());

  const load = useCallback(async (query='', t='all') => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (query) p.append('from', query);
      if (t !== 'all') p.append('type', t);
      const r = await api.get(`/rides/search?${p}`);
      setRides(r.data.rides||[]);
    } catch { notify('Failed to load rides','error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const book = async (rideId, isPrivate) => {
    try {
      if (isPrivate) {
        await api.post(`/rides/request/${rideId}`);
        notify('Request sent! Waiting for driver approval.','info');
      } else {
        const r = await api.post(`/rides/book/${rideId}`);
        notify(`Booked! 🎉 Saved ${r.data.carbonSaved?.toFixed?.(2)||0}kg CO₂`,'success');
        setBooked(prev => new Set([...prev, rideId]));
        load(q, type);
      }
    } catch (e) { notify(e.response?.data?.error||'Failed','error'); }
  };

  const uid = user.id||user._id;

  return (
    <div>
      <h1 style={{ fontSize:36,fontWeight:700,color:'#111',marginBottom:4,
        fontFamily:"'Space Grotesk',sans-serif" }}>Find a ride</h1>
      <p style={{ color:'#6b7280',fontSize:15,marginBottom:24,
        fontFamily:"'Space Grotesk',sans-serif" }}>
        Showing rides from {user.organization}
      </p>

      {/* Search bar */}
      <div style={{ background:'#fff',border:'2px solid #111',borderRadius:12,
        marginBottom:16,boxShadow:'4px 4px 0 #111',overflow:'visible',position:'relative' }}>
        <div style={{ display:'flex',alignItems:'center',gap:12,padding:'0 16px',flexWrap:'wrap' }}>
          <div style={{ flex:1,minWidth:200,borderRight:'2px solid #f3f4f6',position:'relative' }}>
            <LocationInput placeholder="Search by location e.g. Sector 18, Greater Noida"
              value={q} dotColor="#6b7280" onChange={(name)=>setQ(name)} />
          </div>
          <div style={{ display:'flex',gap:6,padding:'10px 0',flexWrap:'wrap' }}>
            {[['all','ALL'],['carpool','🚗 CARPOOL'],['bikepool','🏍 BIKEPOOL']].map(([v,l])=>(
              <button key={v} onClick={()=>setType(v)}
                style={{ padding:'7px 14px',borderRadius:8,border:'2px solid #111',
                  background:type===v?'#FACC15':'#fff',fontFamily:"'Space Grotesk',sans-serif",
                  fontWeight:700,fontSize:12,cursor:'pointer',
                  boxShadow:type===v?'2px 2px 0 #111':'none',letterSpacing:'0.05em' }}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={()=>load(q,type)}
            style={{ padding:'10px 20px',border:'2px solid #111',borderRadius:8,
              background:'#FACC15',fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,
              fontSize:14,cursor:'pointer',boxShadow:'3px 3px 0 #111',letterSpacing:'0.05em' }}>
            SEARCH
          </button>
        </div>
      </div>

      {/* Pending banner */}
      {user.verificationStatus !== 'verified' && (
        <div style={{ background:'#fef3c7',border:'2px solid #f59e0b',borderRadius:8,
          padding:'12px 16px',marginBottom:16,fontSize:14,fontWeight:600,
          color:'#92400e',fontFamily:"'Space Grotesk',sans-serif" }}>
          Your account is PENDING. You can browse rides but cannot book or offer until an admin verifies your college ID.
        </div>
      )}

      {/* Results */}
      <div style={{ background:'#fff',border:'2px solid #111',borderRadius:12,
        overflow:'hidden',boxShadow:'4px 4px 0 #111' }}>
        {loading ? (
          <div style={{ padding:'60px',textAlign:'center' }}>
            <div style={{ width:36,height:36,margin:'0 auto',borderRadius:'50%',
              border:'3px solid #e5e7eb',borderTopColor:'#FACC15',
              animation:'cpSpin 0.8s linear infinite' }} />
          </div>
        ) : rides.length === 0 ? (
          <div style={{ padding:'60px',textAlign:'center' }}>
            <p style={{ fontSize:20,fontWeight:700,color:'#111',marginBottom:8,
              fontFamily:"'Space Grotesk',sans-serif" }}>No rides found</p>
            <p style={{ color:'#6b7280',fontSize:14,fontFamily:"'Space Grotesk',sans-serif" }}>
              Be the first to offer a ride!
            </p>
          </div>
        ) : rides.map((ride,i) => {
          const isOwn = (ride.driver?._id||ride.driver) === uid;
          const seatsLeft = ride.seats - (ride.bookings?.length||0);
          const isFull = seatsLeft <= 0;
          const isBooked = booked.has(ride._id)||ride.bookings?.some(b=>(b._id||b)===uid);
          const isPrivate = ride.visibility === 'private';

          return (
            <div key={ride._id} className="cp-ride-card"
              style={{ padding:20,borderBottom: i<rides.length-1?'2px solid #f3f4f6':'none',
                transition:'transform 0.15s,box-shadow 0.15s',cursor:'default' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12 }}>
                <div style={{ flex:1 }}>
                  {/* Driver */}
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12 }}>
                    <div style={{ width:40,height:40,borderRadius:10,background:'#FACC15',
                      border:'2px solid #111',display:'flex',alignItems:'center',justifyContent:'center',
                      fontWeight:800,fontSize:16,color:'#111',flexShrink:0 }}>
                      {ride.driver?.name?.[0]||'?'}
                    </div>
                    <div>
                      <p style={{ fontWeight:700,fontSize:15,color:'#111',
                        fontFamily:"'Space Grotesk',sans-serif" }}>{ride.driver?.name}</p>
                      <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:2 }}>
                        <span style={{ fontSize:13,color:'#f59e0b' }}>★</span>
                        <span style={{ fontSize:12,color:'#6b7280',fontFamily:"'Space Grotesk',sans-serif" }}>
                          {ride.driver?.rating?.toFixed(1)||'5.0'}
                        </span>
                        {isPrivate && <span style={{ padding:'2px 8px',borderRadius:4,
                          background:'#f3e8ff',border:'1px solid #a855f7',color:'#7c3aed',
                          fontSize:11,fontWeight:600,fontFamily:"'Space Grotesk',sans-serif" }}>PRIVATE</span>}
                        {ride.recurring && <span style={{ padding:'2px 8px',borderRadius:4,
                          background:'#dbeafe',border:'1px solid #3b82f6',color:'#1d4ed8',
                          fontSize:11,fontWeight:600,fontFamily:"'Space Grotesk',sans-serif" }}>RECURRING</span>}
                        {ride.type==='bikepool' && ride.helmetProvided && (
                          <span style={{ padding:'2px 8px',borderRadius:4,
                            background:'#dcfce7',border:'1px solid #16a34a',color:'#166534',
                            fontSize:11,fontWeight:600,fontFamily:"'Space Grotesk',sans-serif" }}>⛑️ HELMET</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Route */}
                  <div style={{ display:'flex',gap:10,marginBottom:12 }}>
                    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:2,paddingTop:3 }}>
                      <div style={{ width:10,height:10,borderRadius:'50%',background:'#16a34a',border:'2px solid #111' }} />
                      <div style={{ width:2,height:24,background:'#d1d5db' }} />
                      <div style={{ width:10,height:10,borderRadius:'50%',background:'#dc2626',border:'2px solid #111' }} />
                    </div>
                    <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
                      <p style={{ fontSize:14,fontWeight:600,color:'#111',
                        fontFamily:"'Space Grotesk',sans-serif" }}>{ride.from}</p>
                      <p style={{ fontSize:14,fontWeight:600,color:'#111',
                        fontFamily:"'Space Grotesk',sans-serif" }}>{ride.to}</p>
                    </div>
                  </div>

                  {/* Meta chips */}
                  <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                    {[
                      `🕐 ${ride.time}`,
                      `📅 ${new Date(ride.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`,
                      `💺 ${seatsLeft} seat${seatsLeft!==1?'s':''} left`,
                      `📍 ${ride.distance} km`,
                      ride.duration && `⏱ ~${ride.duration} min`,
                    ].filter(Boolean).map((c,j) => (
                      <span key={j} style={{ padding:'4px 10px',border:'1.5px solid #e5e7eb',
                        borderRadius:6,fontSize:12,color:'#4b5563',
                        fontFamily:"'Space Grotesk',sans-serif",fontWeight:500 }}>{c}</span>
                    ))}
                  </div>
                </div>

                {/* Price + Book */}
                <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10,flexShrink:0 }}>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:28,fontWeight:800,color:'#111',lineHeight:1,
                      fontFamily:"'Space Grotesk',sans-serif" }}>₹{ride.price}</p>
                    <p style={{ fontSize:11,color:'#9ca3af',fontFamily:"'Space Grotesk',sans-serif" }}>per seat</p>
                  </div>
                  {isBooked ? (
                    <span style={{ padding:'8px 16px',border:'2px solid #16a34a',borderRadius:8,
                      background:'#dcfce7',color:'#166534',fontSize:13,fontWeight:700,
                      fontFamily:"'Space Grotesk',sans-serif" }}>✓ Booked</span>
                  ) : isOwn ? (
                    <span style={{ padding:'8px 16px',border:'2px solid #e5e7eb',borderRadius:8,
                      color:'#9ca3af',fontSize:13,fontWeight:600,
                      fontFamily:"'Space Grotesk',sans-serif" }}>Your ride</span>
                  ) : isFull ? (
                    <span style={{ padding:'8px 16px',border:'2px solid #e5e7eb',borderRadius:8,
                      color:'#9ca3af',fontSize:13,fontWeight:600,
                      fontFamily:"'Space Grotesk',sans-serif" }}>Full</span>
                  ) : (
                    <button onClick={()=>book(ride._id, isPrivate)}
                      disabled={user.verificationStatus!=='verified'}
                      style={{ padding:'10px 20px',border:'2px solid #111',borderRadius:8,
                        background: user.verificationStatus!=='verified' ? '#e5e7eb' : isPrivate ? '#f3e8ff' : '#FACC15',
                        color: user.verificationStatus!=='verified' ? '#9ca3af' : '#111',
                        fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:13,
                        cursor:user.verificationStatus!=='verified'?'default':'pointer',
                        boxShadow:user.verificationStatus!=='verified'?'none':'3px 3px 0 #111' }}>
                      {isPrivate ? 'Request' : 'Book'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   OFFER RIDE
   ═══════════════════════════════════════════════════════════════════════════ */
const OfferRide = ({ user, notify, onSuccess }) => {
  const [f, setF] = useState({
    type:'carpool', from:'', to:'', date:'', time:'',
    seats:3, price:'', distance:'', recurring:false,
    days:[], helmetProvided:false, visibility:'public',
  });
  const [distInfo, setDistInfo]       = useState(null);
  const [distLoading, setDistLoading] = useState(false);
  const [loading, setLoading]         = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const fromRef = useRef(''); const toRef = useRef('');
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const calcDist = async (from, to) => {
    if (!from||!to) return;
    setDistLoading(true);
    try {
      const r = await api.get('/rides/distance', { params:{from,to} });
      setDistInfo(r.data); set('distance', String(r.data.distance));
    } catch (e) { notify(e.response?.data?.error||'Could not calculate distance','warning'); }
    finally { setDistLoading(false); }
  };

  const onFrom = (name) => { set('from',name); fromRef.current=name; setDistInfo(null); calcDist(name,toRef.current); };
  const onTo   = (name) => { set('to',name);   toRef.current=name;   setDistInfo(null); calcDist(fromRef.current,name); };

  const submit = async (e) => {
    e.preventDefault();
    if (user.verificationStatus!=='verified') return notify('Verify your account first','error');
    if (!f.distance) return notify('Distance is required','error');
    setLoading(true);
    try {
      await api.post('/rides/create', f);
      notify('Ride listed! 🚗','success');
      setF({ type:'carpool',from:'',to:'',date:'',time:'',seats:3,price:'',distance:'',
        recurring:false,days:[],helmetProvided:false,visibility:'public' });
      setDistInfo(null); fromRef.current=''; toRef.current='';
      onSuccess?.();
    } catch (e) { notify(e.response?.data?.error||'Failed','error'); }
    finally { setLoading(false); }
  };

  const Toggle = ({on,onClick,label}) => (
    <label style={{ display:'flex',alignItems:'center',gap:10,cursor:'pointer' }} onClick={onClick}>
      <div style={{ width:44,height:24,borderRadius:12,background:on?'#111':'#e5e7eb',
        border:'2px solid #111',position:'relative',transition:'background 0.2s',flexShrink:0 }}>
        <div style={{ position:'absolute',top:2,left:on?22:2,width:16,height:16,
          borderRadius:8,background:on?'#FACC15':'#fff',transition:'left 0.2s',
          border:'1px solid rgba(0,0,0,0.2)' }} />
      </div>
      <span style={{ fontSize:14,color:'#374151',fontFamily:"'Space Grotesk',sans-serif",fontWeight:500 }}>{label}</span>
    </label>
  );

  const segStyle = (active, color='#FACC15') => ({
    flex:1, padding:'10px 0', border:'2px solid #111', cursor:'pointer',
    fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13,
    background: active ? color : '#fff', color:'#111', transition:'all 0.15s',
    boxShadow: active ? '2px 2px 0 #111' : 'none',
  });

  const fieldLabel = (t) => (
    <label style={{ display:'block',fontSize:11,fontWeight:700,letterSpacing:'0.08em',
      textTransform:'uppercase',color:'#374151',marginBottom:6,
      fontFamily:"'Space Grotesk',sans-serif" }}>{t}</label>
  );

  const inputStyle = (extra={}) => ({
    width:'100%', padding:'11px 13px', border:'2px solid #111', borderRadius:8,
    fontFamily:"'Space Grotesk',sans-serif", fontSize:14, outline:'none',
    background:'#fff', boxShadow:'2px 2px 0 #111', colorScheme:'light', ...extra,
  });

  if (user.verificationStatus !== 'verified') return (
    <div>
      <h1 style={{ fontSize:36,fontWeight:700,color:'#111',marginBottom:24,
        fontFamily:"'Space Grotesk',sans-serif" }}>Offer a Ride</h1>
      <div style={{ background:'#fef3c7',border:'2px solid #f59e0b',borderRadius:12,
        padding:32,textAlign:'center',boxShadow:'4px 4px 0 #f59e0b' }}>
        <p style={{ fontSize:20,marginBottom:8 }}>🔒</p>
        <p style={{ fontSize:16,fontWeight:700,color:'#92400e',marginBottom:4,
          fontFamily:"'Space Grotesk',sans-serif" }}>Account not verified</p>
        <p style={{ fontSize:14,color:'#78350f',fontFamily:"'Space Grotesk',sans-serif" }}>
          Upload your college ID and wait for admin approval before offering rides.
        </p>
      </div>
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize:36,fontWeight:700,color:'#111',marginBottom:24,
        fontFamily:"'Space Grotesk',sans-serif" }}>Offer a ride</h1>

      <div style={{ background:'#fff',border:'2px solid #111',borderRadius:12,
        padding:28,boxShadow:'4px 4px 0 #111',maxWidth:680 }}>
        <form onSubmit={submit} style={{ display:'flex',flexDirection:'column',gap:20 }}>

          {/* Type */}
          <div>
            {fieldLabel('Ride Type')}
            <div style={{ display:'flex',borderRadius:8,overflow:'hidden',border:'2px solid #111' }}>
              <button type="button" onClick={()=>{set('type','carpool');set('seats',3);}}
                style={{...segStyle(f.type==='carpool'),borderRadius:0,borderRight:'1px solid #111'}}>
                🚗 Carpool
              </button>
              <button type="button" onClick={()=>{set('type','bikepool');set('seats',1);}}
                style={{...segStyle(f.type==='bikepool'),borderRadius:0}}>
                🏍️ Bikepool
              </button>
            </div>
          </div>

          {/* Visibility */}
          <div>
            {fieldLabel('Visibility')}
            <div style={{ display:'flex',borderRadius:8,overflow:'hidden',border:'2px solid #111' }}>
              <button type="button" onClick={()=>set('visibility','public')}
                style={{...segStyle(f.visibility==='public'),borderRadius:0,borderRight:'1px solid #111'}}>
                🌐 Public
              </button>
              <button type="button" onClick={()=>set('visibility','private')}
                style={{...segStyle(f.visibility==='private','#f3e8ff'),borderRadius:0}}>
                🔒 Private
              </button>
            </div>
            <p style={{ fontSize:12,color:'#6b7280',marginTop:6,fontFamily:"'Space Grotesk',sans-serif" }}>
              {f.visibility==='public' ? 'Anyone from your org can book instantly.' : 'Passengers must request — you approve or decline each one.'}
            </p>
          </div>

          {/* Route */}
          <div>
            {fieldLabel('Route')}
            <div style={{ border:'2px solid #111',borderRadius:8,overflow:'visible',
              boxShadow:'2px 2px 0 #111',position:'relative' }}>
              <LocationInput placeholder="From — Pickup point" value={f.from}
                dotColor="#16a34a" required onChange={onFrom} />
              <div style={{ height:2,background:'#f3f4f6',marginLeft:36 }} />
              <LocationInput placeholder="To — Destination" value={f.to}
                dotColor="#dc2626" required onChange={onTo} />
            </div>
          </div>

          {/* Distance indicator */}
          {distLoading && (
            <div style={{ display:'flex',alignItems:'center',gap:10,padding:'12px 16px',
              background:'#fffbeb',border:'2px solid #f59e0b',borderRadius:8 }}>
              <div style={{ width:14,height:14,borderRadius:'50%',border:'2px solid #fbbf24',
                borderTopColor:'#d97706',animation:'cpSpin 0.7s linear infinite',flexShrink:0 }} />
              <span style={{ fontSize:13,fontWeight:600,color:'#92400e',fontFamily:"'Space Grotesk',sans-serif" }}>
                Calculating route distance…
              </span>
            </div>
          )}
          {distInfo && !distLoading && (
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
              padding:'12px 16px',background:'#f0fdf4',border:'2px solid #16a34a',borderRadius:8,
              boxShadow:'2px 2px 0 #16a34a' }}>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ fontSize:18 }}>🛣️</span>
                <span style={{ fontSize:14,fontWeight:700,color:'#166534',
                  fontFamily:"'Space Grotesk',sans-serif" }}>
                  {distInfo.distance} km · ~{distInfo.duration} min drive
                </span>
              </div>
              <button type="button" onClick={()=>calcDist(f.from,f.to)}
                style={{ background:'none',border:'none',color:'#6b7280',fontSize:12,
                  cursor:'pointer',fontFamily:"'Space Grotesk',sans-serif" }}>recalc</button>
            </div>
          )}

          {/* Date / Time / Distance */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
            {[
              {lbl:'Date',   key:'date',     type:'date'},
              {lbl:'Time',   key:'time',     type:'time'},
              {lbl:'Dist (km)',key:'distance',type:'number',placeholder:'0',step:'0.1'},
            ].map(({lbl,key,type,placeholder,step})=>(
              <div key={key}>
                {fieldLabel(lbl)}
                <input type={type} required value={f[key]} placeholder={placeholder} step={step}
                  onChange={e=>set(key,e.target.value)} style={inputStyle()} />
              </div>
            ))}
          </div>

          {/* Seats / Price */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div>
              {fieldLabel('Seats')}
              <input type="number" min={1} max={f.type==='bikepool'?1:6} value={f.seats}
                disabled={f.type==='bikepool'}
                onChange={e=>set('seats',parseInt(e.target.value)||1)}
                style={inputStyle({opacity:f.type==='bikepool'?0.5:1})} />
            </div>
            <div>
              {fieldLabel('Price / seat (₹)')}
              <input type="number" min={0} required value={f.price} placeholder="0"
                onChange={e=>set('price',e.target.value)} style={inputStyle()} />
            </div>
          </div>

          <Toggle on={f.recurring} onClick={()=>set('recurring',!f.recurring)} label="Daily recurring commute" />

          {f.recurring && (
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {DAYS.map(d=>(
                <button key={d} type="button"
                  onClick={()=>set('days', f.days.includes(d)?f.days.filter(x=>x!==d):[...f.days,d])}
                  style={{ padding:'6px 12px',border:'2px solid #111',borderRadius:6,
                    background:f.days.includes(d)?'#FACC15':'#fff',
                    fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:12,
                    cursor:'pointer',boxShadow:f.days.includes(d)?'2px 2px 0 #111':'none' }}>
                  {d}
                </button>
              ))}
            </div>
          )}

          {f.type==='bikepool' && (
            <Toggle on={f.helmetProvided} onClick={()=>set('helmetProvided',!f.helmetProvided)}
              label="I'll provide a helmet" />
          )}

          <button type="submit" disabled={loading}
            style={{ padding:'14px',border:'2px solid #111',borderRadius:8,
              background:loading?'#e5e7eb':'#111',color:loading?'#9ca3af':'#fff',
              fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,
              cursor:loading?'default':'pointer',boxShadow:loading?'none':'4px 4px 0 rgba(0,0,0,0.2)' }}>
            {loading ? 'Creating ride…' : 'List My Ride'}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD  (my rides)
   ═══════════════════════════════════════════════════════════════════════════ */
const MyRidesDash = ({ user, notify }) => {
  const [view, setView]     = useState('offered');
  const [data, setData]     = useState({ offered:[], booked:[] });
  const [loading, setLoading] = useState(true);
  const uid = user.id||user._id;

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/rides/my-rides');
      setData({ offered: r.data.offeredRides||[], booked: r.data.bookedRides||[] });
    } catch { notify('Failed to load rides','error'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const doComplete = async (id) => {
    try { await api.put(`/rides/complete/${id}`); notify('Ride completed! 🎉','success'); load(); }
    catch(e){ notify(e.response?.data?.error||'Failed','error'); }
  };
  const doCancel = async (id, type) => {
    try {
      if (type==='ride') await api.delete(`/rides/cancel-ride/${id}`);
      else await api.delete(`/rides/cancel-booking/${id}`);
      notify('Cancelled','success'); load();
    } catch(e){ notify(e.response?.data?.error||'Failed','error'); }
  };
  const doApprove = async (rideId, userId) => {
    try { await api.put(`/rides/approve/${rideId}/${userId}`); notify('Approved!','success'); load(); }
    catch(e){ notify(e.response?.data?.error||'Failed','error'); }
  };
  const doDecline = async (rideId, userId) => {
    try { await api.put(`/rides/decline/${rideId}/${userId}`); notify('Declined','info'); load(); }
    catch(e){ notify(e.response?.data?.error||'Failed','error'); }
  };

  const statusColors = {
    scheduled:{ bg:'#dbeafe',color:'#1d4ed8',border:'#93c5fd' },
    ongoing:  { bg:'#dcfce7',color:'#166534',border:'#86efac' },
    completed:{ bg:'#f3f4f6',color:'#374151',border:'#d1d5db' },
    cancelled:{ bg:'#fee2e2',color:'#991b1b',border:'#fca5a5' },
  };

  const RideRow = ({ ride, isDriver }) => {
    const s = statusColors[ride.status]||statusColors.scheduled;
    return (
      <div style={{ padding:20,borderBottom:'2px solid #f3f4f6',animation:'cpFade 0.3s ease' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap' }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap' }}>
              <span style={{ fontSize:13,fontWeight:700,color:'#111',
                fontFamily:"'Space Grotesk',sans-serif" }}>
                {ride.from} → {ride.to}
              </span>
              <span style={{ padding:'3px 10px',borderRadius:6,border:`1.5px solid ${s.border}`,
                background:s.bg,color:s.color,fontSize:11,fontWeight:700,
                fontFamily:"'Space Grotesk',sans-serif",textTransform:'uppercase' }}>
                {ride.status}
              </span>
              {ride.visibility==='private' && (
                <span style={{ padding:'3px 10px',borderRadius:6,
                  background:'#f3e8ff',border:'1.5px solid #a855f7',color:'#7c3aed',
                  fontSize:11,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif" }}>PRIVATE</span>
              )}
            </div>
            <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
              {[`🕐 ${ride.time}`,
                `📅 ${new Date(ride.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`,
                `💺 ${ride.bookings?.length||0}/${ride.seats}`,
                `₹${ride.price}`,
              ].map((c,i)=>(
                <span key={i} style={{ padding:'3px 10px',border:'1.5px solid #e5e7eb',borderRadius:6,
                  fontSize:12,color:'#4b5563',fontFamily:"'Space Grotesk',sans-serif",fontWeight:500 }}>{c}</span>
              ))}
            </div>
          </div>
          {/* Actions */}
          <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
            {isDriver && ride.status==='scheduled' && (
              <button onClick={()=>doComplete(ride._id)}
                style={{ padding:'7px 14px',border:'2px solid #16a34a',borderRadius:8,
                  background:'#dcfce7',color:'#166534',fontFamily:"'Space Grotesk',sans-serif",
                  fontWeight:700,fontSize:12,cursor:'pointer',boxShadow:'2px 2px 0 #16a34a' }}>
                ✓ Complete
              </button>
            )}
            {isDriver && ['scheduled','ongoing'].includes(ride.status) && (
              <button onClick={()=>doCancel(ride._id,'ride')}
                style={{ padding:'7px 14px',border:'2px solid #dc2626',borderRadius:8,
                  background:'#fee2e2',color:'#991b1b',fontFamily:"'Space Grotesk',sans-serif",
                  fontWeight:700,fontSize:12,cursor:'pointer',boxShadow:'2px 2px 0 #dc2626' }}>
                Cancel Ride
              </button>
            )}
            {!isDriver && ride.status==='scheduled' && (
              <button onClick={()=>doCancel(ride._id,'booking')}
                style={{ padding:'7px 14px',border:'2px solid #dc2626',borderRadius:8,
                  background:'#fee2e2',color:'#991b1b',fontFamily:"'Space Grotesk',sans-serif",
                  fontWeight:700,fontSize:12,cursor:'pointer',boxShadow:'2px 2px 0 #dc2626' }}>
                Cancel Booking
              </button>
            )}
          </div>
        </div>

        {/* Pending booking requests */}
        {isDriver && ride.pendingBookings?.length > 0 && (
          <div style={{ marginTop:12,padding:12,background:'#fffbeb',border:'2px solid #f59e0b',borderRadius:8 }}>
            <p style={{ fontSize:12,fontWeight:700,color:'#92400e',marginBottom:8,
              textTransform:'uppercase',letterSpacing:'0.06em',fontFamily:"'Space Grotesk',sans-serif" }}>
              Pending Requests ({ride.pendingBookings.length})
            </p>
            {ride.pendingBookings.map(p=>(
              <div key={p.user?._id||p.user}
                style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'8px 0',borderBottom:'1px solid #fde68a',gap:10 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ width:28,height:28,borderRadius:'50%',background:'#FACC15',
                    border:'2px solid #111',display:'flex',alignItems:'center',justifyContent:'center',
                    fontWeight:700,fontSize:12 }}>{(p.user?.name||'?')[0]}</div>
                  <span style={{ fontSize:13,fontWeight:600,color:'#111',
                    fontFamily:"'Space Grotesk',sans-serif" }}>{p.user?.name||'User'}</span>
                </div>
                <div style={{ display:'flex',gap:6 }}>
                  <button onClick={()=>doApprove(ride._id, p.user?._id||p.user)}
                    style={{ padding:'5px 12px',border:'2px solid #16a34a',borderRadius:6,
                      background:'#dcfce7',color:'#166534',fontWeight:700,fontSize:12,
                      cursor:'pointer',fontFamily:"'Space Grotesk',sans-serif" }}>✓ OK</button>
                  <button onClick={()=>doDecline(ride._id, p.user?._id||p.user)}
                    style={{ padding:'5px 12px',border:'2px solid #dc2626',borderRadius:6,
                      background:'#fee2e2',color:'#991b1b',fontWeight:700,fontSize:12,
                      cursor:'pointer',fontFamily:"'Space Grotesk',sans-serif" }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const rides = view==='offered' ? data.offered : data.booked;

  return (
    <div>
      {/* Stats header */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:28 }}>
        {[
          { bg:'#FACC15',label:'HEY,', val:user.name, sub:user.organization, big:true },
          { bg:'#fff',label:'RIDES OFFERED', val:data.offered.length, border:true },
          { bg:'#38bdf8',label:'RIDES TAKEN',   val:data.booked.length },
          { bg:'#4ade80',label:'RATING',        val:(user.rating||5.0).toFixed(1) },
        ].map((s,i)=>(
          <div key={i} style={{ background:s.bg,border:'2px solid #111',borderRadius:12,
            padding:24,boxShadow:'4px 4px 0 #111',
            outline: s.border?'2px solid #111':undefined }}>
            <p style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
              color:s.big?'rgba(0,0,0,0.6)':'#111',fontFamily:"'Space Grotesk',sans-serif",marginBottom:4 }}>
              {s.label}
            </p>
            <p style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:800,
              fontSize:s.big?28:40,color:'#111',lineHeight:1.1 }}>{s.val}</p>
            {s.sub && <p style={{ fontSize:14,color:'rgba(0,0,0,0.7)',marginTop:4,
              fontFamily:"'Space Grotesk',sans-serif" }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tab + new ride */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10 }}>
        <div style={{ display:'flex',gap:8 }}>
          {[['offered','🚗 OFFERED'],['booked','🏍 BOOKED']].map(([k,l])=>(
            <button key={k} onClick={()=>setView(k)}
              style={{ padding:'8px 18px',border:'2px solid #111',borderRadius:8,
                background:view===k?'#FACC15':'#fff',fontFamily:"'Space Grotesk',sans-serif",
                fontWeight:700,fontSize:13,cursor:'pointer',
                boxShadow:view===k?'3px 3px 0 #111':'none',letterSpacing:'0.05em' }}>
              {l}
            </button>
          ))}
          <button onClick={load}
            style={{ padding:'8px 12px',border:'2px solid #111',borderRadius:8,
              background:'#fff',cursor:'pointer',fontSize:16,boxShadow:'2px 2px 0 #111' }}>
            🔄
          </button>
        </div>
      </div>

      <div style={{ background:'#fff',border:'2px solid #111',borderRadius:12,
        overflow:'hidden',boxShadow:'4px 4px 0 #111' }}>
        {loading ? (
          <div style={{ padding:'60px',textAlign:'center' }}>
            <div style={{ width:36,height:36,margin:'0 auto',borderRadius:'50%',
              border:'3px solid #e5e7eb',borderTopColor:'#FACC15',animation:'cpSpin 0.8s linear infinite' }} />
          </div>
        ) : rides.length===0 ? (
          <div style={{ padding:'60px',textAlign:'center' }}>
            <p style={{ fontSize:18,fontWeight:700,color:'#111',fontFamily:"'Space Grotesk',sans-serif" }}>
              No {view} rides yet
            </p>
          </div>
        ) : rides.map(r => <RideRow key={r._id} ride={r} isDriver={view==='offered'} />)}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   LEADERBOARD
   ═══════════════════════════════════════════════════════════════════════════ */
const LeaderboardTab = ({ user, notify }) => {
  const [org, setOrg]   = useState(user.organization);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (o) => {
    setLoading(true);
    try {
      const r = await api.get(`/rides/leaderboard/${encodeURIComponent(o)}`);
      setData(r.data);
    } catch { notify('Failed to load leaderboard','error'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(org); },[org]);

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',
        marginBottom:24,flexWrap:'wrap',gap:12 }}>
        <div>
          <h1 style={{ fontSize:40,fontWeight:800,color:'#111',display:'flex',alignItems:'center',gap:12,
            fontFamily:"'Space Grotesk',sans-serif" }}>
            <span>🏆</span> Leaderboard
          </h1>
          <p style={{ color:'#6b7280',fontSize:14,fontFamily:"'Space Grotesk',sans-serif" }}>
            Top campus carpoolers.
          </p>
        </div>
        <select value={org} onChange={e=>{setOrg(e.target.value);}}
          style={{ padding:'10px 16px',border:'2px solid #111',borderRadius:8,
            fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:14,
            background:'#fff',cursor:'pointer',boxShadow:'3px 3px 0 #111',minWidth:240 }}>
          {ORGS.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ padding:'60px',textAlign:'center' }}>
          <div style={{ width:36,height:36,margin:'0 auto',borderRadius:'50%',
            border:'3px solid #e5e7eb',borderTopColor:'#FACC15',animation:'cpSpin 0.8s linear infinite' }} />
        </div>
      ) : !data ? null : (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {data.leaderboard.map((e,i)=>(
            <div key={i} style={{ display:'flex',alignItems:'center',gap:16,padding:'16px 20px',
              border:'2px solid #111',borderRadius:12,
              background: i===0?'#FACC15': i===1?'#e5e7eb': i===2?'#fed7aa':'#fff',
              boxShadow:'4px 4px 0 #111',fontFamily:"'Space Grotesk',sans-serif",
              animation:'cpFade 0.3s ease' }}>
              <span style={{ fontSize:20,fontWeight:800,color:'#111',minWidth:36 }}>#{e.rank}</span>
              <div style={{ width:40,height:40,borderRadius:'50%',background:'#fff',
                border:'2px solid #111',display:'flex',alignItems:'center',justifyContent:'center',
                fontWeight:800,fontSize:16,flexShrink:0 }}>{e.name[0]}</div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700,fontSize:15,color:'#111' }}>{e.name}</p>
                <p style={{ fontSize:12,color:'#4b5563' }}>
                  {e.rating?.toFixed(1)} ★ · {e.ridesCompleted} offered · {e.carbonSaved?.toFixed(1)} kg CO₂
                </p>
              </div>
              <span style={{ fontSize:24,fontWeight:800,color:'#111' }}>{e.ridesCompleted}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE
   ═══════════════════════════════════════════════════════════════════════════ */
const ProfileTab = ({ user, logout, notify, onUploadId, refreshUser }) => {
  const [contacts, setContacts] = useState(user.trustedContacts||[]);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);

  const saveContacts = async () => {
    if (!contacts.every(c=>c.name&&c.phone)) return notify('Each contact needs name & phone','error');
    setSaving(true);
    try { await api.put('/auth/trusted-contacts',{trustedContacts:contacts}); notify('Saved!','success'); setEditing(false); refreshUser(); }
    catch(e){ notify(e.response?.data?.error||'Failed','error'); }
    finally { setSaving(false); }
  };

  const badgeCfg = {
    verified:     {label:'✓ Verified',     bg:'#dcfce7',color:'#166534',border:'#86efac'},
    pending:      {label:'⏳ Pending',     bg:'#fef3c7',color:'#92400e',border:'#fde68a'},
    under_review: {label:'👁 Under Review', bg:'#dbeafe',color:'#1e40af',border:'#93c5fd'},
    rejected:     {label:'✕ Rejected',     bg:'#fee2e2',color:'#991b1b',border:'#fca5a5'},
  }[user.verificationStatus]||{label:'Unknown',bg:'#f3f4f6',color:'#374151',border:'#d1d5db'};

  return (
    <div style={{ maxWidth:600,fontFamily:"'Space Grotesk',sans-serif" }}>
      <h1 style={{ fontSize:32,fontWeight:700,color:'#111',marginBottom:24 }}>Profile</h1>

      {/* Avatar card */}
      <div style={{ background:'#fff',border:'2px solid #111',borderRadius:12,padding:24,
        boxShadow:'4px 4px 0 #111',marginBottom:16,display:'flex',alignItems:'center',gap:16 }}>
        <div style={{ width:60,height:60,borderRadius:12,background:'#FACC15',border:'2px solid #111',
          display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:24,
          flexShrink:0 }}>{user.name[0].toUpperCase()}</div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:20,fontWeight:700,color:'#111' }}>{user.name}</p>
          <p style={{ fontSize:14,color:'#6b7280',marginTop:2 }}>{user.email}</p>
          <div style={{ display:'flex',gap:6,marginTop:8,flexWrap:'wrap' }}>
            <span style={{ padding:'3px 10px',border:`1.5px solid ${badgeCfg.border}`,borderRadius:6,
              background:badgeCfg.bg,color:badgeCfg.color,fontSize:12,fontWeight:700 }}>
              {badgeCfg.label}
            </span>
            <span style={{ padding:'3px 10px',border:'1.5px solid #e5e7eb',borderRadius:6,
              background:'#f9fafb',color:'#374151',fontSize:12,fontWeight:600,
              textTransform:'capitalize' }}>{user.role}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16 }}>
        {[{v:user.ridesCompleted||0,l:'Rides'},{v:`${(user.carbonSaved||0).toFixed?.(1)??0}kg`,l:'CO₂'},{v:user.rating||'5.0',l:'Rating'}].map((s,i)=>(
          <div key={i} style={{ background:'#fff',border:'2px solid #111',borderRadius:10,
            padding:'16px',textAlign:'center',boxShadow:'3px 3px 0 #111' }}>
            <p style={{ fontSize:24,fontWeight:800,color:'#111' }}>{s.v}</p>
            <p style={{ fontSize:12,color:'#6b7280',fontWeight:600,textTransform:'uppercase',
              letterSpacing:'0.06em',marginTop:2 }}>{s.l}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{ background:'#fff',border:'2px solid #111',borderRadius:12,
        overflow:'hidden',boxShadow:'4px 4px 0 #111',marginBottom:16 }}>
        {[['Organisation',user.organization],['Phone',user.phone]].map(([l,v],i)=>(
          <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'14px 20px',
            borderBottom: i===0?'2px solid #f3f4f6':'none' }}>
            <span style={{ fontSize:13,color:'#6b7280',fontWeight:600 }}>{l}</span>
            <span style={{ fontSize:13,color:'#111',fontWeight:600 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* ID upload */}
      {user.verificationStatus !== 'verified' && (
        <button onClick={onUploadId}
          style={{ width:'100%',padding:'14px',border:'2px solid #f59e0b',borderRadius:10,
            background:'#fef3c7',color:'#92400e',fontWeight:700,fontSize:14,
            cursor:'pointer',boxShadow:'4px 4px 0 #f59e0b',marginBottom:16,
            display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <span>📎 {user.verificationStatus==='pending'?'Upload College ID Card':'Re-upload ID Card'}</span>
          <span>→</span>
        </button>
      )}

      {/* Trusted contacts */}
      <div style={{ background:'#fff',border:'2px solid #111',borderRadius:12,
        padding:20,boxShadow:'4px 4px 0 #111',marginBottom:16 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
          <div>
            <p style={{ fontSize:15,fontWeight:700,color:'#111' }}>🛡️ Emergency Contacts</p>
            <p style={{ fontSize:12,color:'#6b7280',marginTop:2 }}>Up to 3 contacts for SOS alerts</p>
          </div>
          <button onClick={()=>setEditing(!editing)}
            style={{ padding:'6px 14px',border:'2px solid #111',borderRadius:8,
              background:editing?'#f3f4f6':'#fff',fontWeight:700,fontSize:13,cursor:'pointer',
              boxShadow:'2px 2px 0 #111' }}>
            {editing?'Cancel':'Edit'}
          </button>
        </div>
        {editing ? (
          <div>
            {contacts.map((c,i)=>(
              <div key={i} style={{ background:'#f9fafb',border:'2px solid #e5e7eb',borderRadius:8,
                padding:12,marginBottom:10 }}>
                {['name','phone'].map(k=>(
                  <input key={k} placeholder={k.charAt(0).toUpperCase()+k.slice(1)} value={c[k]}
                    onChange={e=>{const nc=[...contacts];nc[i]={...nc[i],[k]:e.target.value};setContacts(nc);}}
                    style={{ width:'100%',padding:'9px 12px',border:'2px solid #111',borderRadius:6,
                      fontFamily:"'Space Grotesk',sans-serif",fontSize:13,outline:'none',
                      marginBottom:6,background:'#fff',boxSizing:'border-box' }} />
                ))}
                <button onClick={()=>setContacts(contacts.filter((_,j)=>j!==i))}
                  style={{ background:'none',border:'none',color:'#dc2626',fontSize:12,
                    cursor:'pointer',fontWeight:700 }}>✕ Remove</button>
              </div>
            ))}
            <div style={{ display:'flex',gap:8 }}>
              {contacts.length<3 && (
                <button onClick={()=>setContacts([...contacts,{name:'',phone:'',relation:'Emergency Contact'}])}
                  style={{ flex:1,padding:'10px',border:'2px dashed #111',borderRadius:8,
                    background:'#fff',fontWeight:700,fontSize:13,cursor:'pointer' }}>+ Add</button>
              )}
              <button onClick={saveContacts} disabled={saving}
                style={{ flex:1,padding:'10px',border:'2px solid #111',borderRadius:8,
                  background:saving?'#e5e7eb':'#111',color:saving?'#9ca3af':'#fff',
                  fontWeight:700,fontSize:13,cursor:saving?'default':'pointer',
                  boxShadow:saving?'none':'3px 3px 0 rgba(0,0,0,0.2)' }}>
                {saving?'…':'Save'}
              </button>
            </div>
          </div>
        ) : contacts.length===0 ? (
          <p style={{ fontSize:13,color:'#9ca3af' }}>No contacts added yet</p>
        ) : contacts.map((c,i)=>(
          <div key={i} style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
            <div style={{ width:32,height:32,borderRadius:8,background:'#dbeafe',border:'2px solid #3b82f6',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:14 }}>📞</div>
            <div>
              <p style={{ fontSize:13,fontWeight:600,color:'#111' }}>{c.name}</p>
              <p style={{ fontSize:12,color:'#6b7280' }}>{c.phone}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon */}
      <div style={{ background:'#f0f9ff',border:'2px solid #7dd3fc',borderRadius:10,
        padding:'14px 16px',marginBottom:16 }}>
        <p style={{ fontSize:12,fontWeight:700,color:'#0369a1',marginBottom:4,
          textTransform:'uppercase',letterSpacing:'0.06em' }}>🚀 Coming Soon</p>
        <p style={{ fontSize:13,color:'#0c4a6e' }}>
          OTP login · UPI payment gateway · Live GPS map · In-app chat (auto-deleted 2h post-ride)
        </p>
      </div>

      <button onClick={logout}
        style={{ width:'100%',padding:'13px',border:'2px solid #dc2626',borderRadius:10,
          background:'#fee2e2',color:'#991b1b',fontWeight:700,fontSize:14,cursor:'pointer',
          boxShadow:'4px 4px 0 #dc2626',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
        ↪ Sign Out
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE BOTTOM NAV
   ═══════════════════════════════════════════════════════════════════════════ */
const MobileNav = ({ tab, setTab }) => (
  <nav className="cp-mob-nav" style={{ position:'fixed',bottom:0,left:0,right:0,zIndex:100,
    background:'#fff',borderTop:'2px solid #111',display:'flex',
    paddingBottom:'env(safe-area-inset-bottom,0)' }}>
    {[
      { k:'find',        icon:'🔍', label:'Find'    },
      { k:'offer',       icon:'➕', label:'Offer'   },
      { k:'myrides',     icon:'📊', label:'Trips'   },
      { k:'leaderboard', icon:'🏆', label:'Top'     },
      { k:'profile',     icon:'👤', label:'Profile' },
    ].map(n=>(
      <button key={n.k} onClick={()=>setTab(n.k)}
        style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',
          justifyContent:'center',gap:2,padding:'10px 0',background:'none',border:'none',
          cursor:'pointer',borderTop: tab===n.k?'3px solid #FACC15':'3px solid transparent',
          transition:'border-color 0.15s' }}>
        {n.k==='offer' ? (
          <div style={{ width:44,height:44,borderRadius:12,background:'#FACC15',
            border:'2px solid #111',display:'flex',alignItems:'center',justifyContent:'center',
            marginTop:-16,boxShadow:'3px 3px 0 #111',fontSize:20 }}>{n.icon}</div>
        ) : (
          <>
            <span style={{ fontSize:20 }}>{n.icon}</span>
            <span style={{ fontSize:10,fontWeight:700,color: tab===n.k?'#111':'#9ca3af',
              fontFamily:"'Space Grotesk',sans-serif",letterSpacing:'0.05em',
              textTransform:'uppercase' }}>{n.label}</span>
          </>
        )}
      </button>
    ))}
  </nav>
);

/* ═══════════════════════════════════════════════════════════════════════════
   NOTIF PANEL
   ═══════════════════════════════════════════════════════════════════════════ */
const NotifPanel = ({ notifs, onClose }) => (
  <div style={{ position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.4)' }} onClick={onClose}>
    <div style={{ position:'absolute',top:70,right:16,width:320,background:'#fff',
      border:'2px solid #111',borderRadius:12,boxShadow:'6px 6px 0 #111',overflow:'hidden',
      maxHeight:400,overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
      <div style={{ padding:'14px 16px',borderBottom:'2px solid #111',
        fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:'#111' }}>
        Notifications
      </div>
      {notifs.length===0 ? (
        <p style={{ padding:'24px',textAlign:'center',color:'#9ca3af',fontSize:14,
          fontFamily:"'Space Grotesk',sans-serif" }}>No notifications yet</p>
      ) : notifs.map((n,i)=>(
        <div key={i} style={{ padding:'12px 16px',borderBottom:'1px solid #f3f4f6' }}>
          <p style={{ fontSize:13,fontWeight:700,color:'#111',fontFamily:"'Space Grotesk',sans-serif" }}>
            {n.title||'Notification'}
          </p>
          <p style={{ fontSize:12,color:'#6b7280',marginTop:2,fontFamily:"'Space Grotesk',sans-serif" }}>
            {n.message}
          </p>
        </div>
      ))}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════════════════════════════════════ */
const App = () => {
  const [user, setUser]       = useState(null);
  const [page, setPage]       = useState('landing');
  const [tab,  setTab]        = useState('find');
  const [notif, setNotif]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [sockNotifs, setSockNotifs] = useState([]);
  const [showIdUpload, setShowIdUpload] = useState(false);
  const [showNotifs, setShowNotifs]     = useState(false);

  useEffect(() => { injectFonts(); checkAuth(); }, []);

  const notify = useCallback((message, type='success') => setNotif({message,type}), []);

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

  // Socket setup
  useEffect(() => {
    if (!user) return;
    const s = getSock();
    s.emit('join-user-room', user.id||user._id);
    const add = (d) => setSockNotifs(p=>[{...d,timestamp:new Date().toISOString()},...p].slice(0,20));
    s.on('booking-notification', add);
    s.on('booking-request', d=>{add(d); notify(`${d.userName} wants to join your ride!`,'info');});
    s.on('booking-approved', d=>{add(d); notify(d.message,'success');});
    s.on('booking-declined', d=>{add(d); notify(d.message,'warning');});
    s.on('booking-cancelled', add);
    s.on('ride-cancelled-by-driver', add);
    s.on('sos-alert', d=>{add({title:'🆘 SOS',...d}); notify(`SOS: ${d.message}`,'error');});
    return ()=>['booking-notification','booking-request','booking-approved','booking-declined',
      'booking-cancelled','ride-cancelled-by-driver','sos-alert'].forEach(e=>s.off(e));
  }, [user]);

  if (loading) return (
    <div style={{ minHeight:'100vh',background:'#f9fafb',display:'flex',
      alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16 }}>
      <div style={{ width:48,height:48,background:'#FACC15',borderRadius:12,border:'2px solid #111',
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,
        boxShadow:'3px 3px 0 #111' }}>🚗</div>
      <div style={{ width:32,height:32,borderRadius:'50%',border:'3px solid #e5e7eb',
        borderTopColor:'#FACC15',animation:'cpSpin 0.8s linear infinite' }} />
      <style>{`@keyframes cpSpin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Space Grotesk',sans-serif",minHeight:'100vh',background:'#f9fafb' }}>
      <style>{`
        @keyframes cpSpin{to{transform:rotate(360deg);}}
        @keyframes cpSlide{from{opacity:0;transform:translateX(-50%) translateY(-12px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
        @keyframes cpFade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes cpTicker{from{transform:translateX(0);}to{transform:translateX(-50%);}}
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#f9fafb;}
        input::placeholder{color:#9ca3af;}
        select option{background:#fff;color:#111;}
        input[type=date],input[type=time]{color-scheme:light;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:4px;}
        button:active:not(:disabled){transform:scale(0.97);}
        .cp-ride-card:hover{transform:translateY(-2px);}
        @media(min-width:768px){.cp-mob-nav{display:none!important;}}
        @media(max-width:767px){.cp-desk-nav{display:none!important;}}
      `}</style>

      <Toast n={notif} onClose={()=>setNotif(null)} />
      {showNotifs && <NotifPanel notifs={sockNotifs} onClose={()=>setShowNotifs(false)} />}
      {showIdUpload && <IdModal onClose={()=>setShowIdUpload(false)} onSuccess={refreshUser} notify={notify} />}

      {page === 'landing' && <LandingPage setPage={setPage} />}
      {page === 'login'   && (
        <LoginPage setPage={setPage} onLogin={(u)=>{setUser(u);setPage('app');notify(`Welcome back, ${u.name}!`);}} />
      )}
      {page === 'signup'  && (
        <div style={{ minHeight:'100vh',background:'#f9fafb',display:'flex',alignItems:'center',
          justifyContent:'center',padding:24,paddingTop:40 }}>
          <div style={{ width:'100%',maxWidth:480 }}>
            <SignupCard setPage={setPage} />
          </div>
        </div>
      )}

      {page === 'app' && user && (
        <>
          <Navbar user={user} tab={tab} setTab={setTab} logout={logout}
            notifCount={sockNotifs.length} onBell={()=>setShowNotifs(v=>!v)} />
          <VerifBanner user={user} onUpload={()=>setShowIdUpload(true)} />

          <main style={{ maxWidth:1100,margin:'0 auto',padding:'32px 24px 120px',
            animation:'cpFade 0.3s ease' }}>
            {tab==='find'        && <FindRides    user={user} notify={notify} />}
            {tab==='offer'       && <OfferRide    user={user} notify={notify} onSuccess={()=>setTab('myrides')} />}
            {tab==='myrides'     && <MyRidesDash  user={user} notify={notify} />}
            {tab==='leaderboard' && <LeaderboardTab user={user} notify={notify} />}
            {tab==='profile'     && <ProfileTab   user={user} logout={logout} notify={notify}
              onUploadId={()=>setShowIdUpload(true)} refreshUser={refreshUser} />}
          </main>

          <MobileNav tab={tab} setTab={setTab} />
        </>
      )}
    </div>
  );
};

export default App;