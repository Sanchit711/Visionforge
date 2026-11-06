import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  Flame,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Building2,
  ArrowRight,
  Sparkles,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
  role_title: string;
  badge_color: string;
  description: string;
  tenant_name: string;
  password_hint: string;
}

export const LoginView: React.FC = () => {
  const { login, addNotification, tenantsList, setTenantsList } = useAppStore();

  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('admin@visionforge.ai');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [regRole, setRegRole] = useState('engineer');
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeQuickLoginEmail, setActiveQuickLoginEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);

  // Fallback demo users if API hasn't loaded yet
  const fallbackDemoUsers: DemoUser[] = [
    {
      id: 'demo-admin',
      name: 'Admin',
      email: 'admin@visionforge.ai',
      role: 'admin',
      role_title: 'Organization Administrator',
      badge_color: 'emerald',
      description: 'Root governance across tenants, workspaces, models & runtimes.',
      tenant_name: 'SVG Enterprise Global',
      password_hint: 'password123',
    },
    {
      id: 'demo-engineer',
      name: 'Alex Chen',
      email: 'alex@visionforge.ai',
      role: 'engineer',
      role_title: 'ML Systems Engineer',
      badge_color: 'purple',
      description: 'YOLO fine-tuning, Colab/Kaggle Dual-T4 GPU runs & checkpoints.',
      tenant_name: 'SVG Enterprise Global',
      password_hint: 'password123',
    },
    {
      id: 'demo-reviewer',
      name: 'Marcus Vance',
      email: 'marcus@visionforge.ai',
      role: 'reviewer',
      role_title: 'Dataset QA Lead',
      badge_color: 'indigo',
      description: 'Dataset quality audit, annotation review & split version freezing.',
      tenant_name: 'SVG Enterprise Global',
      password_hint: 'password123',
    },
    {
      id: 'demo-annotator',
      name: 'Elena Rostova',
      email: 'elena@visionforge.ai',
      role: 'annotator',
      role_title: 'Annotation Specialist',
      badge_color: 'amber',
      description: 'High-speed labeling, SAM 2 segmentation & trajectory tracking.',
      tenant_name: 'SVG Enterprise Global',
      password_hint: 'password123',
    },
    {
      id: 'demo-viewer',
      name: 'Sarah Jenkins',
      email: 'sarah@visionforge.ai',
      role: 'viewer',
      role_title: 'Auditor & Observer',
      badge_color: 'cyan',
      description: 'Read-only access to metrics, telemetry & forensic scorecards.',
      tenant_name: 'SVG Enterprise Global',
      password_hint: 'password123',
    },
    {
      id: 'demo-partner',
      name: 'Industrial Partner',
      email: 'partner@visionforge.ai',
      role: 'admin',
      role_title: 'External Partner Admin',
      badge_color: 'blue',
      description: 'Isolated partner tenant: Factory line & automated conveyor inspection.',
      tenant_name: 'Industrial Robotics Global',
      password_hint: 'password123',
    },
  ];

  useEffect(() => {
    api
      .getDemoUsers()
      .then((users) => {
        if (users && users.length > 0) setDemoUsers(users);
        else setDemoUsers(fallbackDemoUsers);
      })
      .catch(() => setDemoUsers(fallbackDemoUsers));

    api
      .getTenants()
      .then((tenants) => {
        if (tenants && tenants.length > 0) {
          setTenantsList(tenants);
          setTenantId(tenants[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    const targetEmail = (customEmail || email).trim();
    const targetPass = customPass !== undefined ? customPass : password;

    if (!targetEmail) {
      setErrorMessage('Please enter your work email.');
      return;
    }

    setLoading(true);
    if (customEmail) setActiveQuickLoginEmail(customEmail);

    try {
      const res = await api.authLogin({
        email: targetEmail,
        password: targetPass || 'password123',
      });

      login(res.user, res.token);
      addNotification({
        type: 'success',
        title: `Welcome, ${res.user.name}`,
        message: `Signed in with ${res.user.role.toUpperCase()} privileges`,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
      setActiveQuickLoginEmail(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your work email.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.authRegister({
        tenant_id: tenantId,
        name: name.trim(),
        email: email.trim(),
        password: password || 'password123',
        role: regRole,
      });

      login(res.user, res.token);
      addNotification({
        type: 'success',
        title: 'Account Provisioned',
        message: `Created ${res.user.name} with ${regRole.toUpperCase()} permissions`,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to provision account.');
    } finally {
      setLoading(false);
    }
  };

  const activeDemoList = demoUsers.length > 0 ? demoUsers : fallbackDemoUsers;

  const getRoleDotColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-emerald-400';
      case 'engineer':
        return 'bg-purple-400';
      case 'reviewer':
        return 'bg-indigo-400';
      case 'annotator':
        return 'bg-amber-400';
      case 'viewer':
      default:
        return 'bg-sky-400';
    }
  };

  const getRolePill = (role: string, title: string) => {
    let colorClass = 'bg-sky-500/10 text-sky-300 border-sky-500/20';
    if (role === 'admin') colorClass = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    else if (role === 'engineer') colorClass = 'bg-purple-500/10 text-purple-300 border-purple-500/20';
    else if (role === 'reviewer') colorClass = 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
    else if (role === 'annotator') colorClass = 'bg-amber-500/10 text-amber-300 border-amber-500/20';

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${colorClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${getRoleDotColor(role)}`} />
        <span>{title}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen w-screen bg-[#07090e] text-[#f5f5f7] flex flex-col justify-between relative overflow-x-hidden selection:bg-[#0071e3] selection:text-white">
      {/* Apple-style Soft Ambient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[360px] bg-gradient-to-b from-[#0071e3]/12 via-[#6366f1]/06 to-transparent blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[300px] bg-purple-600/08 blur-[180px] pointer-events-none" />

      {/* Top Apple Minimalist Navigation */}
      <header className="w-full max-w-6xl mx-auto px-6 pt-6 pb-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#0071e3] to-[#6366f1] flex items-center justify-center shadow-lg shadow-blue-500/15">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[17px] tracking-tight text-white">VisionForge</span>
              <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                Enterprise
              </span>
            </div>
            <span className="text-[11px] text-[#86868b] tracking-normal">Industrial Computer Vision & YOLO Studio</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2.5 text-xs text-[#86868b] bg-white/[0.03] backdrop-blur-md border border-white/[0.08] px-3.5 py-1.5 rounded-full shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300">RBAC Enforcement Active</span>
          <span className="text-slate-600">•</span>
          <span className="font-mono text-[11px] text-slate-400">GNU AGPLv3</span>
        </div>
      </header>

      {/* Main Stage: Balanced Grid */}
      <main className="w-full max-w-6xl mx-auto px-6 py-6 flex-1 flex items-center justify-center z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          
          {/* Left Column: Glassmorphic Sign In Card */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="bg-[#11131a]/80 backdrop-blur-2xl border border-white/[0.1] rounded-[28px] p-7 sm:p-8 shadow-2xl shadow-black/60 relative overflow-hidden flex flex-col justify-between">
              
              {/* Subtle Apple Top Edge Highlight */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div>
                {/* Segmented Pill Tabs */}
                <div className="flex p-1 bg-black/40 rounded-full border border-white/[0.08] mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('signin');
                      setErrorMessage('');
                    }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                      tab === 'signin'
                        ? 'bg-[#0071e3] text-white shadow-md'
                        : 'text-[#86868b] hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('register');
                      setErrorMessage('');
                    }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                      tab === 'register'
                        ? 'bg-[#0071e3] text-white shadow-md'
                        : 'text-[#86868b] hover:text-white'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {/* Heading */}
                <div className="mb-5">
                  <h1 className="text-2xl font-semibold tracking-tight text-white">
                    {tab === 'signin' ? 'Sign in to Workspace' : 'Create Team Account'}
                  </h1>
                  <p className="text-xs text-[#86868b] mt-1.5 leading-relaxed">
                    {tab === 'signin'
                      ? 'Enter your credentials or choose any role on the right for instant access.'
                      : 'Provision a new team member with specific role-based permissions.'}
                  </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Sign In Form */}
                {tab === 'signin' ? (
                  <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1.5 tracking-tight">
                        Work Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@visionforge.ai"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-medium text-slate-400 tracking-tight">
                          Password
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">Demo: password123</span>
                      </div>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.98] text-white text-xs font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Authenticating...
                        </span>
                      ) : (
                        <>
                          <span>Sign In to Studio</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Registration Form */
                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Jordan Miller"
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[#0071e3] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Work Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jordan@visionforge.ai"
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[#0071e3] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Organization Workspace
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select
                          value={tenantId}
                          onChange={(e) => setTenantId(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#14161f] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#0071e3]"
                        >
                          {tenantsList.map((t) => (
                            <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        RBAC Role
                      </label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#14161f] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#0071e3]"
                      >
                        <option value="admin">Administrator (Full Access)</option>
                        <option value="engineer">ML Engineer (Training & Colab)</option>
                        <option value="reviewer">QA Reviewer (Datasets & Verification)</option>
                        <option value="annotator">Annotation Specialist (SAM 2 & Labels)</option>
                        <option value="viewer">Auditor (Read-Only Telemetry)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-medium transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
                    >
                      {loading ? 'Creating...' : 'Register Team Member'}
                    </button>
                  </form>
                )}
              </div>

              {/* Security Footnote */}
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#86868b]">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Encrypted Session</span>
                </div>
                <span>v2.4 Enterprise</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sleek 1-Click Role Switcher */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#0071e3] font-semibold">
                  Quick Access
                </span>
                <h2 className="text-xl font-semibold tracking-tight text-white mt-0.5">
                  Sign in by Role
                </h2>
              </div>
              <span className="text-[12px] text-[#86868b]">
                Click any profile to test permissions instantly
              </span>
            </div>

            {/* 2x3 Grid of Compact Apple Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeDemoList.map((user) => {
                const isThisLoading = loading && activeQuickLoginEmail === user.email;

                return (
                  <button
                    key={user.id || user.email}
                    onClick={() => {
                      setEmail(user.email);
                      setPassword(user.password_hint || 'password123');
                      handleLogin(undefined, user.email, user.password_hint || 'password123');
                    }}
                    disabled={loading}
                    className="group text-left p-4 rounded-[20px] bg-white/[0.03] hover:bg-white/[0.06] active:scale-[0.98] border border-white/[0.07] hover:border-white/[0.18] backdrop-blur-xl transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-lg disabled:opacity-50"
                  >
                    <div>
                      {/* Top Role Badge */}
                      <div className="flex items-center justify-between mb-2.5">
                        {getRolePill(user.role, user.role_title)}
                        <span className="text-[10px] text-[#86868b] group-hover:text-white flex items-center gap-0.5 transition-colors">
                          {isThisLoading ? (
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <span>Log in</span>
                              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </>
                          )}
                        </span>
                      </div>

                      {/* Name & Email */}
                      <div className="text-[14px] font-semibold text-white tracking-tight">
                        {user.name}
                      </div>
                      <div className="text-[11px] text-[#86868b] font-mono truncate">
                        {user.email}
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {user.description}
                      </p>
                    </div>

                    {/* Bottom Tenant & Password Info */}
                    <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-[#86868b]">
                      <span className="truncate max-w-[160px]">{user.tenant_name}</span>
                      <span className="font-mono text-slate-400">PW: password123</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Apple-style Info Banner */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3 text-xs text-[#86868b]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-[12px] text-slate-300">
                  <strong>Granular RBAC Enforced:</strong> Views and mutation actions adapt to the active role.
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-full border border-[#0071e3]/20 shrink-0">
                Active
              </span>
            </div>

          </div>

        </div>
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#86868b] border-t border-white/[0.06] z-10">
        <div>
          <span>© 2026 VisionForge Studio. All rights reserved. Industrial Computer Vision Suite.</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Enterprise Tenant Isolation</span>
          <span>•</span>
          <span>Salted SHA-256</span>
          <span>•</span>
          <span>Community Source-Available License</span>
        </div>
      </footer>
    </div>
  );
};
