import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState('');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('token');
    if (!t) {
      setError('❌ Invalid or missing reset token.');
    } else {
      setToken(t);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);

    try {
      await resetPassword(token, form.password);
      setInfo('✅ Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-theme-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-theme-secondary/20 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-theme-primary to-theme-secondary shadow-lg shadow-theme-primary/30 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black text-theme-text tracking-tight">Reset Password</h1>
          <p className="text-theme-text/60 text-sm mt-1">Choose a new password for your account</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-theme-primary/20 rounded-2xl shadow-xl shadow-theme-secondary/10 p-8">
          {info && (
            <div className="mb-5 p-4 bg-theme-primary/10 border border-theme-primary/20 rounded-xl text-theme-primary text-sm leading-relaxed font-medium text-center">
              {info}
            </div>
          )}
          {error && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-sm leading-relaxed font-medium text-center">
              {error}
            </div>
          )}

          {!token ? (
            <div className="text-center">
              <button onClick={() => navigate('/login')} className="px-6 py-2.5 bg-theme-bg hover:bg-theme-bg/80 text-theme-text rounded-xl transition-colors font-semibold border border-theme-primary/10 shadow-sm">
                Go back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-theme-text/60 mb-1.5 uppercase tracking-wider">New Password</label>
                <input
                  type="password" required value={form.password} onChange={f('password')}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  className="w-full bg-white border border-theme-primary/20 rounded-xl px-4 py-3 text-theme-text placeholder:text-theme-text/40 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/30 transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-text/60 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                <input
                  type="password" required value={form.confirmPassword} onChange={f('confirmPassword')}
                  placeholder="Repeat your new password"
                  minLength={8}
                  className="w-full bg-white border border-theme-primary/20 rounded-xl px-4 py-3 text-theme-text placeholder:text-theme-text/40 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/30 transition-all shadow-sm"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-theme-primary to-theme-secondary text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
