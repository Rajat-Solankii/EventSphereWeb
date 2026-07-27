import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { 
  Calendar, MapPin, Ticket, CreditCard, 
  CheckCircle2, Loader2, Download, Activity, Clock 
} from 'lucide-react';

// --- INITIAL STATE ---
const INITIAL_EVENTS = [];

function DynamicTicket({ template, previewTicket, tierName, attendeeId, attendeeName }) {
  const [downloading, setDownloading] = useState(false);
  const ticketRef = useRef(null);

  // Simple fallback template when none is provided
  const FALLBACK_TEMPLATE = {
    canvasBg: '#0f172a',
    bgImage: '',
    bgGradient: 'linear-gradient(135deg, #1e293b, #0f172a)',
    bgOverlayOpacity: 0.4,
    elements: [
      { id: 'fb-title', type: 'text', x: 50, y: 50, width: 400, height: 80, content: 'Event Pass', color: '#ffffff', fontSize: 48, fontWeight: 'bold', textAlign: 'left', bgColor: 'transparent', fontFamily: 'Inter', rotation: 0 },
      { id: 'fb-tier', type: 'text', x: 50, y: 140, width: 300, height: 40, content: tierName || 'General Admission', color: '#94a3b8', fontSize: 22, fontWeight: '600', textAlign: 'left', bgColor: 'transparent', fontFamily: 'Inter', rotation: 0 },
      { id: 'fb-qr', type: 'qrcode', x: 600, y: 280, width: 140, height: 140, data: 'QR', bgColor: '#ffffff', rotation: 0 },
    ]
  };

  const resolveTemplate = (tmpl) => {
    if (!tmpl) return FALLBACK_TEMPLATE;
    if (typeof tmpl === 'object' && (tmpl.elements || tmpl.pages)) return tmpl;
    if (typeof tmpl === 'string') {
      try {
        const parsed = JSON.parse(tmpl);
        if (parsed && typeof parsed === 'object' && (parsed.elements || parsed.pages)) return parsed;
      } catch (e) {
        // It might be an old string ID like "t1", just ignore and fallback
      }
    }
    return FALLBACK_TEMPLATE;
  };

  const actualTemplate = resolveTemplate(template);
  if (!actualTemplate) return null;
  
  const isPolotno = !!actualTemplate.pages;
  
  const canvasBg = actualTemplate.canvasBg || '#0f172a';
  const bgImage = isPolotno ? (previewTicket || '') : actualTemplate.bgImage;
  const bgGradient = actualTemplate.bgGradient || '';
  const bgOverlayOpacity = actualTemplate.bgOverlayOpacity ?? 0.4;
  const elements = actualTemplate.elements || [];
  
  const renderPolotnoOverlay = () => {
    let nameEl = null;
    let qrEl = null;
    
    if (actualTemplate?.pages?.[0]?.children) {
      actualTemplate.pages[0].children.forEach(el => {
        if (el?.custom?.isAttendeeName || (el.text && el.text.includes('{{ATTENDEE_NAME}}'))) nameEl = el;
        if (el?.custom?.isQRCode || (el.src && el.src.includes('create-qr-code'))) qrEl = el;
      });
    }

    return (
      <>
         <img src={bgImage} alt='' style={{width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, objectFit: 'cover'}} crossOrigin='anonymous' />
         
         {nameEl ? (
           <div style={{ 
             position: 'absolute', left: nameEl.x, top: nameEl.y, color: nameEl.fill, fontSize: nameEl.fontSize,
             fontFamily: nameEl.fontFamily, fontWeight: nameEl.fontWeight || 'bold',
             transform: `rotate(${nameEl.rotation || 0}deg)`, zIndex: 20
           }}>
             {attendeeName || 'Attendee Name'}
           </div>
         ) : (
           <div style={{ position: 'absolute', bottom: '30px', left: '40px', color: 'white', zIndex: 10, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
             <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{attendeeName || 'Attendee Name'}</div>
             <div style={{ fontSize: '20px', opacity: 0.9 }}>{tierName} Pass</div>
           </div>
         )}

         {qrEl ? (
           <div style={{ 
             position: 'absolute', left: qrEl.x, top: qrEl.y, width: qrEl.width, height: qrEl.height,
             transform: `rotate(${qrEl.rotation || 0}deg)`, backgroundColor: 'white', padding: '8px', borderRadius: '8px', zIndex: 20
           }}>
             <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(attendeeId)}`} alt='QR' style={{width: '100%', height: '100%'}} crossOrigin='anonymous' />
           </div>
         ) : (
           <div style={{ position: 'absolute', bottom: '30px', right: '40px', width: '120px', height: '120px', backgroundColor: 'white', padding: '8px', borderRadius: '12px', zIndex: 10, boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
             <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(attendeeId)}`} alt='QR' style={{width: '100%', height: '100%'}} crossOrigin='anonymous' />
           </div>
         )}
      </>
    );
  };

  const renderTicketContent = () => {
    if (isPolotno) return renderPolotnoOverlay();
    return (
    <>
      {bgImage && <div className="absolute inset-0 bg-black pointer-events-none z-0" style={{ opacity: bgOverlayOpacity ?? 0.4 }} />}
      {elements.map((el, i) => (
        <div key={el.id} style={{ position: 'absolute', left: el.x, top: el.y, width: el.width, height: el.height, zIndex: i + 1, opacity: el.opacity ?? 1 }}>
          {el.type === 'text' && (
            <div style={{ width: '100%', height: '100%', color: el.color, fontSize: `${el.fontSize}px`, fontWeight: el.fontWeight, fontFamily: el.fontFamily, textAlign: el.textAlign, display: 'flex', flexDirection: 'column', justifyContent: 'center', transform: `rotate(${el.rotation || 0}deg)` }}>
              {el.content}
            </div>
          )}
          {el.type === 'shape' && el.shape === 'triangle' && (
            <div style={{ width: '100%', height: '100%' }}>
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <polygon points="50,5 95,95 5,95" fill={el.bgColor === 'transparent' ? '#4f46e5' : el.bgColor} />
              </svg>
            </div>
          )}
          {el.type === 'shape' && el.shape === 'diamond' && (
            <div style={{ width: '100%', height: '100%' }}>
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <polygon points="50,5 95,50 50,95 5,50" fill={el.bgColor === 'transparent' ? '#4f46e5' : el.bgColor} />
              </svg>
            </div>
          )}
          {el.type === 'shape' && el.shape === 'badge' && (
            <div style={{ width: '100%', height: '100%' }}>
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <polygon points="50,3 61,38 98,38 68,60 79,95 50,73 21,95 32,60 2,38 39,38" fill={el.bgColor === 'transparent' ? '#4f46e5' : el.bgColor} />
              </svg>
            </div>
          )}
          {el.type === 'shape' && !['triangle', 'diamond', 'badge'].includes(el.shape) && (
            <div style={{ width: '100%', height: '100%', backgroundColor: el.bgColor, borderRadius: el.borderRadius, border: el.border || 'none', transform: `rotate(${el.rotation || 0}deg)` }} />
          )}
          {el.type === 'icon' && (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: el.color, transform: `rotate(${el.rotation || 0}deg)` }}>
              {el.iconType === 'calendar' && <Calendar style={{ width: '100%', height: '100%' }} />}
              {el.iconType === 'clock' && <Clock style={{ width: '100%', height: '100%' }} />}
              {el.iconType === 'mappin' && <MapPin style={{ width: '100%', height: '100%' }} />}
            </div>
          )}
          {el.type === 'image' && (
            <img src={el.url} alt="" style={{ width: '100%', height: '100%', objectFit: el.objectFit, borderRadius: el.borderRadius, transform: `rotate(${el.rotation || 0}deg)` }} crossOrigin="anonymous" />
          )}
          {el.type === 'qrcode' && (
            <div style={{ width: '100%', height: '100%', backgroundColor: el.bgColor, padding: '8px', borderRadius: '8px', transform: `rotate(${el.rotation || 0}deg)` }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(attendeeId)}`} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
            </div>
          )}
        </div>
      ))}
    </>
    );
  };

  const handleDownload = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(ticketRef.current, { useCORS: true, allowTaint: true, scale: 2 });
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement('a');
      link.download = `Pass_${attendeeId || 'Ticket'}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate ticket image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={ticketRef} className="relative overflow-hidden" style={{ width: 800, height: 450, backgroundColor: canvasBg, backgroundImage: bgImage ? `url(${bgImage})` : (bgGradient || 'none'), backgroundSize: 'cover', backgroundPosition: 'center' }}>
          {renderTicketContent()}
        </div>
      </div>
      <div className="w-full overflow-hidden flex justify-center mt-2 relative">
        <div style={{ transform: 'scale(0.5)', transformOrigin: 'top center', marginBottom: '-225px' }}>
          <div className="relative shadow-2xl overflow-hidden rounded-xl border border-slate-700/30" style={{ width: 800, height: 450, backgroundColor: canvasBg, backgroundImage: bgImage ? `url(${bgImage})` : (bgGradient || 'none'), backgroundSize: 'cover', backgroundPosition: 'center' }}>
            {renderTicketContent()}
          </div>
        </div>
      </div>
      <button onClick={handleDownload} disabled={downloading} className="mt-10 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all flex items-center space-x-2">
        {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
        <span>{downloading ? 'Processing Ticket...' : 'Download Pass'}</span>
      </button>
    </div>
  );
}

import { useParams, useNavigate } from 'react-router-dom';

export default function Registration() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [targetEvent, setTargetEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/v1/events');
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map(e => ({
            ...e,
            capacity: e.total_capacity,
            available: e.available_slots,
            date: new Date(e.date_time).toISOString().split('T')[0]
          }));
          const ev = mapped.find(e => e.id.toString() === eventId);
          setTargetEvent(ev);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const [selectedTier, setSelectedTier] = useState(null);
  const [bookingState, setBookingState] = useState('idle'); // idle, loading, success
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [customFormData, setCustomFormData] = useState({});
  const [generatedPassId, setGeneratedPassId] = useState('');

  const hasCustomName = targetEvent?.customFormFields?.some(f => f.label.toLowerCase().includes('name')) || false;
  const hasCustomEmail = targetEvent?.customFormFields?.some(f => f.label.toLowerCase().includes('email')) || false;
  const hasCustomPhone = targetEvent?.customFormFields?.some(f => f.label.toLowerCase().includes('phone')) || false;

  const finalName = hasCustomName ? Object.values(customFormData)[0] : attendeeName;
  const finalEmail = hasCustomEmail ? Object.values(customFormData)[1] : attendeeEmail;
  const finalPhone = hasCustomPhone ? Object.values(customFormData)[2] : attendeePhone;
  const closeSheet = () => {
    setSelectedTier(null);
    setBookingState('idle');
    setAttendeeName('');
    setAttendeeEmail('');
    setAttendeePhone('');
    setCustomFormData({});
    setGeneratedPassId('');
  };

  const handleBookTicket = () => {
    if (!finalName || !finalEmail) return;
    
    setBookingState('loading');
    setTimeout(() => {
      const passId = `EVT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const newAttendee = {
        passId,
        name: finalName,
        email: finalEmail,
        phone: finalPhone,
        customData: customFormData,
        eventId: targetEvent.id,
        eventTitle: targetEvent.title,
        eventDate: targetEvent.date,
        eventVenue: targetEvent.venue,
        tierId: selectedTier.id,
        tierName: selectedTier.name,
        timestamp: new Date().toISOString()
      };
      
      const existing = JSON.parse(localStorage.getItem('eventos_attendees') || '[]');
      localStorage.setItem('eventos_attendees', JSON.stringify([...existing, newAttendee]));
      
      // Trigger live storage event for same-window updates
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'eventos_attendees'
      }));

      // Send email via backend (fails silently if backend not running)
      fetch('http://localhost:3000/api/v1/tickets/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendee: newAttendee })
      }).catch(err => console.log('SMTP backend not reachable', err));

      
      setGeneratedPassId(passId);
      setBookingState('success');
    }, 1500);
  };

  const pageConfig = targetEvent?.page_config || { primaryColor: '#10b981', bgColor: '#020617', bgImage: '', showSocials: true };

  return (
    <div className="min-h-screen text-slate-200 font-sans relative flex flex-col" style={{ backgroundColor: pageConfig.bgColor, color: '#ffffff' }}>
      <style>{`
        :root {
          --theme-primary: ${pageConfig.primaryColor};
        }
        .theme-btn {
          background-color: var(--theme-primary) !important;
          box-shadow: 0 0 20px color-mix(in srgb, var(--theme-primary) 40%, transparent);
        }
        .theme-btn:hover {
          filter: brightness(1.15);
        }
        .theme-btn:disabled {
          filter: brightness(0.7);
        }
        .theme-text {
          color: var(--theme-primary) !important;
        }
        .theme-border {
          border-color: var(--theme-primary) !important;
        }
        .theme-hover-border:hover {
          border-color: var(--theme-primary) !important;
          box-shadow: 0 0 15px color-mix(in srgb, var(--theme-primary) 30%, transparent);
        }
        .theme-hover-bg:hover {
          background-color: color-mix(in srgb, var(--theme-primary) 15%, transparent) !important;
        }
        .theme-focus:focus {
          border-color: var(--theme-primary) !important;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-primary) 30%, transparent);
        }
      `}</style>
      
      {pageConfig.bgImage ? (
        <div className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none" style={{ backgroundImage: `url("${pageConfig.bgImage}")`, filter: 'blur(20px)' }} />
      ) : (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: pageConfig.primaryColor, opacity: 0.2 }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        </>
      )}

      <div className="flex-1 overflow-y-auto p-8 lg:p-12 z-10 relative w-full h-full flex flex-col items-center justify-center">
        {isLoading ? (
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white">Loading Event...</h2>
          </div>
        ) : !targetEvent ? (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Event Not Found</h2>
            <p className="text-slate-400 mb-8">The event you are looking for does not exist or has been removed.</p>
            <button onClick={() => navigate('/')} className="px-6 py-3 rounded-xl text-white font-bold transition-colors theme-btn">
              Return Home
            </button>
          </div>
        ) : (
          <div className="max-w-4xl w-full mx-auto bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
            {/* Event Info Left Column */}
            <div className="w-full md:w-1/2 h-64 md:h-auto relative overflow-hidden bg-slate-900">
              <img src={targetEvent.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800'} alt="" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <h1 className="text-4xl font-black text-white leading-tight mb-4">{targetEvent.title}</h1>
                <div className="space-y-3">
                  <div className="flex items-center text-slate-300 space-x-3">
                    <Calendar className="w-5 h-5 theme-text" />
                    <span>{targetEvent.date}</span>
                  </div>
                  <div className="flex items-center text-slate-300 space-x-3">
                    <MapPin className="w-5 h-5 theme-text" />
                    <span>{targetEvent.venue}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Selection Right Column */}
            <div className="w-full md:w-1/2 p-8 flex flex-col justify-center min-h-[500px]">
              {bookingState !== 'success' ? (
                <>
                  {!selectedTier ? (
                    <div className="space-y-6 animate-in fade-in">
                      <h3 className="text-xl font-bold text-white mb-2">Select a Ticket</h3>
                      <div className="space-y-4">
                        {targetEvent.tiers.map(tier => (
                          <div 
                            key={tier.id}
                            onClick={() => tier.available > 0 && setSelectedTier(tier)}
                            className={`p-5 rounded-2xl border-2 transition-all ${tier.available > 0 ? 'bg-slate-800/40 border-slate-700 theme-hover-border theme-hover-bg cursor-pointer shadow-lg' : 'bg-slate-900/50 border-slate-800 opacity-60 cursor-not-allowed'} flex justify-between items-center`}
                          >
                            <div>
                              <h4 className="font-bold text-white text-lg">{tier.name}</h4>
                              <p className="text-sm text-slate-400 mt-1">{tier.available > 0 ? `${tier.available} passes remaining` : 'Sold Out'}</p>
                            </div>
                            <div className="text-right">
                              <div className="font-black text-2xl text-white">{Number(tier.price) === 0 ? "Free" : `$${Number(tier.price).toFixed(2)}`}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                      <div className="flex items-center space-x-4 mb-4">
                        <button onClick={() => setSelectedTier(null)} className="text-sm theme-text font-semibold hover:opacity-80 transition-opacity">← Back to Tiers</button>
                      </div>
                      
                      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 space-y-4">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                          <span className="text-slate-300">Ticket Type</span>
                          <span className="font-bold text-white">{selectedTier.name}</span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                          <span className="text-slate-300">Price</span>
                          <span className="font-bold text-white">{Number(selectedTier.price) === 0 ? "Free" : `$${Number(selectedTier.price).toFixed(2)}`}</span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                          <span className="text-slate-300">Platform Fee</span>
                          <span className="font-bold text-white">{Number(selectedTier.price) === 0 ? "Free" : "$2.50"}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 text-lg">
                          <span>Total</span>
                          <span>{Number(selectedTier.price) === 0 ? "Free" : `$${(Number(selectedTier.price) + 2.50).toFixed(2)}`}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Attendee Details</label>
                        {!hasCustomName && <input type="text" placeholder="Full Name" required value={attendeeName} onChange={e => setAttendeeName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 theme-focus transition-all" />}
                        {!hasCustomEmail && <input type="email" placeholder="Email Address" required value={attendeeEmail} onChange={e => setAttendeeEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 theme-focus transition-all" />}
                        {!hasCustomPhone && <input type="tel" placeholder="Phone Number (Optional)" value={attendeePhone} onChange={e => setAttendeePhone(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 theme-focus transition-all" />}
                        
                        {(targetEvent.customFormFields || []).map(field => (
                          <input 
                            key={field.id}
                            type={field.type} 
                            placeholder={field.label} 
                            required={field.required}
                            value={customFormData[field.id] || ''}
                            onChange={e => setCustomFormData({...customFormData, [field.id]: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 theme-focus transition-all" 
                          />
                        ))}
                      </div>

                      <div className="pt-4">
                        <button 
                          onClick={handleBookTicket}
                          disabled={bookingState === 'loading' || !finalName || !finalEmail}
                          className="w-full py-4 rounded-xl theme-btn text-white font-bold text-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {bookingState === 'loading' ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /><span>Processing...</span></>
                          ) : (
                            <><CreditCard className="w-5 h-5" /><span>Claim Pass</span></>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-6 pt-8 animate-in fade-in zoom-in duration-500">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 rounded-full border-2 border-green-500/30" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}></div>
                      <div className="absolute inset-0 rounded-full flex items-center justify-center border-2 border-green-500/30 text-green-400">
                        <CheckCircle2 className="w-12 h-12" />
                      </div>
                    </div>
                    <div className="text-center space-y-2 mb-8">
                      <h3 className="text-2xl font-bold text-white">You're All Set!</h3>
                      <p className="text-slate-400 text-sm">A confirmation email has been sent to your inbox.</p>
                    </div>
                    
                    <DynamicTicket template={selectedTier.template} previewTicket={selectedTier._previewTicket} tierName={selectedTier.name} attendeeId={generatedPassId} attendeeName={attendeeName} />
                  </div>
                )}
              </div>
            </div>
        )}
      </div>
    </div>
  );
}
