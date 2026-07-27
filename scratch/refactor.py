import re

with open('src/components/TemplateDesigner.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove PREBUILT_TEMPLATES import
content = content.replace("import PREBUILT_TEMPLATES from '../data/templates.json';\n", "")

# 2. Fix resolvedTemplate logic
content = content.replace('''  const resolvedTemplate = typeof initialTemplate === 'string' 
    ? PREBUILT_TEMPLATES.find(t => t.id === initialTemplate)
    : initialTemplate;

  const [activeTemplateId, setActiveTemplateId] = useState(typeof initialTemplate === 'string' ? initialTemplate : null);''', '''  const resolvedTemplate = typeof initialTemplate === 'string' ? null : initialTemplate;
  const [activeTemplateId, setActiveTemplateId] = useState(null);''')

# 3. Change 'templates' to 'background' in default activeTab
content = content.replace("const [activeTab, setActiveTab] = useState('templates');", "const [activeTab, setActiveTab] = useState('background');")

# 4. Remove loadTemplate function entirely
content = re.sub(r'  const loadTemplate =.*?};\n\n  const markCustom', '  const markCustom', content, flags=re.DOTALL)

# 5. Update SidebarTab
content = content.replace("<SidebarTab icon={mode === 'ticket' ? <LayoutTemplate /> : <ImageIcon />} label={mode === 'ticket' ? 'Templates' : 'Stock'} active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} />", "<SidebarTab icon={<ImageIcon />} label='Background' active={activeTab === 'background'} onClick={() => setActiveTab('background')} />")


# 6. Replace the activeTab === 'templates' section with 'background' section
old_templates_block = r"          \{activeTab === 'templates'.*?            <\/div>\n          \}"
new_bg_block = """          {activeTab === 'background' && (
            <div className="h-full flex flex-col">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-300">Stock Images</h3>
                <p className="text-xs text-slate-500 mb-3">High-res backgrounds from Unsplash.</p>
                
                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-400 mb-2 block">Background Darkness</label>
                  <input 
                    type="range" min="0" max="0.9" step="0.1" 
                    value={bgOverlayOpacity} 
                    onChange={e => { setBgOverlayOpacity(parseFloat(e.target.value)); markCustom(); }}
                    className="w-full accent-indigo-500" 
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {STOCK_CATEGORIES.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setStockCategory(cat)}
                      className={`px-3 py-1 text-xs font-bold rounded-full border ${stockCategory === cat ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-2 pb-20">
                {STOCK_IMAGES.filter(img => stockCategory === 'All' || img.category === stockCategory).map(img => (
                  <button 
                    key={img.id}
                    onClick={() => { setBgImage(img.url); setCanvasBg('transparent'); setBgGradient(''); markCustom(); }}
                    className="w-full h-24 rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all relative group"
                  >
                    <img src={img.url} alt="Stock" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-xs font-bold text-white">Apply</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}"""
content = re.sub(old_templates_block, new_bg_block, content, flags=re.DOTALL)

with open('src/components/TemplateDesigner.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
