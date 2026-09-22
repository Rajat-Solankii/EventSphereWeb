import React, { useState, useRef } from 'react';
import { X, Camera, Lock, User, Mail, Save, Loader2, CheckCircle, Shield, KeyRound, ArrowRight, Send, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function UserProfileSettings({ onClose }) {
  const { user, updateUser, authFetch, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState('general');
  
  // General tab state
  const [name, setName] = useState(user?.name || '');
  const [profileImage, setProfileImage] = useState(user?.profile_image || '');
  
  // Email change state
  const [emailFlowOpen, setEmailFlowOpen] = useState(false);
  const [emailStep, setEmailStep] = useState(1); // 1: enter password+email, 2: enter OTP, 3: done
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPass, setEmailCurrentPass] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  
  // Password change state
  const [passMethod, setPassMethod] = useState(null); // 'current' or 'otp'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [passOtp, setPassOtp] = useState('');
  const [passOtpSent, setPassOtpSent] = useState(false);
  const [passOtpVerified, setPassOtpVerified] = useState(false);
  
  // Shared state
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  
  const fileInputRef = useRef(null);

  const isAdmin = user?.role === 'ORG_ADMIN' || user?.role === 'SYSTEM_ADMIN';

  const clearMessages = () => { setErrorMsg(''); setSuccessMsg(''); };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setProfileImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // ===== DELETE ACCOUNT =====
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setErrorMsg('Please enter your password to confirm deletion.');
      setShowDeleteConfirm(false);
      return;
    }
    setLoading(true); clearMessages();
    try {
      const res = await authFetch('/api/auth/me', { 
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword })
      });
      const data = await res.json();
      if (res.ok) {
        logout();
        window.location.href = '/login';
      } else {
        setErrorMsg(data.message || 'Failed to delete account.');
        setShowDeleteConfirm(false);
        setDeletePassword('');
      }
    } catch { 
      setErrorMsg('An error occurred.'); 
      setShowDeleteConfirm(false);
      setDeletePassword('');
    }
    finally { setLoading(false); }
  };

  // ===== SAVE BASIC INFO (name, photo) =====
  const handleSaveBasic = async (e) => {
    e.preventDefault();
    setLoading(true); clearMessages();
    try {
      const res = await authFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ action: 'update_basic', name, profile_image: profileImage })
      });
      const data = await res.json();
      if (res.ok) {
        updateUser(data.user);
        setSuccessMsg('Profile updated!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(data.message || 'Failed to update.');
      }
    } catch { setErrorMsg('An error occurred.'); }
    finally { setLoading(false); }
  };

  // ===== EMAIL CHANGE FLOW =====
  const handleSendEmailOtp = async () => {
    if (!newEmail) { setErrorMsg('Please enter a new email.'); return; }
    if (!emailCurrentPass) { setErrorMsg('Please enter your current password.'); return; }
    setLoading(true); clearMessages();
    try {
      const res = await authFetch('/api/auth/profile/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: newEmail, purpose: 'email_change' })
      });
      const data = await res.json();
      if (res.ok) {
        setEmailOtpSent(true);
        setEmailStep(2);
        setSuccessMsg(`OTP sent to ${newEmail}`);
      } else {
        setErrorMsg(data.message || 'Failed to send OTP.');
      }
    } catch { setErrorMsg('An error occurred.'); }
    finally { setLoading(false); }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length !== 6) { setErrorMsg('Enter the 6-digit code.'); return; }
    setLoading(true); clearMessages();
    try {
      // First verify OTP
      const verifyRes = await authFetch('/api/auth/profile/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: newEmail, otp: emailOtp })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) { setErrorMsg(verifyData.message || 'Invalid code.'); setLoading(false); return; }

      // Then update email
      const updateRes = await authFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ action: 'change_email', newEmail, currentPassword: emailCurrentPass })
      });
      const updateData = await updateRes.json();
      if (updateRes.ok) {
        updateUser(updateData.user);
        setEmailStep(3);
        setSuccessMsg('Email updated successfully!');
        setEmailFlowOpen(false);
        setEmailStep(1); setNewEmail(''); setEmailCurrentPass(''); setEmailOtp(''); setEmailOtpSent(false);
      } else {
        setErrorMsg(updateData.message || 'Failed to update email.');
      }
    } catch { setErrorMsg('An error occurred.'); }
    finally { setLoading(false); }
  };

  // ===== PASSWORD CHANGE =====
  const handleSendPassOtp = async () => {
    setLoading(true); clearMessages();
    try {
      const res = await authFetch('/api/auth/profile/send-otp', {
        method: 'POST',
        body: JSON.stringify({ purpose: 'password_reset' })
      });
      const data = await res.json();
      if (res.ok) {
        setPassOtpSent(true);
        setSuccessMsg(`Code sent to ${user?.email}`);
      } else {
        setErrorMsg(data.message || 'Failed to send code.');
      }
    } catch { setErrorMsg('An error occurred.'); }
    finally { setLoading(false); }
  };

  const handleVerifyPassOtp = async () => {
    if (!passOtp || passOtp.length !== 6) { setErrorMsg('Enter the 6-digit code.'); return; }
    setLoading(true); clearMessages();
    try {
      const res = await authFetch('/api/auth/profile/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: user?.email, otp: passOtp })
      });
      const data = await res.json();
      if (res.ok) {
        setPassOtpVerified(true);
        setSuccessMsg('Code verified! Now enter your new password.');
      } else {
        setErrorMsg(data.message || 'Invalid code.');
      }
    } catch { setErrorMsg('An error occurred.'); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setErrorMsg('Password must be at least 8 characters.'); return; }
    setLoading(true); clearMessages();
    try {
      const payload = { action: 'change_password', newPassword };
      if (passMethod === 'current') {
        if (!currentPassword) { setErrorMsg('Enter your current password.'); setLoading(false); return; }
        payload.currentPassword = currentPassword;
      } else {
        payload.otpEmail = true;
      }
      const res = await authFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        updateUser(data.user);
        setSuccessMsg('Password updated successfully!');
        setPassMethod(null); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        setPassOtp(''); setPassOtpSent(false); setPassOtpVerified(false);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.message || 'Failed to update password.');
      }
    } catch { setErrorMsg('An error occurred.'); }
    finally { setLoading(false); }
  };

  // ===== OTP Input Component =====
  const OtpInput = ({ value, onChange }) => {
    const inputRef = useRef(null);
    return (
      <div className="my-4 relative cursor-text" onClick={() => inputRef.current?.focus()}>
        {/* Hidden real input for typing */}
        <input
          ref={inputRef}
          type="text"
          maxLength="6"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-text"
        />
        {/* Visual display boxes */}
        <div className="flex gap-3 justify-center">
          {[0,1,2,3,4,5].map(i => (
            <div
              key={i}
              className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-extrabold transition-all ${
                i === value.length && document.activeElement === inputRef.current
                  ? 'border-theme-primary bg-theme-primary/5 shadow-[0_0_0_3px_rgba(79,178,192,0.15)]'
                  : value[i]
                    ? 'border-theme-primary/30 bg-white text-theme-text'
                    : 'border-theme-primary/15 bg-theme-bg/30 text-theme-text/20'
              }`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {value[i] || '·'}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-theme-primary/20 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-theme-primary/10 flex items-center justify-between bg-theme-bg/30">
          <h2 className="text-xl font-bold text-theme-text flex items-center gap-2">
            <User className="w-5 h-5 text-theme-primary" />
            Account Settings
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full text-theme-text/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 border-b border-theme-primary/10 space-x-6">
          <button
            type="button"
            onClick={() => { setActiveTab('general'); clearMessages(); }}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'general' ? 'border-theme-primary text-theme-primary' : 'border-transparent text-theme-text/60 hover:text-theme-text'
            }`}
          >
            General
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => { setActiveTab('security'); clearMessages(); }}
              className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
                activeTab === 'security' ? 'border-theme-primary text-theme-primary' : 'border-transparent text-theme-text/60 hover:text-theme-text'
              }`}
            >
              Security
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="px-6 pt-4">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 text-sm font-medium flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" /> {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" /> {successMsg}
            </div>
          )}
        </div>

        {/* ===== GENERAL TAB ===== */}
        {activeTab === 'general' && (
          <div className="p-6 pt-2 max-h-[60vh] overflow-y-auto">
            <form onSubmit={handleSaveBasic}>
              {/* Profile Photo */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-6">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-full bg-theme-primary/10 border border-theme-primary/30 flex items-center justify-center overflow-hidden">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-theme-primary">{(user?.name?.charAt(0) || '').toUpperCase()}</span>
                    )}
                  </div>
                  <button 
                    type="button" onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </div>
                <div>
                  <h3 className="font-semibold text-theme-text text-sm">Profile Photo</h3>
                  <p className="text-xs text-theme-text/60 mt-1">Max 2MB. Click to change.</p>
                  {profileImage && (
                    <button type="button" onClick={() => setProfileImage('')} className="text-xs font-semibold text-rose-500 hover:text-rose-600 mt-1">
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>

              {/* Name */}
              <div className="mb-6">
                <label className="text-sm font-semibold text-theme-text/80 mb-1.5 flex items-center gap-2">
                  <User className="w-4 h-4 opacity-50" /> Full Name
                </label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-theme-bg/50 border border-theme-primary/20 rounded-xl px-4 py-2.5 text-theme-text focus:border-theme-primary focus:outline-none transition-colors"
                />
              </div>

              {/* Save basic */}
              <button type="submit" disabled={loading}
                className="w-full px-6 py-2.5 bg-gradient-to-r from-theme-primary to-theme-secondary text-white rounded-xl font-bold shadow-lg shadow-theme-primary/20 hover:shadow-theme-primary/40 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </form>

            {/* Email Change Section */}
            <div className="mt-8 pt-6 border-t border-theme-primary/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                <div className="min-w-0 flex-1">
                  <label className="text-sm font-semibold text-theme-text/80 flex items-center gap-2">
                    <Mail className="w-4 h-4 opacity-50" /> Email Address
                  </label>
                  <p className="text-sm text-theme-text/60 mt-1 truncate">{user?.email}</p>
                </div>
                <button type="button" onClick={() => { 
                  if (emailFlowOpen) {
                    setEmailFlowOpen(false); setEmailStep(1); setNewEmail(''); setEmailCurrentPass(''); setEmailOtp(''); setEmailOtpSent(false); setShowCurrentPass(false);
                  } else {
                    setEmailFlowOpen(true);
                  }
                  clearMessages(); 
                }}
                  className="shrink-0 px-4 py-1.5 text-xs font-bold bg-theme-primary/10 text-theme-primary rounded-lg hover:bg-theme-primary/20 transition-colors w-full sm:w-auto"
                >
                  {emailFlowOpen ? 'Cancel' : 'Change Email'}
                </button>
              </div>

              {emailFlowOpen && (
                <div className="p-4 bg-theme-bg/40 border border-theme-primary/15 rounded-2xl space-y-4 mt-3">
                  {emailStep === 1 && (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-theme-text/70 mb-1 block">Current Password</label>
                        <div className="relative">
                          <input type={showCurrentPass ? 'text' : 'password'} value={emailCurrentPass} onChange={e => setEmailCurrentPass(e.target.value)}
                            placeholder="Enter your current password"
                            className="w-full bg-white border border-theme-primary/20 rounded-xl px-4 py-2.5 text-theme-text text-sm focus:border-theme-primary focus:outline-none pr-10"
                          />
                          <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text/40 hover:text-theme-text/70">
                            {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-theme-text/70 mb-1 block">New Email Address</label>
                        <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                          placeholder="Enter your new email"
                          className="w-full bg-white border border-theme-primary/20 rounded-xl px-4 py-2.5 text-theme-text text-sm focus:border-theme-primary focus:outline-none"
                        />
                      </div>
                      <button onClick={handleSendEmailOtp} disabled={loading || !newEmail || !emailCurrentPass}
                        className="w-full px-4 py-2.5 bg-theme-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-theme-primary/90 disabled:opacity-50 transition-all"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send Verification Code
                      </button>
                    </>
                  )}
                  {emailStep === 2 && (
                    <>
                      <p className="text-center text-sm text-theme-text/70">
                        Enter the 6-digit code sent to
                      </p>
                      <p className="text-center text-sm mt-1 flex items-center justify-center gap-2">
                        <strong className="text-theme-primary">{newEmail}</strong>
                        <button type="button" onClick={() => { setEmailStep(1); setEmailOtp(''); setEmailOtpSent(false); clearMessages(); }}
                          className="text-xs font-semibold text-theme-text/50 hover:text-theme-primary underline transition-colors"
                        >Edit</button>
                      </p>
                      <OtpInput value={emailOtp} onChange={setEmailOtp} />
                      <button onClick={handleVerifyEmailOtp} disabled={loading || emailOtp.length !== 6}
                        className="w-full px-4 py-2.5 bg-theme-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-theme-primary/90 disabled:opacity-50 transition-all"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Verify & Update Email
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {/* Delete Account Section */}
            <div className="mt-8 pt-6 border-t border-theme-primary/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-rose-500">Delete Account</h4>
                  <p className="text-xs text-theme-text/60 mt-1">Permanently delete your account and all data.</p>
                </div>
                <button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={loading}
                  className="shrink-0 w-full sm:w-auto px-4 py-2 text-xs font-bold text-rose-500 border border-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== SECURITY TAB (Admin Only) ===== */}
        {activeTab === 'security' && isAdmin && (
          <div className="p-6 pt-2 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-theme-text/60 mb-6">Choose a method to change your password.</p>

            {/* Method selector */}
            {!passMethod && (
              <div className="space-y-3">
                <button onClick={() => { setPassMethod('current'); clearMessages(); }}
                  className="w-full p-4 border border-theme-primary/15 rounded-2xl hover:border-theme-primary/40 transition-all text-left flex items-center gap-4 group bg-white"
                >
                  <div className="w-10 h-10 rounded-xl bg-theme-primary/10 flex items-center justify-center shrink-0 group-hover:bg-theme-primary/20 transition-colors">
                    <KeyRound className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-theme-text text-sm">Use Current Password</h4>
                    <p className="text-xs text-theme-text/50 mt-0.5">Enter your existing password to set a new one.</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-theme-text/30 group-hover:text-theme-primary transition-colors" />
                </button>

                <button onClick={() => { setPassMethod('otp'); clearMessages(); }}
                  className="w-full p-4 border border-theme-primary/15 rounded-2xl hover:border-theme-primary/40 transition-all text-left flex items-center gap-4 group bg-white"
                >
                  <div className="w-10 h-10 rounded-xl bg-theme-secondary/10 flex items-center justify-center shrink-0 group-hover:bg-theme-secondary/20 transition-colors">
                    <Mail className="w-5 h-5 text-theme-secondary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-theme-text text-sm">Use Email Verification</h4>
                    <p className="text-xs text-theme-text/50 mt-0.5">Receive a code on <strong>{user?.email}</strong></p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-theme-text/30 group-hover:text-theme-secondary transition-colors" />
                </button>
              </div>
            )}

            {/* Method: Current Password */}
            {passMethod === 'current' && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <button type="button" onClick={() => { setPassMethod(null); clearMessages(); }} className="text-xs font-semibold text-theme-text/50 hover:text-theme-text flex items-center gap-1 mb-2">
                  ← Back to methods
                </button>
                <div>
                  <label className="text-xs font-semibold text-theme-text/70 mb-1 block">Current Password</label>
                  <div className="relative">
                    <input type={showCurrentPass ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Your current password"
                      className="w-full bg-theme-bg/50 border border-theme-primary/20 rounded-xl px-4 py-2.5 text-theme-text text-sm focus:border-theme-primary focus:outline-none pr-10"
                    />
                    <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text/40 hover:text-theme-text/70">
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-theme-text/70 mb-1 block">New Password</label>
                  <div className="relative">
                    <input type={showNewPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full bg-theme-bg/50 border border-theme-primary/20 rounded-xl px-4 py-2.5 text-theme-text text-sm focus:border-theme-primary focus:outline-none pr-10"
                    />
                    <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text/40 hover:text-theme-text/70">
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-theme-text/70 mb-1 block">Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-theme-bg/50 border border-theme-primary/20 rounded-xl px-4 py-2.5 text-theme-text text-sm focus:border-theme-primary focus:outline-none"
                  />
                </div>
                <button type="submit" disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full px-6 py-2.5 bg-gradient-to-r from-theme-primary to-theme-secondary text-white rounded-xl font-bold shadow-lg shadow-theme-primary/20 hover:shadow-theme-primary/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Update Password
                </button>
              </form>
            )}

            {/* Method: Email OTP */}
            {passMethod === 'otp' && (
              <div className="space-y-4">
                <button type="button" onClick={() => { setPassMethod(null); clearMessages(); setPassOtpSent(false); setPassOtpVerified(false); setPassOtp(''); }} className="text-xs font-semibold text-theme-text/50 hover:text-theme-text flex items-center gap-1 mb-2">
                  ← Back to methods
                </button>
                
                {!passOtpSent && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-theme-secondary/10 flex items-center justify-center">
                      <Mail className="w-8 h-8 text-theme-secondary" />
                    </div>
                    <p className="text-sm text-theme-text/70">
                      We'll send a verification code to<br/><strong className="text-theme-primary">{user?.email}</strong>
                    </p>
                    <button onClick={handleSendPassOtp} disabled={loading}
                      className="w-full px-6 py-2.5 bg-theme-secondary text-white rounded-xl font-bold shadow-lg hover:bg-theme-secondary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send Verification Code
                    </button>
                  </div>
                )}

                {passOtpSent && !passOtpVerified && (
                  <div className="space-y-4">
                    <p className="text-center text-sm text-theme-text/70">
                      Enter the 6-digit code sent to<br/><strong className="text-theme-primary">{user?.email}</strong>
                    </p>
                    <OtpInput value={passOtp} onChange={setPassOtp} />
                    <button onClick={handleVerifyPassOtp} disabled={loading || passOtp.length !== 6}
                      className="w-full px-4 py-2.5 bg-theme-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-theme-primary/90 disabled:opacity-50 transition-all"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Verify Code
                    </button>
                  </div>
                )}

                {passOtpVerified && (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Email verified. Set your new password.
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-theme-text/70 mb-1 block">New Password</label>
                      <div className="relative">
                        <input type={showNewPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          className="w-full bg-theme-bg/50 border border-theme-primary/20 rounded-xl px-4 py-2.5 text-theme-text text-sm focus:border-theme-primary focus:outline-none pr-10"
                        />
                        <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text/40 hover:text-theme-text/70">
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-theme-text/70 mb-1 block">Confirm New Password</label>
                      <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full bg-theme-bg/50 border border-theme-primary/20 rounded-xl px-4 py-2.5 text-theme-text text-sm focus:border-theme-primary focus:outline-none"
                      />
                    </div>
                    <button type="submit" disabled={loading || !newPassword || !confirmPassword}
                      className="w-full px-6 py-2.5 bg-gradient-to-r from-theme-primary to-theme-secondary text-white rounded-xl font-bold shadow-lg shadow-theme-primary/20 hover:shadow-theme-primary/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      Update Password
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Hint for staff */}
            {!isAdmin && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 text-sm flex items-start gap-3">
                <Shield className="w-5 h-5 shrink-0 mt-0.5" />
                <p>As a staff member, only your organization admin can change your password. Please contact them if needed.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" onClick={() => !loading && setShowDeleteConfirm(false)} />
          <div className="relative bg-white border border-rose-500/20 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-theme-text mb-2">Delete Account?</h3>
            <p className="text-sm text-theme-text/60 mb-4">
              Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.
            </p>
            <input 
              type="password" 
              placeholder="Enter your password to confirm"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full bg-theme-bg/50 border border-theme-primary/20 rounded-xl px-4 py-2.5 text-theme-text text-sm focus:border-theme-primary focus:outline-none mb-6"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }} 
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl font-bold text-theme-text/70 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteAccount} 
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-rose-500/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
