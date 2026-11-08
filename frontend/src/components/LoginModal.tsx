import React, { useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  Lock,
  Mail,
  User,
  KeyRound,
  Shield,
  Building2,
  X,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const LoginModal: React.FC = () => {
  const {
    loginModalOpen,
    setLoginModalOpen,
    login,
    currentTenant,
    tenantsList,
    addNotification,
  } = useAppStore();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tenantId, setTenantId] = useState(currentTenant?.id || '');
  const [role, setRole] = useState('annotator');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!loginModalOpen) return null;

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    const targetEmail = customEmail || email;
    const targetPass = customPass !== undefined ? customPass : password;

    if (!targetEmail.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const res = await api.authLogin({
        email: targetEmail.trim(),
        password: targetPass,
      });

      login(res.user, res.token);
      addNotification({
        type: 'success',
        title: 'Authentication Successful',
        message: `Welcome back, ${res.user.name} (${res.user.role.toUpperCase()})`,
      });
      setLoginModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim() || !email.trim()) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const targetTenantId = tenantId || (tenantsList.length > 0 ? tenantsList[0].id : '');
      const res = await api.authRegister({
        tenant_id: targetTenantId,
        name: name.trim(),
        email: email.trim(),
        password: password || 'password123',
        role: role,
      });

      login(res.user, res.token);
      addNotification({
        type: 'success',
        title: 'Account Registered',
        message: `User created with role ${role.toUpperCase()}`,
      });
      setLoginModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const quickLoginUsers = [
    { name: 'Admin', role: 'admin', email: 'admin@visionforge.ai', label: 'Admin (Full Access)' },
    { name: 'Marcus', role: 'reviewer', email: 'marcus@visionforge.ai', label: 'Reviewer (QA & Audit)' },
    { name: 'Elena', role: 'annotator', email: 'elena@visionforge.ai', label: 'Annotator (Labeling & Track)' },
    { name: 'Alex', role: 'engineer', email: 'engineer@visionforge.ai', label: 'ML Engineer (YOLO Train)' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0f172a] border border-[#e5e5ea] dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0071e3] via-indigo-500 to-purple-500" />

        <div className="p-6 sm:p-8">
          {/* Modal Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0071e3] flex items-center justify-center text-white shadow-sm shadow-[#0071e3]/20">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-white tracking-tight">VisionForge Access Portal</h2>
                <p className="text-xs text-[#86868b] mt-0.5">Tenant Security, Shared Workspaces & RBAC Roles</p>
              </div>
            </div>
            <button
              onClick={() => setLoginModalOpen(false)}
              className="text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white p-1 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick 1-Click Login Chips */}
          <div className="mb-6 bg-[#f6f3f5] dark:bg-slate-900/80 border border-[#e5e5ea] dark:border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-4 h-4 text-[#0071e3]" />
              <span className="text-[11px] font-bold text-[#1d1d1f] dark:text-slate-300 uppercase tracking-wider">
                1-Click Preset Team Accounts
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickLoginUsers.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => handleLogin(undefined, u.email, 'password123')}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:border-[#0071e3] border border-[#e5e5ea] dark:border-slate-700 text-left transition-all shadow-xs group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#f5f5f7] dark:bg-slate-700 group-hover:bg-[#0071e3] group-hover:text-white flex items-center justify-center text-xs font-bold text-[#1d1d1f] dark:text-white transition-colors">
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1d1d1f] dark:text-slate-200 group-hover:text-[#0071e3] truncate">
                      {u.name}
                    </span>
                    <span className="text-[10px] text-[#86868b] truncate uppercase font-mono">
                      {u.role}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-[#e5e5ea] dark:border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMessage('');
              }}
              className={`pb-3 text-sm font-semibold transition-all relative ${
                tab === 'login' ? 'text-[#0071e3]' : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-slate-200'
              }`}
            >
              <span>Sign In with Password</span>
              {tab === 'login' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0071e3] rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setErrorMessage('');
              }}
              className={`ml-6 pb-3 text-sm font-semibold transition-all relative ${
                tab === 'register' ? 'text-[#0071e3]' : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-slate-200'
              }`}
            >
              <span>Register New User</span>
              {tab === 'register' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0071e3] rounded-full" />
              )}
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#414753] dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@visionforge.ai"
                    className="w-full bg-white dark:bg-slate-900 border border-[#e5e5ea] dark:border-slate-800 focus:border-[#0071e3] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1d1d1f] dark:text-white placeholder-[#86868b] outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#414753] dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (default: password123)"
                    className="w-full bg-white dark:bg-slate-900 border border-[#e5e5ea] dark:border-slate-800 focus:border-[#0071e3] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1d1d1f] dark:text-white placeholder-[#86868b] outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#0071e3] hover:bg-[#0a84ff] text-white text-xs font-bold transition-all shadow-sm shadow-[#0071e3]/20 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Elena Rostova"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. elena@visionforge.ai"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Assign Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="annotator">Annotator</option>
                    <option value="engineer">ML Engineer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Tenant Organization</label>
                  <select
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    {tenantsList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password (min 6 characters)"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? 'Registering...' : 'Create Account & Sign In'}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};