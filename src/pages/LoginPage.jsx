import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const API = 'http://localhost:3000';

export default function LoginPage({ onNavigate }) {
  const { login, register, forgotPassword } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'forgot_password'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const location = useLocation();

  // Read URL params for verification feedback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('verified') === 'true') {
      setInfo('✅ Email verified successfully! You can now log in.');
    } else if (params.get('error') === 'token_expired') {
      setError('⏰ Verification link expired. Please request a new one below.');
      setShowResend(true);
      setResendEmail(decodeURIComponent(params.get('email') || ''));
    } else if (params.get('error') === 'invalid_token') {
      setError('❌ Invalid verification link. Please request a new one.');
      setShowResend(true);
    }
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    // Custom validation
    if (tab === 'register') {
      if (!form.name.trim()) { setError('Please enter your full name.'); return; }
      if (!form.email.trim()) { setError('Please enter your email address.'); return; }
      if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    } else if (tab === 'login') {
      if (!form.email.trim()) { setError('Please enter your email address.'); return; }
      if (!form.password) { setError('Please enter your password.'); return; }
    } else if (tab === 'forgot_password') {
      if (!form.email.trim()) { setError('Please enter your email address.'); return; }
    }

    setLoading(true);

    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else if (tab === 'register') {
        const result = await register(form.name, form.email, form.password);
        if (result.requiresVerification) {
          setInfo(`📧 Check your inbox at ${form.email} — we've sent a verification link. Click it to activate your account. (Please also check your spam folder)`);
          setTab('login');
          setForm(f => ({ ...f, password: '', confirmPassword: '' }));
        } else {
          await login(form.email, form.password);
        }
      } else if (tab === 'forgot_password') {
        await forgotPassword(form.email);
        setInfo(`📧 A password reset link has been sent to ${form.email}.`);
        setTab('login');
        setForm(f => ({ ...f, password: '', confirmPassword: '' }));
      }
    } catch (err) {
      const msg = err.message || 'Something went wrong.';
      setError(msg);
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        setShowResend(true);
        setResendEmail(form.email);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail })
      });
      const data = await res.json();
      setResendDone(true);
      setInfo(`📧 New verification email sent to ${resendEmail}`);
      setError('');
      setShowResend(false);
    } catch (_) {
      setError('Failed to resend. Check your connection.');
    } finally {
      setResendLoading(false);
    }
  };

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-theme-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-theme-secondary/20 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-theme-primary to-theme-secondary shadow-lg shadow-theme-primary/30 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black text-theme-text tracking-tight">EventSphere</h1>
          <p className="text-theme-text/60 text-sm mt-1">Admin Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-theme-primary/20 rounded-2xl shadow-xl shadow-theme-secondary/10 overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-theme-primary/10">
            {['login', 'register'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setInfo(''); setShowResend(false); }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all capitalize ${
                  tab === t
                    ? 'text-theme-primary bg-theme-primary/5 border-b-2 border-theme-primary'
                    : 'text-theme-text/50 hover:text-theme-text'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* Info / Error banners */}
            {info && (
              <div className="mb-5 p-4 bg-theme-primary/10 border border-theme-primary/20 rounded-xl text-theme-primary text-sm leading-relaxed font-medium">
                {info}
              </div>
            )}
            {error && (
              <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-sm leading-relaxed font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-theme-text/60 mb-1.5 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text" value={form.name} onChange={f('name')}
                    placeholder="Your full name"
                    className="w-full bg-white border border-theme-primary/20 rounded-xl px-4 py-3 text-theme-text placeholder:text-theme-text/40 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/30 transition-all shadow-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-theme-text/60 mb-1.5 uppercase tracking-wider">Email Address</label>
                <input
                  type="email" value={form.email} onChange={f('email')}
                  placeholder="you@example.com"
                  className="w-full bg-white border border-theme-primary/20 rounded-xl px-4 py-3 text-theme-text placeholder:text-theme-text/40 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/30 transition-all shadow-sm"
                />
              </div>

              {tab !== 'forgot_password' && (
                <>
                <div>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <label className="block text-xs font-semibold text-theme-text/60 uppercase tracking-wider">Password</label>
                    {tab === 'login' && (
                      <button 
                        type="button"
                        onClick={() => { setTab('forgot_password'); setError(''); setInfo(''); }}
                        className="text-xs font-medium text-theme-accent hover:text-theme-accent/80 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} value={form.password} onChange={f('password')}
                      placeholder={tab === 'register' ? 'Minimum 8 characters' : '••••••••'}
                      className="w-full bg-white border border-theme-primary/20 rounded-xl px-4 py-3 pr-11 text-theme-text placeholder:text-theme-text/40 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/30 transition-all shadow-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text/35 hover:text-theme-text/60 transition-colors">
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {tab === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-theme-text/60 mb-1.5 uppercase tracking-wider">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={f('confirmPassword')}
                        placeholder="Re-enter your password"
                        className="w-full bg-white border border-theme-primary/20 rounded-xl px-4 py-3 pr-11 text-theme-text placeholder:text-theme-text/40 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/30 transition-all shadow-sm"
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text/35 hover:text-theme-text/60 transition-colors">
                        {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>
                )}
                </>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-theme-primary to-theme-secondary text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Please wait...</>
                ) : (
                  tab === 'login' ? 'Sign In →' : 
                  tab === 'register' ? 'Create Account →' : 
                  'Send Reset Link →'
                )}
              </button>
              
              {tab === 'forgot_password' && (
                <button
                  type="button"
                  onClick={() => { setTab('login'); setError(''); setInfo(''); }}
                  className="w-full py-3.5 bg-theme-bg hover:bg-theme-bg/80 text-theme-text font-semibold rounded-xl transition-all border border-theme-primary/10 mt-2 shadow-sm"
                >
                  Back to Sign In
                </button>
              )}
            </form>

            {/* Resend verification */}
            {showResend && (
              <div className="mt-5 p-4 bg-theme-secondary/10 border border-theme-secondary/20 rounded-xl space-y-3">
                <p className="text-theme-secondary text-sm font-medium">Resend Verification Email</p>
                <div className="flex gap-2">
                  <input
                    type="email" value={resendEmail} onChange={e => setResendEmail(e.target.value)}
                    placeholder="Your email address"
                    className="flex-1 bg-white border border-theme-secondary/20 rounded-lg px-3 py-2 text-theme-text text-sm focus:outline-none focus:border-theme-secondary"
                  />
                  <button
                    onClick={handleResend} disabled={resendLoading || !resendEmail}
                    className="px-4 py-2 bg-theme-secondary hover:bg-theme-secondary/80 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50"
                  >
                    {resendLoading ? '...' : 'Resend'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
