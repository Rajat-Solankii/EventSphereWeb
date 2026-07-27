import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Eye, Edit3, Trash2, Plus, Calendar, MapPin, Users, Ticket, CheckCircle, Save, ImageIcon, ExternalLink, Activity, DollarSign, Download, Settings, LayoutDashboard, CreditCard, X, ChevronDown, ChevronRight, BarChart3, TrendingUp, Filter, Bell, AlertTriangle, Info, Copy, ShieldAlert
} from 'lucide-react';
import TemplateDesigner from '../components/TemplateDesigner';

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
              success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
              error: <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />,
              warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
              info: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
            };
            const borders = {
              success: 'border-emerald-500/30',
              error: 'border-rose-500/30',
              warning: 'border-amber-500/30',
              info: 'border-sky-500/30',
            };
            return (
              <div
                key={toast.id}
                className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl border ${borders[toast.type]} bg-slate-900/95 backdrop-blur-xl shadow-2xl text-sm text-white font-medium ${
                  toast.exiting ? 'animate-toast-out' : 'animate-toast-in'
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-slate-900/95 border border-slate-700/50 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-toast-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)' }}>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-white">{state.title}</h3>
            </div>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">{state.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleClose(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700 transition-colors"
              >Cancel</button>
              <button
                onClick={() => handleClose(true)}
                className={`px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors shadow-lg ${
                  state.confirmColor === 'rose'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
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
    } catch(e) {
      console.error(e);
    }
  }, [selectedEventId, activeEvent, allAttendees]);

  if (!events || events.length === 0) return <div className="text-stone-400 p-8">No events found.</div>;

  const dynamicHeaders = activeEvent?.customFormFields || [];

  const toast = useToast();
  const confirm = useConfirm();

  const handleDeleteTicket = async (ticketId) => {
    const yes = await confirm('Delete Registration', 'Are you sure you want to delete this registration? This action cannot be undone.');
    if (!yes) return;
    try {
      const res = await fetch(`http://localhost:3000/api/v1/tickets/${ticketId}`, { method: 'DELETE' });
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
          <h2 className="text-3xl font-bold text-white mb-2">Attendee Register</h2>
          <p className="text-stone-400">View and manage registered attendees for your events.</p>
        </div>
        
        <div className="glass-panel border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.6)] rounded-xl p-1 flex bg-stone-900/50 backdrop-blur-xl">
          <select 
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-transparent border-none text-white font-mono text-sm py-2 px-4 focus:ring-0 cursor-pointer appearance-none outline-none"
          >
            <option value="all" className="bg-stone-900">All Events</option>
            {events.map(e => (
              <option key={e.id} value={e.id} className="bg-stone-900">{e.title}</option>
            ))}
          </select>
          <div className="px-3 flex items-center justify-center border-l border-white/10 pointer-events-none text-stone-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="glass-panel border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl bg-stone-900/40 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/[0.05]">
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Event</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Name & Email</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Tier</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Pass ID</th>
                {dynamicHeaders.map(h => (
                  <th key={h.id} className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">{h.label}</th>
                ))}
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {attendees.length === 0 ? (
                <tr>
                  <td colSpan={3 + dynamicHeaders.length} className="py-12 text-center text-stone-500 italic">
                    No attendees registered for this event yet.
                  </td>
                </tr>
              ) : (
                attendees.map((attendee, idx) => {
                  const evt = events.find(e => e.id === attendee.eventId);
                  return (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-emerald-400">{evt?.title || 'Unknown Event'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-200">{attendee.name}</div>
                      <div className="text-sm text-stone-500 font-mono">{attendee.email}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/30">
                        {attendee.tierName || 'GA'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-xs text-stone-400 bg-black/30 px-2 py-1 rounded">{attendee.passId}</span>
                    </td>
                    {dynamicHeaders.map(h => (
                      <td key={h.id} className="py-4 px-6 text-sm text-slate-300">
                        {attendee[h.id] || '-'}
                      </td>
                    ))}
                    <td className="py-4 px-6 text-right">
                      <button onClick={() => handleDeleteTicket(attendee.passId)} className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )})
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

  if (!activeEvent) return null;

  const totalCapacity = activeEvent.tiers.reduce((sum, t) => sum + parseInt(t.capacity || 0), 0);
  const totalAvailable = activeEvent.tiers.reduce((sum, t) => sum + parseInt(t.available || 0), 0);
  const totalBooked = totalCapacity - totalAvailable;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 relative z-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Live Telemetry</h2>
          <p className="text-stone-400">Real-time attendance and capacity metrics.</p>
        </div>
        
        <div className="glass-panel border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.6)] rounded-xl p-1 flex bg-stone-900/50 backdrop-blur-xl">
          <select 
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(Number(e.target.value))}
            className="bg-transparent border-none text-white font-mono text-sm py-2 px-4 focus:ring-0 cursor-pointer appearance-none outline-none"
          >
            {events.map(e => (
              <option key={e.id} value={e.id} className="bg-stone-900">{e.title}</option>
            ))}
          </select>
          <div className="pointer-events-none flex items-center pr-3 text-slate-500">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "TOTAL CAPACITY", value: totalCapacity, color: "text-emerald-400" },
          { label: "PASSES CLAIMED", value: totalBooked, color: "text-emerald-400" },
          { label: "REMAINING", value: totalAvailable, color: "text-cyan-400" }
        ].map((kpi, i) => (
          <div key={i} className="relative bg-stone-900/40 backdrop-blur-xl border border-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.6)] rounded-2xl p-6 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h4 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-4">{kpi.label}</h4>
            <div className={`font-mono text-5xl font-light ${kpi.color}`}>
              {kpi.value.toString().padStart(4, '0')}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-stone-900/40 backdrop-blur-xl border border-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-white/[0.03] flex justify-between items-center bg-black/20">
          <h3 className="font-bold text-white tracking-wide">ACTIVE GUEST LOG</h3>
          <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]">LIVE • {allAttendees.filter(a => String(a.eventId) === String(activeEvent.id)).length} REGISTRATIONS</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.03] text-xs font-bold text-slate-500 uppercase tracking-widest bg-black/40">
                <th className="px-6 py-4 font-mono">ID</th>
                <th className="px-6 py-4">Attendee</th>
                <th className="px-6 py-4 font-mono">Time</th>
                <th className="px-6 py-4 text-right">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {allAttendees.filter(a => String(a.eventId) === String(activeEvent.id)).map(log => (
                <tr key={log.passId} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 font-mono text-slate-500 text-sm group-hover:text-emerald-400 transition-colors">{log.passId}</td>
                  <td className="px-6 py-4 text-slate-200 font-medium">{log.name}</td>
                  <td className="px-6 py-4 font-mono text-stone-400 text-sm">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-mono text-xs px-2 py-1 rounded border shadow-sm ${
                      log.status === 'INSIDE' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10' 
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

function EventManager({ events, allAttendees = [], setAllAttendees, onAddEvent, onEditEvent, onDeleteEvent, viewingEventId, setViewingEventId, eventActiveTab }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [isCreating, setIsCreating] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [activeTierId, setActiveTierId] = useState(null);
  const [isDesigningCover, setIsDesigningCover] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', date: '', venue: '', image: '', 
    tiers: [{ id: Date.now() + Math.random().toString(36).substr(2, 5), name: 'General Admission', price: '', capacity: '', template: null, _previewTicket: null }],
    customFormFields: []
  });
  
  const [smtpForm, setSmtpForm] = useState({ host: '', port: '', user: '', pass: '', fromEmail: '' });
  const [pageConfig, setPageConfig] = useState({ primaryColor: '#10b981', bgColor: '#020617', bgImage: '', showSocials: true });
  const initializedEventId = useRef(null);

  useEffect(() => {
    if (viewingEventId) {
      const event = events.find(e => e.id === viewingEventId);
      if (event && initializedEventId.current !== viewingEventId) {
        setSmtpForm(event.smtp_config || { host: '', port: '', user: '', pass: '', fromEmail: '' });
        setPageConfig(event.page_config || { primaryColor: '#10b981', bgColor: '#020617', bgImage: '', showSocials: true });
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

    if (editingEventId) {
      onEditEvent({ ...formData, tiers: processedTiers });
    } else {
      onAddEvent({ ...formData, tiers: processedTiers });
    }
    
    setIsCreating(false);
    setEditingEventId(null);
    setFormData({ title: '', date: '', venue: '', image: '', tiers: [{ id: Date.now().toString(), name: 'General Admission', price: '', capacity: '', template: null, _previewTicket: null }], customFormFields: [] });
  };

  const addTier = () => setFormData(prev => ({...prev, tiers: [...prev.tiers, { id: Date.now().toString(), name: '', price: '', capacity: '', template: null, _previewTicket: null }]}));
  const updateTier = (id, key, value) => setFormData(prev => ({...prev, tiers: prev.tiers.map(t => t.id === id ? { ...t, [key]: value } : t)}));
  const removeTier = (id) => setFormData(prev => ({...prev, tiers: prev.tiers.filter(t => t.id !== id)}));

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
    setFormData(event);
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
      e.preventDefault();
      try {
        const res = await fetch(`http://localhost:3000/api/v1/events/${event.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...event, smtp_config: smtpForm, page_config: pageConfig })
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
    const handlePageConfigSave = async (e) => {
      e.preventDefault();
      try {
        const res = await fetch(`http://localhost:3000/api/v1/events/${event.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
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
        const res = await fetch(`http://localhost:3000/api/v1/tickets/${ticketId}`, { method: 'DELETE' });
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
        
        <div className="glass-panel border border-slate-700/50 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <img src={event.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800'} alt="" className="w-full md:w-1/3 h-48 object-cover rounded-xl border border-slate-700" />
            <div className="flex-1 space-y-4 relative">
              <div className="absolute top-0 right-0 flex space-x-2">
                <button onClick={() => handleEdit(event)} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded border border-emerald-400 text-xs font-bold text-white shadow-lg transition-colors">Edit</button>
                <button onClick={() => {
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
                }} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded border border-emerald-400 text-xs font-bold text-white shadow-lg transition-colors">Share Link</button>
                <button onClick={async () => { const yes = await confirm('Delete Event', `Are you sure you want to permanently delete "${event.title}"? All registrations and data will be lost.`); if (yes) { onDeleteEvent(event.id); setViewingEventId(null); } }} className="px-3 py-1 bg-rose-600/80 hover:bg-rose-500 rounded border border-rose-400 text-xs font-bold text-white shadow-lg transition-colors">Delete</button>
              </div>
              <h2 className="text-3xl font-bold text-white pr-48">{event.title}</h2>
              <div className="flex items-center text-slate-300 space-x-6">
                <div className="flex items-center space-x-2"><Calendar className="w-5 h-5 text-emerald-400" /> <span>{formatEventDate(event.date)}</span></div>
                <div className="flex items-center space-x-2"><MapPin className="w-5 h-5 text-emerald-400" /> <span>{event.venue}</span></div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700/50">
                <div><div className="text-sm text-slate-400">Total Capacity</div><div className="text-xl font-bold text-white">{stats.totalCap}</div></div>
                <div><div className="text-sm text-slate-400">Tickets Available</div><div className="text-xl font-bold text-white">{stats.totalAvail}</div></div>
                <div><div className="text-sm text-slate-400">Registrations</div><div className="text-xl font-bold text-emerald-400">{eventAttendees.length}</div></div>
              </div>
            </div>
          </div>
        </div>

        {eventActiveTab === 'overview' && (
          <div className="glass-panel border border-slate-700/50 rounded-2xl p-8 space-y-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Event Overview</h3>
            <p className="text-stone-400">Select an option from the sidebar to configure this event's emails or view participants.</p>
          </div>
        )}

        {eventActiveTab === 'smtp' && (
          <form onSubmit={handleSmtpSave} className="glass-panel border border-slate-700/50 rounded-2xl p-8 space-y-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">SMTP Configuration</h3>
            <p className="text-stone-400 mb-6">Configure custom email settings to send tickets from your own domain instead of the default platform address.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">SMTP Host</label>
                <input type="text" required value={smtpForm.host} onChange={(e) => setSmtpForm({...smtpForm, host: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white" placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">SMTP Port</label>
                <input type="number" required value={smtpForm.port} onChange={(e) => setSmtpForm({...smtpForm, port: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white" placeholder="587" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">SMTP Username</label>
                <input type="text" required value={smtpForm.user} onChange={(e) => setSmtpForm({...smtpForm, user: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white" placeholder="info@myevent.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">SMTP Password / App Password</label>
                <input type="password" required value={smtpForm.pass} onChange={(e) => setSmtpForm({...smtpForm, pass: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white" placeholder="••••••••" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-300 mb-2">From Address</label>
                <input type="text" value={smtpForm.fromEmail} onChange={(e) => setSmtpForm({...smtpForm, fromEmail: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white" placeholder="&quot;Tech Event 2026&quot; <info@techevent.com>" />
                <p className="text-xs text-stone-500 mt-2">Optional: Define exactly how the sender name should appear in the recipient's inbox.</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-700/50">
              <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">Save SMTP Config</button>
            </div>
          </form>
        )}

        {eventActiveTab === 'design' && (
          <form onSubmit={handlePageConfigSave} className="glass-panel border border-slate-700/50 rounded-2xl p-8 space-y-6 shadow-2xl animate-in fade-in">
            <h3 className="text-xl font-bold text-white mb-4">Registration Page Design</h3>
            <p className="text-stone-400 mb-6">Customize the look and feel of the public registration page for this event.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Primary Accent Color</label>
                <div className="flex items-center space-x-3">
                  <input type="color" value={pageConfig.primaryColor} onChange={(e) => setPageConfig({...pageConfig, primaryColor: e.target.value})} className="h-10 w-10 rounded border border-slate-700 bg-slate-900 cursor-pointer" />
                  <input type="text" value={pageConfig.primaryColor} onChange={(e) => setPageConfig({...pageConfig, primaryColor: e.target.value})} className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono uppercase" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Background Color (Dark)</label>
                <div className="flex items-center space-x-3">
                  <input type="color" value={pageConfig.bgColor} onChange={(e) => setPageConfig({...pageConfig, bgColor: e.target.value})} className="h-10 w-10 rounded border border-slate-700 bg-slate-900 cursor-pointer" />
                  <input type="text" value={pageConfig.bgColor} onChange={(e) => setPageConfig({...pageConfig, bgColor: e.target.value})} className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono uppercase" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-300 mb-2">Custom Background Image URL (Optional)</label>
                <input type="text" value={pageConfig.bgImage || ''} onChange={(e) => setPageConfig({...pageConfig, bgImage: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white" placeholder="https://..." />
                <p className="text-xs text-stone-500 mt-2">If provided, this image will be used as a blurred backdrop for the entire registration page.</p>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={pageConfig.showSocials} onChange={(e) => setPageConfig({...pageConfig, showSocials: e.target.checked})} className="rounded text-emerald-500 focus:ring-emerald-500 bg-stone-900 border-slate-600 w-5 h-5" />
                  <span className="text-sm font-semibold text-slate-300">Show Social Sharing Buttons on Checkout</span>
                </label>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-slate-900 rounded-xl border border-slate-700 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: pageConfig.bgImage ? `url("${pageConfig.bgImage}")` : 'none', backgroundColor: pageConfig.bgColor }} />
              <div className="relative z-10 p-6 flex flex-col items-center justify-center space-y-4">
                <h4 className="text-white font-bold">Live Preview</h4>
                <button type="button" style={{ backgroundColor: pageConfig.primaryColor }} className="px-6 py-2 rounded-xl text-white font-bold shadow-lg">Checkout Button</button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700/50">
              <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">Save Page Design</button>
            </div>
          </form>
        )}

        {eventActiveTab === 'participants' && (
          <div className="glass-panel border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Participant List</h3>
              <button 
                onClick={() => handleExportCSV(event.title, eventAttendees)}
                className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg text-sm font-semibold flex items-center space-x-2 border border-emerald-500/30 transition-colors"
              >
                <span>Export CSV</span>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              {eventAttendees.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No attendees have registered for this event yet.</div>
              ) : (
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 border-b border-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Pass ID</th>
                      <th className="px-6 py-4 font-semibold">Name</th>
                      <th className="px-6 py-4 font-semibold">Email</th>
                      <th className="px-6 py-4 font-semibold">Tier</th>
                      {(event.customFormFields || []).map(f => (
                        <th key={f.id} className="px-6 py-4 font-semibold">{f.label}</th>
                      ))}
                      <th className="px-6 py-4 font-semibold text-right">Timestamp</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventAttendees.map((a, i) => (
                      <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4 font-mono text-emerald-400">{a.passId}</td>
                        <td className="px-6 py-4 font-bold text-white">{a.name}</td>
                        <td className="px-6 py-4">{a.email}</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-700 rounded text-xs">{a.tierName}</span></td>
                        {(event.customFormFields || []).map(f => (
                          <td key={f.id} className="px-6 py-4">{a[f.id] || '-'}</td>
                        ))}
                        <td className="px-6 py-4 text-right text-slate-500">{a.timestamp ? new Date(a.timestamp).toLocaleString() : '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteTicket(a.passId)}
                            className="p-2 text-stone-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            title="Delete Ticket"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
          <h2 className="text-2xl font-bold text-white">{editingEventId ? 'Edit Event' : 'Create New Event'}</h2>
          <button onClick={() => { setIsCreating(false); setEditingEventId(null); }} className="text-stone-400 hover:text-white transition-colors">Cancel</button>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel border border-slate-700/50 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-300">Event Title</label>
              <input 
                type="text" required
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Global AI Conference 2026" 
                className="w-full bg-stone-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Date & Time</label>
              <div className="relative">
                <Calendar className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="datetime-local" required
                  value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-stone-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-indigo-500 transition-all [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Venue / Location</label>
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" required
                  value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})}
                  placeholder="e.g., Grand Hyatt, NYC" 
                  className="w-full bg-stone-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-300">Event Cover</label>
              <div className="flex items-center space-x-4">
                {formData.image && (
                  <img src={formData.image} alt="Event Cover Preview" className="w-32 h-20 object-cover rounded-xl border border-slate-700/50 shadow-md" />
                )}
                <button
                  type="button"
                  onClick={() => setIsDesigningCover(true)}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 border border-slate-700/50"
                >
                  <ImageIcon className="w-5 h-5 text-emerald-400" />
                  <span>{formData.image ? 'Edit Cover Design' : 'Design Event Cover'}</span>
                </button>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-stone-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-200">Custom Registration Form</h3>
                  <p className="text-xs text-stone-400">Add extra fields like 'Registration No.' or 'Branch' to ask during checkout.</p>
                </div>
                <button type="button" onClick={addFormField} className="px-4 py-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg text-sm font-semibold flex items-center space-x-2 transition-all">
                  <Plus className="w-4 h-4" /> <span>Add Field</span>
                </button>
              </div>

              <div className="space-y-3">
                {(formData.customFormFields || []).map((field, index) => (
                  <div key={field.id} className="flex flex-col md:flex-row items-center gap-4 p-3 bg-slate-800/40 border border-slate-700 rounded-xl relative">
                    <div className="flex-1 w-full">
                      <input type="text" required value={field.label} onChange={e => updateFormField(field.id, 'label', e.target.value)} className="w-full bg-stone-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Field Label (e.g., Roll No.)" />
                    </div>
                    <div className="w-full md:w-48">
                      <select value={field.type} onChange={e => updateFormField(field.id, 'type', e.target.value)} className="w-full bg-stone-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                        <option value="text">Short Text</option>
                        <option value="email">Email</option>
                        <option value="number">Number</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-slate-300 flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={field.required} onChange={e => updateFormField(field.id, 'required', e.target.checked)} className="rounded text-emerald-500 focus:ring-emerald-500 bg-stone-900 border-slate-600" />
                        <span>Required</span>
                      </label>
                      <button type="button" onClick={() => removeFormField(field.id)} className="p-2 text-slate-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!formData.customFormFields || formData.customFormFields.length === 0) && (
                  <div className="text-sm text-slate-500 italic p-4 border border-dashed border-slate-700 rounded-xl text-center">
                    No custom fields added. Attendees will only be asked for Name and Email.
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-stone-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-200">Ticket Tiers</h3>
                  <p className="text-xs text-stone-400">Create multiple ticket types (GA, VIP) and design a unique pass for each.</p>
                </div>
                <button type="button" onClick={addTier} className="px-4 py-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg text-sm font-semibold flex items-center space-x-2 transition-all">
                  <Plus className="w-4 h-4" /> <span>Add Tier</span>
                </button>
              </div>

              <div className="space-y-4">
                {formData.tiers.map((tier, index) => (
                  <div key={tier.id} className="p-4 bg-slate-800/40 border border-slate-700 rounded-xl relative">
                    {formData.tiers.length > 1 && (
                      <button type="button" onClick={() => removeTier(tier.id)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pr-6">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-stone-400">Tier Name</label>
                        <input type="text" required value={tier.name} onChange={e => updateTier(tier.id, 'name', e.target.value)} className="w-full bg-stone-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="VIP Pass" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-stone-400">Price ($)</label>
                        <input type="number" min="0" step="0.01" required value={tier.price} onChange={e => updateTier(tier.id, 'price', e.target.value)} className="w-full bg-stone-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="150" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-stone-400">Capacity</label>
                        <input type="number" min="1" required value={tier.capacity} onChange={e => updateTier(tier.id, 'capacity', e.target.value)} className="w-full bg-stone-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="50" />
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {tier._previewTicket && <img src={tier._previewTicket} alt="Preview" className="w-16 h-10 object-cover rounded border border-slate-600" />}
                      <button
                        type="button"
                        onClick={() => setActiveTierId(tier.id)}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-all flex items-center space-x-2"
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

          <div className="pt-6 border-t border-slate-700/50 flex justify-end space-x-4">
            <button type="button" onClick={() => { setIsCreating(false); setEditingEventId(null); }} className="px-6 py-3 rounded-xl font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-8 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all">
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
            onSave={({ dataUrl }) => {
              setFormData({ ...formData, image: dataUrl });
              setIsDesigningCover(false);
            }}
            onCancel={() => setIsDesigningCover(false)}
          />,
          document.body
        )}
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
          <h2 className="text-2xl font-bold text-white tracking-tight">Events Management</h2>
          <p className="text-stone-400 text-sm mt-1">Manage your active events and launch new ones.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          <span>Create Event</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => {
          const stats = getEventStats(event);
          return (
            <div key={event.id} onClick={(e) => { if (e.target.tagName !== 'BUTTON') setViewingEventId(event.id); }} className="glass-panel rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col relative group cursor-pointer hover:border-emerald-500/50 transition-colors">
              <div className="h-32 bg-stone-900 relative">
                <img src={event.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800'} alt="" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                <div className="absolute top-3 right-3 px-2 py-1 bg-stone-900/80 backdrop-blur rounded border border-slate-700 text-xs font-semibold text-slate-300">
                  ID: {event.id.toString().padStart(4, '0')}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{event.title}</h3>
                <div className="space-y-1 mb-4 text-sm text-stone-400">
                  <div className="flex items-center space-x-2"><Calendar className="w-3.5 h-3.5" /> <span>{formatEventDate(event.date)}</span></div>
                  <div className="flex items-center space-x-2"><MapPin className="w-3.5 h-3.5" /> <span className="line-clamp-1">{event.venue}</span></div>
                </div>
                <div className="mt-auto pt-4 border-t border-stone-800 flex justify-between items-center text-sm">
                  <div className="text-slate-300"><span className="font-bold text-white">{stats.totalAvail}</span> / {stats.totalCap} left</div>
                  <div className="font-bold text-emerald-400">{stats.minPrice === 0 ? "Free" : `From $${stats.minPrice.toFixed(2)}`}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  const baseStyles = "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer font-medium text-sm";
  const variants = {
    default: active 
      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-inner" 
      : "text-stone-400 hover:bg-slate-800/50 hover:text-slate-200",
  };
  return (
    <div onClick={onClick} className={`${baseStyles} ${variants.default}`}>
      <div className={active ? "text-emerald-400" : ""}>{icon}</div>
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
  const toast = useToast();
  const confirm = useConfirm();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
const [events, setEvents] = useState([]);
  const [allAttendees, setAllAttendees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/v1/events');
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
      const res = await fetch('http://localhost:3000/api/v1/tickets');
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
    } catch(e) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) fetchEvents();
    } catch(e) { console.error(e); }
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) fetchEvents();
    } catch(e) { console.error(e); }
  };

  const handleDeleteEvent = async (id) => {
    try {
      const res = await fetch(`http://localhost:3000/api/v1/events/${id}`, { method: 'DELETE' });
      if (res.ok) fetchEvents();
    } catch(e) { console.error(e); }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') { // Simple password as requested
      setIsAuthenticated(true);
    } else {
      toast('Invalid password. Please try again.', 'error');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 z-0 pointer-events-none" />
        
        <form onSubmit={handleLogin} className="glass-panel border border-slate-700/50 p-8 rounded-2xl max-w-sm w-full relative z-10 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Admin Portal</h2>
            <p className="text-stone-400 text-sm">Enter password to access portal</p>
          </div>
          
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-stone-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="Password"
            autoFocus
          />
          
          <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">
            Access System
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 z-10 relative overflow-hidden font-sans">
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent z-0 pointer-events-none" />
      
      <ParticleBackground />

      <aside className="w-72 hidden md:flex flex-col relative z-20 shrink-0 h-full p-4 pl-6 py-6">
        <div className="h-full w-full bg-stone-900/40 backdrop-blur-xl border border-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.6)] rounded-2xl flex flex-col overflow-hidden">
          <div className="p-6 border-b border-white/[0.03] bg-black/20">
            <div className="flex items-center space-x-3 text-white">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Settings className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-bold text-lg tracking-tight">EventSphere</span>
            </div>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {viewingEventId ? (
              <>
                <div className="pt-2 pb-4">
                  <button onClick={() => setViewingEventId(null)} className="flex items-center space-x-2 text-stone-400 hover:text-white transition-colors text-sm font-semibold">
                    <span>← Back to Global Admin</span>
                  </button>
                </div>
                <div className="pt-2 pb-2">
                  <div className="px-3 text-xs font-bold text-emerald-500 uppercase tracking-widest font-mono">Event Controls</div>
                </div>
                <NavItem icon={<LayoutDashboard size={18} />} label="Overview" active={eventActiveTab === 'overview'} onClick={() => setEventActiveTab('overview')} />
                <NavItem icon={<LayoutDashboard size={18} />} label="Page Design" active={eventActiveTab === 'design'} onClick={() => setEventActiveTab('design')} />
                <NavItem icon={<Settings size={18} />} label="Email / SMTP Config" active={eventActiveTab === 'smtp'} onClick={() => setEventActiveTab('smtp')} />
                <NavItem icon={<Users size={18} />} label="Participant List" active={eventActiveTab === 'participants'} onClick={() => setEventActiveTab('participants')} />
              </>
            ) : (
              <>
                <NavItem icon={<LayoutDashboard size={18} />} label="Live Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <NavItem icon={<Calendar size={18} />} label="Events Management" active={activeTab === 'events_management'} onClick={() => setActiveTab('events_management')} />
                
                <div className="pt-4 pb-2">
                  <div className="px-3 text-xs font-bold text-slate-600 uppercase tracking-widest font-mono">Operations</div>
                </div>
                
                <NavItem icon={<Users size={18} />} label="Attendee Register" active={activeTab === 'attendees'} onClick={() => setActiveTab('attendees')} />
                <NavItem icon={<CreditCard size={18} />} label="Transactions" />
              </>
            )}
          </nav>
          
          <div className="p-4 border-t border-white/[0.03] bg-black/10">
            <div className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-white/[0.03] cursor-pointer transition-colors border border-transparent hover:border-white/[0.02]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 p-0.5 shadow-lg">
                <img src="https://i.pravatar.cc/150?u=admin" alt="Admin" className="w-full h-full rounded-full border-2 border-slate-900 object-cover" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">System Admin</div>
                <div className="text-xs text-slate-500 font-mono">admin@eventsphere.inc</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-20 py-6 pr-6">
        
        <header className="h-16 mb-6 bg-stone-900/40 backdrop-blur-xl border border-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.6)] rounded-2xl flex items-center justify-between px-6 shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent pointer-events-none" />
          <div className="font-bold text-slate-200 flex items-center tracking-wide text-lg relative z-10">
            {activeTab === 'events_management' ? 'Events Management' : 'Live Dashboard'}
          </div>
          <div className="flex items-center space-x-4 relative z-10">
            <button className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-white/[0.05] border border-transparent hover:border-white/[0.05] transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto rounded-2xl relative">
          {activeTab === 'events_management' ? (
            <div className="bg-stone-900/40 backdrop-blur-xl border border-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.6)] rounded-2xl p-6 min-h-full">
              <EventManager events={events} allAttendees={allAttendees || []} setAllAttendees={setAllAttendees} onAddEvent={handleAddEvent} onEditEvent={handleEditEvent} onDeleteEvent={handleDeleteEvent} viewingEventId={viewingEventId} setViewingEventId={setViewingEventId} eventActiveTab={eventActiveTab} />
            </div>
          ) : activeTab === 'attendees' ? (
            <AttendeeRegisterView events={events} allAttendees={allAttendees} />
          ) : (
            <LiveDashboardView events={events} allAttendees={allAttendees || []} />
          )}
        </div>
      </main>
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
