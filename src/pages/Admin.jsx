import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  Eye, Edit3, Trash2, Plus, Calendar, MapPin, Users, Ticket, CheckCircle, Save, ImageIcon, ExternalLink, Activity, DollarSign, Download, Settings, LayoutDashboard, CreditCard, X, ChevronDown, ChevronRight, BarChart3, TrendingUp, Filter, Bell, AlertTriangle, Info, Copy, ShieldAlert, LogOut, Shield, MessageSquare, XCircle, Loader, Clock, Menu
} from 'lucide-react';
import TemplateDesigner from '../components/TemplateDesigner';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import UserManagement from '../components/admin/UserManagement';
import jsQR from 'jsqr';
import UserProfileSettings from '../components/admin/UserProfileSettings';

import { STOCK_IMAGES } from '../data/stockImages';

const MOCK_LOGS = [];

const PREDEFINED_SMTP_PROVIDERS = [
  { id: 'gmail', name: 'Gmail', host: 'smtp.gmail.com', ports: [465, 587] },
  { id: 'outlook', name: 'Outlook / Hotmail', host: 'smtp.office365.com', ports: [587] },
  { id: 'yahoo', name: 'Yahoo Mail', host: 'smtp.mail.yahoo.com', ports: [465, 587] },
  { id: 'icloud', name: 'iCloud Mail', host: 'smtp.mail.me.com', ports: [587] },
  { id: 'aol', name: 'AOL Mail', host: 'smtp.aol.com', ports: [465] },
  { id: 'custom', name: 'Custom', host: '', ports: [] }
];

