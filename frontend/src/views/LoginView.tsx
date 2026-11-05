import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  Flame,
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Building2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Cpu,
  Eye,
  KeyRound,
  Layers,
  AlertCircle,
  HelpCircle,
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
  const [email, setEmail] = useState('sanchit@visionforge.ai');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [regRole, setRegRole] = useState('engineer');
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);

  // Fallback demo users if API hasn't loaded yet
  const fallbackDemoUsers: DemoUser[] = [
    {
      id: 'demo-admin',
      name: 'Sanchit',
      email: 'sanchit@visionforge.ai',
      role: 'admin',
      role_title: 'Organization Administrator',
      badge_color: 'emerald',
      description: 'Root authority: Full access to all 13 stages, user invites, model promotion & runtimes.',
      tenant_name: 'SVG Global Enterprise',
      password_hint: 'password123',
    },
    {
      id: 'demo-engineer',
      name: 'Alex Chen',
      email: 'alex@visionforge.ai',
      role: 'engineer',
      role_title: 'ML Systems Engineer',
      badge_color: 'purple',
      description: 'Pipeline control: YOLO training runs, Colab GPU launcher, checkpoint analysis & staging.',
      tenant_name: 'SVG Global Enterprise',
      password_hint: 'password123',
    },
    {
      id: 'demo-reviewer',
      name: 'Marcus Vance',
      email: 'marcus@visionforge.ai',
      role: 'reviewer',
      role_title: 'Dataset QA Lead & Reviewer',
      badge_color: 'indigo',
      description: 'Quality assurance: Approves polygon masks, freezes dataset versions & runs benchmarks.',
      tenant_name: 'SVG Global Enterprise',
      password_hint: 'password123',
    },
    {
      id: 'demo-annotator',
      name: 'Elena Rostova',
      email: 'elena@visionforge.ai',
      role: 'annotator',
      role_title: 'Annotation Specialist',
      badge_color: 'amber',
      description: 'High-speed labeling: SAM 2 interactive segmentation & conveyor video tracking.',
      tenant_name: 'SVG Global Enterprise',
      password_hint: 'password123',
    },
    {
      id: 'demo-viewer',
      name: 'Sarah Jenkins',
      email: 'sarah@visionforge.ai',
      role: 'viewer',
      role_title: 'Auditor & Observer',
      badge_color: 'cyan',
      description: 'Read-only audit: Inspects metrics, dataset distributions & forensic model scores.',
      tenant_name: 'SVG Global Enterprise',
      password_hint: 'password123',
    },
    {
      id: 'demo-partner',
      name: 'David Kim',
      email: 'david@acmerobotics.com',
      role: 'admin',
      role_title: 'Acme Robotics Admin',
      badge_color: 'blue',
      description: 'External multi-tenant partner: Isolated Acme workspace & robotics pipeline.',
      tenant_name: 'Acme Robotics & Automation',
      password_hint: 'password123',
    },
  ];

  useEffect(() => {
    // Load dynamic demo users and tenants
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
      setErrorMessage('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.authLogin({ email: targetEmail, password: targetPass });
      login(res.user, res.token);
      addNotification({
        type: 'success',
        title: 'Authentication Successful',
        message: `Welcome to VisionForge Studio, ${res.user.name} (${res.user.role.toUpperCase()})`,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!name.trim() || !email.trim()) {
      setErrorMessage('Please provide your full name and work email.');
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
        role: regRole,
      });

      login(res.user, res.token);
      addNotification({
        type: 'success',
        title: 'Account Provisioned',
        message: `Created ${res.user.name} with ${regRole.toUpperCase()} permissions`,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const activeDemoList = demoUsers.length > 0 ? demoUsers : fallbackDemoUsers;

  const getRoleCardBorder = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'hover:border-emerald-500/50 hover:bg-emerald-500/5 group-hover:text-emerald-400';
      case 'engineer':
        return 'hover:border-purple-500/50 hover:bg-purple-500/5 group-hover:text-purple-400';
      case 'reviewer':
        return 'hover:border-indigo-500/50 hover:bg-indigo-500/5 group-hover:text-indigo-400';
      case 'annotator':
        return 'hover:border-amber-500/50 hover:bg-amber-500/5 group-hover:text-amber-400';
      case 'viewer':
      default:
        return 'hover:border-cyan-500/50 hover:bg-cyan-500/5 group-hover:text-cyan-400';
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'engineer':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'reviewer':
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
      case 'annotator':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'viewer':
      default:
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-[#080c14] text-slate-100 relative overflow-x-hidden selection:bg-brand-500 selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-brand-600/20 via-indigo-600/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-100px] w-[600px] h-[400px] bg-purple-600/10 blur-[150px] pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">VisionForge</span>
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-brand-500/15 text-brand-400 border border-brand-500/30">
                v2.4 Enterprise
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Autonomous Vision & YOLO MLOps Studio</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3.5 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>RBAC Enforcement Active</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-mono">SOC2 Type II</span>
        </div>
      </header>

      {/* Main Content: Split Grid */}
      <main className="w-full max-w-7xl mx-auto px-6 py-4 flex-1 flex flex-col justify-center z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Enterprise Login Card */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-slate-900/85 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/80 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500" />

              {/* Tabs: Sign In / Register */}
              <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    tab === 'signin'
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Enterprise Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    tab === 'register'
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Create Team Account
                </button>
              </div>

              {/* Form Heading */}
              <div className="mb-6">
                <h2 className="text-xl font-black text-white tracking-tight">
                  {tab === 'signin' ? 'Sign into your Workspace' : 'Provision Team Member Account'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {tab === 'signin'
                    ? 'Enter your credentials or click any RBAC profile on the right.'
                    : 'Assign granular permission tier and organization tenant.'}
                </p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Sign In Form */}
              {tab === 'signin' ? (
                <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Work Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="sanchit@visionforge.ai"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying Session Token...
                      </span>
                    ) : (
                      <>
                        <span>Authenticate & Launch Studio</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Registration Form */
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
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
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
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
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Tenant Organization
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        value={tenantId}
                        onChange={(e) => setTenantId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-brand-500 cursor-pointer"
                      >
                        {tenantsList.map((t) => (
                          <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                            {t.name} ({t.plan?.toUpperCase() || 'ENTERPRISE'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Assigned RBAC Role
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-brand-500 cursor-pointer font-semibold"
                    >
                      <option value="admin" className="bg-slate-900">Administrator (Root Pipeline & All Stages)</option>
                      <option value="engineer" className="bg-slate-900">ML Systems Engineer (Training, Colab & Models)</option>
                      <option value="reviewer" className="bg-slate-900">Dataset QA Reviewer (Annotation Approval & Splits)</option>
                      <option value="annotator" className="bg-slate-900">Annotation Specialist (SAM 2 & Conveyor Tracking)</option>
                      <option value="viewer" className="bg-slate-900">Auditor / Viewer (Read-Only Metrics & Forensic Log)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-brand-600 hover:from-emerald-500 hover:to-brand-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Provisioning User...
                      </span>
                    ) : (
                      <>
                        <span>Register & Enter Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Security Hint */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-brand-400" />
                  <span>Encrypted SHA-256 Auth</span>
                </div>
                <span className="text-slate-400 font-mono">VisionForge v2.4</span>
              </div>
            </div>
          </div>

          {/* Right Column: 1-Click RBAC Profile Switcher Cards */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-brand-400 font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20">
                  Role-Based Access Control
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5 tracking-tight flex items-center gap-2">
                  <span>Quick Test Login by Role</span>
                  <Sparkles className="w-4 h-4 text-brand-400" />
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Click any profile to instantly test permission boundaries
              </span>
            </div>

            {/* Grid of Seeded Profiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {activeDemoList.map((user) => {
                const badgeStyle = getRoleBadgeStyle(user.role);
                const borderHover = getRoleCardBorder(user.role);

                return (
                  <button
                    key={user.id || user.email}
                    onClick={() => {
                      setEmail(user.email);
                      setPassword(user.password_hint || 'password123');
                      handleLogin(undefined, user.email, user.password_hint || 'password123');
                    }}
                    className={`group text-left p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md transition-all duration-200 flex flex-col justify-between ${borderHover}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                          {user.role_title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 opacity-80 group-hover:opacity-100">
                          1-Click Login →
                        </span>
                      </div>

                      <div className="text-sm font-bold text-white group-hover:text-white flex items-center gap-2">
                        <span>{user.name}</span>
                        <span className="text-xs text-slate-400 font-normal">({user.email})</span>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                        {user.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="truncate max-w-[170px]">{user.tenant_name}</span>
                      <span className="font-mono text-brand-400 font-medium">PW: password123</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Granular Permission Summary Pill */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>
                  <strong className="text-slate-200">Granular Permission Matrix:</strong> Stages and mutating actions are locked according to active user role.
                </span>
              </div>
              <span className="text-[11px] font-mono text-brand-400 bg-brand-500/10 px-2 py-1 rounded-md border border-brand-500/20 whitespace-nowrap">
                Strict RBAC Active
              </span>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-800/60 z-10">
        <div>
          <span>© 2026 VisionForge Studio Inc. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Enterprise Tenant Isolation</span>
          <span>•</span>
          <span>Salted SHA-256 Credentials</span>
          <span>•</span>
          <span>Colab & Edge YOLO Inference</span>
        </div>
      </footer>
    </div>
  );
};
