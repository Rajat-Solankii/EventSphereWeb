import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Trash2, Plus, X, Eye, Edit, Loader2, AlertTriangle, ServerCrash } from 'lucide-react';

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'EVENT_MANAGER' });
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [modalError, setModalError] = useState('');

  // Fetch users from admin API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/v1/events', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchUsers();
    fetchEvents();
  }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!newUser.email) { setModalError('Email is required'); return; }
    setOtpLoading(true); setModalError('');
    try {
      const res = await fetch('http://localhost:3000/api/admin/users/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('es_token')}`
        },
        body: JSON.stringify({ email: newUser.email })
      });
      const data = await res.json();
      if (res.ok) {
        setCreateStep(2);
      } else {
        setModalError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setModalError('Error sending OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) { setModalError('OTP is required'); return; }
    setOtpLoading(true); setModalError('');
    try {
      const res = await fetch('http://localhost:3000/api/admin/users/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('es_token')}`
        },
        body: JSON.stringify({ email: newUser.email, otp })
      });
      const data = await res.json();
      if (res.ok) {
        setCreateStep(3);
      } else {
        setModalError(data.message || 'Invalid OTP');
      }
    } catch (err) {
      setModalError('Error verifying OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      const res = await fetch('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('es_token')}`
        },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setShowCreateModal(false);
        setCreateStep(1);
        setOtp('');
        setNewUser({ name: '', email: '', password: '', role: 'EVENT_MANAGER' });
        fetchUsers();
      } else {
        const data = await res.json();
        setModalError(data.message || 'Failed to create user');
      }
    } catch (err) {
      setModalError('Error creating user');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`http://localhost:3000/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
        setUserToDelete(null);
      } else {
        setDeleteError(data.message || 'Failed to delete user');
        setUserToDelete(null);
      }
    } catch (err) {
      setDeleteError('Failed to delete user');
      setUserToDelete(null);
    }
  };

  const toggleEventAccess = async (userId, eventId, hasAccess) => {
    try {
      const method = hasAccess ? 'DELETE' : 'POST';
      const res = await fetch(`http://localhost:3000/api/admin/users/${userId}/events/${eventId}`, {
        method,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('es_token')}` }
      });
      if (res.ok) { fetchUsers(); setDeleteError(null); }
    } catch (err) {
      setDeleteError('Failed to update event access');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="w-8 h-8 text-theme-primary animate-spin" />
      <div className="text-theme-text/60 font-semibold animate-pulse">Loading staff...</div>
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 animate-in fade-in zoom-in duration-300">
      <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
        <ServerCrash className="w-8 h-8 text-rose-500" />
      </div>
      <div className="text-center">
        <h3 className="text-xl font-bold text-theme-text font-serif">Connection Error</h3>
        <p className="text-theme-text/60 mt-2 max-w-md mx-auto">{error === 'Network error' ? 'Failed to connect to the EventSphere backend server. Please ensure the server is running.' : error}</p>
      </div>
      <button onClick={fetchUsers} className="mt-4 px-6 py-2 bg-theme-primary text-theme-text font-semibold rounded-lg shadow-lg hover:bg-theme-primary/90 transition-colors">
        Try Again
      </button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-theme-text tracking-tight">Staff Management</h2>
          <p className="text-theme-text/60 text-sm mt-1">Manage staff accounts and their event access.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-5 py-2.5 bg-theme-primary hover:bg-theme-primary text-theme-text rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          <span>Add Staff Member</span>
        </button>
      </div>

      <div className="bg-white/40 backdrop-blur-xl border border-theme-primary/10 shadow-[0_0_0_1px_rgba(79,178,192,0.1),0_8px_32px_rgba(151,161,218,0.2)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-theme-bg/40 border-b border-theme-primary/10">
                <th className="py-4 px-6 text-xs font-bold text-theme-text/60 uppercase tracking-wider">User</th>
                <th className="py-4 px-6 text-xs font-bold text-theme-text/60 uppercase tracking-wider">Role</th>
                <th className="py-4 px-6 text-xs font-bold text-theme-text/60 uppercase tracking-wider">Assigned Events</th>
                <th className="py-4 px-6 text-xs font-bold text-theme-text/60 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-primary/10">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-theme-primary/5 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-bold text-theme-text">{u.name} {u.id === user.id && <span className="text-xs text-theme-primary ml-2">(You)</span>}</div>
                    <div className="text-sm text-theme-text/50">{u.email}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${u.role === 'ORG_ADMIN' ? 'bg-theme-secondary/10 text-theme-secondary border-theme-secondary/20' : 'bg-theme-primary/10 text-theme-primary border-theme-primary/20'}`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {u.role === 'ORG_ADMIN' ? (
                      <span className="text-theme-text/50 text-xs italic">All Events</span>
                    ) : (
                      <div className="flex flex-col gap-1 max-w-xs">
                        {events.map(ev => {
                          const hasAccess = u.event_access?.some(a => a.event.id === ev.id);
                          return (
                            <label key={ev.id} className="flex items-center gap-2 cursor-pointer text-xs text-theme-text/80">
                              <input 
                                type="checkbox" 
                                checked={hasAccess} 
                                onChange={() => toggleEventAccess(u.id, ev.id, hasAccess)}
                                className="rounded text-theme-primary focus:ring-theme-primary bg-white border-slate-600"
                              />
                              <span className="truncate">{ev.title}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button onClick={() => setUserToDelete(u)} className="p-2 text-theme-text/60 hover:text-rose-400 transition-colors disabled:opacity-50" disabled={u.id === user.id} title="Delete User">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center">
          <div className="absolute inset-0 bg-theme-bg/60 backdrop-blur-sm" onClick={() => setUserToDelete(null)} />
          <div className="relative bg-white/95 border border-theme-primary/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-500/10 border border-rose-500/30">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-theme-text">Delete Staff Member</h3>
            </div>
            <p className="text-theme-text/60 text-sm mb-8 leading-relaxed">
              Are you sure you want to delete <strong>{userToDelete.name}</strong>? They will lose all access to the admin dashboard and events immediately. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setUserToDelete(null)} className="px-5 py-2.5 rounded-xl bg-theme-bg hover:bg-theme-bg/80 text-theme-text/80 text-sm font-semibold border border-theme-primary/20 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteUser} className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20 text-sm font-semibold transition-colors">
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {deleteError && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-theme-bg/60 backdrop-blur-sm" onClick={() => setDeleteError(null)} />
          <div className="relative bg-white/95 border border-rose-500/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-500/10 border border-rose-500/30 text-rose-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-theme-text">Action Denied</h3>
            </div>
            <p className="text-theme-text/80 text-sm mb-8 leading-relaxed font-medium">
              {deleteError}
            </p>
            <div className="flex justify-end">
              <button onClick={() => setDeleteError(null)} className="px-6 py-2.5 rounded-xl bg-theme-bg hover:bg-theme-bg/80 text-theme-text font-semibold border border-theme-primary/20 transition-colors">
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-bg/60 backdrop-blur-sm">
          <div className="bg-white border border-theme-primary/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-theme-primary/20 bg-theme-bg/20">
              <h3 className="text-xl font-bold text-theme-text">Add Staff Member</h3>
              <button onClick={() => { setShowCreateModal(false); setCreateStep(1); setModalError(''); }} className="text-theme-text/60 hover:text-theme-text"><X size={20} /></button>
            </div>
            <div className="p-6">
              {modalError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 text-sm font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{modalError}</p>
                </div>
              )}
              {createStep === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-theme-text/80 mb-1">Staff Email Address</label>
                    <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-theme-bg border border-theme-primary/20 rounded-lg px-4 py-2 text-theme-text focus:border-theme-primary focus:outline-none" placeholder="staff@example.com" />
                    <p className="text-xs text-theme-text/60 mt-2">We will send a 6-digit OTP to this email to verify it belongs to the staff member.</p>
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => { setShowCreateModal(false); setCreateStep(1); setModalError(''); }} className="px-5 py-2 rounded-xl text-theme-text/80 hover:bg-theme-bg transition-colors text-sm font-semibold">Cancel</button>
                    <button type="submit" disabled={otpLoading} className="px-5 py-2 bg-theme-primary hover:bg-theme-primary text-theme-text rounded-xl text-sm font-bold shadow-lg transition-colors flex items-center gap-2">
                      {otpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Send OTP
                    </button>
                  </div>
                </form>
              )}

              {createStep === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-theme-text/80 mb-1">Email</label>
                    <input disabled type="email" value={newUser.email} className="w-full bg-theme-bg/50 border border-theme-primary/20 rounded-lg px-4 py-2 text-theme-text/50 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-theme-text/80 mb-1">Enter 6-digit OTP</label>
                    <input required type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} className="w-full bg-theme-bg border border-theme-primary/20 rounded-lg px-4 py-2 text-theme-text focus:border-theme-primary focus:outline-none tracking-widest text-center text-lg font-mono" placeholder="------" />
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setCreateStep(1)} className="px-5 py-2 rounded-xl text-theme-text/80 hover:bg-theme-bg transition-colors text-sm font-semibold">Back</button>
                    <button type="submit" disabled={otpLoading || otp.length < 6} className="px-5 py-2 bg-theme-primary hover:bg-theme-primary text-theme-text rounded-xl text-sm font-bold shadow-lg transition-colors flex items-center gap-2">
                      {otpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Verify OTP
                    </button>
                  </div>
                </form>
              )}

              {createStep === 3 && (
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="p-3 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-2 text-emerald-600">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Email Verified Successfully</span>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-theme-text/80 mb-1">Email</label>
                    <input disabled type="email" value={newUser.email} className="w-full bg-theme-bg/50 border border-theme-primary/20 rounded-lg px-4 py-2 text-theme-text/50 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-theme-text/80 mb-1">Full Name</label>
                    <input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-theme-bg border border-theme-primary/20 rounded-lg px-4 py-2 text-theme-text focus:border-theme-primary focus:outline-none" placeholder="e.g., John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-theme-text/80 mb-1">Temporary Password</label>
                    <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-theme-bg border border-theme-primary/20 rounded-lg px-4 py-2 text-theme-text focus:border-theme-primary focus:outline-none" placeholder="Min. 8 characters" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-theme-text/80 mb-1">Role</label>
                    <select required value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full bg-theme-bg border border-theme-primary/20 rounded-lg px-4 py-2 text-theme-text focus:border-theme-primary focus:outline-none">
                      <option value="EVENT_MANAGER">Event Manager</option>
                      <option value="ORG_ADMIN">Organization Admin</option>
                      <option value="VISITOR">Visitor (Read-only)</option>
                    </select>
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => { setShowCreateModal(false); setCreateStep(1); }} className="px-5 py-2 rounded-xl text-theme-text/80 hover:bg-theme-bg transition-colors text-sm font-semibold">Cancel</button>
                    <button type="submit" className="px-5 py-2 bg-theme-primary hover:bg-theme-primary text-theme-text rounded-xl text-sm font-bold shadow-lg transition-colors">Create Staff</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
