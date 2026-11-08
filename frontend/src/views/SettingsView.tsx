import React, { useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import {
  Settings,
  Sun,
  Moon,
  HardDrive,
  Keyboard,
  Shield,
  Sparkles,
  Save,
  Building2,
  Users,
  Check,
  Plus,
  Layers,
  Cpu,
  Key,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    theme,
    toggleTheme,
    setTheme,
    addNotification,
    currentTenant,
    setCurrentTenant,
    tenantsList,
    currentUser,
    setCurrentUser,
    usersList,
  } = useAppStore();

  const [appName, setAppName] = useState('VisionForge Studio');
  const [authorName, setAuthorName] = useState('VisionForge AI Engineering');

  const shortcuts = [
    { key: 'Ctrl + K', action: 'Open Global Command Palette' },
    { key: 'B', action: 'Activate Bounding Box Tool' },
    { key: 'P', action: 'Activate Polygon Segmentation Tool' },
    { key: 'S', action: 'SAM 2 Point Prompt Segmentation Mode' },
    { key: 'X', action: 'SAM 2 Box Prompt Boundary Refine' },
    { key: 'V', action: 'Activate Select & Pointer Tool' },
    { key: 'H / Space + Drag', action: 'Activate Pan Canvas Tool' },
    { key: 'A / Left Arrow', action: 'Previous Frame in Annotation Studio' },
    { key: 'D / Right Arrow', action: 'Next Frame in Annotation Studio' },
    { key: '1 - 9', action: 'Quick Switch Object Class & Palette' },
    { key: 'Delete / Backspace', action: 'Delete Selected Annotation' },
    { key: 'Ctrl + Z', action: 'Undo Canvas Modification' },
    { key: 'Ctrl + Y', action: 'Redo Canvas Modification' },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addNotification({ type: 'success', title: 'Settings Saved', message: 'Studio preferences updated.' });
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'reviewer':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'engineer':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'annotator':
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Studio Settings & Multi-Tenant Access</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage organization workspaces, team access roles, visual themes, and local engine parameters
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workspace Tenants & Multi-Tenancy */}
        <div className="bg-white dark:bg-[#121826]/90 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span>Workspace Tenants & Organizations</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Active: {currentTenant?.name || 'Default'}
            </span>
          </div>

          <div className="space-y-2">
            {tenantsList.map((tenant) => {
              const isActive = currentTenant?.id === tenant.id;
              return (
                <div
                  key={tenant.id}
                  onClick={() => {
                    setCurrentTenant(tenant);
                    addNotification({
                      type: 'info',
                      title: 'Active Workspace Set',
                      message: `Switched to ${tenant.name}`,
                    });
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-500/60 text-slate-900 dark:text-white shadow-sm'
                      : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate text-slate-900 dark:text-white">{tenant.name}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Slug: <span className="font-mono text-slate-700 dark:text-slate-300">{tenant.slug}</span> &bull; Plan:{' '}
                      <span className="uppercase font-semibold text-blue-600 dark:text-blue-400">{tenant.plan || 'Enterprise'}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 font-mono">
                      {tenant.project_count || 0} projects
                    </span>
                    {isActive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 hover:text-blue-500 font-semibold transition-colors">Switch</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Members & Role Context */}
        <div className="bg-white dark:bg-[#121826]/90 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>Team Members & Role Access</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300">
              {usersList.length} Accounts
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {usersList.map((user) => {
              const isCurrent = currentUser?.id === user.id;
              return (
                <div
                  key={user.id}
                  onClick={() => {
                    setCurrentUser(user);
                    addNotification({
                      type: 'success',
                      title: 'Active Session Switched',
                      message: `Session now active as ${user.name} (${user.role.toUpperCase()})`,
                    });
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isCurrent
                      ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-500/60 shadow-sm'
                      : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Current
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Branding & Theme Mode */}
        <div className="bg-white dark:bg-[#121826]/90 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span>Branding & Appearance</span>
            </h3>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Application Name</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Organization / Studio</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Visual Theme Selection */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
              <div className="font-semibold text-slate-700 dark:text-slate-300">Color Appearance</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                    theme === 'dark'
                      ? 'bg-blue-600/10 border-blue-500 text-blue-600 dark:text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <div className="text-left">
                    <div className="font-bold text-xs">Dark Graphite</div>
                    <div className="text-[10px] opacity-75">High contrast for vision lab</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                    theme === 'light'
                      ? 'bg-blue-600/10 border-blue-500 text-blue-600 dark:text-slate-900 shadow-sm'
                      : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sun className="w-5 h-5 text-amber-500" />
                  <div className="text-left">
                    <div className="font-bold text-xs">Clean Light</div>
                    <div className="text-[10px] opacity-75">Crisp daytime daylight mode</div>
                  </div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Preferences</span>
            </button>
          </form>
        </div>

        {/* VisionForge Studio Core Architecture & Design Standards */}
        <div className="bg-white dark:bg-[#121826]/90 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>Core Architecture & Design Standards</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              v2.4.0 Engine
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            VisionForge Studio implements an enterprise-grade industrial inspection architecture with 4-tier surface elevations, 20px Gaussian glassmorphism, sub-pixel bounding box tracking, and non-blocking pipeline telemetry.
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
              <span className="text-[10px] text-slate-400 block uppercase">Inference Engine</span>
              <span className="text-slate-900 dark:text-white font-bold">TensorRT / ONNX</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
              <span className="text-[10px] text-slate-400 block uppercase">Frame Tracking</span>
              <span className="text-emerald-500 font-bold">Rigid 60 FPS</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] text-xs">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>Cloud Acceleration Pipeline:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">Dual Tesla T4 (Headless)</span>
            </div>
          </div>
        </div>

        {/* Global Keyboard Shortcuts Table */}
        <div className="lg:col-span-2 bg-white dark:bg-[#121826]/90 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-blue-500" />
              <span>Studio Hotkeys & Acceleration Shortcuts</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300">
              13 Shortcuts Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {shortcuts.map((sc, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/[0.04]">
                <span className="text-slate-700 dark:text-slate-300">{sc.action}</span>
                <kbd className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-mono text-[11px] shadow-sm">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
