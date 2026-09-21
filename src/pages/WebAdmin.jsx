import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Key, LogOut, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function WebAdmin() {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem('webadmin_token') || null);
  const [loading, setLoading] = useState(false);
  // Login State
  const [loginMode, setLoginMode] = useState('password'); // 'password', 'otp'
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState('form'); // 'form' or 'otp'
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsOtp, setSettingsOtp] = useState('');

  // Dashboard State
  const [users, setUsers] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [deleteState, setDeleteState] = useState({});
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  const handleSendLoginOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/webadmin/send-login-otp`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('OTP sent to the Super Admin email');
        setLoginMode('otp');
      } else {
        toast.error(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loginMode === 'password' && !password) return toast.error('Password required');
    if (loginMode === 'otp' && !otp) return toast.error('OTP required');

    setLoading(true);
    try {
      const payload = loginMode === 'password' ? { password } : { otp };
      const res = await fetch(`${API}/api/v1/webadmin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Logged in successfully');
        localStorage.setItem('webadmin_token', data.accessToken);
        setToken(data.accessToken);
      } else {
        toast.error(data.error || 'Invalid credentials');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendProfileOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/webadmin/profile/send-otp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('OTP sent to your current email');
        setSettingsView('otp');
      } else {
        toast.error(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!settingsOtp) return toast.error('OTP is required');

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/webadmin/profile/update`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          otp: settingsOtp,
          newEmail: newEmail || undefined,
          newPassword: newPassword || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Profile updated! Please log in again.');
        handleLogout();
        setShowSettings(false);
      } else {
        toast.error(data.error || 'Invalid OTP');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setFetchingUsers(true);
    try {
      const res = await fetch(`${API}/api/v1/webadmin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          toast.error('Session expired');
        }
      }
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setFetchingUsers(false);
    }
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    const userId = userToDelete;
    setUserToDelete(null); // Close modal
    
    setDeleteState(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`${API}/api/v1/webadmin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('User and associated data deleted');
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        toast.error('Failed to delete user');
      }
    } catch (err) {
      toast.error('Error deleting user');
    } finally {
      setDeleteState(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('webadmin_token');
    setToken(null);
    setPassword('');
  };

  // Login View
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-8">
          <div className="flex flex-col items-center mb-8">
            <img src="/logo.png" alt="Logo" className="w-16 h-16 mb-4" />
            <h1 className="text-2xl font-serif text-center">WebAdmin Portal</h1>
            <p className="text-sm text-gray-500 mt-2">Super Admin Access Only</p>
          </div>

          {loginMode === 'password' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-serif text-gray-600 mb-1">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Super Admin password"
                    className="w-full pl-9 pr-3 py-2 border rounded text-sm focus:ring-1 focus:ring-black outline-none"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white rounded py-2 text-sm font-medium hover:bg-black/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Login'}
              </button>
              <button
                type="button"
                onClick={handleSendLoginOtp}
                disabled={loading}
                className="w-full text-xs text-gray-500 hover:text-black underline mt-2"
              >
                {loading ? 'Sending OTP...' : 'Login with OTP instead'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-serif text-gray-600 mb-1">Enter OTP</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                    className="w-full pl-9 pr-3 py-2 border rounded text-sm focus:ring-1 focus:ring-black outline-none tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white rounded py-2 text-sm font-medium hover:bg-black/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Login'}
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('password')}
                className="w-full text-xs text-gray-500 hover:text-black underline mt-2"
              >
                Back to Password
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8" />
          <span className="font-serif text-xl tracking-tight">EventSphere WebAdmin</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setShowSettings(true);
              setSettingsView('form');
              setNewEmail('');
              setNewPassword('');
              setSettingsOtp('');
            }}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
          >
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 mt-6">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50/50">
            <h2 className="font-serif text-lg text-gray-800">Registered Organizers</h2>
            <button 
              onClick={fetchUsers} 
              disabled={fetchingUsers}
              className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              {fetchingUsers ? 'Refreshing...' : 'Refresh List'}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-serif tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium border-b">ID / Created</th>
                  <th className="px-6 py-4 font-medium border-b">User Details</th>
                  <th className="px-6 py-4 font-medium border-b">Organization</th>
                  <th className="px-6 py-4 font-medium border-b text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400 font-serif">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-gray-900 font-mono text-xs mb-1">{u.id.split('-')[0]}...</div>
                        <div className="text-gray-400 text-[11px]">{new Date(u.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{u.name}</div>
                        <div className="text-gray-500 text-xs">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        {u.organization ? (
                          <div className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                            {u.organization.name}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setUserToDelete(u.id)}
                          disabled={deleteState[u.id]}
                          className="inline-flex items-center justify-center p-2 text-rose-500 hover:bg-rose-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete User & Organization"
                        >
                          {deleteState[u.id] ? (
                            <div className="w-4 h-4 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Custom Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl border max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-serif text-gray-900 mb-2">Delete User?</h3>
            <p className="text-gray-600 text-sm mb-6">
              Are you absolutely sure you want to delete this user? This will <span className="font-bold text-rose-600">permanently delete their organization and all their associated events.</span> This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteUser}
                className="px-4 py-2 text-sm bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors shadow-sm"
              >
                Yes, delete user
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl border max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-serif text-gray-900 mb-4">WebAdmin Settings</h3>
            
            {settingsView === 'form' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-serif text-gray-600 mb-1">New Email (Optional)</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full px-3 py-2 border rounded text-sm focus:ring-1 focus:ring-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-serif text-gray-600 mb-1">New Password (Optional)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full px-3 py-2 border rounded text-sm focus:ring-1 focus:ring-black outline-none"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendProfileOtp}
                    disabled={loading || (!newEmail && !newPassword)}
                    className="px-4 py-2 text-sm bg-black text-white rounded hover:bg-black/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Sending OTP...' : 'Request OTP to Save'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <p className="text-sm text-gray-600 mb-2">We sent a 6-digit OTP to your <b>current</b> email address to authorize these changes.</p>
                <div>
                  <label className="block text-xs font-serif text-gray-600 mb-1">Enter OTP</label>
                  <input
                    type="text"
                    value={settingsOtp}
                    onChange={(e) => setSettingsOtp(e.target.value)}
                    placeholder="6-digit code"
                    maxLength={6}
                    required
                    className="w-full px-3 py-2 border rounded text-sm focus:ring-1 focus:ring-black outline-none tracking-widest"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setSettingsView('form')}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-black text-white rounded hover:bg-black/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Verify & Save'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
