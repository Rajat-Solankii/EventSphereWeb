import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const API = 'http://localhost:3000';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  const location = useLocation();

  useEffect(() => {
    // This page receives the user after clicking the email link
    // The backend /api/auth/verify-email already redirected here with ?verified=true or ?error=...
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the URL.');
      return;
    }

    // Redirect to backend which will verify and redirect back
    window.location.href = `${API}/api/auth/verify-email?token=${token}`;
  }, []);

  return (
    <div className="min-h-screen bg-theme-bg flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-theme-primary/30 border-t-theme-primary rounded-full animate-spin mx-auto" />
            <p className="text-theme-text/60 text-sm">Verifying your email address...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl">❌</div>
            <p className="text-red-500 text-sm">{message}</p>
            <a href="/login" className="text-theme-primary text-sm hover:underline">← Back to Login</a>
          </>
        )}
      </div>
    </div>
  );
}