// ===== CUSTOM TOAST NOTIFICATION SYSTEM =====
const ToastContext = React.createContext();

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = (message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400);
    }, duration);
  };
  return (
    <ToastContext.Provider value={show}>
      {children}
      {createPortal(
        <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none" style={{ maxWidth: 420 }}>
          {toasts.map(toast => {
            const icons = {
              success: <CheckCircle className="w-5 h-5 text-black shrink-0" />,
              error: <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />,
              warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
              info: <Info className="w-5 h-5 text-theme-secondary shrink-0" />,
            };
            const borders = {
              success: 'border-black/30',
              error: 'border-rose-500/30',
              warning: 'border-amber-500/30',
              info: 'border-theme-secondary/30',
            };
            return (
              <div
                key={toast.id}
                className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-none border ${borders[toast.type]} bg-white/95 backdrop-blur-xl shadow-2xl text-sm text-theme-text font-medium ${toast.exiting ? 'animate-toast-out' : 'animate-toast-in'
                  }`}
              >
                {icons[toast.type]}
                <span className="flex-1">{toast.message}</span>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
const useToast = () => React.useContext(ToastContext);

// ===== HELPERS FOR COLOR EXTRACTION =====
const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; } 
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
};

const hslToHex = (h, s, l) => {
  let r, g, b;
  if (s === 0) { r = g = b = l; } 
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = x => { const hex = Math.round(x * 255).toString(16); return hex.length === 1 ? '0' + hex : hex; };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// ===== CUSTOM CONFIRM DIALOG =====
const ConfirmContext = React.createContext();

function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { title, message, confirmLabel, confirmColor, resolve }
  const show = (title, message, confirmLabel = 'Delete', confirmColor = 'rose') => {
    return new Promise(resolve => {
      setState({ title, message, confirmLabel, confirmColor, resolve });
    });
  };
  const handleClose = (result) => {
    state?.resolve(result);
    setState(null);
  };
  return (
    <ConfirmContext.Provider value={show}>
      {children}
      {state && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center" onClick={() => handleClose(false)}>
          <div className="absolute inset-0 bg-theme-bg/60 backdrop-blur-sm" />
          <div
            className="relative bg-white/95 border border-gray-200 rounded-none p-8 max-w-md w-full mx-4 shadow-2xl animate-toast-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-none flex items-center justify-center" style={{ backgroundColor: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)' }}>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-lg font-serif font-normal text-theme-text">{state.title}</h3>
            </div>
            <p className="text-theme-text/60 text-sm mb-8 leading-relaxed">{state.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleClose(false)}
                className="px-5 py-2.5 rounded-none bg-theme-bg hover:bg-slate-700 text-theme-text/80 text-sm font-sans font-medium border border-gray-200 transition-colors"
              >Cancel</button>
              <button
                onClick={() => handleClose(true)}
                className={`px-5 py-2.5 rounded-none text-white text-sm font-sans font-medium transition-colors shadow-lg ${state.confirmColor === 'rose'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                    : 'bg-black hover:bg-gray-800 shadow-black/5'
                  }`}
              >{state.confirmLabel}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
}
const useConfirm = () => React.useContext(ConfirmContext);

function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    const mouse = { x: null, y: null, radius: 200 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const handleMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const handleMouseOut = () => { mouse.x = null; mouse.y = null; };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);

    class Particle {
      constructor(x, y, size, color, speedX, speedY) {
        this.x = x; this.y = y; this.size = size;
        this.baseX = this.x; this.baseY = this.y;
        this.color = color;
        this.speedX = speedX; this.speedY = speedY;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
      update() {
        if (mouse.x != null) {
          let dx = mouse.x - this.x;
          let dy = mouse.y - this.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          let forceDirectionX = dx / distance;
          let forceDirectionY = dy / distance;
          let maxDistance = mouse.radius;
          let force = (maxDistance - distance) / maxDistance;
          let directionX = forceDirectionX * force * 2.5;
          let directionY = forceDirectionY * force * 2.5;

          if (distance < mouse.radius) {
            this.x -= directionX;
            this.y -= directionY;
          } else {
            if (this.x !== this.baseX) { this.x -= (this.x - this.baseX) / 20; }
            if (this.y !== this.baseY) { this.y -= (this.y - this.baseY) / 20; }
          }
        } else {
          if (this.x !== this.baseX) { this.x -= (this.x - this.baseX) / 20; }
          if (this.y !== this.baseY) { this.y -= (this.y - this.baseY) / 20; }
        }

        this.baseX += this.speedX;
        this.baseY += this.speedY;

        if (this.baseX > canvas.width) this.baseX = 0;
        if (this.baseX < 0) this.baseX = canvas.width;
        if (this.baseY > canvas.height) this.baseY = 0;
        if (this.baseY < 0) this.baseY = canvas.height;

        this.draw();
      }
    }

    const initParticles = () => {
      particles = [];
      const numberOfParticles = Math.floor((canvas.width * canvas.height) / 12000);
      for (let i = 0; i < numberOfParticles; i++) {
        let size = (Math.random() * 2.5) + 1.5; // Increased size
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        let opacity = Math.random() * 0.5 + 0.3; // Increased opacity
        let color = `rgba(165, 180, 252, ${opacity})`;
        let speedX = (Math.random() - 0.5) * 0.4;
        let speedY = (Math.random() - 0.5) * 0.4;
        particles.push(new Particle(x, y, size, color, speedX, speedY));
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
}


function AttendeeRegisterView({ events, allAttendees }) {
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const activeEvent = selectedEventId === 'all' ? null : (events.find(e => String(e.id) === String(selectedEventId)) || events[0]);

  const [attendees, setAttendees] = useState([]);

  useEffect(() => {
    try {
      if (selectedEventId === 'all') {
        setAttendees(allAttendees);
      } else if (activeEvent) {
        setAttendees(allAttendees.filter(a => String(a.eventId) === String(activeEvent.id)));
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedEventId, activeEvent, allAttendees]);

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-700">
        <div className="w-24 h-24 mb-6 rounded-none bg-gray-50 flex items-center justify-center border border-gray-200">
          <Users className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-4xl font-serif text-black mb-4">No Attendees Yet</h2>
        <p className="text-gray-500 max-w-md font-sans leading-relaxed">
          You haven't created any events yet. Once you launch an event, the registered attendees will populate here.
        </p>
      </div>
    );
  }
  const dynamicHeaders = activeEvent?.customFormFields || [];

  const toast = useToast();
  const confirm = useConfirm();

  const handleDeleteTicket = async (ticketId) => {
    const yes = await confirm('Delete Registration', 'Are you sure you want to delete this registration? This action cannot be undone.');
    if (!yes) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      });
      if (res.ok) {
        // Trigger a re-fetch in the parent component
        window.dispatchEvent(new StorageEvent('storage', { key: 'eventos_attendees' }));
        // Also manually update local state for immediate feedback
        setAttendees(prev => prev.filter(t => t.passId !== ticketId));
      }
    } catch (e) {
      console.error('Failed to delete ticket', e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative z-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-normal text-theme-text mb-2">Attendee Register</h2>
          <p className="text-theme-text/60">View and manage registered attendees for your events.</p>
        </div>

        <div className="glass-panel border border-gray-100 shadow-[0_8px_32px_rgba(151,161,218,0.2)] rounded-none p-1 flex bg-white/50 backdrop-blur-xl relative z-50">
          <div className="bg-transparent border-none text-theme-text font-mono text-sm py-2 px-4 cursor-default">
            {selectedEventId === 'all' ? 'All Events' : (events.find(e => e.id === selectedEventId)?.title || 'All Events')}
          </div>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-3 flex items-center justify-center border-l border-gray-100 cursor-pointer text-theme-text/60 hover:text-theme-primary transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-100 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 max-h-64 overflow-y-auto">
                <button 
                  onClick={() => { setSelectedEventId('all'); setIsDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm font-mono hover:bg-gray-50 transition-colors ${selectedEventId === 'all' ? 'text-theme-primary font-semibold bg-blue-50/30' : 'text-theme-text'}`}
                >
                  All Events
                </button>
                {events.map(e => (
                  <button 
                    key={e.id}
                    onClick={() => { setSelectedEventId(e.id); setIsDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm font-mono hover:bg-gray-50 transition-colors ${selectedEventId === e.id ? 'text-theme-primary font-semibold bg-blue-50/30' : 'text-theme-text'}`}
                  >
                    {e.title}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="glass-panel border border-gray-200 rounded-none overflow-hidden shadow-2xl bg-white/40 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-theme-bg/40 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-serif font-normal text-theme-text/60 uppercase tracking-wider">Event</th>
                <th className="py-4 px-6 text-xs font-serif font-normal text-theme-text/60 uppercase tracking-wider">Name & Email</th>
                <th className="py-4 px-6 text-xs font-serif font-normal text-theme-text/60 uppercase tracking-wider">Ticket Tier</th>
                <th className="py-4 px-6 text-xs font-serif font-normal text-theme-text/60 uppercase tracking-wider">Pass ID</th>
                {dynamicHeaders.map(h => (
                  <th key={h.id} className="py-4 px-6 text-xs font-serif font-normal text-theme-text/60 uppercase tracking-wider">{h.label}</th>
                ))}
                <th className="py-4 px-6 text-xs font-serif font-normal text-theme-text/60 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-primary/10">
              {attendees.length === 0 ? (
                <tr>
                  <td colSpan={3 + dynamicHeaders.length} className="py-12 text-center text-theme-text/50 italic">
                    No attendees registered for this event yet.
                  </td>
                </tr>
              ) : (
                attendees.map((attendee, idx) => {
                  const evt = events.find(e => e.id === attendee.eventId);
                  return (
                    <tr key={idx} className="hover:bg-black/5 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-serif font-normal text-black">{evt?.title || 'Unknown Event'}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-serif font-normal text-theme-text">{attendee.name}</div>
                        <div className="text-sm text-gray-500 font-mono font-medium">{attendee.email}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 bg-black/20 text-black rounded-none text-xs font-serif font-normal border border-black/30">
                          {attendee.tierName || 'GA'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs text-theme-text/60 bg-theme-bg/30 px-2 py-1 rounded">{attendee.passId}</span>
                      </td>
                      {dynamicHeaders.map(h => (
                        <td key={h.id} className="py-4 px-6 text-sm text-theme-text/80">
                          {attendee[h.id] || '-'}
                        </td>
                      ))}
                      <td className="py-4 px-6 text-right">
                        <button onClick={() => handleDeleteTicket(attendee.passId)} className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-sm hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TransactionsView({ events, allAttendees }) {
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const activeEvent = selectedEventId === 'all' ? null : (events.find(e => String(e.id) === String(selectedEventId)) || events[0]);
  const [transactions, setTransactions] = useState([]);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    try {
      let filtered = allAttendees;
      if (selectedEventId !== 'all' && activeEvent) {
        filtered = allAttendees.filter(a => String(a.eventId) === String(activeEvent.id));
      }
      // Only show attendees that have a payment screenshot (i.e. a transaction)
      setTransactions(filtered.filter(a => a.payment_screenshot));
    } catch (e) {
      console.error(e);
    }
  }, [selectedEventId, activeEvent, allAttendees]);

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-700">
        <div className="w-24 h-24 mb-6 rounded-none bg-gray-50 flex items-center justify-center border border-gray-200">
          <CreditCard className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-4xl font-serif text-black mb-4">No Transactions Yet</h2>
        <p className="text-gray-500 max-w-md font-sans leading-relaxed">
          You haven't created any events yet. Once you launch an event and receive payments, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative z-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-normal text-theme-text mb-2">Transactions</h2>
          <p className="text-theme-text/60">View and manage payment receipts and transactions.</p>
        </div>

        <div className="glass-panel border border-gray-100 shadow-[0_8px_32px_rgba(151,161,218,0.2)] rounded-none p-1 flex bg-white/50 backdrop-blur-xl relative z-50">
          <div className="bg-transparent border-none text-theme-text font-mono text-sm py-2 px-4 cursor-default">
            {selectedEventId === 'all' ? 'All Events' : (events.find(e => e.id === selectedEventId)?.title || 'All Events')}
          </div>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-3 flex items-center justify-center border-l border-gray-100 cursor-pointer text-theme-text/60 hover:text-theme-primary transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-100 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 max-h-64 overflow-y-auto">
                <button 
                  onClick={() => { setSelectedEventId('all'); setIsDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm font-mono hover:bg-gray-50 transition-colors ${selectedEventId === 'all' ? 'text-theme-primary font-semibold bg-blue-50/30' : 'text-theme-text'}`}
                >
                  All Events
                </button>
                {events.map(e => (
                  <button 
                    key={e.id}
                    onClick={() => { setSelectedEventId(e.id); setIsDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm font-mono hover:bg-gray-50 transition-colors ${selectedEventId === e.id ? 'text-theme-primary font-semibold bg-blue-50/30' : 'text-theme-text'}`}
                  >
                    {e.title}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="glass-panel border border-gray-200 rounded-none overflow-hidden shadow-2xl bg-white/40 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-theme-bg/40 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-serif font-normal text-theme-text/60 uppercase tracking-wider">Transaction ID</th>
                <th className="py-4 px-6 text-xs font-serif font-normal text-theme-text/60 uppercase tracking-wider">Pass ID</th>
                <th className="py-4 px-6 text-xs font-serif font-normal text-theme-text/60 uppercase tracking-wider">Attendee</th>
                <th className="py-4 px-6 text-xs font-serif font-normal text-theme-text/60 uppercase tracking-wider">Event</th>
                <th className="py-4 px-6 text-xs font-serif font-normal text-theme-text/60 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-serif font-normal text-theme-text/60 uppercase tracking-wider text-right">Screenshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-primary/10">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-theme-text/50 italic">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((txn, idx) => {
                  const evt = events.find(e => e.id === txn.eventId);
                  const txnId = `TXN-${txn.passId.substring(0, 8).toUpperCase()}`;
                  return (
                    <tr key={idx} className="hover:bg-black/5 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs font-medium text-black">{txnId}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs text-theme-text/60 bg-theme-bg/30 px-2 py-1 rounded">{txn.passId}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-serif font-normal text-theme-text">{txn.name}</div>
                        <div className="text-sm text-gray-500 font-mono font-medium">{txn.email}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-serif font-normal text-black">{evt?.title || 'Unknown Event'}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-none text-xs font-serif font-normal border ${
                          txn.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          txn.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          txn.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                          'bg-black/10 text-black border-black/20'
                        }`}>
                          {txn.status || 'PAID'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button onClick={() => setLightboxImage(txn.payment_screenshot)} className="inline-flex items-center space-x-1 text-sm font-medium text-theme-primary hover:text-theme-secondary transition-colors">
                          <ImageIcon className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setLightboxImage(null)}>
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightboxImage(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300">
              <X size={24} />
            </button>
            <img src={lightboxImage} alt="Payment Screenshot Preview" className="max-w-full max-h-[85vh] object-contain rounded-none border border-white/10 shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

function LiveDashboardView({ events, allAttendees }) {
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-700">
        <div className="w-24 h-24 mb-6 rounded-none bg-gray-50 flex items-center justify-center border border-gray-200">
          <Activity className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-4xl font-serif text-black mb-4">No Live Telemetry</h2>
        <p className="text-gray-500 max-w-md font-sans leading-relaxed">
          The dashboard is waiting for your first event. Create an event to start monitoring live metrics and attendance.
        </p>
      </div>
    );
  }

  const activeEvents = selectedEventId === 'all' ? events : events.filter(e => String(e.id) === String(selectedEventId));
  const totalCapacity = activeEvents.reduce((sum, e) => sum + e.tiers.reduce((s, t) => s + parseInt(t.capacity || 0), 0), 0);
  const totalAvailable = activeEvents.reduce((sum, e) => sum + e.tiers.reduce((s, t) => s + parseInt(t.available || 0), 0), 0);
  const totalBooked = totalCapacity - totalAvailable;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 relative z-10">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-normal text-theme-text mb-2">Live Telemetry</h2>
          <p className="text-theme-text/60">Real-time attendance and capacity metrics.</p>
        </div>

        <div className="glass-panel border border-gray-100 shadow-[0_8px_32px_rgba(151,161,218,0.2)] rounded-none p-1 flex bg-white/50 backdrop-blur-xl relative z-50">
          <div className="bg-transparent border-none text-theme-text font-mono text-sm py-2 px-4 cursor-default">
            {selectedEventId === 'all' ? 'All Events' : (events.find(e => e.id === selectedEventId)?.title || 'All Events')}
          </div>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-3 flex items-center justify-center border-l border-gray-100 cursor-pointer text-theme-text/60 hover:text-theme-primary transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-100 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 max-h-64 overflow-y-auto">
                <button 
                  onClick={() => { setSelectedEventId('all'); setIsDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm font-mono hover:bg-gray-50 transition-colors ${selectedEventId === 'all' ? 'text-theme-primary font-semibold bg-blue-50/30' : 'text-theme-text'}`}
                >
                  All Events
                </button>
                {events.map(e => (
                  <button 
                    key={e.id}
                    onClick={() => { setSelectedEventId(e.id); setIsDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm font-mono hover:bg-gray-50 transition-colors ${selectedEventId === e.id ? 'text-theme-primary font-semibold bg-blue-50/30' : 'text-theme-text'}`}
                  >
                    {e.title}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "TOTAL CAPACITY", value: totalCapacity, color: "text-black" },
          { label: "PASSES CLAIMED", value: totalBooked, color: "text-black" },
          { label: "REMAINING", value: totalAvailable, color: "text-theme-secondary" }
        ].map((kpi, i) => (
          <div key={i} className="relative bg-white/40 backdrop-blur-xl border border-gray-100 shadow-[0_0_0_1px_rgba(79,178,192,0.1),0_8px_32px_rgba(151,161,218,0.2)] rounded-none p-6 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-theme-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h4 className="text-xs font-serif font-normal text-theme-text/50 tracking-widest uppercase mb-4">{kpi.label}</h4>
            <div className={`font-mono text-5xl font-light ${kpi.color}`}>
              {kpi.value.toString().padStart(4, '0')}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/40 backdrop-blur-xl border border-gray-100 shadow-[0_0_0_1px_rgba(79,178,192,0.1),0_8px_32px_rgba(151,161,218,0.2)] rounded-none overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-theme-bg/20">
          <h3 className="font-serif font-normal text-theme-text tracking-wide">ACTIVE GUEST LOG</h3>
          <span className="font-mono text-xs text-black bg-gray-100 px-2 py-1 rounded border border-gray-200 shadow-[0_0_10px_rgba(99,102,241,0.2)]">LIVE • {allAttendees.filter(a => selectedEventId === 'all' || String(a.eventId) === String(selectedEventId)).length} REGISTRATIONS</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-serif font-normal text-theme-text/50 uppercase tracking-widest bg-theme-bg/40">
                <th className="px-6 py-4 font-mono">ID</th>
                <th className="px-6 py-4">Attendee</th>
                <th className="px-6 py-4 font-mono">Time</th>
                <th className="px-6 py-4 text-right">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-primary/10">
              {allAttendees.filter(a => selectedEventId === 'all' || String(a.eventId) === String(selectedEventId)).map(log => (
                <tr key={log.passId} className="hover:bg-black/5 transition-colors group">
                  <td className="px-6 py-4 font-mono text-theme-text/50 text-sm group-hover:text-black transition-colors">{log.passId}</td>
                  <td className="px-6 py-4 text-theme-text font-medium">{log.name}</td>
                  <td className="px-6 py-4 font-mono text-theme-text/60 text-sm">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-mono text-xs px-2 py-1 rounded border shadow-sm ${log.status === 'INSIDE'
                        ? 'bg-gray-100 text-black border-gray-200 shadow-theme-primary/10'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10'
                      }`}>
                      {log.status || 'OUTSIDE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const formatEventDate = (dateString) => {
  if (!dateString) return '';
  if (dateString.includes('•')) return dateString;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).replace(/, (?=\d+:\d+)/, ' • ');
  } catch (e) {
    return dateString;
  }
};

const formatMessage = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return (
          <span key={i}>
            {part.split('\n').map((line, j, arr) => (
              <React.Fragment key={j}>
                {line}
                {j !== arr.length - 1 && <br />}
              </React.Fragment>
            ))}
          </span>
        );
      })}
    </>
  );
};

function AIChatModal({ isOpen, onClose, onEventReady }) {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isProcessing) {
      inputRef.current?.focus();
    }
  }, [isProcessing]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/events/ai-chat/sessions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      });
      const data = await res.json();
      if (data.success && data.sessions) {
        setSessions(data.sessions);
        if (!currentSessionId && data.sessions.length > 0) {
          setCurrentSessionId(data.sessions[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (!currentSessionId) {
        setMessages([{ role: 'assistant', content: 'Hello! Need any help in creating an event? Just tell me what you have in mind!' }]);
        return;
      }

      setIsLoadingHistory(true);
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/events/ai-chat/history/${currentSessionId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.history && data.history.length > 0) {
          setMessages(data.history);
        } else {
          setMessages([{ role: 'assistant', content: 'Hello! Need any help in creating an event? Just tell me what you have in mind!' }]);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoadingHistory(false));
    }
  }, [isOpen, currentSessionId]);

  const { socket } = useSocket();
  const [streamingMessage, setStreamingMessage] = useState('');

  useEffect(() => {
    if (!socket) return;
    
    const handleChunk = ({ chunk }) => {
      setStreamingMessage(prev => prev + chunk);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleDone = ({ fullReply, sessionId, parsedJson }) => {
      setStreamingMessage('');
      setIsProcessing(false);
      
      let finalJson = parsedJson;
      // Fallback parsing if backend didn't parse it but it looks like event data
      if (!finalJson && fullReply && fullReply.includes('"event_ready"')) {
        try {
          const firstIdx = fullReply.indexOf('{');
          const lastIdx = fullReply.lastIndexOf('}');
          if (firstIdx !== -1 && lastIdx !== -1 && lastIdx > firstIdx) {
            // Strip any literal newlines that might be breaking JSON parse inside strings
            let jsonStr = fullReply.substring(firstIdx, lastIdx + 1);
            // Replace literal unescaped newlines with spaces just in case
            jsonStr = jsonStr.replace(/\n/g, ' '); 
            finalJson = JSON.parse(jsonStr);
          }
        } catch(e) {
          console.error("Frontend fallback parse failed:", e);
        }
      }

      if (finalJson && finalJson.event_ready) {
        if (sessionId) setCurrentSessionId(sessionId);
        toast('AI has finished preparing your event details!', 'success');
        onEventReady({ ...finalJson.event_data, ai_session_id: sessionId });
        setMessages([{ role: 'assistant', content: 'Hello! Need any help in creating an event? Just tell me what you have in mind!' }]);
      } else {
        if (sessionId && sessionId !== currentSessionId) {
          setCurrentSessionId(sessionId);
          fetchSessions();
        }
        setMessages(prev => [...prev, { role: 'assistant', content: fullReply }]);
      }
    };

    const handleError = ({ error }) => {
      toast(error || 'Failed to communicate with AI.', 'error');
      setStreamingMessage('');
      setIsProcessing(false);
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${error}` }]);
    };

    socket.on('ai_chat_chunk', handleChunk);
    socket.on('ai_chat_done', handleDone);
    socket.on('ai_chat_error', handleError);

    return () => {
      socket.off('ai_chat_chunk', handleChunk);
      socket.off('ai_chat_done', handleDone);
      socket.off('ai_chat_error', handleError);
    };
  }, [socket, currentSessionId, fetchSessions, messages, onClose, onEventReady, toast]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isProcessing || !socket) return;

    const newMessages = [...messages, { role: 'user', content: input.trim(), image: selectedImage }];
    setMessages(newMessages);
    setInput('');
    setSelectedImage(null);
    setIsProcessing(true);
    setStreamingMessage('');

    socket.emit('ai_chat_message', { messages: newMessages, sessionId: currentSessionId });
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([{ role: 'assistant', content: 'Hello! Need any help in creating an event? Just tell me what you have in mind!' }]);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 rounded-none w-full max-w-lg shadow-2xl overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200 flex flex-col" style={{ height: '600px' }}>
        <div className="px-6 py-4 border-b border-gray-100 bg-theme-bg/5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-serif font-normal text-theme-text flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-black" />
              AI Event Creator
            </h3>
            <p className="text-xs text-theme-text/60 mt-1">Powered by Gemini</p>
          </div>
          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <select 
                value={currentSessionId || ''}
                onChange={(e) => setCurrentSessionId(e.target.value)}
                className="text-xs border-gray-200 rounded px-2 py-1 bg-white text-gray-700 max-w-[120px] truncate"
              >
                <option value="" disabled>Select Chat...</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>{s.title || 'Chat'}</option>
                ))}
              </select>
            )}
            <button type="button" onClick={handleNewChat} className="text-xs flex items-center gap-1 font-medium text-theme-text/60 hover:text-black hover:bg-gray-100 px-2 py-1 rounded transition-colors">
              <Plus className="w-3.5 h-3.5" />
              New Chat
            </button>
            <button type="button" onClick={onClose} className="p-2 text-theme-text/50 hover:bg-white hover:shadow rounded-none transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {isLoadingHistory ? (
            <div className="flex justify-center items-center h-full text-slate-400">
              <Loader className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-none px-4 py-3 text-sm ${
                    m.role === 'user' 
                      ? 'bg-black text-white rounded-br-sm shadow-md' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                  }`}>
                    {m.image && (
                      <div className="mb-2">
                        <img src={m.image} alt="Attachment" className="max-w-full rounded-sm object-contain" style={{ maxHeight: '150px' }} />
                      </div>
                    )}
                    {m.content && <div>{formatMessage(m.content)}</div>}
                  </div>
                </div>
              ))}
              {streamingMessage && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-white border border-slate-200 text-slate-800 rounded-none rounded-bl-sm px-4 py-3 text-sm shadow-sm">
                    {formatMessage(streamingMessage)}
                  </div>
                </div>
              )}
              {isProcessing && !streamingMessage && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 text-slate-500 rounded-none rounded-bl-sm px-4 py-3 text-sm shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-500 rounded-none animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-none animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-none animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {selectedImage && (
          <div className="px-4 py-3 bg-slate-50 border-t border-gray-200 flex shrink-0">
            <div className="relative inline-block">
              <img src={selectedImage} alt="Preview" className="h-16 w-auto rounded border border-slate-300 shadow-sm" />
              <button onClick={() => setSelectedImage(null)} type="button" className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 shadow hover:bg-rose-600 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2 shrink-0 items-center">
          <input 
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => setSelectedImage(reader.result);
                reader.readAsDataURL(file);
              }
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="p-2.5 text-slate-500 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
            title="Attach Poster/Flyer"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={selectedImage ? "Add a message (optional)..." : "Describe your event..."}
            disabled={isProcessing}
            className="flex-1 bg-slate-100 border border-slate-200 rounded-none px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isProcessing || (!input.trim() && !selectedImage)}
            className="px-4 py-2.5 bg-black hover:bg-gray-500 text-white rounded-none font-serif font-normal transition-all shadow-md disabled:opacity-50 flex items-center justify-center shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}


function generateAITemplate(mode, eventData, tierName = '') {
  const themeCategory = eventData.theme_category || 'Abstract';
  const themeColor = eventData.theme_color || '#6366f1';
  const tagline = eventData.tagline || 'Join us for an amazing event!';
  
  // Format the date nicely
  let dateStr = eventData.date;
  try {
    const d = new Date(eventData.date);
    if (!isNaN(d.getTime())) {
      dateStr = d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(/, (?=\d+:\d+)/, ' • ');
    }
  } catch(e) {}
  const defaultSubtitle = [dateStr, eventData.venue].filter(Boolean).join('  |  ') || 'Date & Time  |  Venue';

  const matchingImages = STOCK_IMAGES.filter(img => 
    img.category.toLowerCase().includes(themeCategory.toLowerCase()) ||
    themeCategory.toLowerCase().includes(img.category.toLowerCase())
  );
  
  let bgImage = '';
  if (matchingImages.length > 0) {
    bgImage = matchingImages[Math.floor(Math.random() * matchingImages.length)].url;
  } else {
    const abstractImages = STOCK_IMAGES.filter(img => img.category === 'Abstract');
    bgImage = abstractImages[Math.floor(Math.random() * abstractImages.length)]?.url || STOCK_IMAGES[0].url;
  }

  const baseTemplate = {
    canvasBg: '#0f172a',
    bgImage: bgImage,
    bgGradient: '',
    bgOverlayOpacity: 0.65,
    elements: []
  };

  if (mode === 'cover') {
    baseTemplate.elements.push(
      {
        id: 'title-1', type: 'text',
        x: 0, y: 110, width: 800, height: 100,
        content: eventData.title || 'Event Title',
        color: '#ffffff', fontSize: 72, fontWeight: '900',
        textAlign: 'center', bgColor: 'transparent',
        fontFamily: 'Outfit', rotation: 0
      },
      {
        id: 'divider-1', type: 'shape', shape: 'line',
        x: 350, y: 220, width: 100, height: 4,
        bgColor: themeColor, borderRadius: '0px', border: 'none', rotation: 0
      },
      {
        id: 'tagline-1', type: 'text',
        x: 0, y: 240, width: 800, height: 40,
        content: tagline.toUpperCase(),
        color: themeColor, fontSize: 20, fontWeight: '700',
        textAlign: 'center', bgColor: 'transparent',
        fontFamily: 'Inter', rotation: 0
      },
      {
        id: 'subtitle-1', type: 'text',
        x: 0, y: 310, width: 800, height: 40,
        content: defaultSubtitle,
        color: '#e2e8f0', fontSize: 18, fontWeight: '500',
        textAlign: 'center', bgColor: 'transparent',
        fontFamily: 'Inter', rotation: 0
      }
    );
  } else if (mode === 'ticket') {
    baseTemplate.elements.push(
      {
        id: 'bg-shape', type: 'shape', shape: 'rounded',
        x: 40, y: 40, width: 720, height: 320,
        bgColor: 'rgba(15, 23, 42, 0.75)', borderRadius: '24px', border: `2px solid ${themeColor}40`, rotation: 0
      },
      {
        id: 'accent-shape', type: 'shape', shape: 'rect',
        x: 40, y: 40, width: 20, height: 320,
        bgColor: themeColor, borderRadius: '24px 0 0 24px', border: 'none', rotation: 0
      },
      {
        id: 'tier-label', type: 'text',
        x: 90, y: 70, width: 450, height: 40,
        content: tierName.toUpperCase(),
        color: themeColor, fontSize: 22, fontWeight: '900',
        textAlign: 'left', bgColor: 'transparent',
        fontFamily: 'Outfit', rotation: 0
      },
      {
        id: 'title-1', type: 'text',
        x: 90, y: 110, width: 450, height: 80,
        content: eventData.title || 'Event Title',
        color: '#ffffff', fontSize: 40, fontWeight: '700',
        textAlign: 'left', bgColor: 'transparent',
        fontFamily: 'Outfit', rotation: 0
      },
      {
        id: 'subtitle-1', type: 'text',
        x: 90, y: 220, width: 480, height: 60,
        content: defaultSubtitle,
        color: '#cbd5e1', fontSize: 16, fontWeight: '500',
        textAlign: 'left', bgColor: 'transparent',
        fontFamily: 'Inter', rotation: 0
      },
      {
        id: 'qr-mandatory', type: 'qrcode', _locked: true,
        x: 580, y: 130, width: 140, height: 140,
        data: 'QR-CODE', bgColor: '#ffffff', rotation: 0
      }
    );
  }

  return JSON.stringify(baseTemplate);
}

function EventManager({ events, allAttendees = [], setAllAttendees, onAddEvent, onEditEvent, onDeleteEvent, viewingEventId, setViewingEventId, eventActiveTab }) {
  const [lightboxImage, setLightboxImage] = useState(null);
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentView = searchParams.get('view');
  const isCreating = currentView === 'create' || currentView === 'edit';
  const isAIChatOpen = currentView === 'ai-chat';
  const isMailModalOpen = currentView === 'mail';
  const isDeleteModalOpen = currentView === 'delete';

  const handleCloseView = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('view');
    setSearchParams(newParams);
    // Do NOT set viewingEventId to null here unless intended.
    // If they are just closing a modal, we shouldn't lose the event they are viewing!
  };

  const [editingEventId, setEditingEventId] = useState(null);
  
  // Routing for Designer
  const designerMode = searchParams.get('designer'); // 'cover' or 'ticket'
  const activeTierId = designerMode === 'ticket' ? searchParams.get('tierId') : null;
  const isDesigningCover = designerMode === 'cover';
  
  const openDesigner = (mode, tierId = null) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('designer', mode);
    if (tierId) newParams.set('tierId', tierId);
    setSearchParams(newParams);
  };
  
  const closeDesigner = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('designer');
    newParams.delete('tierId');
    setSearchParams(newParams);
  };
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [formData, setFormData] = useState({
    title: '', date: '', end_date: '', venue: '', image: '', currency: 'INR',
    tiers: [{ id: Date.now() + Math.random().toString(36).substr(2, 5), name: 'General Admission', price: '', capacity: '', template: null, _previewTicket: null }],
    customFormFields: []
  });
  
  const event = events?.find(e => e.id === viewingEventId);

  const extractColorsFromCover = () => {
    if (!event?.image) {
      toast('No cover image available to extract colors from.', 'error');
      return;
    }
    
    toast('Extracting colors from cover image...', 'info');
    
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let r = 0, g = 0, b = 0, count = 0;
        
        const step = Math.ceil(data.length / 4 / 1000) * 4; 
        
        for (let i = 0; i < data.length; i += step) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        
        const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        
        // Simple RGB to HSL
        let rNorm = r/255, gNorm = g/255, bNorm = b/255;
        let max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
        let h, s, l = (max + min) / 2;
        if(max === min){ h = s = 0; } else {
          let d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch(max) {
            case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
            case gNorm: h = (bNorm - rNorm) / d + 2; break;
            case bNorm: h = (rNorm - gNorm) / d + 4; break;
          }
          h /= 6;
        }
        
        // Enhance saturation for a better accent color
        s = Math.min(1, s + 0.3);
        l = Math.min(0.8, Math.max(0.4, l));
        
        // HSL to RGB
        let rOut, gOut, bOut;
        if(s === 0){ rOut = gOut = bOut = l; } else {
          const hue2rgb = (p, q, t) => {
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          };
          let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          let p = 2 * l - q;
          rOut = hue2rgb(p, q, h + 1/3);
          gOut = hue2rgb(p, q, h);
          bOut = hue2rgb(p, q, h - 1/3);
        }
        
        const accentHex = rgbToHex(Math.round(rOut*255), Math.round(gOut*255), Math.round(bOut*255));
        const isDark = l < 0.5;
        
        setPageConfig({
          ...pageConfig,
          primaryColor: accentHex,
          bgColor: isDark ? '#020617' : '#f8fafc',
          textColor: isDark ? '#ffffff' : '#0f172a',
          cardBgColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)',
        });
        
        toast('Color scheme extracted successfully!', 'success');
      } catch (err) {
        console.error(err);
        toast('Failed to extract colors. The image might have cross-origin restrictions.', 'error');
      }
    };
    
    img.onerror = () => {
      toast('Failed to load image for color extraction.', 'error');
    };
    
    if (event?.image) {
      // Append a cache-buster so the browser fetches fresh with CORS headers instead of using the tainted cache
      // Use 'cb' instead of 'cors' to avoid triggering S3's restricted REST API subresources
      const sep = event.image.includes('?') ? '&' : '?';
      img.src = event.image + sep + 'cb=' + Date.now();
    }
  };


  const handleAIEventReady = (eventData) => {
    const processedTiers = (eventData.tiers || [{ name: 'General Admission', price: 0, capacity: 100 }]).map(t => ({
      id: Date.now() + Math.random().toString(36).substr(2, 5),
      name: t.name || 'General Admission',
      price: t.price || 0,
      capacity: t.capacity || 100,
      template: generateAITemplate('ticket', eventData, t.name || 'General Admission'),
      _previewTicket: null
    }));

    const aiCoverTemplate = generateAITemplate('cover', eventData);

    // Get the bgImage from the generated template so we can show something in the list view immediately
    let coverImageUrl = '';
    try {
      coverImageUrl = JSON.parse(aiCoverTemplate).bgImage;
    } catch (e) {}

    setFormData({
      title: eventData.title || '',
      date: eventData.date || '',
      venue: eventData.venue || '',
      image: coverImageUrl,
      currency: eventData.currency || 'INR',
      tiers: processedTiers,
      capacity: eventData.capacity || 100,
      customFormFields: [],
      _aiCoverTemplate: aiCoverTemplate,
      ai_session_id: eventData.ai_session_id
    });
    setEditingEventId(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', 'create');
    setSearchParams(newParams);
  };

  const [smtpForm, setSmtpForm] = useState({ host: 'smtp.gmail.com', port: '587', user: '', pass: '', fromEmail: '' });
  const [smtpTestState, setSmtpTestState] = useState('idle'); // idle | loading | success | error
  const [smtpTestMessage, setSmtpTestMessage] = useState('');
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  // Broadcast email state
  const [broadcastState, setBroadcastState] = useState('idle'); // idle | loading | done
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastAttachments, setBroadcastAttachments] = useState([]);
  const [broadcastResult, setBroadcastResult] = useState(null); // { sent, failed, total, message }

  const [upiConfig, setUpiConfig] = useState({ upiId: '', upiName: '' });
  const [verifyState, setVerifyState] = useState({});
  const [declineState, setDeclineState] = useState({});
  const [deleteActionState, setDeleteActionState] = useState({});
  const [showBroadcastPreview, setShowBroadcastPreview] = useState(false);
  
  // Private custom email state
  const [customMailModal, setCustomMailModal] = useState({ attendee: null, subject: '', message: '', attachments: [], status: 'idle' });
  // Per-attendee resend state: { [passId]: 'idle' | 'loading' | 'done' | 'error' }
  const [resendStates, setResendStates] = useState({});
  const [pageConfig, setPageConfig] = useState({ primaryColor: '#10b981', bgColor: '#020617', bgImage: '', showSocials: true });
  const initializedEventId = useRef(null);

  useEffect(() => {
    if (viewingEventId) {
      const event = events.find(e => e.id === viewingEventId);
      if (event && initializedEventId.current !== viewingEventId) {
        setSmtpForm(event.smtp_config ? (typeof event.smtp_config === 'string' ? JSON.parse(event.smtp_config) : event.smtp_config) : { host: 'smtp.gmail.com', port: '587', user: '', pass: '', fromEmail: '' });
        setPageConfig(event.page_config ? (typeof event.page_config === 'string' ? JSON.parse(event.page_config) : event.page_config) : { primaryColor: '#10b981', bgColor: '#020617', bgImage: '', showSocials: true });
        setUpiConfig(event.upi_config ? (typeof event.upi_config === 'string' ? JSON.parse(event.upi_config) : event.upi_config) : { upiId: '', upiName: '' });
        initializedEventId.current = viewingEventId;
      }
    } else {
      initializedEventId.current = null;
    }
  }, [viewingEventId, events]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.venue || formData.tiers.length === 0) return;

    const processedTiers = formData.tiers.map(t => ({
      ...t,
      price: parseFloat(t.price) || 0,
      capacity: parseInt(t.capacity) || 100,
      available: parseInt(t.capacity) || 100
    }));

    const finalEventData = { ...formData, tiers: processedTiers };
    if (!editingEventId) {
       finalEventData.page_config = { currency: formData.currency || 'INR', primaryColor: '#10b981', bgColor: '#020617', bgImage: '', showSocials: true, upiId: '' };
    } else {
       finalEventData.page_config = { ...(finalEventData.page_config || {}), currency: formData.currency || 'INR' };
    }

    if (editingEventId) {
      onEditEvent(finalEventData);
    } else {
      onAddEvent(finalEventData);
    }

    handleCloseView();
    setEditingEventId(null);
    setFormData({ title: '', date: '', venue: '', image: '', currency: 'INR', tiers: [{ id: Date.now().toString(), name: 'General Admission', price: '', capacity: '', template: null, _previewTicket: null }], customFormFields: [] });
  };

  const addTier = () => setFormData(prev => ({ ...prev, tiers: [...prev.tiers, { id: Date.now().toString(), name: '', price: '', capacity: '', template: null, _previewTicket: null }] }));
  const updateTier = (id, key, value) => setFormData(prev => ({ ...prev, tiers: prev.tiers.map(t => t.id === id ? { ...t, [key]: value } : t) }));
  const removeTier = (id) => setFormData(prev => ({ ...prev, tiers: prev.tiers.filter(t => t.id !== id) }));

  const addFormField = () => setFormData(prev => ({
    ...prev,
    customFormFields: [...(prev.customFormFields || []), { id: Date.now().toString(), label: '', type: 'text', required: false }]
  }));
  const updateFormField = (id, key, value) => setFormData(prev => ({
    ...prev,
    customFormFields: (prev.customFormFields || []).map(f => f.id === id ? { ...f, [key]: value } : f)
  }));
  const removeFormField = (id) => setFormData(prev => ({
    ...prev,
    customFormFields: (prev.customFormFields || []).filter(f => f.id !== id)
  }));

  const handleEdit = (event) => {
    setFormData({ ...event, currency: event.page_config?.currency || 'INR' });
    setEditingEventId(event.id);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', 'edit');
    newParams.delete('event');
    newParams.delete('eventTab');
    setSearchParams(newParams);
  };


  if (viewingEventId) {
    const event = events.find(e => e.id === viewingEventId);
    if (!event) return null;
    const stats = getEventStats(event);
    const eventAttendees = (allAttendees || []).filter(a => a.eventId === event.id);

    const handleSmtpSave = async (e) => {
      e?.preventDefault?.();

      if (!smtpForm.host) return toast('Please enter SMTP Host.', 'error');
      if (!smtpForm.port) return toast('Please enter SMTP Port.', 'error');
      if (!smtpForm.user) return toast('Please enter SMTP Username.', 'error');
      if (!smtpForm.pass) return toast('Please enter SMTP Password / App Password.', 'error');

      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/events/${event.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('es_token')}`
          },
          body: JSON.stringify({ ...event, smtp_config: smtpForm, page_config: pageConfig, upi_config: upiConfig })
        });
        if (res.ok) {
          const updatedEvent = await res.json();
          onEditEvent(updatedEvent);
          toast('SMTP configuration saved successfully!', 'success');
        }
      } catch (err) {
        console.error('Failed to save config', err);
        toast('Failed to save configuration', 'error');
      }
    };

    const handleUpiSave = async (e) => {
      e?.preventDefault?.();
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/events/${event.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('es_token')}`
          },
          body: JSON.stringify({ ...event, smtp_config: smtpForm, page_config: pageConfig, upi_config: upiConfig })
        });
        if (res.ok) {
          const updatedEvent = await res.json();
          onEditEvent(updatedEvent);
          toast('UPI configuration saved successfully!', 'success');
        }
      } catch (err) {
        console.error('Failed to save config', err);
        toast('Failed to save configuration', 'error');
      }
    };

    const handleVerifyPayment = async (ticketId) => {
      setVerifyState(prev => ({ ...prev, [ticketId]: 'loading' }));
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/tickets/${ticketId}/verify-payment`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
        });
        if (res.ok) {
          toast('Payment verified and ticket confirmed!', 'success');
          setVerifyState(prev => ({ ...prev, [ticketId]: 'done' }));
          setAllAttendees(prev => prev.map(a => a.passId === ticketId ? { ...a, status: 'OUTSIDE' } : a));
        } else {
          toast('Failed to verify payment', 'error');
          setVerifyState(prev => ({ ...prev, [ticketId]: 'idle' }));
        }
      } catch (err) {
        toast('Error verifying payment', 'error');
        setVerifyState(prev => ({ ...prev, [ticketId]: 'idle' }));
      }
    };

    const handleDeclinePayment = async (ticketId) => {
      const yes = await confirm('Decline Payment', 'Are you sure you want to decline this payment? The ticket will be put on hold and the capacity will be freed.');
      if (!yes) return;
      setDeclineState(prev => ({ ...prev, [ticketId]: 'loading' }));
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/tickets/${ticketId}/decline-payment`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
        });
        if (res.ok) {
          toast('Payment declined and ticket put on hold.', 'success');
          setDeclineState(prev => ({ ...prev, [ticketId]: 'done' }));
          setAllAttendees(prev => prev.map(a => a.passId === ticketId ? { ...a, status: 'DECLINED' } : a));
        } else {
          toast('Failed to decline payment', 'error');
          setDeclineState(prev => ({ ...prev, [ticketId]: 'idle' }));
        }
      } catch (err) {
        toast('Error declining payment', 'error');
        setDeclineState(prev => ({ ...prev, [ticketId]: 'idle' }));
      }
    };

    const handleSmtpTest = async () => {
      if (!smtpForm.host || !smtpForm.user || !smtpForm.pass) {
        toast('Please fill in the SMTP Host, Username, and Password before testing.', 'warning');
        return;
      }
      if (!smtpTestEmail) {
        toast('Please enter a recipient email address in the "Send Test To" field.', 'warning');
        return;
      }
      setSmtpTestState('loading');
      setSmtpTestMessage('');
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/smtp/test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('es_token')}`
          },
          body: JSON.stringify({ ...smtpForm, toEmail: smtpTestEmail })
        });
        const data = await res.json();
        if (data.success) {
          setSmtpTestState('success');
          setSmtpTestMessage(`✅ Test email sent to ${smtpTestEmail}. Check your inbox!`);
          toast('Test email sent successfully! Check your inbox.', 'success');
        } else {
          setSmtpTestState('error');
          setSmtpTestMessage(`❌ ${data.message}`);
          toast(data.message, 'error');
        }
      } catch (err) {
        setSmtpTestState('error');
        setSmtpTestMessage('❌ Could not connect to the backend server.');
        toast('Could not connect to the server. Is the backend running?', 'error');
      }
    };

    // Broadcast email to ALL attendees of this event
    const handleBroadcast = async (e) => {
      e.preventDefault();
      if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
        toast('Subject and message body are required.', 'warning');
        return;
      }
      if (eventAttendees.length === 0) {
        toast('No attendees registered yet.', 'warning');
        return;
      }
      const yes = await confirm(
        'Send Broadcast Email',
        `This will send "${broadcastSubject}" to all ${eventAttendees.length} registered attendee(s) using the event's SMTP config. Continue?`,
        'Send to All', 'emerald'
      );
      if (!yes) return;
      setBroadcastState('loading');
      setBroadcastResult(null);
      try {
        const formData = new FormData();
        formData.append('subject', broadcastSubject);
        formData.append('message', broadcastMessage);
        broadcastAttachments.forEach(file => formData.append('attachments', file));
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/events/${event.id}/email-all`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('es_token')}`
          },
          body: formData
        });
        const data = await res.json();
        setBroadcastResult(data);
        if (data.success) {
          toast(`Broadcast sent! ${data.sent} delivered, ${data.failed} failed.`, data.failed > 0 ? 'warning' : 'success');
          setBroadcastSubject('');
          setBroadcastMessage('');
        } else {
          toast(data.message || 'Broadcast failed.', 'error');
        }
      } catch (err) {
        toast('Could not connect to the server.', 'error');
        setBroadcastResult({ success: false, message: 'Network error.' });
      } finally {
        setBroadcastState('idle');
      }
    };

    // Private Custom Email to one attendee
    const handleSendCustomMail = async (e) => {
      e.preventDefault();
      setCustomMailModal({...customMailModal, status: 'loading'});
      try {
        const formData = new FormData();
        formData.append('subject', customMailModal.subject);
        formData.append('message', customMailModal.message);
        customMailModal.attachments.forEach(file => formData.append('attachments', file));
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/tickets/${customMailModal.attendee.passId}/custom-email`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` },
          body: formData
        });
        if (res.ok) {
          toast('Private message sent successfully!', 'success');
          handleCloseView();
          setCustomMailModal({ attendee: null, subject: '', message: '', attachments: [], status: 'idle' });
        } else {
          toast('Failed to send message.', 'error');
          setCustomMailModal({...customMailModal, status: 'idle'});
        }
      } catch (err) {
        toast('Could not connect to server.', 'error');
        setCustomMailModal({...customMailModal, status: 'idle'});
      }
    };
    // Resend confirmation to a single attendee
    const handleResendEmail = async (passId) => {
      setResendStates(prev => ({ ...prev, [passId]: 'loading' }));
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/tickets/${passId}/resend-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('es_token')}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setResendStates(prev => ({ ...prev, [passId]: 'done' }));
          toast('Confirmation email resent successfully!', 'success');
          setTimeout(() => setResendStates(prev => ({ ...prev, [passId]: 'idle' })), 3000);
        } else {
          setResendStates(prev => ({ ...prev, [passId]: 'error' }));
          toast(data.message || 'Failed to resend email.', 'error');
          setTimeout(() => setResendStates(prev => ({ ...prev, [passId]: 'idle' })), 3000);
        }
      } catch (err) {
        setResendStates(prev => ({ ...prev, [passId]: 'error' }));
        toast('Could not connect to the server.', 'error');
        setTimeout(() => setResendStates(prev => ({ ...prev, [passId]: 'idle' })), 3000);
      }
    };
    const handlePageConfigSave = async (e) => {
      e.preventDefault();
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/events/${event.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('es_token')}`
          },
          body: JSON.stringify({ ...event, page_config: pageConfig, smtp_config: smtpForm })
        });
        if (res.ok) {
          const updatedEvent = await res.json();
          onEditEvent(updatedEvent);
          toast('Page Design saved successfully!', 'success');
        }
      } catch (err) {
        console.error('Failed to save config', err);
        toast('Failed to save page design', 'error');
      }
    };

    const handleExportCSV = (eventName, data) => {
      if (data.length === 0) return toast('No attendees to export yet. Registrations will appear here once people sign up.', 'warning');
      const customHeaders = data.reduce((acc, curr) => {
        Object.keys(curr).forEach(k => {
          if (!['passId', 'name', 'email', 'phone', 'tierName', 'timestamp', 'id', 'event_id', 'attendee_name', 'attendee_email', 'attendee_phone', 'tier_id', 'tier_name', 'status', 'created_at', 'custom_data', 'eventId', 'customData', 'event', 'attendance_logs'].includes(k)) {
            acc.add(k);
          }
        });
        return acc;
      }, new Set());
      const headers = ['passId', 'name', 'email', 'phone', 'tierName', 'timestamp', ...Array.from(customHeaders)];
      const csvRows = [headers.join(',')];
      data.forEach(row => {
        const values = headers.map(header => {
          const val = row[header] ? String(row[header]).replace(/"/g, '""') : '';
          return `"${val}"`;
        });
        csvRows.push(values.join(','));
      });
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${eventName.replace(/\s+/g, '_')}_Attendees.csv`;
      a.click();
    };

    const handleDeleteTicket = async (ticketId) => {
      const yes = await confirm('Delete Registration', 'Are you sure you want to delete this registration? This action cannot be undone.');
      if (!yes) return;
      
      setDeleteActionState(prev => ({ ...prev, [ticketId]: true }));
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/tickets/${ticketId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
        });
        if (res.ok) {
          if (setAllAttendees) setAllAttendees(prev => prev.filter(t => t.passId !== ticketId));
          window.dispatchEvent(new StorageEvent('storage', { key: 'eventos_attendees' }));
        } else {
          toast('Failed to delete ticket', 'error');
        }
      } catch (e) {
        console.error('Failed to delete ticket', e);
        toast('Error deleting ticket', 'error');
      } finally {
        setDeleteActionState(prev => ({ ...prev, [ticketId]: false }));
      }
    };

    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
        {isDeleteModalOpen && createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
            <div className="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" onClick={() => handleCloseView()} />
            <div className="relative bg-white border border-rose-500/20 rounded-xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3 text-rose-500">
                  <Shield className="w-6 h-6" />
                  <h3 className="text-xl font-bold">Delete Event</h3>
                </div>
                <button onClick={() => handleCloseView()} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-rose-500/10 text-rose-700 p-4 rounded-lg mb-6 text-sm font-medium">
                This action is irreversible. All registrations, tickets, and configurations for this event will be permanently destroyed.
              </div>
              <p className="text-sm text-theme-text mb-2">
                Please type <span className="font-bold select-all bg-gray-100 px-1 rounded">{event.title}</span> to confirm.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-white border border-rose-300 focus:border-rose-500 rounded-lg px-4 py-2.5 text-theme-text text-sm focus:outline-none mb-6 font-mono"
                placeholder={event.title}
              />
              <button
                disabled={deleteConfirmText !== event.title}
                onClick={() => {
                  onDeleteEvent(event.id);
                  setViewingEventId(null);
                  handleCloseView();
                }}
                className="w-full py-2.5 rounded-lg font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-500/20"
              >
                I understand the consequences, delete this event
              </button>
            </div>
          </div>,
          document.body
        )}

        <div className="glass-panel border border-gray-200 rounded-none p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <img src={event.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800'} alt="" className="w-full md:w-1/3 h-48 object-cover rounded-none border border-gray-200" />
            <div className="flex-1 space-y-4 relative">
              <div className="absolute top-0 right-0 flex space-x-2">
                <button onClick={() => handleEdit(event)} className="px-3 py-1 bg-black hover:bg-gray-800 rounded border border-black text-xs font-serif font-normal text-white shadow-lg transition-colors">Edit</button>
                <button onClick={() => {
                  if (!event.smtp_config) {
                    toast('Please setup the email configuration first before sharing the event link.', 'warning');
                    return;
                  }
                  if (!event.upi_config) {
                    toast('Please setup the payment / UPI configuration first before hosting the event.', 'warning');
                    return;
                  }
                  const link = `${window.location.origin}/event/${event.id}`;
                  navigator.clipboard.writeText(link).then(() => toast('Registration link copied to clipboard!', 'success')).catch(() => {
                    const textarea = document.createElement('textarea');
                    textarea.value = link;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    toast('Registration link copied to clipboard!', 'success');
                  });
                }} className="px-3 py-1 bg-black hover:bg-gray-800 rounded border border-black text-xs font-serif font-normal text-white shadow-lg transition-colors">Share Link</button>
                <button onClick={() => {
                  setDeleteConfirmText('');
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('view', 'delete');
                  setSearchParams(newParams);
                }} className="px-3 py-1 bg-rose-600/80 hover:bg-rose-500 rounded border border-rose-400 text-xs font-serif font-normal text-theme-text shadow-lg transition-colors">Delete</button>
              </div>
              <h2 className="text-3xl font-serif font-normal text-theme-text pr-48">{event.title}</h2>
              <div className="flex items-center text-theme-text/80 space-x-6">
                <div className="flex items-center space-x-2"><Calendar className="w-5 h-5 text-black" /> <span>{formatEventDate(event.date)}</span></div>
                <div className="flex items-center space-x-2"><MapPin className="w-5 h-5 text-black" /> <span>{event.venue}</span></div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div><div className="text-sm text-theme-text/60">Total Capacity</div><div className="text-xl font-serif font-normal text-theme-text">{stats.totalCap}</div></div>
                <div><div className="text-sm text-theme-text/60">Tickets Available</div><div className="text-xl font-serif font-normal text-theme-text">{stats.totalAvail}</div></div>
                <div><div className="text-sm text-theme-text/60">Registrations</div><div className="text-xl font-serif font-normal text-black">{eventAttendees.length}</div></div>
              </div>
            </div>
          </div>
        </div>

        {eventActiveTab === 'overview' && (
          <div className="glass-panel border border-gray-200 rounded-none p-8 space-y-6 shadow-2xl">
            <h3 className="text-xl font-serif font-normal text-theme-text mb-4">Event Overview</h3>
            
            <div className="bg-white/50 border border-gray-200 rounded-none p-6 shadow-inner">
              <h4 className="text-sm font-serif font-normal text-theme-text/70 uppercase tracking-widest mb-6">Registration Trend</h4>
              {eventAttendees.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={
                      Object.values(
                        eventAttendees.reduce((acc, t) => {
                          const date = t.timestamp || t.created_at || t.createdAt 
                            ? new Date(t.timestamp || t.created_at || t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
                            : 'Unknown';
                          if (!acc[date]) acc[date] = { name: date, registrations: 0 };
                          acc[date].registrations += 1;
                          return acc;
                        }, {})
                      )
                    }>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }} 
                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }} 
                      />
                      <Line type="monotone" dataKey="registrations" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#0f766e' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-theme-text/40 text-sm">
                  No registrations yet to show trend.
                </div>
              )}
            </div>
          </div>
        )}

        {eventActiveTab === 'smtp' && (
          <div className="space-y-8">
            <form onSubmit={handleSmtpSave} noValidate className="glass-panel border border-gray-200 rounded-none p-8 space-y-6 shadow-2xl">
              <div className="mb-6">
                <h3 className="text-xl font-serif font-normal text-theme-text mb-2">SMTP Configuration</h3>
                <p className="text-theme-text/60">Configure custom email settings to send tickets from your own domain instead of the default platform address.</p>
              </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-sm text-blue-900 rounded-r-md">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                How to set up Gmail SMTP
              </h4>
              <ol className="list-decimal list-inside space-y-1 ml-1">
                <li>Go to your Google Account Settings &gt; Security.</li>
                <li>Enable <strong>2-Step Verification</strong> if not already enabled.</li>
                <li>Search for "App passwords" in your Google Account settings (<a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline font-medium">direct link</a>).</li>
                <li>Create a new App Password and name it "EventSphere".</li>
                <li>Use <code className="bg-blue-100 px-1 py-0.5 rounded">smtp.gmail.com</code> for Host and <code className="bg-blue-100 px-1 py-0.5 rounded">587</code> for Port.</li>
                <li>Enter the generated 16-character App Password below.</li>
              </ol>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">SMTP Host</label>
                <select 
                  value={PREDEFINED_SMTP_PROVIDERS.find(p => p.host === smtpForm.host && p.id !== 'custom')?.id || 'custom'} 
                  onChange={(e) => {
                    const selected = PREDEFINED_SMTP_PROVIDERS.find(p => p.id === e.target.value);
                    if (selected && selected.id !== 'custom') {
                      setSmtpForm({ ...smtpForm, host: selected.host, port: selected.ports[0].toString() });
                    } else {
                      setSmtpForm({ ...smtpForm, host: '' });
                    }
                  }} 
                  className={`w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text ${!PREDEFINED_SMTP_PROVIDERS.find(p => p.host === smtpForm.host && p.id !== 'custom') ? 'mb-3' : ''}`}
                >
                  {PREDEFINED_SMTP_PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.id !== 'custom' ? `(${p.host})` : ''}</option>
                  ))}
                </select>
                
                {(!PREDEFINED_SMTP_PROVIDERS.find(p => p.host === smtpForm.host && p.id !== 'custom')) && (
                  <input type="text" required value={smtpForm.host} onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text animate-fade-in" placeholder="smtp.custom.com" />
                )}
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">SMTP Port</label>
                {PREDEFINED_SMTP_PROVIDERS.find(p => p.host === smtpForm.host && p.id !== 'custom') ? (
                  <select 
                    value={smtpForm.port} 
                    onChange={(e) => setSmtpForm({ ...smtpForm, port: e.target.value })} 
                    className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text animate-fade-in"
                  >
                    {PREDEFINED_SMTP_PROVIDERS.find(p => p.host === smtpForm.host && p.id !== 'custom').ports.map(port => (
                      <option key={port} value={port}>{port}</option>
                    ))}
                  </select>
                ) : (
                  <input type="number" required value={smtpForm.port} onChange={(e) => setSmtpForm({ ...smtpForm, port: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text animate-fade-in" placeholder="587" />
                )}
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">SMTP Username</label>
                <div className="relative group">
                  <input type="text" required value={smtpForm.user} onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text peer" placeholder="info@myevent.com" />
                  
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 shadow-xl rounded-md p-3 opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200">
                    <p className="text-xs text-theme-text/60 mb-2">Suggested username (your login email):</p>
                    <button
                      type="button"
                      onMouseDown={(e) => { 
                        e.preventDefault(); 
                        setSmtpForm({...smtpForm, user: user?.email || ''});
                      }}
                      className="w-full text-left p-2 bg-blue-50 hover:bg-blue-100 rounded text-sm text-blue-800 font-medium border border-blue-200 transition-colors"
                    >
                      {user?.email || 'email@example.com'}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">SMTP Password / App Password</label>
                <input type="password" required value={smtpForm.pass} onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text" placeholder="••••••••" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">From Address</label>
                <div className="relative group">
                  <input type="text" value={smtpForm.fromEmail} onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text peer" placeholder='"Tech Event 2026" <info@techevent.com>' />
                  
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 shadow-xl rounded-md p-3 opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200">
                    <p className="text-xs text-theme-text/60 mb-2">Suggested format based on event name and email:</p>
                    <button
                      type="button"
                      onMouseDown={(e) => { 
                        e.preventDefault(); 
                        setSmtpForm({...smtpForm, fromEmail: `"${event.title}" <${smtpForm.user || user?.email || ''}>`});
                      }}
                      className="w-full text-left p-2 bg-blue-50 hover:bg-blue-100 rounded text-sm text-blue-800 font-medium border border-blue-200 transition-colors"
                    >
                      "{event.title}" &lt;{smtpForm.user || user?.email || 'email@example.com'}&gt;
                    </button>
                  </div>
                </div>
                <p className="text-xs text-theme-text/50 mt-2">Optional: Define exactly how the sender name should appear in the recipient's inbox.</p>
              </div>
            </div>

            {/* SMTP Test Section */}
            <div className="mt-6 p-5 bg-white/60 border border-gray-200 rounded-none space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-none bg-amber-400 animate-pulse" />
                <h4 className="text-sm font-serif font-normal text-theme-text/80 uppercase tracking-wider">Test SMTP Connection</h4>
              </div>
              <p className="text-xs text-theme-text/50">Verify your credentials by sending a real test email before saving. This will use the credentials entered above.</p>
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="Send test email to..."
                  value={smtpTestEmail}
                  onChange={e => setSmtpTestEmail(e.target.value)}
                  className="flex-1 bg-theme-bg border border-gray-200 rounded-sm px-4 py-2 text-theme-text text-sm placeholder:text-slate-600 focus:outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={handleSmtpTest}
                  disabled={smtpTestState === 'loading'}
                  className="px-5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-sm text-sm font-serif font-normal transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {smtpTestState === 'loading' ? (
                    <><span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-none animate-spin inline-block" /> Sending...</>
                  ) : '✉ Send Test'}
                </button>
              </div>
              {smtpTestMessage && (
                <p className={`text-xs font-medium rounded-sm px-4 py-3 border ${smtpTestState === 'success'
                    ? 'bg-gray-100 text-black border-gray-200'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>{smtpTestMessage}</p>
              )}
            </div>
            <div className="pt-4 border-t border-gray-200">
              <button type="submit" className="px-6 py-2 bg-black hover:bg-gray-800 text-white rounded-sm font-serif font-normal transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">Save SMTP Config</button>
            </div>
            </form>
          </div>
        )}

        {eventActiveTab === 'payment' && (
          <div className="space-y-6">

            <div className="glass-panel border border-gray-200 rounded-none p-8 space-y-6 shadow-2xl animate-in fade-in">
              <div>
                <h3 className="text-xl font-serif font-normal text-theme-text mb-2">Payment / UPI Config</h3>
                <p className="text-theme-text/60">Configure UPI details to accept payments during registration. The QR code will be auto-generated for attendees.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">UPI ID</label>
                  <input type="text" value={upiConfig.upiId} onChange={(e) => setUpiConfig({ ...upiConfig, upiId: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text" placeholder="e.g. example@oksbi" />
                </div>
                <div>
                  <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">Payee Name</label>
                  <input type="text" value={upiConfig.upiName} onChange={(e) => setUpiConfig({ ...upiConfig, upiName: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text" placeholder="e.g. Example" />
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <label className="cursor-pointer px-4 py-2 bg-theme-secondary/10 text-theme-secondary hover:bg-theme-secondary/20 rounded-sm text-sm font-serif font-normal transition-all border border-theme-secondary/20 inline-flex items-center gap-2">
                  <ImageIcon size={16} /> Auto-fill from QR Code Image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width; canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const code = jsQR(imageData.data, imageData.width, imageData.height);
                        if (code) {
                          try {
                            const url = new URL(code.data);
                            if (url.protocol === 'upi:') {
                              setUpiConfig({ upiId: url.searchParams.get('pa') || '', upiName: url.searchParams.get('pn') || '' });
                              toast('UPI details extracted!', 'success');
                            } else toast('QR is not a UPI URL', 'warning');
                          } catch (e) { toast('Invalid QR content', 'error'); }
                        } else toast('Could not detect QR code', 'error');
                      };
                      img.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                  }} />
                </label>
                <p className="text-xs text-theme-text/50 mt-2">Upload your GPay/PhonePe QR code screenshot to automatically extract the details.</p>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <button type="button" onClick={handleUpiSave} className="px-6 py-2 bg-black hover:bg-gray-800 text-white rounded-sm font-serif font-normal transition-all shadow-lg">Save Configs</button>
              </div>
            </div>
          </div>
        )}

        {eventActiveTab === 'broadcast' && (
          <div className="space-y-6">
            {/* ── Broadcast Email Composer ── */}
            <div className="glass-panel border border-theme-secondary/20 rounded-none p-6 shadow-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-sm bg-theme-secondary/10 border border-theme-secondary/20 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-theme-secondary" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-normal text-theme-text">Email All Attendees</h3>
                  <p className="text-xs text-theme-text/50">Uses this event's SMTP config · personalised per attendee · {eventAttendees.length} recipient{eventAttendees.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <form onSubmit={handleBroadcast} className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Email subject..."
                    value={broadcastSubject}
                    onChange={e => {
                      setBroadcastSubject(e.target.value);
                      e.target.setCustomValidity('');
                    }}
                    onInvalid={e => e.target.setCustomValidity('Please provide a subject for the email.')}
                    required
                    className="w-full bg-white/60 border border-gray-200 rounded-sm px-4 py-2.5 text-theme-text text-sm placeholder:text-slate-600 focus:outline-none focus:border-theme-secondary transition-colors"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-sans font-medium text-theme-text/80">Message (HTML or Text)</label>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-theme-text/50">Attachments:</label>
                        <input 
                          type="file" 
                          multiple 
                          onChange={e => {
                            setBroadcastAttachments(prev => [...prev, ...Array.from(e.target.files)]);
                            e.target.value = '';
                          }} 
                          className="text-xs w-48 text-theme-text/80 file:mr-2 file:py-1 file:px-2 file:rounded-sm file:border-0 file:text-xs file:font-sans font-medium file:bg-gray-100 file:text-black hover:file:bg-black/20 transition-all cursor-pointer"
                        />
                      </div>
                      {broadcastAttachments.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-2 max-w-[300px]">
                          {broadcastAttachments.map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-black text-xs rounded-sm font-mono truncate max-w-[150px]">
                              <span className="truncate">{f.name}</span>
                              <button type="button" onClick={() => setBroadcastAttachments(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-rose-500 transition-colors shrink-0"><X size={12} /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <textarea
                    placeholder="Write your email here... Use {{name}} to insert the attendee's name automatically. You can use HTML tags for formatting."
                    value={broadcastMessage}
                    onChange={e => setBroadcastMessage(e.target.value)}
                    required
                    rows={8}
                    className="w-full bg-white/60 font-mono text-sm border border-gray-200 rounded-sm p-4 text-theme-text placeholder:text-slate-500 focus:outline-none focus:border-theme-secondary transition-colors resize-y"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-theme-text/50">
                    {!event.smtp_config
                      ? '⚠️ No SMTP configured for this event — will use global fallback'
                      : `✉ Will send from: ${event.smtp_config?.fromEmail || event.smtp_config?.user || 'configured sender'}`
                    }
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBroadcastPreview(!showBroadcastPreview)}
                      className="px-5 py-2 bg-gray-100 hover:bg-black/20 text-black rounded-sm text-sm font-serif font-normal transition-all flex items-center gap-2"
                    >
                      <Eye size={16} /> Preview
                    </button>
                    <button
                      type="submit"
                      disabled={broadcastState === 'loading' || eventAttendees.length === 0}
                      className="px-5 py-2 bg-black hover:bg-gray-800 text-white rounded-sm text-sm font-serif font-normal transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/5"
                    >
                      {broadcastState === 'loading' ? (
                        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Sending...</>
                      ) : (
                        <>📣 Send to All ({eventAttendees.length})</>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {showBroadcastPreview && (
                <div className="mt-4 p-4 border border-gray-200 rounded-none bg-slate-50 overflow-hidden shadow-inner">
                  <p className="text-xs font-serif font-normal text-theme-text/50 uppercase mb-3">Live Preview:</p>
                  <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm min-h-[150px]">
                    <div dangerouslySetInnerHTML={{ __html: (broadcastMessage || '<em>Your message will appear here...</em>').replace(/\{\{name\}\}/g, 'Attendee Name') }} />
                  </div>
                </div>
              )}

              {broadcastResult && (
                <div className={`flex items-start gap-3 rounded-none px-4 py-3 border text-sm ${broadcastResult.success
                    ? 'bg-gray-100 border-gray-200 text-black'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}>
                  <span>{broadcastResult.success ? '✅' : '❌'}</span>
                  <div>
                    <div className="font-sans font-medium">{broadcastResult.message}</div>
                    {broadcastResult.failed > 0 && broadcastResult.errors && (
                      <div className="mt-1 text-xs opacity-70">
                        Failed: {broadcastResult.errors.map(e => e.email).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {eventActiveTab === 'design' && (
          <form onSubmit={handlePageConfigSave} className="glass-panel border border-gray-200 rounded-none p-8 space-y-6 shadow-2xl animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-xl font-serif font-normal text-theme-text mb-2">Registration Page Design</h3>
                <p className="text-theme-text/60">Customize the look and feel of the public registration page for this event.</p>
              </div>
              <button 
                type="button" 
                onClick={extractColorsFromCover}
                className="px-4 py-2 bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border border-theme-primary/30"
              >
                <ImageIcon className="w-4 h-4" />
                Extract Colors from Cover Image
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">Primary Accent Color</label>
                <div className="flex items-center space-x-3">
                  <input type="color" value={pageConfig.primaryColor} onChange={(e) => setPageConfig({ ...pageConfig, primaryColor: e.target.value })} className="h-10 w-10 rounded border border-gray-200 bg-white cursor-pointer" />
                  <input type="text" value={pageConfig.primaryColor} onChange={(e) => setPageConfig({ ...pageConfig, primaryColor: e.target.value })} className="flex-1 bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text font-mono uppercase" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">Background Color</label>
                <div className="flex items-center space-x-3">
                  <input type="color" value={pageConfig.bgColor} onChange={(e) => setPageConfig({ ...pageConfig, bgColor: e.target.value })} className="h-10 w-10 rounded border border-gray-200 bg-white cursor-pointer" />
                  <input type="text" value={pageConfig.bgColor} onChange={(e) => setPageConfig({ ...pageConfig, bgColor: e.target.value })} className="flex-1 bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text font-mono uppercase" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">Text Color</label>
                <div className="flex items-center space-x-3">
                  <input type="color" value={pageConfig.textColor || '#ffffff'} onChange={(e) => setPageConfig({ ...pageConfig, textColor: e.target.value })} className="h-10 w-10 rounded border border-gray-200 bg-white cursor-pointer" />
                  <input type="text" value={pageConfig.textColor || '#ffffff'} onChange={(e) => setPageConfig({ ...pageConfig, textColor: e.target.value })} className="flex-1 bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text font-mono uppercase" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">Card Background</label>
                <div className="flex items-center space-x-3">
                  <input type="text" value={pageConfig.cardBgColor || 'rgba(15, 23, 42, 0.5)'} onChange={(e) => setPageConfig({ ...pageConfig, cardBgColor: e.target.value })} className="flex-1 bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text font-mono" placeholder="e.g. rgba(15, 23, 42, 0.5)" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">Button Radius</label>
                <select value={pageConfig.buttonRadius || '0.75rem'} onChange={(e) => setPageConfig({ ...pageConfig, buttonRadius: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text focus:outline-none focus:border-black">
                  <option value="0px">Square (0px)</option>
                  <option value="0.375rem">Slight (6px)</option>
                  <option value="0.75rem">Rounded (12px)</option>
                  <option value="9999px">Pill</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">Font Family</label>
                <select value={pageConfig.fontFamily || 'Inter, sans-serif'} onChange={(e) => setPageConfig({ ...pageConfig, fontFamily: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text focus:outline-none focus:border-black">
                  <option value="Inter, sans-serif">Inter (Sans-serif)</option>
                  <option value="Outfit, sans-serif">Outfit (Modern)</option>
                  <option value="'Playfair Display', serif">Playfair Display (Serif)</option>
                  <option value="'JetBrains Mono', monospace">JetBrains Mono (Mono)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">Custom Background Image URL (Optional)</label>
                <input type="text" value={pageConfig.bgImage || ''} onChange={(e) => setPageConfig({ ...pageConfig, bgImage: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text" placeholder="https://..." />
                <p className="text-xs text-theme-text/50 mt-2">If provided, this image will be used as a blurred backdrop for the entire registration page.</p>
              </div>

              <div className="md:col-span-2 pt-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={pageConfig.showSocials} onChange={(e) => setPageConfig({ ...pageConfig, showSocials: e.target.checked })} className="rounded text-black focus:ring-theme-primary bg-white border-slate-600 w-5 h-5" />
                  <span className="text-sm font-sans font-medium text-theme-text/80">Show Social Sharing Buttons on Checkout</span>
                </label>
              </div>
            </div>

            <div className="mt-8 p-4 bg-white rounded-none border border-gray-200 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: pageConfig.bgImage ? `url("${pageConfig.bgImage}")` : 'none', backgroundColor: pageConfig.bgColor }} />
              <div className="relative z-10 p-6 flex flex-col items-center justify-center space-y-4">
                <h4 className="font-serif font-normal" style={{ color: pageConfig.textColor || '#000000', fontFamily: pageConfig.fontFamily || 'Inter, sans-serif' }}>Live Preview</h4>
                <button type="button" style={{ backgroundColor: pageConfig.primaryColor, color: pageConfig.textColor || '#ffffff', borderRadius: pageConfig.buttonRadius || '0.75rem', fontFamily: pageConfig.fontFamily || 'Inter, sans-serif' }} className="px-6 py-2 shadow-lg">Checkout Button</button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button type="submit" className="px-6 py-2 bg-black hover:bg-gray-800 text-white rounded-sm font-serif font-normal transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">Save Page Design</button>
            </div>
          </form>
        )}

        {eventActiveTab === 'participants' && (
          <div className="space-y-6">

            {/* ── Participant Table ── */}
            <div className="glass-panel border border-gray-200 rounded-none overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-serif font-normal text-theme-text">Participant List</h3>
                <button
                  onClick={() => handleExportCSV(event.title, eventAttendees)}
                  className="px-4 py-2 bg-black/20 hover:bg-black/40 text-black rounded-sm text-sm font-sans font-medium flex items-center space-x-2 border border-black/30 transition-colors"
                >
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                {eventAttendees.length === 0 ? (
                  <div className="p-12 text-center text-theme-text/60">No attendees have registered for this event yet.</div>
                ) : (
                  <table className="w-full text-left text-sm text-theme-text/80">
                    <thead className="text-xs text-theme-text/60 uppercase bg-theme-bg/50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 font-sans font-medium">Pass ID</th>
                        <th className="px-6 py-4 font-sans font-medium">Name</th>
                        <th className="px-6 py-4 font-sans font-medium">Email</th>
                        <th className="px-6 py-4 font-sans font-medium">Tier</th>
                        {(event.customFormFields || []).map(f => (
                          <th key={f.id} className="px-6 py-4 font-sans font-medium">{f.label}</th>
                        ))}
                        <th className="px-6 py-4 font-sans font-medium">Status</th>
                        <th className="px-6 py-4 font-sans font-medium text-right">Timestamp</th>
                        <th className="px-6 py-4 font-sans font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventAttendees.map((a, i) => {
                        const rState = resendStates[a.passId] || 'idle';
                        return (
                          <tr key={i} className="border-b border-gray-200 hover:bg-theme-bg/20 transition-colors">
                            <td className="px-6 py-4 font-mono text-black text-xs whitespace-nowrap">{a.passId}</td>
                            <td className="px-6 py-4 font-serif font-normal text-theme-text whitespace-nowrap">{a.name}</td>
                            <td className="px-6 py-4 text-theme-text/60 whitespace-nowrap">{a.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 bg-slate-700 rounded text-xs font-medium text-white">{a.tierName}</span></td>
                            {(event.customFormFields || []).map(f => (
                              <td key={f.id} className="px-6 py-4 whitespace-nowrap">{a[f.id] || '-'}</td>
                            ))}
                            <td className="px-6 py-4">
                              {a.status === 'PENDING' ? (
                                <span className="px-2 py-1 bg-amber-500/20 text-amber-500 rounded text-xs font-serif font-normal flex items-center w-max gap-1">
                                  <AlertTriangle size={12} /> PENDING
                                </span>
                              ) : a.status === 'DECLINED' ? (
                                <span className="px-2 py-1 bg-rose-500/20 text-rose-500 rounded text-xs font-serif font-normal flex items-center w-max gap-1">
                                  <XCircle size={12} /> DECLINED
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-gray-500/20 text-gray-500 rounded text-xs font-serif font-normal">
                                  VALID
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-theme-text/50">{a.timestamp ? new Date(a.timestamp).toLocaleString() : '-'}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Payment Verification */}
                                <div className="flex gap-1 mr-2">
                                  {a.payment_screenshot && (
                                    <button onClick={() => setLightboxImage(a.payment_screenshot)} className="p-2 text-theme-secondary hover:bg-theme-secondary/10 rounded-sm text-xs font-serif font-normal transition-colors flex items-center gap-1" title="View Screenshot">
                                      <ImageIcon size={16} />
                                    </button>
                                  )}
                                  {(a.status === 'PENDING' || a.status === 'DECLINED') && (
                                    <>
                                      {a.status === 'PENDING' && (
                                        <button onClick={() => handleDeclinePayment(a.passId)} disabled={declineState[a.passId] === 'loading'} className="px-3 py-1 bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 rounded-sm text-xs font-serif font-normal transition-colors flex items-center gap-1">
                                          {declineState[a.passId] === 'loading' ? '...' : 'Decline'}
                                        </button>
                                      )}
                                      <button onClick={() => handleVerifyPayment(a.passId)} disabled={verifyState[a.passId] === 'loading'} className="px-3 py-1 bg-black text-white rounded-sm text-xs font-serif font-normal hover:bg-black/90 transition-colors flex items-center gap-1">
                                        {verifyState[a.passId] === 'loading' ? '...' : 'Verify'}
                                      </button>
                                    </>
                                  )}
                                </div>
                                {/* Resend Email */}
                                <button
                                  onClick={() => handleResendEmail(a.passId)}
                                  disabled={rState === 'loading'}
                                  title="Resend confirmation email"
                                  className={`p-2 rounded-sm transition-colors text-xs font-sans font-medium flex items-center gap-1 ${rState === 'done' ? 'text-black bg-gray-100'
                                      : rState === 'error' ? 'text-rose-400 bg-rose-500/10'
                                        : 'text-theme-secondary hover:text-theme-secondary hover:bg-theme-secondary/10'
                                    } disabled:opacity-50`}
                                >
                                  {rState === 'loading' ? (
                                    <span className="w-3.5 h-3.5 border-2 border-theme-secondary border-t-transparent rounded-none animate-spin inline-block" />
                                  ) : rState === 'done' ? '✓' : rState === 'error' ? '✗' : '✉'}
                                </button>
                                {/* Message */}
                                <button
                                  onClick={() => {
                                    const newParams = new URLSearchParams(searchParams);
                                    newParams.set('view', 'mail');
                                    setSearchParams(newParams);
                                    setCustomMailModal({ attendee: a, subject: '', message: '', attachments: [], status: 'idle' });
                                  }}
                                  className="p-2 text-theme-text/50 hover:text-black hover:bg-gray-100 rounded-sm transition-colors"
                                  title="Send Private Message"
                                >
                                  <MessageSquare size={16} />
                                </button>
                                {/* Delete */}
                                <button
                                  onClick={() => handleDeleteTicket(a.passId)}
                                  disabled={deleteActionState[a.passId]}
                                  className="p-2 text-theme-text/50 hover:text-red-400 hover:bg-red-400/10 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete Ticket"
                                >
                                  {deleteActionState[a.passId] ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                                  ) : (
                                    <Trash2 size={16} />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {eventActiveTab === 'access_logs' && (
          <div className="space-y-6">
            <div className="glass-panel border border-gray-200 rounded-none overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-serif font-normal text-theme-text">Attendee Access Logs</h3>
                  <p className="text-sm text-theme-text/60 mt-1">Detailed timestamps for check-in, temporary exits, re-entries, and permanent checkouts.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                {eventAttendees.length === 0 ? (
                  <div className="p-12 text-center text-theme-text/60">No attendees have registered for this event yet.</div>
                ) : (
                  <table className="w-full text-left text-sm text-theme-text/80">
                    <thead className="text-xs text-theme-text/60 uppercase bg-theme-bg/50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 font-sans font-medium">Pass ID</th>
                        <th className="px-6 py-4 font-sans font-medium">Name</th>
                        <th className="px-6 py-4 font-sans font-medium">Status</th>
                        <th className="px-6 py-4 font-sans font-medium">In Time</th>
                        <th className="px-6 py-4 font-sans font-medium">Temp Out</th>
                        <th className="px-6 py-4 font-sans font-medium">Temp In</th>
                        <th className="px-6 py-4 font-sans font-medium text-right">Out Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventAttendees.map((a, i) => (
                        <tr key={i} className="border-b border-gray-200 hover:bg-theme-bg/20 transition-colors">
                          <td className="px-6 py-4 font-mono text-black text-xs whitespace-nowrap">{a.passId}</td>
                          <td className="px-6 py-4 font-serif font-normal text-theme-text whitespace-nowrap">{a.name}</td>
                          <td className="px-6 py-4 text-xs font-medium whitespace-nowrap">{a.status}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-theme-text/70">{a.in_time ? new Date(a.in_time).toLocaleString() : '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-theme-text/70">{a.temp_out_time ? new Date(a.temp_out_time).toLocaleString() : '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-theme-text/70">{a.temp_in_time ? new Date(a.temp_in_time).toLocaleString() : '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-theme-text/70">{a.out_time ? new Date(a.out_time).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Custom Mail Modal */}
        {isMailModalOpen && customMailModal.attendee && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" onClick={() => handleCloseView()} />
            <div className="relative bg-white/95 rounded-none w-full max-w-3xl shadow-2xl overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
              <form onSubmit={handleSendCustomMail}>
                <div className="px-6 py-4 border-b border-gray-100 bg-theme-bg/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-serif font-normal text-theme-text flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-black" />
                      Message {customMailModal.attendee?.name}
                    </h3>
                    <p className="text-xs text-theme-text/60 mt-1">{customMailModal.attendee?.email}</p>
                  </div>
                  <button type="button" onClick={() => handleCloseView()} className="p-2 text-theme-text/50 hover:bg-white hover:shadow rounded-none transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className="block text-sm font-sans font-medium text-theme-text/80 mb-1">Subject</label>
                    <input 
                      type="text" required
                      value={customMailModal.subject}
                      onChange={e => setCustomMailModal({...customMailModal, subject: e.target.value})}
                      className="w-full bg-theme-bg/30 border border-gray-200 rounded-sm px-4 py-2 text-theme-text"
                      placeholder="e.g., Question about your ticket"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-sm font-sans font-medium text-theme-text/80">Message (HTML or Text)</label>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-theme-text/50">Attachments:</label>
                          <input 
                            type="file" 
                            multiple 
                            onChange={e => {
                              setCustomMailModal({...customMailModal, attachments: [...(customMailModal.attachments || []), ...Array.from(e.target.files)]});
                              e.target.value = '';
                            }} 
                            className="text-xs w-48 text-theme-text/80 file:mr-2 file:py-1 file:px-2 file:rounded-sm file:border-0 file:text-xs file:font-sans font-medium file:bg-gray-100 file:text-black hover:file:bg-black/20 transition-all cursor-pointer"
                          />
                        </div>
                        {(customMailModal.attachments || []).length > 0 && (
                          <div className="flex flex-wrap justify-end gap-2 max-w-[300px]">
                            {(customMailModal.attachments || []).map((f, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-black text-xs rounded-sm font-mono truncate max-w-[150px]">
                                <span className="truncate">{f.name}</span>
                                <button type="button" onClick={() => setCustomMailModal({...customMailModal, attachments: customMailModal.attachments.filter((_, idx) => idx !== i)})} className="hover:text-rose-500 transition-colors shrink-0"><X size={12} /></button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <textarea
                      placeholder="Write your email here... Use {{name}} to insert the attendee's name automatically. You can use HTML tags for formatting."
                      value={customMailModal.message}
                      onChange={e => setCustomMailModal({...customMailModal, message: e.target.value})}
                      required
                      rows={6}
                      className="w-full bg-white/60 font-mono text-sm border border-gray-200 rounded-sm p-4 text-theme-text placeholder:text-slate-500 focus:outline-none focus:border-theme-secondary transition-colors resize-y"
                    />
                  </div>
                  <div className="pt-2">
                    <p className="text-xs font-serif font-normal text-theme-text/50 uppercase mb-3">Live Preview:</p>
                    <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-sm min-h-[100px]">
                      <div dangerouslySetInnerHTML={{ __html: (customMailModal.message || '<em>Your message will appear here...</em>').replace(/\{\{name\}\}/g, customMailModal.attendee?.name || 'Attendee Name') }} />
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-theme-bg/30 border-t border-gray-100 flex justify-end gap-3">
                  <button type="button" onClick={() => handleCloseView()} className="px-5 py-2 text-theme-text/60 hover:text-theme-text font-sans font-medium transition-colors">Cancel</button>
                  <button type="submit" disabled={customMailModal.status === 'loading'} className="px-6 py-2 bg-black text-white rounded-none font-serif font-normal hover:bg-black/90 transition-all flex items-center gap-2 shadow-lg shadow-black/5 disabled:opacity-50">
                    {customMailModal.status === 'loading' ? (
                      <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-none animate-spin inline-block" /> Sending...</>
                    ) : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lightbox Modal */}
        {lightboxImage && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-300">
              <button 
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-none transition-colors backdrop-blur-sm shadow-xl border border-white/10"
                onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
              >
                <X size={24} />
              </button>
              <img 
                src={lightboxImage} 
                alt="Payment Screenshot" 
                className="max-w-full max-h-full object-contain rounded-none shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10"
                onClick={(e) => e.stopPropagation()} // Prevent click inside image from closing modal
              />
            </div>
          </div>
        )}

      </div>
    );
  }

  if (isCreating) {
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-serif font-normal text-theme-text">{editingEventId ? 'Edit Event' : 'Create New Event'}</h2>
          <button onClick={() => { handleCloseView(); setEditingEventId(null); }} className="text-theme-text/60 hover:text-theme-text transition-colors">Cancel</button>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel border border-gray-200 rounded-none p-8 space-y-6 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="text-sm font-sans font-medium text-theme-text/80">Event Title</label>
              <input
                type="text" required
                value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Global AI Conference 2026"
                className="w-full bg-white/50 border border-gray-200 rounded-none px-4 py-3 text-theme-text placeholder:text-slate-600 focus:outline-none focus:border-black focus:ring-1 focus:ring-gray-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-sans font-medium text-theme-text/80">Start Date & Time</label>
                <input
                  type="datetime-local" required
                  value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-white/50 border border-gray-200 rounded-none px-4 py-3 text-theme-text focus:outline-none focus:border-black focus:ring-1 focus:ring-gray-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-sans font-medium text-theme-text/80">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full bg-white/50 border border-gray-200 rounded-none px-4 py-3 text-theme-text focus:outline-none focus:border-black focus:ring-1 focus:ring-gray-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-sans font-medium text-theme-text/80">Venue / Location</label>
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-theme-text/50" />
                <input
                  type="text" required
                  value={formData.venue} onChange={e => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g., Grand Hyatt, NYC"
                  className="w-full bg-white/50 border border-gray-200 rounded-none pl-12 pr-4 py-3 text-theme-text placeholder:text-slate-600 focus:outline-none focus:border-black focus:ring-1 focus:ring-gray-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-sans font-medium text-theme-text/80">Event Currency</label>
              <select
                value={formData.currency || 'INR'}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-white/50 border border-gray-200 rounded-none px-4 py-3 text-theme-text focus:outline-none focus:border-black focus:ring-1 focus:ring-gray-500 transition-all"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="text-sm font-sans font-medium text-theme-text/80">Event Cover</label>
              <div className="flex items-center space-x-4">
                {formData.image && (
                  <img src={formData.image} alt="Event Cover Preview" className="w-32 h-20 object-cover rounded-none border border-gray-200 shadow-md" />
                )}
                <button
                  type="button"
                  onClick={() => openDesigner('cover')}
                  className="px-5 py-3 bg-theme-bg hover:bg-slate-700 text-theme-text rounded-none text-sm font-sans font-medium transition-all flex items-center space-x-2 border border-gray-200"
                >
                  <ImageIcon className="w-5 h-5 text-black" />
                  <span>{formData.image ? 'Edit Cover Design' : 'Design Event Cover'}</span>
                </button>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-stone-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-serif font-normal text-theme-text">Custom Registration Form</h3>
                  <p className="text-xs text-theme-text/60">Add extra fields like 'Registration No.' or 'Branch' to ask during checkout.</p>
                </div>
                <button type="button" onClick={addFormField} className="px-4 py-2 bg-black/20 text-black hover:bg-black/30 rounded-sm text-sm font-sans font-medium flex items-center space-x-2 transition-all">
                  <Plus className="w-4 h-4" /> <span>Add Field</span>
                </button>
              </div>

              <div className="space-y-3">
                {(formData.customFormFields || []).map((field, index) => (
                  <div key={field.id} className="flex flex-col md:flex-row items-center gap-4 p-3 bg-theme-bg/40 border border-gray-200 rounded-none relative">
                    <div className="flex-1 w-full">
                      <input type="text" required value={field.label} onChange={e => updateFormField(field.id, 'label', e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm px-3 py-2 text-sm text-theme-text" placeholder="Field Label (e.g., Roll No.)" />
                    </div>
                    <div className="w-full md:w-48">
                      <select value={field.type} onChange={e => updateFormField(field.id, 'type', e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm px-3 py-2 text-sm text-theme-text">
                        <option value="text">Short Text</option>
                        <option value="email">Email</option>
                        <option value="number">Number</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-theme-text/80 flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={field.required} onChange={e => updateFormField(field.id, 'required', e.target.checked)} className="rounded text-black focus:ring-theme-primary bg-white border-slate-600" />
                        <span>Required</span>
                      </label>
                      <button type="button" onClick={() => removeFormField(field.id)} className="p-2 text-theme-text/50 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!formData.customFormFields || formData.customFormFields.length === 0) && (
                  <div className="text-sm text-theme-text/50 italic p-4 border border-dashed border-gray-200 rounded-none text-center">
                    No custom fields added. Attendees will only be asked for Name and Email.
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-stone-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-serif font-normal text-theme-text">Ticket Tiers</h3>
                  <p className="text-xs text-theme-text/60">Create multiple ticket types (GA, VIP) and design a unique pass for each.</p>
                </div>
                <button type="button" onClick={addTier} className="px-4 py-2 bg-black/20 text-black hover:bg-black/30 rounded-sm text-sm font-sans font-medium flex items-center space-x-2 transition-all">
                  <Plus className="w-4 h-4" /> <span>Add Tier</span>
                </button>
              </div>

              <div className="space-y-4">
                {formData.tiers.map((tier, index) => (
                  <div key={tier.id} className="p-4 bg-theme-bg/40 border border-gray-200 rounded-none relative">
                    {formData.tiers.length > 1 && (
                      <button type="button" onClick={() => removeTier(tier.id)} className="absolute top-2 right-2 text-theme-text/50 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pr-6">
                      <div className="space-y-1">
                        <label className="text-xs font-sans font-medium text-theme-text/60">Tier Name</label>
                        <input type="text" required value={tier.name} onChange={e => updateTier(tier.id, 'name', e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm px-3 py-2 text-sm text-theme-text" placeholder="VIP Pass" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-sans font-medium text-theme-text/60">Price ({formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : formData.currency === 'GBP' ? '£' : '₹'})</label>
                        <input type="number" min="0" step="0.01" required value={tier.price} onChange={e => updateTier(tier.id, 'price', e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm px-3 py-2 text-sm text-theme-text" placeholder="150" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-sans font-medium text-theme-text/60">Capacity</label>
                        <input type="number" min="1" required value={tier.capacity} onChange={e => updateTier(tier.id, 'capacity', e.target.value)} className="w-full bg-white border border-gray-200 rounded-sm px-3 py-2 text-sm text-theme-text" placeholder="50" />
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {tier._previewTicket && <img src={tier._previewTicket} alt="Preview" className="w-16 h-10 object-cover rounded border border-slate-600" />}
                      <button
                        type="button"
                        onClick={() => openDesigner('ticket', tier.id)}
                        className="px-4 py-2 bg-gray-100 hover:bg-black/20 text-black border border-gray-200 rounded-sm text-sm font-serif font-normal transition-all flex items-center space-x-2"
                      >
                        <Ticket className="w-4 h-4" />
                        <span>{tier.template ? 'Edit Pass Design' : 'Design Custom Pass'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 flex justify-end space-x-4">
            <button type="button" onClick={() => { handleCloseView(); setEditingEventId(null); }} className="px-6 py-3 rounded-none font-medium text-theme-text/80 hover:bg-theme-bg transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-8 py-3 rounded-none font-serif font-normal bg-black hover:bg-gray-800 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all">
              {editingEventId ? 'Save Changes' : 'Launch Event'}
            </button>
          </div>
        </form>

        {activeTierId && createPortal(
          <TemplateDesigner
            mode="ticket"
            defaultTitle={formData.title}
            defaultDate={formData.date}
            defaultVenue={formData.venue}
            initialTemplate={formData.tiers.find(t => t.id === activeTierId)?.template}
            onSave={({ dataUrl, templateData }) => {
              setFormData(prev => ({
                ...prev,
                tiers: prev.tiers.map(t => t.id === activeTierId ? { ...t, template: templateData, _previewTicket: dataUrl } : t)
              }));
              closeDesigner();
            }}
            onCancel={closeDesigner}
          />,
          document.body
        )}

        {isDesigningCover && createPortal(
          <TemplateDesigner
            mode="cover"
            defaultTitle={formData.title + ' Cover'}
            defaultDate={formData.date}
            defaultVenue={formData.venue}
            initialTemplate={formData._aiCoverTemplate}
            onSave={({ dataUrl, templateData }) => {
              setFormData({ ...formData, image: dataUrl, _aiCoverTemplate: templateData });
              closeDesigner();
            }}
            onCancel={closeDesigner}
          />,
          document.body
        )}

        <AIChatModal isOpen={isAIChatOpen} onClose={() => handleCloseView()} onEventReady={handleAIEventReady} />
      </div>
    );
  }

  function getEventStats(event) {
    const totalCap = event.tiers.reduce((sum, t) => sum + parseInt(t.capacity || 0), 0);
    const totalAvail = event.tiers.reduce((sum, t) => sum + parseInt(t.available || 0), 0);
    const minPrice = Math.min(...event.tiers.map(t => parseFloat(t.price || 0)));
    return { totalCap, totalAvail, minPrice };
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-normal text-theme-text tracking-tight">Events Management</h2>
          <p className="text-theme-text/60 text-sm mt-1">Manage your active events and launch new ones.</p>
        </div>
        {['ORG_ADMIN', 'SYSTEM_ADMIN'].includes(user?.role) && (
          <div className="flex flex-row w-full md:w-auto gap-3">
            <button
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.set('view', 'ai-chat');
                setSearchParams(newParams);
              }}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-3 sm:px-5 py-2.5 bg-black hover:bg-gray-500 text-white rounded-none text-xs sm:text-sm font-sans font-medium transition-all shadow-lg shadow-gray-500/20 border border-gray-500"
            >
              <MessageSquare className="w-4 sm:w-5 h-4 sm:h-5 shrink-0" />
              <span className="whitespace-nowrap">Ask AI</span>
            </button>
            <button
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.set('view', 'create');
                setSearchParams(newParams);
              }}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-3 sm:px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-none text-xs sm:text-sm font-sans font-medium transition-all shadow-lg shadow-gray-500/20"
            >
              <Plus className="w-4 sm:w-5 h-4 sm:h-5 shrink-0" />
              <span className="whitespace-nowrap">Create Event</span>
            </button>
          </div>
        )}
      </div>

      {(() => {
        const now = new Date();
        const ongoing = events.filter(e => {
          const start = new Date(e.date);
          const end = e.end_date ? new Date(e.end_date) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
          return start <= now && now <= end;
        });
        const upcoming = events.filter(e => new Date(e.date) > now);
        const ended = events.filter(e => {
          const start = new Date(e.date);
          const end = e.end_date ? new Date(e.end_date) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
          return now > end;
        });

        const renderEventCard = (event) => {
          const stats = getEventStats(event);
          const pageConfig = event.page_config ? (typeof event.page_config === 'string' ? JSON.parse(event.page_config) : event.page_config) : {};
          const currencySymbol = pageConfig.currency === 'USD' ? '$' : pageConfig.currency === 'EUR' ? '€' : pageConfig.currency === 'GBP' ? '£' : '₹';
          return (
            <div key={event.id} onClick={(e) => { if (e.target.tagName !== 'BUTTON') setViewingEventId(event.id); }} className="glass-panel rounded-none border border-gray-200 overflow-hidden flex flex-col relative group cursor-pointer hover:border-black/50 transition-colors">
              <div className="h-32 bg-white relative">
                <img src={event.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800'} alt="" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                <div className="absolute top-3 right-3 px-2 py-1 bg-white/80 backdrop-blur rounded border border-gray-200 text-xs font-sans font-medium text-theme-text/80">
                  ID: {event.id.toString().padStart(4, '0')}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-serif font-normal text-theme-text mb-2 line-clamp-1">{event.title}</h3>
                <div className="space-y-1 mb-4 text-sm text-theme-text/60">
                  <div className="flex items-center space-x-2"><Calendar className="w-3.5 h-3.5" /> <span>{formatEventDate(event.date)}</span></div>
                  <div className="flex items-center space-x-2"><MapPin className="w-3.5 h-3.5" /> <span className="line-clamp-1">{event.venue}</span></div>
                </div>
                <div className="mt-auto pt-4 border-t border-stone-800 flex justify-between items-center text-sm">
                  <div className="text-theme-text/80"><span className="font-serif font-normal text-theme-text">{stats.totalAvail}</span> / {stats.totalCap} left</div>
                  <div className="font-serif font-normal text-black">{stats.minPrice === 0 ? "Free" : `From ${currencySymbol}${stats.minPrice.toFixed(2)}`}</div>
                </div>
              </div>
            </div>
          );
        };

        return (
          <div className="space-y-10">
            {/* Ongoing Events */}
            {ongoing.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-2.5 h-2.5 bg-black rounded-full animate-pulse" />
                  <h3 className="text-lg font-serif font-normal text-theme-text">Ongoing Events</h3>
                  <span className="text-[10px] font-mono bg-black text-white px-2.5 py-0.5 rounded-full tracking-wider">{ongoing.length} LIVE</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ongoing.map(renderEventCard)}
                </div>
              </div>
            )}

            {/* Separator */}
            {ongoing.length > 0 && upcoming.length > 0 && (
              <hr className="border-gray-200" />
            )}

            {/* Upcoming Events */}
            {upcoming.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-2.5 h-2.5 bg-gray-400 rounded-full" />
                  <h3 className="text-lg font-serif font-normal text-theme-text">Upcoming Events</h3>
                  <span className="text-[10px] font-mono bg-gray-100 text-black px-2.5 py-0.5 rounded-full border border-gray-200 tracking-wider">{upcoming.length} SCHEDULED</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcoming.map(renderEventCard)}
                </div>
              </div>
            )}

            {/* Separator */}
            {(ongoing.length > 0 || upcoming.length > 0) && ended.length > 0 && (
              <hr className="border-gray-200" />
            )}

            {/* Ended Events */}
            {ended.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-2.5 h-2.5 bg-gray-300 rounded-full" />
                  <h3 className="text-lg font-serif font-normal text-gray-400">Ended Events</h3>
                  <span className="text-[10px] font-mono bg-gray-100 text-gray-400 px-2.5 py-0.5 rounded-full border border-gray-200 tracking-wider">{ended.length} PAST</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50">
                  {ended.map(renderEventCard)}
                </div>
              </div>
            )}

            {events.length === 0 && (
              <div className="text-center text-theme-text/50 py-16 font-sans">No events created yet.</div>
            )}
          </div>
        );
      })()}
      <AIChatModal isOpen={isAIChatOpen} onClose={() => handleCloseView()} onEventReady={handleAIEventReady} />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  const baseStyles = "flex items-center space-x-3 px-4 py-3 rounded-none transition-all duration-200 cursor-pointer font-medium text-sm";
  const variants = {
    default: active
      ? "bg-gray-100 text-black border border-gray-200 shadow-inner"
      : "text-theme-text/60 hover:bg-theme-bg/50 hover:text-theme-text",
  };
  return (
    <div onClick={onClick} className={`${baseStyles} ${variants.default}`}>
      <div className={active ? "text-black" : ""}>{icon}</div>
      <span>{label}</span>
    </div>
  );
}

// INITIAL STATE FOR DEMO ONLY
const INITIAL_EVENTS = [];

function AdminDashboardInner() {

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'eventos_events') {
        setEvents(JSON.parse(e.newValue || '[]'));
      }
      if (e.key === 'eventos_attendees') {
        // Just trigger a re-render so event details view updates
        setEvents(prev => [...prev]);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeTab = searchParams.get('tab') || 'events_management';
  const viewingEventId = searchParams.get('event') || null;
  const eventActiveTab = searchParams.get('eventTab') || 'overview';

  const setActiveTab = (tab) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    newParams.delete('event');
    newParams.delete('eventTab');
    setSearchParams(newParams);
  };

  const setViewingEventId = (id) => {
    if (id) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', 'events_management');
      newParams.set('event', id);
      newParams.set('eventTab', 'overview');
      setSearchParams(newParams);
    } else {
      if (window.history.state && window.history.state.idx > 0) {
        navigate(-1);
      } else {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('event');
        newParams.delete('eventTab');
        setSearchParams(newParams);
      }
    }
  };

  const setEventActiveTab = (eventTab) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('eventTab', eventTab);
    setSearchParams(newParams);
  };
  
  const showSettingsModal = searchParams.get('view') === 'settings';

  const handleCloseModal = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      setSearchParams({});
    }
  };

  const toast = useToast();
  const confirm = useConfirm();
  const { user, logout } = useAuth();

  const [events, setEvents] = useState([]);
  const [allAttendees, setAllAttendees] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      const handleNewNotification = (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        toast.show(`New notification: ${notification.title}`, 'info');
        // Instantly fetch the updated participant list and event counts when a new registration/notification occurs
        fetchEvents();
        fetchAttendees();
      };
      socket.on('new_notification', handleNewNotification);
      return () => {
        socket.off('new_notification', handleNewNotification);
      };
    }
  }, [socket, toast]);

  useEffect(() => {
    if (socket && events.length > 0) {
      events.forEach(e => socket.emit('join_event', e.id));
      
      const handleTicketScanned = ({ ticketId, status }) => {
        setAllAttendees(prev => prev.map(a => a.id === ticketId ? { ...a, status } : a));
      };

      socket.on('ticket_scanned', handleTicketScanned);
      return () => {
        events.forEach(e => socket.emit('leave_event', e.id));
        socket.off('ticket_scanned', handleTicketScanned);
      };
    }
  }, [socket, events]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/notifications`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      });
      if (res.ok) setNotifications(await res.json());
    } catch (e) { console.error('Failed to fetch notifications', e); }
  };

  const markAllRead = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      });
      if (res.ok) setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {}
  };
  
  const markAsRead = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      });
      if (res.ok) setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {}
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/events`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map(e => ({
          ...e,
          capacity: e.total_capacity,
          available: e.available_slots,
          date: new Date(e.date_time).toISOString().slice(0, 16),
          end_date: e.end_time ? new Date(e.end_time).toISOString().slice(0, 16) : ''
        }));
        setEvents(mapped);
      }
    } catch (e) {
      console.error('Failed to fetch events', e);
    }
  };

  const fetchAttendees = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/tickets`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map(t => {
          const cData = t.custom_data ? JSON.parse(t.custom_data) : {};
          return {
            ...t,
            passId: t.id,
            eventId: t.event_id,
            name: t.attendee_name,
            email: t.attendee_email,
            phone: t.attendee_phone,
            tierId: t.tier_id,
            tierName: t.tier_name,
            timestamp: t.created_at,
            ...cData
          };
        });
        setAllAttendees(mapped);
      }
    } catch (e) {
      console.error('Failed to fetch attendees', e);
    }
  };

  useEffect(() => {
    Promise.all([fetchEvents(), fetchAttendees(), fetchNotifications()]).finally(() => setIsLoading(false));
  }, []);


  const handleExportCSV = (eventTitle, attendees) => {
    if (!attendees.length) return toast('No attendees to export yet. Registrations will appear here once people sign up.', 'warning');

    const customHeaders = attendees.reduce((acc, curr) => {
      Object.keys(curr).forEach(k => {
        if (!['passId', 'name', 'email', 'phone', 'tierName', 'timestamp', 'id', 'event_id', 'attendee_name', 'attendee_email', 'attendee_phone', 'tier_id', 'tier_name', 'status', 'created_at', 'custom_data', 'eventId', 'customData', 'event', 'attendance_logs'].includes(k)) {
          acc.add(k);
        }
      });
      return acc;
    }, new Set());
    const headers = ['passId', 'name', 'email', 'phone', 'tierName', 'timestamp', ...Array.from(customHeaders)];

    // Create CSV content
    const csvRows = [];
    csvRows.push(headers.join(',')); // Header row

    attendees.forEach(a => {
      const values = headers.map(header => {
        const val = a[header] || '';
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${eventTitle.replace(/\s+/g, '_')}_Attendees.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };


  const handleEditClick = (event) => {
    setEditingEventId(event.id);
    setFormData({
      title: event.title,
      date: event.date,
      end_date: event.end_date || '',
      venue: event.venue,
      capacity: event.capacity,
      image: event.image,
      tiers: event.tiers || [],
      customFormFields: event.customFormFields || []
    });
    setIsCreating(true);
    setViewingEventId(null);
  };

  const handleAddEvent = async (newEvent) => {
    try {
      const payload = {
        title: newEvent.title,
        date_time: new Date(newEvent.date).toISOString(),
        end_time: newEvent.end_date ? new Date(newEvent.end_date).toISOString() : null,
        venue: newEvent.venue,
        ticket_price: parseFloat(newEvent.tiers?.[0]?.price || 0),
        total_capacity: parseInt(newEvent.capacity || 100),
        available_slots: parseInt(newEvent.capacity || 100),
        image: newEvent.image,
        tiers: newEvent.tiers,
        customFormFields: newEvent.customFormFields,
        ai_session_id: newEvent.ai_session_id
      };

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('es_token')}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) fetchEvents();
    } catch (e) { console.error(e); }
  };

  const handleEditEvent = async (updatedEvent) => {
    try {
      const payload = {
        title: updatedEvent.title,
        date_time: new Date(updatedEvent.date).toISOString(),
        end_time: updatedEvent.end_date ? new Date(updatedEvent.end_date).toISOString() : null,
        venue: updatedEvent.venue,
        ticket_price: parseFloat(updatedEvent.tiers?.[0]?.price || 0),
        total_capacity: parseInt(updatedEvent.capacity || 100),
        available_slots: parseInt(updatedEvent.available || updatedEvent.capacity),
        image: updatedEvent.image,
        tiers: updatedEvent.tiers,
        customFormFields: updatedEvent.customFormFields
      };

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/events/${updatedEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('es_token')}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) fetchEvents();
    } catch (e) { console.error(e); }
  };

  const handleDeleteEvent = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      });
      if (res.ok) fetchEvents();
    } catch (e) { console.error(e); }
  };

  // Login is now handled by the separate /login page and AuthContext

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="EventSphere Logo" className="w-16 h-16 animate-pulse" />
          <p className="text-slate-500 text-sm font-serif">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-theme-bg z-10 relative overflow-hidden font-sans">

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-theme-primary/10 via-theme-bg to-theme-bg z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-theme-secondary/10 via-transparent to-transparent z-0 pointer-events-none" />

      <ParticleBackground />

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-72 fixed md:relative flex-col z-40 md:z-20 shrink-0 h-full p-4 pl-6 py-6 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex`}>
        <div className="h-full w-full bg-white/60 md:bg-white/40 backdrop-blur-xl border border-gray-100 shadow-[0_0_0_1px_rgba(79,178,192,0.1),0_8px_32px_rgba(151,161,218,0.2)] rounded-2xl md:rounded-none flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-theme-bg/20 flex justify-between items-center">
            <div className="flex items-center space-x-3 text-theme-text">
              <img src="/logo.png" alt="EventSphere Logo" className="w-12 h-12 object-contain" />
              <span className="font-serif font-normal text-lg tracking-tight">EventSphere</span>
            </div>
            <button 
              className="md:hidden text-theme-text/60 hover:text-theme-text"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {viewingEventId ? (
              <>
                <div className="pt-2 pb-4">
                  <button onClick={() => setViewingEventId(null)} className="flex items-center space-x-2 text-theme-text/60 hover:text-theme-text transition-colors text-sm font-sans font-medium">
                    <span>← Back to Global Admin</span>
                  </button>
                </div>
                <div className="pt-2 pb-2">
                  <div className="px-3 text-xs font-serif font-normal text-black uppercase tracking-widest font-mono">Event Controls</div>
                </div>
                <NavItem icon={<LayoutDashboard size={18} />} label="Overview" active={eventActiveTab === 'overview'} onClick={() => setEventActiveTab('overview')} />
                <NavItem icon={<LayoutDashboard size={18} />} label="Page Design" active={eventActiveTab === 'design'} onClick={() => setEventActiveTab('design')} />
                <NavItem icon={<Settings size={18} />} label="Email / SMTP Config" active={eventActiveTab === 'smtp'} onClick={() => setEventActiveTab('smtp')} />
                <NavItem icon={<CreditCard size={18} />} label="Payment / UPI Config" active={eventActiveTab === 'payment'} onClick={() => setEventActiveTab('payment')} />
                <NavItem icon={<MessageSquare size={18} />} label="Broadcast Message" active={eventActiveTab === 'broadcast'} onClick={() => setEventActiveTab('broadcast')} />
                <NavItem icon={<Users size={18} />} label="Participant List" active={eventActiveTab === 'participants'} onClick={() => setEventActiveTab('participants')} />
                <NavItem icon={<Clock size={18} />} label="Access Logs" active={eventActiveTab === 'access_logs'} onClick={() => setEventActiveTab('access_logs')} />
              </>
            ) : (
              <>
                <NavItem icon={<LayoutDashboard size={18} />} label="Live Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <NavItem icon={<Calendar size={18} />} label="Events Management" active={activeTab === 'events_management'} onClick={() => setActiveTab('events_management')} />

                {user?.role === 'ORG_ADMIN' && (
                  <NavItem icon={<Shield size={18} />} label="Staff Management" active={activeTab === 'user_management'} onClick={() => setActiveTab('user_management')} />
                )}

                <div className="pt-4 pb-2">
                  <div className="px-3 text-xs font-serif font-normal text-slate-600 uppercase tracking-widest font-mono">Operations</div>
                </div>

                <NavItem icon={<Users size={18} />} label="Attendee Register" active={activeTab === 'attendees'} onClick={() => setActiveTab('attendees')} />
                <NavItem icon={<CreditCard size={18} />} label="Transactions" active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
              </>
            )}
          </nav>

          <div className="p-4 border-t border-gray-100 bg-theme-bg/10">
            <div className="flex items-center space-x-3 px-3 py-2 rounded-none hover:bg-white/[0.03] transition-colors border border-transparent hover:border-gray-100">
              <div className="w-8 h-8 rounded-none bg-gradient-to-r from-theme-primary to-gray-500 p-0.5 shadow-lg shrink-0 overflow-hidden">
                <div className="w-full h-full rounded-none bg-white flex items-center justify-center text-xs font-serif font-normal text-black overflow-hidden">
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    (user?.name?.charAt(0) || '').toUpperCase()
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-serif font-normal text-theme-text truncate">{user?.name}</div>
                <div className="text-xs text-gray-500 font-mono font-medium truncate">{user?.email}</div>
              </div>
              <button onClick={logout} className="p-2 hover:bg-white/10 rounded-sm text-theme-text/60 hover:text-rose-400 transition-colors" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-20 md:py-6 md:pr-6 p-4">

        <header className="h-16 mb-4 md:mb-6 bg-white/40 backdrop-blur-xl border border-gray-100 shadow-[0_0_0_1px_rgba(79,178,192,0.1),0_8px_32px_rgba(151,161,218,0.2)] rounded-none flex items-center justify-between px-4 md:px-6 shrink-0 relative z-50">
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent pointer-events-none" />
          <div className="font-serif font-normal text-theme-text flex items-center tracking-wide text-lg relative z-10 gap-3">
            <button 
              className="md:hidden text-theme-text/80 hover:text-theme-text transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            {viewingEventId
              ? (events.find(e => e.id === viewingEventId)?.title || 'Event Detail')
              : activeTab === 'events_management' ? 'Events Management'
                : activeTab === 'attendees' ? 'Attendee Register'
                  : activeTab === 'transactions' ? 'Transactions'
                  : activeTab === 'user_management' ? 'User Management'
                    : 'Live Dashboard'
            }
          </div>
          <div className="flex items-center space-x-4 relative z-10">
            <button 
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.set('view', 'settings');
                setSearchParams(newParams);
              }}
              className="p-2 text-theme-text/60 hover:text-theme-text rounded-sm hover:bg-white/[0.05] border border-transparent hover:border-gray-100 transition-all"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="relative">
              <button 
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  if (searchParams.get('view') === 'notifications') {
                    newParams.delete('view');
                  } else {
                    newParams.set('view', 'notifications');
                  }
                  setSearchParams(newParams);
                }}
                className="p-2 text-theme-text/60 hover:text-theme-text rounded-sm hover:bg-white/[0.05] border border-transparent hover:border-gray-100 transition-all relative">
                <Bell className="w-5 h-5" />
                {notifications.some(n => !n.is_read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-none shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                )}
              </button>

              {searchParams.get('view') === 'notifications' && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('view');
                      setSearchParams(newParams);
                    }}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-serif text-sm font-semibold text-theme-text">Notifications</h3>
                    <button onClick={markAllRead} className="text-xs text-theme-primary hover:text-theme-secondary transition-colors font-semibold tracking-wide">Mark all read</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500 font-mono">No notifications yet.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} onClick={() => { if (!n.is_read) markAsRead(n.id); }} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${n.is_read ? 'opacity-60' : 'bg-blue-50/20'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-sm text-theme-text">{n.title}</span>
                            {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>}
                          </div>
                          <p className="text-xs text-gray-600 font-mono leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-gray-400 mt-2 block font-mono">{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto rounded-none relative">
          {activeTab === 'events_management' ? (
            <div className="bg-white/40 backdrop-blur-xl border border-gray-100 shadow-[0_0_0_1px_rgba(79,178,192,0.1),0_8px_32px_rgba(151,161,218,0.2)] rounded-none p-6 min-h-full">
              <EventManager events={events} allAttendees={allAttendees || []} setAllAttendees={setAllAttendees} onAddEvent={handleAddEvent} onEditEvent={handleEditEvent} onDeleteEvent={handleDeleteEvent} viewingEventId={viewingEventId} setViewingEventId={setViewingEventId} eventActiveTab={eventActiveTab} />
            </div>
          ) : activeTab === 'attendees' ? (
            <AttendeeRegisterView events={events} allAttendees={allAttendees} />
          ) : activeTab === 'transactions' ? (
            <TransactionsView events={events} allAttendees={allAttendees} />
          ) : activeTab === 'user_management' ? (
            <UserManagement />
          ) : (
            <LiveDashboardView events={events} allAttendees={allAttendees || []} />
          )}
        </div>
      </main>

      {showSettingsModal && (
        <UserProfileSettings onClose={() => handleCloseModal()} />
      )}
    </div>
  );
}


export default function AdminDashboard() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminDashboardInner />
      </ConfirmProvider>
    </ToastProvider>
  );
}
