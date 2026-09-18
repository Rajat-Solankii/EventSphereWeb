import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const API = 'http://localhost:3000';

export default function VerifyEmailPage() {
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const e = params.get('email');
    if (e) setEmail(e);
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email || !otp) {
      return setError('Email and OTP are required.');
    }

    setLoading(true);

    try {
      await verifyEmail(email, otp);
      setInfo('✅ Email verified successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to verify email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      return setError('Please enter your email to resend the code.');
    }
    setResendLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resend');
      setResendDone(true);
      setInfo(`📧 New verification code sent to ${email}`);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to resend. Check your connection.');
    } finally {
      setResendLoading(false);
    }
  };

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
        <div className="text-center mb-10 flex flex-col items-center justify-center">
          <img src="/logo.png" alt="EventSphere Logo" className="w-32 h-32 mb-4 object-contain" />
          <h1 className="text-4xl sm:text-5xl font-normal font-serif text-black tracking-tight" style={{ letterSpacing: '-1.5px' }}>
            Verify Email
          </h1>
          <p className="text-[#6F6F6F] font-sans mt-2 text-sm text-center">
            Enter the code sent to your email.<br/>
            <span className="opacity-75">(Please also check your spam folder)</span>
          </p>
        </div>

        <div className="bg-white border border-black/10 rounded-none shadow-2xl shadow-black/5 p-8 sm:p-10">
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
            <div>
              <label className="block text-xs font-semibold text-black mb-2 uppercase tracking-wider">Email Address</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent border-b border-black/20 px-0 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors rounded-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-black mb-2 uppercase tracking-wider">6-Digit Code</label>
              <input
                type="text" required value={otp} onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full bg-transparent border-b border-black/20 px-0 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors rounded-none tracking-widest text-lg"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-black text-white font-sans py-4 text-sm tracking-wide font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
            
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading || resendDone}
              className="w-full mt-4 text-sm text-[#6F6F6F] hover:text-black transition-colors disabled:opacity-50"
            >
              {resendLoading ? 'Sending...' : resendDone ? 'Code Resent!' : "Didn't receive a code? Resend"}
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full mt-2 text-sm text-[#6F6F6F] hover:text-black transition-colors"
            >
              Back to Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
