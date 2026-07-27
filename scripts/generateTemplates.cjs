const fs = require('fs');
const path = require('path');

const templates = [];

const palettes = {
  ga: [
    { bg: '#ffffff', gradient: 'linear-gradient(135deg, #f59e0b, #ea580c)', text: '#ffffff', sub: '#fde68a' },
    { bg: '#ffffff', gradient: 'linear-gradient(135deg, #10b981, #047857)', text: '#ffffff', sub: '#a7f3d0' },
    { bg: '#ffffff', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', text: '#ffffff', sub: '#bfdbfe' },
    { bg: '#ffffff', gradient: 'linear-gradient(135deg, #ec4899, #be185d)', text: '#ffffff', sub: '#fbcfe8' },
    { bg: '#ffffff', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', text: '#ffffff', sub: '#ddd6fe' }
  ],
  vip: [
    { bg: '#0f172a', gradient: 'linear-gradient(135deg, #0f172a, #1e293b)', text: '#ffffff', sub: '#94a3b8' },
    { bg: '#171717', gradient: 'linear-gradient(135deg, #171717, #262626)', text: '#ffffff', sub: '#a3a3a3' },
    { bg: '#18181b', gradient: 'linear-gradient(135deg, #18181b, #27272a)', text: '#ffffff', sub: '#a1a1aa' },
    { bg: '#020617', gradient: 'linear-gradient(to right, #020617, #0f172a)', text: '#ffffff', sub: '#94a3b8' },
    { bg: '#111827', gradient: 'linear-gradient(135deg, #111827, #1f2937)', text: '#ffffff', sub: '#9ca3af' }
  ],
  platinum: [
    { bg: '#000000', gradient: 'linear-gradient(135deg, #000000, #111111)', text: '#fbbf24', sub: '#d97706' },
    { bg: '#050505', gradient: 'linear-gradient(135deg, #1f1a09, #0a0803)', text: '#fcd34d', sub: '#b45309' },
    { bg: '#000000', gradient: 'linear-gradient(135deg, #2a2a2a, #000000)', text: '#e5e7eb', sub: '#9ca3af' }, // Silver
    { bg: '#050010', gradient: 'linear-gradient(135deg, #2e1065, #000000)', text: '#c084fc', sub: '#7e22ce' }, // Royal
    { bg: '#110000', gradient: 'linear-gradient(135deg, #450a0a, #000000)', text: '#fca5a5', sub: '#b91c1c' }  // Ruby
  ],
  cover: [
    { bg: '#000000', gradient: '', text: '#ffffff', sub: '#e2e8f0', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800' },
    { bg: '#000000', gradient: '', text: '#ffffff', sub: '#e2e8f0', image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=800' },
    { bg: '#000000', gradient: '', text: '#ffffff', sub: '#e2e8f0', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800' },
    { bg: '#000000', gradient: '', text: '#ffffff', sub: '#e2e8f0', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800' },
    { bg: '#000000', gradient: '', text: '#ffffff', sub: '#e2e8f0', image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=800' }
  ]
};

const layouts = [
  // Layout 1: Stub on Right (Standard)
  (color, i, tier) => ({
    id: `template-${tier}-${i}-1`,
    name: `${tier.toUpperCase()} Layout A - ${i}`,
    tier,
    canvasBg: color.bg,
    bgGradient: color.gradient,
    bgImage: '',
    elements: [
      { id: 't1', type: 'text', x: 40, y: 40, width: 450, height: 80, content: 'Event Title', color: color.text, fontSize: 56, fontWeight: '900', fontFamily: 'Inter', textAlign: 'left', rotation: 0 },
      { id: 't2', type: 'text', x: 40, y: 130, width: 300, height: 30, content: 'Date & Time • Venue', color: color.sub, fontSize: 20, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', rotation: 0 },
      { id: 't3', type: 'text', x: 40, y: 350, width: 200, height: 30, content: `${tier.toUpperCase()} PASS`, color: color.text, fontSize: 24, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'left', rotation: 0 },
      { id: 't4', type: 'text', x: 700, y: 150, width: 250, height: 60, content: 'ADMIT ONE', color: color.text, fontSize: 32, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'center', rotation: 90 },
      { id: 's1', type: 'shape', shape: 'dashed', x: 600, y: 0, width: 4, height: 450, bgColor: 'transparent', border: `2px dashed ${color.sub}`, rotation: 0 },
      { id: 'q1', type: 'qrcode', x: 630, y: 280, width: 120, height: 120, bgColor: '#ffffff', rotation: 0 },
      { id: 'i1', type: 'icon', iconType: 'calendar', x: 40, y: 170, width: 30, height: 30, color: color.sub, rotation: 0 },
      { id: 'i2', type: 'icon', iconType: 'mappin', x: 40, y: 210, width: 30, height: 30, color: color.sub, rotation: 0 }
    ]
  }),
  
  // Layout 2: Stub on Left (Vertical Title)
  (color, i, tier) => ({
    id: `template-${tier}-${i}-2`,
    name: `${tier.toUpperCase()} Layout B - ${i}`,
    tier,
    canvasBg: color.bg,
    bgGradient: color.gradient,
    bgImage: '',
    elements: [
      { id: 't1', type: 'text', x: -50, y: 180, width: 350, height: 80, content: 'Event Title', color: color.text, fontSize: 48, fontWeight: '900', fontFamily: 'Inter', textAlign: 'center', rotation: -90 },
      { id: 't2', type: 'text', x: 250, y: 50, width: 400, height: 30, content: 'Date & Time • Venue', color: color.sub, fontSize: 24, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', rotation: 0 },
      { id: 't3', type: 'text', x: 250, y: 350, width: 200, height: 30, content: `${tier.toUpperCase()} PASS`, color: color.text, fontSize: 24, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'left', rotation: 0 },
      { id: 's1', type: 'shape', shape: 'dashed', x: 200, y: 0, width: 4, height: 450, bgColor: 'transparent', border: `2px dashed ${color.sub}`, rotation: 0 },
      { id: 'q1', type: 'qrcode', x: 40, y: 300, width: 100, height: 100, bgColor: '#ffffff', rotation: 0 },
      { id: 'i1', type: 'icon', iconType: 'clock', x: 250, y: 100, width: 30, height: 30, color: color.sub, rotation: 0 }
    ]
  }),
  
  // Layout 3: Centered Cinema Style
  (color, i, tier) => ({
    id: `template-${tier}-${i}-3`,
    name: `${tier.toUpperCase()} Layout C - ${i}`,
    tier,
    canvasBg: color.bg,
    bgGradient: color.gradient,
    bgImage: '',
    elements: [
      { id: 't1', type: 'text', x: 0, y: 50, width: 800, height: 80, content: 'Event Title', color: color.text, fontSize: 64, fontWeight: '900', fontFamily: 'Inter', textAlign: 'center', rotation: 0 },
      { id: 't2', type: 'text', x: 0, y: 150, width: 800, height: 30, content: 'Date & Time • Venue', color: color.sub, fontSize: 24, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'center', rotation: 0 },
      { id: 't3', type: 'text', x: 0, y: 380, width: 800, height: 30, content: `•• ${tier.toUpperCase()} PASS ••`, color: color.text, fontSize: 20, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'center', rotation: 0 },
      { id: 'q1', type: 'qrcode', x: 330, y: 220, width: 140, height: 140, bgColor: '#ffffff', rotation: 0 },
      { id: 's1', type: 'shape', shape: 'line', x: 200, y: 200, width: 400, height: 2, bgColor: color.sub, rotation: 0 }
    ]
  }),
  
  // Layout 4: Abstract Geometric
  (color, i, tier) => ({
    id: `template-${tier}-${i}-4`,
    name: `${tier.toUpperCase()} Layout D - ${i}`,
    tier,
    canvasBg: color.bg,
    bgGradient: color.gradient,
    bgImage: '',
    elements: [
      { id: 's2', type: 'shape', shape: 'circle', x: -100, y: -100, width: 400, height: 400, bgColor: color.sub, opacity: 0.1, rotation: 0 },
      { id: 't1', type: 'text', x: 50, y: 100, width: 450, height: 80, content: 'Event Title', color: color.text, fontSize: 56, fontWeight: '900', fontFamily: 'Inter', textAlign: 'left', rotation: 0 },
      { id: 't2', type: 'text', x: 50, y: 250, width: 300, height: 30, content: 'Date & Time • Venue', color: color.sub, fontSize: 20, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', rotation: 0 },
      { id: 't3', type: 'text', x: 50, y: 300, width: 200, height: 30, content: `${tier.toUpperCase()} PASS`, color: color.text, fontSize: 24, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'left', rotation: 0 },
      { id: 'q1', type: 'qrcode', x: 550, y: 150, width: 150, height: 150, bgColor: '#ffffff', rotation: 0 }
    ]
  })
];

const coverLayouts = [
  // Cover 1: Dark Overlay Center Text
  (color, i, tier) => ({
    id: `template-${tier}-${i}-1`,
    name: `Cover Image - Style A`,
    tier,
    canvasBg: color.bg,
    bgGradient: color.gradient,
    bgImage: color.image,
    elements: [
      { id: 's1', type: 'shape', shape: 'rectangle', x: 0, y: 0, width: 800, height: 450, bgColor: '#000000', opacity: 0.6, rotation: 0 },
      { id: 't1', type: 'text', x: 0, y: 150, width: 800, height: 80, content: 'Event Title', color: color.text, fontSize: 72, fontWeight: '900', fontFamily: 'Inter', textAlign: 'center', rotation: 0 },
      { id: 't2', type: 'text', x: 0, y: 250, width: 800, height: 30, content: 'Date & Time • Venue', color: color.sub, fontSize: 24, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'center', rotation: 0 }
    ]
  }),
  // Cover 2: Gradient Bottom Left Text
  (color, i, tier) => ({
    id: `template-${tier}-${i}-2`,
    name: `Cover Image - Style B`,
    tier,
    canvasBg: color.bg,
    bgGradient: color.gradient,
    bgImage: color.image,
    elements: [
      { id: 's1', type: 'shape', shape: 'rectangle', x: 0, y: 250, width: 800, height: 200, bgColor: '#0f172a', opacity: 0.8, rotation: 0 },
      { id: 't1', type: 'text', x: 40, y: 280, width: 700, height: 80, content: 'Event Title', color: color.text, fontSize: 56, fontWeight: '900', fontFamily: 'Inter', textAlign: 'left', rotation: 0 },
      { id: 't2', type: 'text', x: 40, y: 370, width: 700, height: 30, content: 'Date & Time • Venue', color: color.sub, fontSize: 20, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'left', rotation: 0 }
    ]
  }),
  // Cover 3: Clean & Minimal Top Text
  (color, i, tier) => ({
    id: `template-${tier}-${i}-3`,
    name: `Cover Image - Style C`,
    tier,
    canvasBg: color.bg,
    bgGradient: color.gradient,
    bgImage: color.image,
    elements: [
      { id: 's1', type: 'shape', shape: 'rectangle', x: 40, y: 40, width: 450, height: 160, bgColor: '#ffffff', opacity: 0.9, borderRadius: 16, rotation: 0 },
      { id: 't1', type: 'text', x: 60, y: 60, width: 410, height: 60, content: 'Event Title', color: '#0f172a', fontSize: 48, fontWeight: '900', fontFamily: 'Inter', textAlign: 'left', rotation: 0 },
      { id: 't2', type: 'text', x: 60, y: 140, width: 410, height: 30, content: 'Date & Time • Venue', color: '#475569', fontSize: 20, fontWeight: 'bold', fontFamily: 'Inter', textAlign: 'left', rotation: 0 }
    ]
  })
];

Object.keys(palettes).forEach(tier => {
  const paletteSet = palettes[tier];
  const activeLayouts = tier === 'cover' ? coverLayouts : layouts;
  
  let count = 0;
  for (let iteration = 0; iteration < 3; iteration++) {
    for (let c = 0; c < paletteSet.length; c++) {
      for (let l = 0; l < activeLayouts.length; l++) {
        if (count >= 50) break;
        const color = paletteSet[c];
        const layoutFn = activeLayouts[l];
        templates.push(layoutFn(color, count, tier));
        count++;
      }
    }
  }
});

const dir = path.join(__dirname, '..', 'src', 'data');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(path.join(dir, 'templates.json'), JSON.stringify(templates, null, 2));

console.log(`Successfully generated ${templates.length} templates!`);
