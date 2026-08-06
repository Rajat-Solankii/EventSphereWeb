const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.jsx', 'utf8');

// 1. Add jsQR import
content = content.replace(
  "import UserProfileSettings from '../components/admin/UserProfileSettings';",
  "import UserProfileSettings from '../components/admin/UserProfileSettings';\nimport jsQR from 'jsqr';"
);

// 2. Add paymentConfig state
content = content.replace(
  "const [pageConfig, setPageConfig] = useState({ primaryColor: '#10b981', bgColor: '#020617', bgImage: '', showSocials: true });\n  const initializedEventId = useRef(null);",
  "const [pageConfig, setPageConfig] = useState({ primaryColor: '#10b981', bgColor: '#020617', bgImage: '', showSocials: true });\n  const [paymentConfig, setPaymentConfig] = useState('');\n  const initializedEventId = useRef(null);"
);

// 3. Initialize paymentConfig
content = content.replace(
  "setPageConfig(event.page_config || { primaryColor: '#10b981', bgColor: '#020617', bgImage: '', showSocials: true });\n        initializedEventId.current = viewingEventId;",
  "setPageConfig(event.page_config || { primaryColor: '#10b981', bgColor: '#020617', bgImage: '', showSocials: true });\n        setPaymentConfig(event.payment_config || '');\n        initializedEventId.current = viewingEventId;"
);

// 4. Update handlePageConfigSave and add handlePaymentConfigSave + handleQRUpload
const oldHandlePageConfig = `    const handlePageConfigSave = async (e) => {
      e.preventDefault();
      try {
        const res = await fetch(\`http://localhost:3000/api/v1/events/\${event.id}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...event, page_config: pageConfig, smtp_config: smtpForm })
        });`;
const newHandlePageConfig = `    const handlePageConfigSave = async (e) => {
      e.preventDefault();
      try {
        const res = await fetch(\`http://localhost:3000/api/v1/events/\${event.id}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...event, page_config: pageConfig, smtp_config: smtpForm, payment_config: paymentConfig })
        });`;

content = content.replace(oldHandlePageConfig, newHandlePageConfig);

const oldExportCSV = `    const handleExportCSV = (eventName, data) => {`;
const newExportCSV = `    const handlePaymentConfigSave = async (e) => {
      e.preventDefault();
      try {
        const res = await fetch(\`http://localhost:3000/api/v1/events/\${event.id}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...event, payment_config: paymentConfig })
        });
        if (res.ok) {
          const updatedEvent = await res.json();
          onEditEvent(updatedEvent);
          toast('Payment configuration saved successfully!', 'success');
        }
      } catch (err) {
        toast('Failed to save payment config', 'error');
      }
    };

    const handleQRUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          if (code.data.startsWith('upi://pay')) {
             setPaymentConfig(code.data);
             toast('UPI QR successfully scanned!', 'success');
          } else {
             toast('QR code found, but it is not a valid UPI payment QR.', 'warning');
          }
        } else {
          toast('Could not find a clear QR code in the image.', 'error');
        }
      };
      img.src = url;
    };

    const handleExportCSV = (eventName, data) => {`;

content = content.replace(oldExportCSV, newExportCSV);

// 5. Add payment tab UI
const oldDesignFormClose = `            <div className="pt-4 border-t border-slate-700/50">
              <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">Save Page Design</button>
            </div>
          </form>
        )}`;
const newDesignFormClose = `            <div className="pt-4 border-t border-slate-700/50">
              <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">Save Page Design</button>
            </div>
          </form>
        )}

        {eventActiveTab === 'payment' && (
          <div className="glass-panel border border-theme-primary/20 rounded-2xl p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold text-theme-text mb-4">Payment Settings (UPI)</h3>
            <p className="text-sm text-theme-text/80 mb-6">Upload your PhonePe, Google Pay, or Paytm QR code here. When attendees book a paid ticket, they will automatically see a generated QR code with the exact ticket amount embedded.</p>
            <form onSubmit={handlePaymentConfigSave} className="space-y-6">
              
              <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-200">
                <label className="block text-sm font-bold text-theme-text/80 mb-2">1. Upload your QR Code Image</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleQRUpload} 
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-theme-text/80 mb-2">2. Scanned UPI URI (Automatically filled)</label>
                <input
                  type="text"
                  value={paymentConfig}
                  readOnly
                  placeholder="upi://pay?pa=..."
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg p-3 text-slate-500 text-sm font-mono cursor-not-allowed"
                />
                {paymentConfig && (
                  <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                    <CheckCircle size={14} /> Ready to accept payments. The amount will be appended automatically during checkout.
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-theme-primary/20">
                <button type="submit" disabled={!paymentConfig} className="px-6 py-2.5 bg-theme-primary hover:bg-theme-secondary text-white rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Save size={18} /> Save Payment Config
                </button>
              </div>
            </form>
          </div>
        )}`;
content = content.replace(oldDesignFormClose, newDesignFormClose);

// 6. Add navigation link
const oldNav = `<NavItem icon={<LayoutDashboard size={18} />} label="Page Design" active={eventActiveTab === 'design'} onClick={() => setEventActiveTab('design')} />`;
const newNav = `<NavItem icon={<LayoutDashboard size={18} />} label="Page Design" active={eventActiveTab === 'design'} onClick={() => setEventActiveTab('design')} />
                <NavItem icon={<CreditCard size={18} />} label="Payment Setup" active={eventActiveTab === 'payment'} onClick={() => setEventActiveTab('payment')} />`;
content = content.replace(oldNav, newNav);

fs.writeFileSync('src/pages/Admin.jsx', content, 'utf8');
console.log('Modifications applied successfully');
