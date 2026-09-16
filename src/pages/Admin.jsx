import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Eye, Edit3, Trash2, Plus, Calendar, MapPin, Users, Ticket, CheckCircle, Save, ImageIcon, ExternalLink, Activity, DollarSign, Download, Settings, LayoutDashboard, CreditCard, X, ChevronDown, ChevronRight, BarChart3, TrendingUp, Filter, Bell, AlertTriangle, Info, Copy, ShieldAlert, LogOut, Shield, MessageSquare, XCircle, Loader
} from 'lucide-react';
import TemplateDesigner from '../components/TemplateDesigner';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import UserManagement from '../components/admin/UserManagement';
import jsQR from 'jsqr';
import UserProfileSettings from '../components/admin/UserProfileSettings';

import { STOCK_IMAGES } from '../data/stockImages';

const MOCK_LOGS = [];

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
                className={`px-5 py-2.5 rounded-none text-theme-text text-sm font-sans font-medium transition-colors shadow-lg ${state.confirmColor === 'rose'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                    : 'bg-black hover:bg-black shadow-black/5'
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
        let size = (Math.random() * 1.5) + 0.5;
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        let opacity = Math.random() * 0.4 + 0.1;
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
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || 'all');
  const activeEvent = selectedEventId === 'all' ? null : (events.find(e => e.id === selectedEventId) || events[0]);

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
      const res = await fetch(`http://localhost:3000/api/v1/tickets/${ticketId}`, {
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

        <div className="glass-panel border border-gray-100 shadow-[0_8px_32px_rgba(151,161,218,0.2)] rounded-none p-1 flex bg-white/50 backdrop-blur-xl">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-transparent border-none text-theme-text font-mono text-sm py-2 px-4 focus:ring-0 cursor-pointer appearance-none outline-none"
          >
            <option value="all" className="bg-white">All Events</option>
            {events.map(e => (
              <option key={e.id} value={e.id} className="bg-white">{e.title}</option>
            ))}
          </select>
          <div className="px-3 flex items-center justify-center border-l border-gray-100 pointer-events-none text-theme-text/60">
            <ChevronDown className="w-4 h-4" />
          </div>
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

function LiveDashboardView({ events, allAttendees }) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || null);
  const activeEvent = events.find(e => e.id === selectedEventId) || events[0];

  if (!activeEvent || events.length === 0) {
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

  const totalCapacity = activeEvent.tiers.reduce((sum, t) => sum + parseInt(t.capacity || 0), 0);
  const totalAvailable = activeEvent.tiers.reduce((sum, t) => sum + parseInt(t.available || 0), 0);
  const totalBooked = totalCapacity - totalAvailable;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 relative z-10">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-normal text-theme-text mb-2">Live Telemetry</h2>
          <p className="text-theme-text/60">Real-time attendance and capacity metrics.</p>
        </div>

        <div className="glass-panel border border-gray-100 shadow-[0_8px_32px_rgba(151,161,218,0.2)] rounded-none p-1 flex bg-white/50 backdrop-blur-xl">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(Number(e.target.value))}
            className="bg-transparent border-none text-theme-text font-mono text-sm py-2 px-4 focus:ring-0 cursor-pointer appearance-none outline-none"
          >
            {events.map(e => (
              <option key={e.id} value={e.id} className="bg-white">{e.title}</option>
            ))}
          </select>
          <div className="pointer-events-none flex items-center pr-3 text-theme-text/50">
            <ChevronDown className="w-4 h-4" />
          </div>
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
          <span className="font-mono text-xs text-black bg-gray-100 px-2 py-1 rounded border border-gray-200 shadow-[0_0_10px_rgba(99,102,241,0.2)]">LIVE • {allAttendees.filter(a => String(a.eventId) === String(activeEvent.id)).length} REGISTRATIONS</span>
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
              {allAttendees.filter(a => String(a.eventId) === String(activeEvent.id)).map(log => (
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

  useEffect(() => {
    if (isOpen) {
      setIsLoadingHistory(true);
      fetch('http://localhost:3000/api/v1/events/ai-chat/history', {
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
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isProcessing) return;

    const newMessages = [...messages, { role: 'user', content: input.trim(), image: selectedImage }];
    setMessages(newMessages);
    setInput('');
    setSelectedImage(null);
    setIsProcessing(true);

    try {
      const res = await fetch('http://localhost:3000/api/v1/events/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('es_token')}`
        },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to communicate with AI.');
      }

      if (data.is_ready) {
        toast('AI has finished preparing your event details!', 'success');
        onEventReady(data.event_data);
        onClose();
        setMessages([{ role: 'assistant', content: 'Hello! Need any help in creating an event? Just tell me what you have in mind!' }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: data.message }]);
      }
    } catch (err) {
      toast(err.message, 'error');
      setMessages([...newMessages, { role: 'assistant', content: `Sorry, I encountered an error: ${err.message}` }]);
    } finally {
      setIsProcessing(false);
    }
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
            <p className="text-xs text-theme-text/60 mt-1">Powered by Groq</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-theme-text/50 hover:bg-white hover:shadow rounded-none transition-all">
            <X className="w-5 h-5" />
          </button>
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
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 text-slate-500 rounded-none rounded-bl-sm px-4 py-3 text-sm shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-500 rounded-none animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-none animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-none animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={chatEndRef} />
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
  const [isCreating, setIsCreating] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [activeTierId, setActiveTierId] = useState(null);
  const [isDesigningCover, setIsDesigningCover] = useState(false);
  const [formData, setFormData] = useState({
    title: '', date: '', venue: '', image: '', currency: 'INR',
    tiers: [{ id: Date.now() + Math.random().toString(36).substr(2, 5), name: 'General Admission', price: '', capacity: '', template: null, _previewTicket: null }],
    customFormFields: []
  });

  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  
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
    
    img.src = event?.image;
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
      _aiCoverTemplate: aiCoverTemplate
    });
    setEditingEventId(null);
    setIsCreating(true);
  };

  const [smtpForm, setSmtpForm] = useState({ host: '', port: '', user: '', pass: '', fromEmail: '' });
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
  const [showBroadcastPreview, setShowBroadcastPreview] = useState(false);
  
  // Private custom email state
  const [customMailModal, setCustomMailModal] = useState({ isOpen: false, attendee: null, subject: '', message: '', attachments: [], status: 'idle' });
  // Per-attendee resend state: { [passId]: 'idle' | 'loading' | 'done' | 'error' }
  const [resendStates, setResendStates] = useState({});
  const [pageConfig, setPageConfig] = useState({ primaryColor: '#10b981', bgColor: '#020617', bgImage: '', showSocials: true });
  const initializedEventId = useRef(null);

  useEffect(() => {
    if (viewingEventId) {
      const event = events.find(e => e.id === viewingEventId);
      if (event && initializedEventId.current !== viewingEventId) {
        setSmtpForm(event.smtp_config ? (typeof event.smtp_config === 'string' ? JSON.parse(event.smtp_config) : event.smtp_config) : { host: '', port: '', user: '', pass: '', fromEmail: '' });
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

    setIsCreating(false);
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
    setIsCreating(true);
    setViewingEventId(null);
  };


  if (viewingEventId) {
    const event = events.find(e => e.id === viewingEventId);
    if (!event) return null;
    const stats = getEventStats(event);
    const eventAttendees = (allAttendees || []).filter(a => a.eventId === event.id);

    const handleSmtpSave = async (e) => {
      e?.preventDefault?.();
      try {
        const res = await fetch(`http://localhost:3000/api/v1/events/${event.id}`, {
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
        const res = await fetch(`http://localhost:3000/api/v1/events/${event.id}`, {
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
        const res = await fetch(`http://localhost:3000/api/v1/tickets/${ticketId}/verify-payment`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
        });
        if (res.ok) {
          toast('Payment verified and ticket confirmed!', 'success');
          setVerifyState(prev => ({ ...prev, [ticketId]: 'done' }));
          fetchTickets(); // Refresh tickets to update status
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
      if (!confirm('Are you sure you want to decline this payment? The ticket will be put on hold and the capacity will be freed.')) return;
      setDeclineState(prev => ({ ...prev, [ticketId]: 'loading' }));
      try {
        const res = await fetch(`http://localhost:3000/api/v1/tickets/${ticketId}/decline-payment`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
        });
        if (res.ok) {
          toast('Payment declined and ticket put on hold.', 'success');
          setDeclineState(prev => ({ ...prev, [ticketId]: 'done' }));
          fetchTickets(); // Refresh tickets to update status
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
        const res = await fetch('http://localhost:3000/api/v1/smtp/test', {
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
        const res = await fetch(`http://localhost:3000/api/v1/events/${event.id}/email-all`, {
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
        const res = await fetch(`http://localhost:3000/api/v1/tickets/${customMailModal.attendee.passId}/custom-email`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` },
          body: formData
        });
        if (res.ok) {
          toast('Private message sent successfully!', 'success');
          setCustomMailModal({ isOpen: false, attendee: null, subject: '', message: '', attachments: [], status: 'idle' });
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
        const res = await fetch(`http://localhost:3000/api/v1/tickets/${passId}/resend-email`, {
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
        const res = await fetch(`http://localhost:3000/api/v1/events/${event.id}`, {
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
      try {
        const res = await fetch(`http://localhost:3000/api/v1/tickets/${ticketId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
        });
        if (res.ok) {
          if (setAllAttendees) setAllAttendees(prev => prev.filter(t => t.passId !== ticketId));
          window.dispatchEvent(new StorageEvent('storage', { key: 'eventos_attendees' }));
        }
      } catch (e) {
        console.error('Failed to delete ticket', e);
      }
    };

    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 relative">

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
                <button onClick={async () => { const yes = await confirm('Delete Event', `Are you sure you want to permanently delete "${event.title}"? All registrations and data will be lost.`); if (yes) { onDeleteEvent(event.id); setViewingEventId(null); } }} className="px-3 py-1 bg-rose-600/80 hover:bg-rose-500 rounded border border-rose-400 text-xs font-serif font-normal text-theme-text shadow-lg transition-colors">Delete</button>
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
            <form onSubmit={handleSmtpSave} className="glass-panel border border-gray-200 rounded-none p-8 space-y-6 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-serif font-normal text-theme-text mb-2">SMTP Configuration</h3>
                <p className="text-theme-text/60">Configure custom email settings to send tickets from your own domain instead of the default platform address.</p>
              </div>
              <button
                type="button"
                onClick={() => setSmtpForm({ host: 'smtp.gmail.com', port: '587', user: 'rajatsolanki1210@gmail.com', pass: '', fromEmail: '"Tech Event 2026" <info@techevent.com>' })}
                className="px-4 py-2 bg-gray-100 text-black hover:bg-black/20 rounded-sm text-sm font-serif font-normal transition-all whitespace-nowrap border border-gray-200"
              >
                ⚡ Autofill Default
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">SMTP Host</label>
                <input type="text" required value={smtpForm.host} onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text" placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">SMTP Port</label>
                <input type="number" required value={smtpForm.port} onChange={(e) => setSmtpForm({ ...smtpForm, port: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text" placeholder="587" />
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">SMTP Username</label>
                <input type="text" required value={smtpForm.user} onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text" placeholder="info@myevent.com" />
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">SMTP Password / App Password</label>
                <input type="password" required value={smtpForm.pass} onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text" placeholder="••••••••" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-sans font-medium text-theme-text/80 mb-2">From Address</label>
                <input type="text" value={smtpForm.fromEmail} onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })} className="w-full bg-white/50 border border-gray-200 rounded-sm px-4 py-2 text-theme-text" placeholder='"Tech Event 2026" <info@techevent.com>' />
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
                    onChange={e => setBroadcastSubject(e.target.value)}
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
                      className="px-5 py-2 bg-theme-secondary hover:bg-theme-secondary text-theme-text rounded-sm text-sm font-serif font-normal transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/5"
                    >
                      {broadcastState === 'loading' ? (
                        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-none animate-spin inline-block" /> Sending...</>
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
                                  onClick={() => setCustomMailModal({ isOpen: true, attendee: a, subject: '', message: '', attachments: [], status: 'idle' })}
                                  className="p-2 text-theme-text/50 hover:text-black hover:bg-gray-100 rounded-sm transition-colors"
                                  title="Send Private Message"
                                >
                                  <MessageSquare size={16} />
                                </button>
                                {/* Delete */}
                                <button
                                  onClick={() => handleDeleteTicket(a.passId)}
                                  className="p-2 text-theme-text/50 hover:text-red-400 hover:bg-red-400/10 rounded-sm transition-colors"
                                  title="Delete Ticket"
                                >
                                  <Trash2 size={16} />
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

        {/* Custom Mail Modal */}
        {customMailModal.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" onClick={() => setCustomMailModal({ isOpen: false, attendee: null, subject: '', message: '', attachments: [], status: 'idle' })} />
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
                  <button type="button" onClick={() => setCustomMailModal({ isOpen: false, attendee: null, subject: '', message: '', attachments: [], status: 'idle' })} className="p-2 text-theme-text/50 hover:bg-white hover:shadow rounded-none transition-all">
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
                  <button type="button" onClick={() => setCustomMailModal({ isOpen: false, attendee: null, subject: '', message: '', attachments: [], status: 'idle' })} className="px-5 py-2 text-theme-text/60 hover:text-theme-text font-sans font-medium transition-colors">Cancel</button>
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
          <button onClick={() => { setIsCreating(false); setEditingEventId(null); }} className="text-theme-text/60 hover:text-theme-text transition-colors">Cancel</button>
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

            <div className="space-y-2">
              <label className="text-sm font-sans font-medium text-theme-text/80">Date & Time</label>
              <input
                type="datetime-local" required
                value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-white/50 border border-gray-200 rounded-none px-4 py-3 text-theme-text focus:outline-none focus:border-black focus:ring-1 focus:ring-gray-500 transition-all"
              />
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
                  onClick={() => setIsDesigningCover(true)}
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
                        onClick={() => setActiveTierId(tier.id)}
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
            <button type="button" onClick={() => { setIsCreating(false); setEditingEventId(null); }} className="px-6 py-3 rounded-none font-medium text-theme-text/80 hover:bg-theme-bg transition-colors">
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
              setActiveTierId(null);
            }}
            onCancel={() => setActiveTierId(null)}
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
              setIsDesigningCover(false);
            }}
            onCancel={() => setIsDesigningCover(false)}
          />,
          document.body
        )}
        <AIChatModal isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} onEventReady={handleAIEventReady} />
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-normal text-theme-text tracking-tight">Events Management</h2>
          <p className="text-theme-text/60 text-sm mt-1">Manage your active events and launch new ones.</p>
        </div>
        {['ORG_ADMIN', 'SYSTEM_ADMIN'].includes(user?.role) && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsAIChatOpen(true)}
              className="flex items-center space-x-2 px-5 py-2.5 bg-black hover:bg-gray-500 text-white rounded-none font-sans font-medium transition-all shadow-lg shadow-gray-500/20 border border-gray-500"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Ask AI to Create</span>
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center space-x-2 px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-none font-sans font-medium transition-all shadow-lg shadow-gray-500/20"
            >
              <Plus className="w-5 h-5" />
              <span>Create Event</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => {
          const stats = getEventStats(event);
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
                  <div className="font-serif font-normal text-black">{stats.minPrice === 0 ? "Free" : `From $${stats.minPrice.toFixed(2)}`}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <AIChatModal isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} onEventReady={handleAIEventReady} />
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

  const [activeTab, setActiveTab] = useState('events_management');
  const [viewingEventId, setViewingEventId] = useState(null);
  const [eventActiveTab, setEventActiveTab] = useState('overview');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const { user, logout } = useAuth();

  const [events, setEvents] = useState([]);
  const [allAttendees, setAllAttendees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/v1/events', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map(e => ({
          ...e,
          capacity: e.total_capacity,
          available: e.available_slots,
          date: new Date(e.date_time).toISOString().slice(0, 16)
        }));
        setEvents(mapped);
      }
    } catch (e) {
      console.error('Failed to fetch events', e);
    }
  };

  const fetchAttendees = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/v1/tickets', {
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
    Promise.all([fetchEvents(), fetchAttendees()]).finally(() => setIsLoading(false));

    // Auto-refresh periodically for live dashboard updates
    const interval = setInterval(() => {
      fetchEvents();
      fetchAttendees();
    }, 5000);
    return () => clearInterval(interval);
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
        venue: newEvent.venue,
        ticket_price: parseFloat(newEvent.tiers?.[0]?.price || 0),
        total_capacity: parseInt(newEvent.capacity || 100),
        available_slots: parseInt(newEvent.capacity || 100),
        image: newEvent.image,
        tiers: newEvent.tiers,
        customFormFields: newEvent.customFormFields
      };

      const res = await fetch('http://localhost:3000/api/v1/events', {
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
        venue: updatedEvent.venue,
        ticket_price: parseFloat(updatedEvent.tiers?.[0]?.price || 0),
        total_capacity: parseInt(updatedEvent.capacity || 100),
        available_slots: parseInt(updatedEvent.available || updatedEvent.capacity),
        image: updatedEvent.image,
        tiers: updatedEvent.tiers,
        customFormFields: updatedEvent.customFormFields
      };

      const res = await fetch(`http://localhost:3000/api/v1/events/${updatedEvent.id}`, {
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
      const res = await fetch(`http://localhost:3000/api/v1/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      });
      if (res.ok) fetchEvents();
    } catch (e) { console.error(e); }
  };

  // Login is now handled by the separate /login page and AuthContext

  return (
    <div className="flex h-screen w-full bg-theme-bg z-10 relative overflow-hidden font-sans">

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-theme-primary/10 via-theme-bg to-theme-bg z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-theme-secondary/10 via-transparent to-transparent z-0 pointer-events-none" />

      <ParticleBackground />

      <aside className="w-72 hidden md:flex flex-col relative z-20 shrink-0 h-full p-4 pl-6 py-6">
        <div className="h-full w-full bg-white/40 backdrop-blur-xl border border-gray-100 shadow-[0_0_0_1px_rgba(79,178,192,0.1),0_8px_32px_rgba(151,161,218,0.2)] rounded-none flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-theme-bg/20">
            <div className="flex items-center space-x-3 text-theme-text">
              <div className="w-8 h-8 rounded-sm bg-black/20 border border-black/30 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Settings className="w-4 h-4 text-black" />
              </div>
              <span className="font-serif font-normal text-lg tracking-tight">EventSphere</span>
            </div>
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
                <NavItem icon={<CreditCard size={18} />} label="Transactions" onClick={() => setActiveTab('attendees')} />
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

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-20 py-6 pr-6">

        <header className="h-16 mb-6 bg-white/40 backdrop-blur-xl border border-gray-100 shadow-[0_0_0_1px_rgba(79,178,192,0.1),0_8px_32px_rgba(151,161,218,0.2)] rounded-none flex items-center justify-between px-6 shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent pointer-events-none" />
          <div className="font-serif font-normal text-theme-text flex items-center tracking-wide text-lg relative z-10">
            {viewingEventId
              ? (events.find(e => e.id === viewingEventId)?.title || 'Event Detail')
              : activeTab === 'events_management' ? 'Events Management'
                : activeTab === 'attendees' ? 'Attendee Register'
                  : activeTab === 'user_management' ? 'User Management'
                    : 'Live Dashboard'
            }
          </div>
          <div className="flex items-center space-x-4 relative z-10">
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="p-2 text-theme-text/60 hover:text-theme-text rounded-sm hover:bg-white/[0.05] border border-transparent hover:border-gray-100 transition-all"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button className="p-2 text-theme-text/60 hover:text-theme-text rounded-sm hover:bg-white/[0.05] border border-transparent hover:border-gray-100 transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-black rounded-none shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto rounded-none relative">
          {activeTab === 'events_management' ? (
            <div className="bg-white/40 backdrop-blur-xl border border-gray-100 shadow-[0_0_0_1px_rgba(79,178,192,0.1),0_8px_32px_rgba(151,161,218,0.2)] rounded-none p-6 min-h-full">
              <EventManager events={events} allAttendees={allAttendees || []} setAllAttendees={setAllAttendees} onAddEvent={handleAddEvent} onEditEvent={handleEditEvent} onDeleteEvent={handleDeleteEvent} viewingEventId={viewingEventId} setViewingEventId={setViewingEventId} eventActiveTab={eventActiveTab} />
            </div>
          ) : activeTab === 'attendees' ? (
            <AttendeeRegisterView events={events} allAttendees={allAttendees} />
          ) : activeTab === 'user_management' ? (
            <UserManagement />
          ) : (
            <LiveDashboardView events={events} allAttendees={allAttendees || []} />
          )}
        </div>
      </main>

      {showSettingsModal && (
        <UserProfileSettings onClose={() => setShowSettingsModal(false)} />
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
