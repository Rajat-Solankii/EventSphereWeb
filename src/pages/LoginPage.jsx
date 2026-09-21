import { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const API = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'));

export default function LoginPage({ onNavigate }) {
  const { login, register, forgotPassword } = useAuth();
  const navigate = useNavigate();
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
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

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
        const from = location.state?.from?.pathname || "/admin";
        navigate(from, { replace: true });
      } else if (tab === 'register') {
        const result = await register(form.name, form.email, form.password);
        if (result.requiresVerification) {
          navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
        } else {
          await login(form.email, form.password);
          const from = location.state?.from?.pathname || "/admin";
          navigate(from, { replace: true });
        }
      } else if (tab === 'forgot_password') {
        await forgotPassword(form.email);
        navigate(`/reset-password?email=${encodeURIComponent(form.email)}`);
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
      if (!res.ok) throw new Error(data.error);
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <button 
        onClick={() => {
          if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
          } else {
            navigate('/');
          }
        }} 
        className="absolute top-8 left-8 sm:top-12 sm:left-12 flex items-center gap-2 text-sm font-medium text-[#6F6F6F] hover:text-black transition-colors z-20"
      >
        <ArrowLeft size={16} /> Back to Home
      </button>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10 flex flex-col items-center justify-center">
          <img src="/logo.png" alt="EventSphere Logo" className="w-32 h-32 mb-4 object-contain" />
          <h1 className="text-4xl sm:text-5xl font-normal font-serif text-black tracking-tight" style={{ letterSpacing: '-1.5px' }}>
            EventSphere<sup className="text-xl">®</sup>
          </h1>
          <p className="text-[#6F6F6F] font-sans mt-2">Curate the unforgettable.</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-black/10 rounded-none shadow-2xl shadow-black/5 overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-black/10">
            {['login', 'register'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setInfo(''); setShowResend(false); }}
                className={`flex-1 py-4 text-sm tracking-wide font-medium transition-all capitalize ${
                  tab === t
                    ? 'text-black bg-black/5 border-b-2 border-black'
                    : 'text-[#6F6F6F] hover:text-black'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="p-8 sm:p-10">
            {/* Info / Error banners */}
            {info && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 text-black text-sm leading-relaxed font-medium">
                {info}
              </div>
            )}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm leading-relaxed font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {tab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-black mb-2 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text" value={form.name} onChange={f('name')}
                    placeholder="Your full name"
                    className="w-full bg-transparent border-b border-black/20 px-0 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors rounded-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-black mb-2 uppercase tracking-wider">Email Address</label>
                <input
                  type="email" value={form.email} onChange={f('email')}
                  placeholder="you@example.com"
                  className="w-full bg-transparent border-b border-black/20 px-0 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors rounded-none"
                />
              </div>

              {tab !== 'forgot_password' && (
                <>
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <label className="block text-xs font-semibold text-black uppercase tracking-wider">Password</label>
                    {tab === 'login' && (
                      <button 
                        type="button"
                        onClick={() => { setTab('forgot_password'); setError(''); setInfo(''); }}
                        className="text-xs font-medium text-[#6F6F6F] hover:text-black transition-colors"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} value={form.password} onChange={f('password')}
                      placeholder={tab === 'register' ? 'Minimum 8 characters' : '••••••••'}
                      className="w-full bg-transparent border-b border-black/20 px-0 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors rounded-none pr-10"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-black transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {tab === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-black mb-2 uppercase tracking-wider">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={f('confirmPassword')}
                        placeholder="••••••••"
                        className="w-full bg-transparent border-b border-black/20 px-0 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors rounded-none pr-10"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-black transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white font-sans py-4 text-sm tracking-wide font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {loading ? 'Processing...' : tab === 'login' ? 'Sign In' : tab === 'register' ? 'Create Account' : 'Send Reset Code'}
              </button>

              {tab === 'forgot_password' && (
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="w-full mt-4 text-sm text-[#6F6F6F] hover:text-black transition-colors"
                >
                  Back to Sign In
                </button>
              )}
            </form>

            {showResend && (
              <div className="mt-8 p-6 bg-gray-50 border border-gray-200">
                <p className="text-sm text-black mb-4 font-medium">Didn't receive the email?</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 bg-white border border-gray-200 px-3 py-2 text-sm text-black focus:outline-none focus:border-black transition-colors rounded-none"
                  />
                  <button
                    onClick={handleResend}
                    disabled={resendLoading || !resendEmail || resendDone}
                    className="bg-black text-white px-4 py-2 text-sm hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? 'Sending...' : resendDone ? 'Sent!' : 'Resend'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Minimal Footer */}
        <p className="text-center text-xs text-[#6F6F6F] mt-10">
          Protected by strict authentication protocols.<br />
          Access restricted to authorized curators only.
        </p>
      </div>
    </div>
  );
}
