import React, { useState, useRef, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import html2canvas from 'html2canvas';
import { 
  Type, Square, Circle, Image as ImageIcon, Download, Trash2, X, 
  QrCode, Minus, AlignLeft, AlignCenter, AlignRight, LayoutTemplate,
  RotateCw, Palette, Calendar, Clock, MapPin, User, Tag, Sparkles, Loader,
  Upload, Search, Star, Triangle, Hexagon, Heart, Zap, Diamond,
  ArrowRight, ChevronUp, ChevronDown as ChevDown, Lock
} from 'lucide-react';

// ─── Color Palette Presets ───
const COLOR_PALETTES = [
  { name: 'Midnight', colors: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8'] },
  { name: 'Neon', colors: ['#ff006e', '#8338ec', '#3a86ff', '#06d6a0', '#ffd166', '#ef476f'] },
  { name: 'Sunset', colors: ['#ff6b35', '#f7c59f', '#efefd0', '#004e89', '#1a659e', '#ff9f1c'] },
  { name: 'Forest', colors: ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7'] },
  { name: 'Royal', colors: ['#10002b', '#240046', '#3c096c', '#5a189a', '#7b2cbf', '#9d4edd'] },
  { name: 'Ocean', colors: ['#03045e', '#023e8a', '#0077b6', '#0096c7', '#00b4d8', '#48cae4'] },
  { name: 'Warm', colors: ['#d00000', '#dc2f02', '#e85d04', '#f48c06', '#faa307', '#ffba08'] },
  { name: 'Pastel', colors: ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#bdb2ff'] },
];

// ─── Extra Shape Types ───
const SHAPE_OPTIONS = [
  { type: 'rect', icon: <Square />, label: 'Rectangle' },
  { type: 'rounded', icon: <Square className="rounded-xl" />, label: 'Rounded' },
  { type: 'circle', icon: <Circle />, label: 'Circle' },
  { type: 'line', icon: <Minus />, label: 'Line' },
  { type: 'dashed', icon: <Minus className="opacity-50" />, label: 'Dashed' },
  { type: 'triangle', icon: <Triangle />, label: 'Triangle' },
  { type: 'diamond', icon: <Diamond />, label: 'Diamond' },
  { type: 'badge', icon: <Hexagon />, label: 'Badge' },
];

export default function TemplateDesigner({ onSave, onCancel, defaultTitle, defaultDate, defaultVenue, mode = 'ticket', initialTemplate = null }) {
  let resolvedTemplate = initialTemplate;
  if (typeof initialTemplate === 'string') {
    try {
      resolvedTemplate = JSON.parse(initialTemplate);
    } catch (e) {
      resolvedTemplate = null;
    }
  }

  // Formatted default string
  const defaultSubtitle = [defaultDate, defaultVenue].filter(Boolean).join(' • ') || 'Date & Time • Venue';

  // For ticket mode, always inject a QR code element
  const getDefaultElements = () => {
    const base = [
      {
        id: 'title-1', type: 'text',
        x: 50, y: 50, width: 400, height: 80,
        content: defaultTitle || 'Event Title',
        color: '#ffffff', fontSize: mode === 'cover' ? 72 : 48, fontWeight: 'bold',
        textAlign: mode === 'cover' ? 'center' : 'left', bgColor: 'transparent',
        fontFamily: 'Inter', rotation: 0
      },
      {
        id: 'subtitle-1', type: 'text',
        x: mode === 'cover' ? 0 : 50, y: mode === 'cover' ? 250 : 130,
        width: mode === 'cover' ? 800 : 300, height: 40,
        content: defaultSubtitle,
        color: '#cbd5e1', fontSize: 24, fontWeight: 'normal',
        textAlign: mode === 'cover' ? 'center' : 'left', bgColor: 'transparent',
        fontFamily: 'Inter', rotation: 0
      }
    ];
    if (mode === 'ticket') {
      base.push({
        id: 'qr-mandatory', type: 'qrcode', _locked: true,
        x: 600, y: 280, width: 140, height: 140,
        data: 'QR-CODE', bgColor: '#ffffff', rotation: 0
      });
    }
    return base;
  };

  const [elements, setElements] = useState(resolvedTemplate?.elements || getDefaultElements());
  const [selectedId, setSelectedId] = useState(null);
  const [canvasBg, setCanvasBg] = useState(resolvedTemplate?.canvasBg || '#0f172a');
  const [bgImage, setBgImage] = useState(resolvedTemplate?.bgImage || '');
  const [bgGradient, setBgGradient] = useState(resolvedTemplate?.bgGradient || '');
  const [bgOverlayOpacity, setBgOverlayOpacity] = useState(resolvedTemplate?.bgOverlayOpacity ?? 0.4);
  const [activeTab, setActiveTab] = useState('background');
  const [isExporting, setIsExporting] = useState(false);

  // Unsplash search state
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const markCustom = () => {};

  // ─── Unsplash Search ───
  const searchUnsplash = useCallback(async () => {
    if (!unsplashQuery.trim()) return;
    setUnsplashLoading(true);
    try {
      // Use Unsplash Source for free, no API key needed
      // We'll generate predictable URLs based on search query
      const results = [];
      const baseQueries = [unsplashQuery.trim()];
      // Generate 12 different image variations using the search term
      for (let i = 0; i < 12; i++) {
        results.push({
          id: `unsplash-${i}-${Date.now()}`,
          url: `https://source.unsplash.com/800x600/?${encodeURIComponent(unsplashQuery.trim())}&sig=${i}`,
          thumb: `https://source.unsplash.com/400x300/?${encodeURIComponent(unsplashQuery.trim())}&sig=${i}`,
        });
      }
      setUnsplashResults(results);
    } catch (e) {
      console.error('Unsplash search failed:', e);
    } finally {
      setUnsplashLoading(false);
    }
  }, [unsplashQuery]);

  // ─── File Upload ───
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setElements(prev => [...prev, {
        id: Date.now().toString(), type: 'image',
        x: 100, y: 100, width: 200, height: 200,
        url: ev.target.result,
        objectFit: 'cover', borderRadius: '0px', rotation: 0
      }]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ─── Element Creators ───
  const addText = (preset) => {
    const presets = {
      heading: { content: 'Heading', fontSize: 48, fontWeight: 'bold', height: 80 },
      subheading: { content: 'Subheading', fontSize: 24, fontWeight: '600', height: 50 },
      body: { content: 'Body text here', fontSize: 16, fontWeight: 'normal', height: 40 },
      label: { content: 'LABEL', fontSize: 12, fontWeight: 'bold', height: 30 },
    };
    const p = presets[preset] || presets.body;
    setElements(prev => [...prev, {
      id: Date.now().toString(), type: 'text',
      x: 100, y: 100, width: 300, height: p.height,
      content: p.content, color: '#ffffff', fontSize: p.fontSize, fontWeight: p.fontWeight,
      textAlign: 'left', bgColor: 'transparent', fontFamily: 'Inter', rotation: 0
    }]);
  };

  const addShape = (shapeType) => {
    let props = {
      id: Date.now().toString(), type: 'shape', shape: shapeType,
      x: 150, y: 150, width: 100, height: 100,
      bgColor: '#4f46e5', borderRadius: '0px', border: 'none', rotation: 0
    };
    if (shapeType === 'line') { props.height = 4; props.width = 200; }
    else if (shapeType === 'dashed') { props.height = 4; props.width = 200; props.bgColor = 'transparent'; props.border = '2px dashed #94a3b8'; }
    else if (shapeType === 'circle') { props.borderRadius = '50%'; }
    else if (shapeType === 'rounded') { props.borderRadius = '16px'; }
    else if (shapeType === 'triangle') { props.bgColor = 'transparent'; }
    else if (shapeType === 'diamond') { props.bgColor = 'transparent'; }
    else if (shapeType === 'badge') { props.bgColor = 'transparent'; }
    setElements(prev => [...prev, props]);
  };

  const addIcon = (iconType) => {
    setElements(prev => [...prev, {
      id: Date.now().toString(), type: 'icon', iconType,
      x: 100, y: 100, width: 40, height: 40,
      color: '#ffffff', rotation: 0
    }]);
  };

  const updateElement = (id, newProps) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...newProps } : el));
  };

  const deleteElement = (id) => {
    // Prevent deletion of locked QR
    const el = elements.find(e => e.id === id);
    if (el?._locked) return;
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const bringForward = (id) => {
    const currentIndex = elements.findIndex(el => el.id === id);
    if (currentIndex < elements.length - 1) {
      const newElements = [...elements];
      [newElements[currentIndex], newElements[currentIndex + 1]] = [newElements[currentIndex + 1], newElements[currentIndex]];
      setElements(newElements);
    }
  };

  const sendBackward = (id) => {
    const currentIndex = elements.findIndex(el => el.id === id);
    if (currentIndex > 0) {
      const newElements = [...elements];
      [newElements[currentIndex - 1], newElements[currentIndex]] = [newElements[currentIndex], newElements[currentIndex - 1]];
      setElements(newElements);
    }
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setSelectedId(null);

    setTimeout(async () => {
      try {
        const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, backgroundColor: canvasBg });
        onSave({
          dataUrl: canvas.toDataURL('image/jpeg', 0.9),
          templateData: { elements, canvasBg, bgImage, bgGradient, bgOverlayOpacity },
          templateId: null
        });
      } catch (error) {
        console.error("Export failed:", error);
      } finally {
        setIsExporting(false);
      }
    }, 150);
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  // Canvas size differs by mode
  const canvasWidth = mode === 'cover' ? 900 : 800;
  const canvasHeight = mode === 'cover' ? 500 : 450;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex text-slate-200">
      
      {/* ─── Icon Sidebar ─── */}
      <div className="w-[72px] bg-slate-950 border-r border-slate-800/60 flex flex-col items-center py-5 space-y-1 z-20">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-5">
          {mode === 'ticket' ? <Ticket className="w-4 h-4 text-white" /> : <ImageIcon className="w-4 h-4 text-white" />}
        </div>
        
        <SidebarTab icon={<Palette />} label="BG" active={activeTab === 'background'} onClick={() => setActiveTab('background')} />
        <SidebarTab icon={<Type />} label="Text" active={activeTab === 'text'} onClick={() => setActiveTab('text')} />
        <SidebarTab icon={<Square />} label="Shapes" active={activeTab === 'shapes'} onClick={() => setActiveTab('shapes')} />
        <SidebarTab icon={<Sparkles />} label="Elements" active={activeTab === 'elements'} onClick={() => setActiveTab('elements')} />
        <SidebarTab icon={<Upload />} label="Upload" active={activeTab === 'upload'} onClick={() => setActiveTab('upload')} />
        <SidebarTab icon={<Search />} label="Photos" active={activeTab === 'photos'} onClick={() => setActiveTab('photos')} />
      </div>

      {/* ─── Panel ─── */}
      <div className="w-[280px] bg-slate-900/95 border-r border-slate-800/60 flex flex-col h-full shadow-2xl z-10">
        <div className="px-5 py-4 border-b border-slate-800/60 flex justify-between items-center">
          <h3 className="text-base font-bold text-white capitalize">{activeTab === 'photos' ? 'Search Photos' : activeTab}</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 p-1.5 rounded-lg transition-colors"><X className="w-4 h-4"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* ─── Background Tab ─── */}
          {activeTab === 'background' && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Background Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={canvasBg} onChange={(e) => { setCanvasBg(e.target.value); setBgGradient(''); }} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-slate-700 p-0.5 flex-shrink-0" />
                  <input type="text" value={canvasBg} onChange={(e) => setCanvasBg(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono" />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Gradient</label>
                <select value={bgGradient} onChange={(e) => setBgGradient(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all">
                  <option value="">None (Solid Color)</option>
                  <option value="linear-gradient(135deg, #FF007B, #3B00FF)">Neon Purple-Pink</option>
                  <option value="linear-gradient(to right, #0f172a, #1e293b, #0f172a)">Cinematic Dark</option>
                  <option value="linear-gradient(135deg, #10b981, #047857)">Emerald Shine</option>
                  <option value="linear-gradient(to right, #f59e0b, #ea580c)">Sunset Orange</option>
                  <option value="linear-gradient(135deg, #667eea, #764ba2)">Dreamy Purple</option>
                  <option value="linear-gradient(135deg, #f093fb, #f5576c)">Pink Blush</option>
                  <option value="linear-gradient(to right, #00c6ff, #0072ff)">Sky Blue</option>
                  <option value="linear-gradient(135deg, #232526, #414345)">Charcoal</option>
                </select>
              </div>

              {bgImage && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Background Overlay</label>
                  <input 
                    type="range" min="0" max="0.9" step="0.05" 
                    value={bgOverlayOpacity} 
                    onChange={e => setBgOverlayOpacity(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Light</span><span>Dark</span>
                  </div>
                </div>
              )}

              {bgImage && (
                <button onClick={() => { setBgImage(''); }} className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-bold transition-colors">
                  Remove Background Image
                </button>
              )}

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Color Palettes</label>
                <div className="space-y-3">
                  {COLOR_PALETTES.map(palette => (
                    <div key={palette.name}>
                      <p className="text-[11px] text-slate-500 mb-1.5 font-medium">{palette.name}</p>
                      <div className="flex gap-1.5">
                        {palette.colors.map((color, i) => (
                          <button
                            key={i}
                            onClick={() => { setCanvasBg(color); setBgGradient(''); setBgImage(''); }}
                            className="w-8 h-8 rounded-lg border border-slate-700/50 hover:scale-110 hover:ring-2 hover:ring-indigo-500 transition-all shadow-sm"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Text Tab ─── */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <button onClick={() => addText('heading')} className="w-full p-4 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 rounded-xl transition-all text-left hover:border-indigo-500/50 group">
                <span className="text-2xl font-bold text-white block group-hover:text-indigo-300 transition-colors">Add a heading</span>
              </button>
              <button onClick={() => addText('subheading')} className="w-full p-4 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 rounded-xl transition-all text-left hover:border-indigo-500/50 group">
                <span className="text-lg font-semibold text-slate-200 block group-hover:text-indigo-300 transition-colors">Add a subheading</span>
              </button>
              <button onClick={() => addText('body')} className="w-full p-4 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 rounded-xl transition-all text-left hover:border-indigo-500/50 group">
                <span className="text-sm text-slate-300 block group-hover:text-indigo-300 transition-colors">Add body text</span>
              </button>
              <button onClick={() => addText('label')} className="w-full p-4 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 rounded-xl transition-all text-left hover:border-indigo-500/50 group">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block group-hover:text-indigo-300 transition-colors">ADD A LABEL</span>
              </button>
            </div>
          )}

          {/* ─── Shapes Tab ─── */}
          {activeTab === 'shapes' && (
            <div className="grid grid-cols-2 gap-2.5">
              {SHAPE_OPTIONS.map(s => (
                <ShapeButton key={s.type} icon={s.icon} label={s.label} onClick={() => addShape(s.type)} />
              ))}
            </div>
          )}

          {/* ─── Elements Tab (icons, decorations) ─── */}
          {activeTab === 'elements' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Icons</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'calendar', icon: <Calendar />, label: 'Calendar' },
                    { type: 'clock', icon: <Clock />, label: 'Clock' },
                    { type: 'mappin', icon: <MapPin />, label: 'Location' },
                    { type: 'user', icon: <User />, label: 'Person' },
                    { type: 'star', icon: <Star />, label: 'Star' },
                    { type: 'heart', icon: <Heart />, label: 'Heart' },
                    { type: 'zap', icon: <Zap />, label: 'Lightning' },
                    { type: 'tag', icon: <Tag />, label: 'Tag' },
                    { type: 'arrow', icon: <ArrowRight />, label: 'Arrow' },
                  ].map(item => (
                    <button 
                      key={item.type}
                      onClick={() => addIcon(item.type)}
                      className="flex flex-col items-center justify-center p-3 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 rounded-xl transition-all text-slate-300 hover:text-indigo-400 hover:border-indigo-500/50"
                    >
                      <div className="w-5 h-5 mb-1.5">{item.icon}</div>
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Quick Colors</label>
                <p className="text-[11px] text-slate-500 mb-2">Click to copy a color, then use it in element properties.</p>
                <div className="flex flex-wrap gap-1.5">
                  {['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'].map(c => (
                    <button
                      key={c}
                      onClick={() => navigator.clipboard.writeText(c)}
                      className="w-7 h-7 rounded-md border border-slate-700/50 hover:scale-125 transition-transform"
                      style={{ backgroundColor: c }}
                      title={`Copy ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Upload Tab ─── */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-600 hover:border-indigo-500 rounded-2xl transition-all bg-slate-800/30 hover:bg-indigo-500/5 group cursor-pointer"
              >
                <Upload className="w-10 h-10 text-slate-400 mb-3 group-hover:text-indigo-400 transition-colors" />
                <span className="font-bold text-sm text-slate-300 group-hover:text-indigo-300 transition-colors">Upload Image</span>
                <span className="text-xs text-slate-500 mt-1">PNG, JPG, SVG up to 5MB</span>
              </button>
              <p className="text-[11px] text-slate-500 text-center">Uploaded images are added as draggable elements on the canvas.</p>
            </div>
          )}

          {/* ─── Search Photos Tab ─── */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={unsplashQuery}
                  onChange={e => setUnsplashQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchUnsplash()}
                  placeholder="Search Unsplash..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
                <button 
                  onClick={searchUnsplash} 
                  disabled={unsplashLoading}
                  className="px-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors flex items-center"
                >
                  {unsplashLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['Concert', 'Abstract', 'Technology', 'Nature', 'Neon', 'City'].map(tag => (
                  <button 
                    key={tag}
                    onClick={() => { setUnsplashQuery(tag); }}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {unsplashResults.length > 0 && (
                <div>
                  <p className="text-[11px] text-slate-500 mb-2">Click to set as background, or drag onto canvas.</p>
                  <div className="grid grid-cols-2 gap-2 pb-16">
                    {unsplashResults.map(img => (
                      <button
                        key={img.id}
                        onClick={() => { setBgImage(img.url); setCanvasBg('transparent'); setBgGradient(''); }}
                        className="w-full h-24 rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all relative group"
                      >
                        <img src={img.thumb} alt="Unsplash" className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-[10px] font-bold text-white">Set as BG</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {unsplashResults.length === 0 && !unsplashLoading && (
                <div className="text-center py-8 text-slate-500">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Search for photos</p>
                  <p className="text-xs mt-1">Type a keyword and press Enter</p>
                </div>
              )}
            </div>
          )}

          {/* ─── Properties / Canvas Settings ─── */}
          <div className="h-px bg-slate-800/60 w-full" />
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">
              {selectedElement ? (selectedElement._locked ? '🔒 QR Code (Required)' : 'Properties') : 'Canvas Settings'}
            </label>

            {!selectedElement ? (
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <p className="text-xs text-slate-500">Select an element on the canvas to edit its properties.</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                {selectedElement.type === 'text' && (
                  <>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Content</label>
                      <textarea 
                        value={selectedElement.content} onChange={(e) => updateElement(selectedId, { content: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 min-h-[60px] transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Font Size</label>
                        <input type="number" value={selectedElement.fontSize} onChange={(e) => updateElement(selectedId, { fontSize: Number(e.target.value) })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Color</label>
                        <input type="color" value={selectedElement.color} onChange={(e) => updateElement(selectedId, { color: e.target.value })} className="w-full h-9 rounded-lg cursor-pointer bg-transparent border border-slate-700 p-0.5" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Font Family</label>
                      <select 
                        value={selectedElement.fontFamily} onChange={(e) => updateElement(selectedId, { fontFamily: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500"
                      >
                        <option value="Inter">Inter</option>
                        <option value="Arial">Arial</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Impact">Impact</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Weight</label>
                        <select 
                          value={selectedElement.fontWeight} onChange={(e) => updateElement(selectedId, { fontWeight: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500"
                        >
                          <option value="normal">Normal</option>
                          <option value="600">Semi Bold</option>
                          <option value="bold">Bold</option>
                          <option value="900">Black</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Align</label>
                        <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden p-0.5 h-9">
                          {['left', 'center', 'right'].map(align => (
                            <button key={align} onClick={() => updateElement(selectedId, { textAlign: align })} className={`flex-1 flex justify-center items-center rounded-md transition-colors ${selectedElement.textAlign === align ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
                              {align === 'left' && <AlignLeft className="w-3.5 h-3.5"/>}
                              {align === 'center' && <AlignCenter className="w-3.5 h-3.5"/>}
                              {align === 'right' && <AlignRight className="w-3.5 h-3.5"/>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Text Background</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={selectedElement.bgColor === 'transparent' ? '#000000' : selectedElement.bgColor} onChange={(e) => updateElement(selectedId, { bgColor: e.target.value })} className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-slate-700 p-0.5 flex-shrink-0" />
                        <button onClick={() => updateElement(selectedId, { bgColor: 'transparent' })} className="text-xs text-slate-400 hover:text-white bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg transition-colors">Transparent</button>
                      </div>
                    </div>
                  </>
                )}

                {selectedElement.type === 'shape' && (
                  <>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Fill Color</label>
                      <input type="color" value={selectedElement.bgColor === 'transparent' ? '#000000' : selectedElement.bgColor} onChange={(e) => updateElement(selectedId, { bgColor: e.target.value })} className="w-full h-9 rounded-lg cursor-pointer bg-transparent border border-slate-700 p-0.5" />
                    </div>
                    {selectedElement.shape !== 'circle' && selectedElement.shape !== 'triangle' && selectedElement.shape !== 'diamond' && selectedElement.shape !== 'badge' && (
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Border Radius</label>
                        <input type="text" value={selectedElement.borderRadius} onChange={(e) => updateElement(selectedId, { borderRadius: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Border</label>
                      <input type="text" value={selectedElement.border || 'none'} onChange={(e) => updateElement(selectedId, { border: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="2px solid #fff" />
                    </div>
                  </>
                )}

                {selectedElement.type === 'image' && (
                  <>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Image URL</label>
                      <input type="url" value={selectedElement.url} onChange={(e) => updateElement(selectedId, { url: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Border Radius</label>
                      <input type="text" value={selectedElement.borderRadius} onChange={(e) => updateElement(selectedId, { borderRadius: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Fit</label>
                      <select value={selectedElement.objectFit || 'cover'} onChange={(e) => updateElement(selectedId, { objectFit: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500">
                        <option value="cover">Cover</option>
                        <option value="contain">Contain</option>
                        <option value="fill">Fill</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedElement.type === 'qrcode' && (
                  <div>
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-xs font-bold text-indigo-300">Required Element</span>
                      </div>
                      <p className="text-[11px] text-indigo-400/80">A unique QR code will be generated for each attendee's ticket. You can reposition and resize it.</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">QR Background</label>
                      <input type="color" value={selectedElement.bgColor} onChange={(e) => updateElement(selectedId, { bgColor: e.target.value })} className="w-full h-9 rounded-lg cursor-pointer bg-transparent border border-slate-700 p-0.5" />
                    </div>
                  </div>
                )}

                {selectedElement.type === 'icon' && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Icon Color</label>
                    <input type="color" value={selectedElement.color} onChange={(e) => updateElement(selectedId, { color: e.target.value })} className="w-full h-9 rounded-lg cursor-pointer bg-transparent border border-slate-700 p-0.5" />
                  </div>
                )}

                {/* Global element controls */}
                <div className="pt-3 mt-3 border-t border-slate-800/60 space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Opacity</label>
                    <input type="range" min="0" max="1" step="0.05" value={selectedElement.opacity ?? 1} onChange={(e) => updateElement(selectedId, { opacity: parseFloat(e.target.value) })} className="w-full accent-indigo-500" />
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => sendBackward(selectedId)} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-lg text-xs font-medium text-slate-300 transition-colors flex items-center justify-center gap-1"><ChevDown className="w-3 h-3" /> Back</button>
                    <button onClick={() => bringForward(selectedId)} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-lg text-xs font-medium text-slate-300 transition-colors flex items-center justify-center gap-1"><ChevronUp className="w-3 h-3" /> Front</button>
                  </div>
                </div>

                {!selectedElement._locked && (
                  <button onClick={() => deleteElement(selectedId)} className="w-full flex items-center justify-center space-x-2 py-2.5 mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors text-sm font-bold">
                    <Trash2 className="w-4 h-4" /> <span>Delete Element</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800/60 bg-slate-900/80">
          <button 
            onClick={handleExport} disabled={isExporting}
            className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isExporting ? <Loader className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            <span>{isExporting ? 'Generating...' : 'Save & Apply'}</span>
          </button>
        </div>
      </div>

      {/* ─── Canvas Workspace ─── */}
      <div 
        className="flex-1 bg-slate-950/50 flex items-center justify-center relative overflow-hidden"
        onClick={() => setSelectedId(null)}
        style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      >
        {/* Mode indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-full text-xs font-bold text-slate-400 z-30">
          {mode === 'ticket' ? '🎫 Ticket Designer' : '🖼️ Cover Designer'} — {canvasWidth}×{canvasHeight}
        </div>

        <div 
          ref={canvasRef}
          className="relative shadow-[0_0_60px_rgba(0,0,0,0.6)] overflow-hidden rounded-lg"
          style={{ 
            width: canvasWidth, height: canvasHeight, 
            backgroundColor: canvasBg,
            backgroundImage: bgImage ? `url(${bgImage})` : (bgGradient || 'none'),
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {bgImage && (
            <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: bgOverlayOpacity }} />
          )}
          {elements.map((el, index) => {
            const isSelected = selectedId === el.id;
            return (
              <Rnd
                key={el.id}
                position={{ x: el.x, y: el.y }}
                size={{ width: el.width, height: el.height }}
                onDrag={(e, d) => updateElement(el.id, { x: d.x, y: d.y })}
                onResize={(e, direction, ref, delta, position) => {
                  updateElement(el.id, { width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...position });
                }}
                onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
                className={`group ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-transparent' : ''}`}
                style={{ zIndex: index + 1, opacity: el.opacity ?? 1, userSelect: 'none', cursor: 'move' }}
              >
                {el.type === 'text' && (
                  <div style={{ width: '100%', height: '100%', color: el.color, fontSize: `${el.fontSize}px`, fontWeight: el.fontWeight, fontFamily: el.fontFamily, backgroundColor: el.bgColor, textAlign: el.textAlign, display: 'flex', flexDirection: 'column', justifyContent: 'center', pointerEvents: 'none', transform: `rotate(${el.rotation || 0}deg)`, lineHeight: 1.2 }}>
                    {el.content}
                  </div>
                )}
                
                {el.type === 'shape' && el.shape === 'triangle' && (
                  <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <svg viewBox="0 0 100 100" width="100%" height="100%">
                      <polygon points="50,5 95,95 5,95" fill={el.bgColor === 'transparent' ? '#4f46e5' : el.bgColor} />
                    </svg>
                  </div>
                )}
                {el.type === 'shape' && el.shape === 'diamond' && (
                  <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <svg viewBox="0 0 100 100" width="100%" height="100%">
                      <polygon points="50,5 95,50 50,95 5,50" fill={el.bgColor === 'transparent' ? '#4f46e5' : el.bgColor} />
                    </svg>
                  </div>
                )}
                {el.type === 'shape' && el.shape === 'badge' && (
                  <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <svg viewBox="0 0 100 100" width="100%" height="100%">
                      <polygon points="50,3 61,38 98,38 68,60 79,95 50,73 21,95 32,60 2,38 39,38" fill={el.bgColor === 'transparent' ? '#4f46e5' : el.bgColor} />
                    </svg>
                  </div>
                )}
                {el.type === 'shape' && !['triangle', 'diamond', 'badge'].includes(el.shape) && (
                  <div style={{ width: '100%', height: '100%', backgroundColor: el.bgColor, borderRadius: el.borderRadius, border: el.border || 'none', pointerEvents: 'none', transform: `rotate(${el.rotation || 0}deg)` }} />
                )}

                {el.type === 'icon' && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: el.color, pointerEvents: 'none', transform: `rotate(${el.rotation || 0}deg)` }}>
                    {el.iconType === 'calendar' && <Calendar style={{ width: '100%', height: '100%' }} />}
                    {el.iconType === 'clock' && <Clock style={{ width: '100%', height: '100%' }} />}
                    {el.iconType === 'mappin' && <MapPin style={{ width: '100%', height: '100%' }} />}
                    {el.iconType === 'user' && <User style={{ width: '100%', height: '100%' }} />}
                    {el.iconType === 'star' && <Star style={{ width: '100%', height: '100%' }} />}
                    {el.iconType === 'heart' && <Heart style={{ width: '100%', height: '100%' }} />}
                    {el.iconType === 'zap' && <Zap style={{ width: '100%', height: '100%' }} />}
                    {el.iconType === 'tag' && <Tag style={{ width: '100%', height: '100%' }} />}
                    {el.iconType === 'arrow' && <ArrowRight style={{ width: '100%', height: '100%' }} />}
                  </div>
                )}

                {el.type === 'image' && (
                  <img src={el.url} alt="Element" draggable={false} style={{ width: '100%', height: '100%', objectFit: el.objectFit, borderRadius: el.borderRadius, pointerEvents: 'none', transform: `rotate(${el.rotation || 0}deg)` }} crossOrigin="anonymous" />
                )}

                {el.type === 'qrcode' && (
                  <div style={{ width: '100%', height: '100%', backgroundColor: el.bgColor, padding: '8px', borderRadius: '8px', pointerEvents: 'none', transform: `rotate(${el.rotation || 0}deg)` }}>
                    <div className="w-full h-full border-2 border-dashed border-slate-400 rounded flex flex-col items-center justify-center">
                      <QrCode className="w-8 h-8 text-slate-500 mb-1" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase">QR Code</span>
                    </div>
                  </div>
                )}
                
                {/* Hover outline */}
                {!isSelected && !isExporting && (
                  <div className="absolute inset-0 border border-slate-500/0 group-hover:border-indigo-400/40 transition-colors pointer-events-none rounded" />
                )}
                {/* Lock badge for QR */}
                {el._locked && !isExporting && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg pointer-events-none z-10">
                    <Lock className="w-3 h-3 text-white" />
                  </div>
                )}
              </Rnd>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Need Ticket icon for the sidebar logo ───
function Ticket(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
      <path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
    </svg>
  );
}

function SidebarTab({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-3 px-1 w-full border-l-2 transition-all ${
        active ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
      }`}
    >
      <div className="w-5 h-5 mb-1">{icon}</div>
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function ShapeButton({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-3.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 rounded-xl transition-all text-slate-300 hover:text-indigo-400 hover:border-indigo-500/50">
      <div className="w-6 h-6 mb-1.5 flex items-center justify-center">{icon}</div>
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}
