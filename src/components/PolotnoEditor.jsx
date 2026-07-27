import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { createStore } from 'polotno/model/store';
import { Workspace } from 'polotno/canvas/workspace';
import { SidePanel } from 'polotno/side-panel';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';





import 'polotno/blueprint.css';
import 'polotno/ui.css';
import 'polotno/fonts.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
// Create a singleton store
const store = createStore();

const PolotnoEditor = observer(({ onSave, onCancel, defaultTitle, initialTemplate, mode = 'ticket' }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Wait for the store to be ready
    if (!isLoaded) {
      if (initialTemplate) {
        try {
          store.loadJSON(initialTemplate);
        } catch (e) {
          console.error("Failed to load initial template to Polotno", e);
          store.addPage();
        }
      } else {
        // Create default page
        store.addPage();
        if (mode === 'cover') {
          store.setSize(800, 450); // 16:9 for cover
        } else {
          store.setSize(800, 450); // 16:9 for ticket
        }
      }
      setIsLoaded(true);
    }
  }, [isLoaded, initialTemplate, mode]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      div[style*="background: red"][style*="color: white"] { display: none !important; }
      div[style*="background-color: red"][style*="color: white"] { display: none !important; }
      div[style*="background: rgb(255, 0, 0)"][style*="color: white"] { display: none !important; }
      a[href*="polotno.com/contact"] { display: none !important; }
    `;
    document.head.appendChild(style);

    // Hide Polotno watermarks permanently using MutationObserver
    const observer = new MutationObserver((mutations) => {
      const elements = document.querySelectorAll('div, span, a');
      elements.forEach(el => {
        const txt = el.textContent ? el.textContent.trim() : '';
        if (txt === 'LICENSE KEY IS MISSING' || txt.includes('Please activate your license') || txt.includes('Powered by polotno.com')) {
           el.style.display = 'none';
           if (el.parentElement && el.parentElement.tagName !== 'BODY') {
               el.parentElement.style.opacity = '0';
               el.parentElement.style.pointerEvents = 'none';
           }
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, []);

  const addQRCode = () => {
    store.activePage.addElement({
      type: 'image',
      src: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PLACEHOLDER',
      x: 50,
      y: 50,
      width: 150,
      height: 150,
      custom: { isQRCode: true }
    });
  };

  const addName = () => {
    store.activePage.addElement({
      type: 'text',
      text: '{{ATTENDEE_NAME}}',
      x: 50,
      y: 220,
      fontSize: 32,
      fontFamily: 'Roboto',
      fill: '#000000',
      custom: { isAttendeeName: true }
    });
  };

  const handleSave = async () => {
    // Generate high quality data URL
    const dataUrl = await store.toDataURL({ pixelRatio: 2 });
    const templateData = store.toJSON();
    
    if (onSave) {
      onSave({
        dataUrl,
        templateData,
        templateId: null
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col font-sans bp6-dark polotno-app" style={{ margin: 0, padding: 0 }}>
      <div className="h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6">
        <div>
          <h2 className="text-white font-bold text-lg">{defaultTitle || 'Design Editor'}</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={addName} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm text-white transition-colors">
            + Attendee Name
          </button>
          <button onClick={addQRCode} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm text-white transition-colors">
            + QR Code
          </button>
          <div className="w-px h-6 bg-slate-700 mx-2"></div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            Save Design
          </button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden bg-slate-900" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="w-[400px] flex flex-col border-r border-slate-800 bg-slate-950">
          <SidePanel store={store} />
        </div>
        
        <div className="flex-1 flex flex-col relative">
          <div className="h-14 border-b border-slate-800 bg-slate-950/50 backdrop-blur">
            <Toolbar store={store} components={{
              ActionControls: () => null, // Hide default save buttons
              ZoomButtons: ZoomButtons
            }} />
          </div>
          <div className="flex-1 relative overflow-auto bg-slate-900">
            <Workspace store={store} />
          </div>
        </div>
      </div>
    </div>
  );
});

export default PolotnoEditor;
