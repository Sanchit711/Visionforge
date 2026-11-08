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
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    theme,
    toggleTheme,
    setTheme,
    setStitchModalOpen,
    addNotification,
    currentTenant,
    setCurrentTenant,
    tenantsList,
    currentUser,
    setCurrentUser,
    usersList,
  } = useAppStore();

  const [appName, setAppName] = useState('VisionForge Studio');
  const [authorName, setAuthorName] = useState('ML Computer Vision Team');

  const shortcuts = [
    { key: 'Ctrl + K', action: 'Open Global Command Palette' },
    { key: 'B', action: 'Activate Bounding Box Tool' },
    { key: 'P', action: 'Activate Polygon Segmentation Tool' },
    { key: 'S', action: 'SAM 2 Point Prompt Segmentation Mode' },
    { key: 'X', action: 'SAM 2 Box Prompt Fine Boundary Mode' },
    { key: 'V', action: 'Activate Select / Move Tool' },
    { key: 'H / Space + Drag', action: 'Activate Pan Canvas Tool' },
    { key: 'A / Left Arrow', action: 'Previous Frame in Annotation Studio' },
    { key: 'D / Right Arrow', action: 'Next Frame in Annotation Studio' },
    { key: '1 - 9', action: 'Quick Switch Class Color & Category' },
    { key: 'Delete / Backspace', action: 'Delete Selected Annotation' },
    { key: 'Ctrl + Z', action: 'Undo Annotation Modification' },
    { key: 'Ctrl + Y', action: 'Redo Annotation Modification' },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addNotification({ type: 'success', title: 'Settings Saved', message: 'Studio preferences updated.' });
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'reviewer':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'engineer':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'annotator':
      default:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Bar */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white tracking-tight">Studio Settings & Multi-Tenant Access</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure branding, light/dark theme modes, workspace tenants, and team roles
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workspace Tenants & Multi-Tenancy */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-400" />
              Workspace Tenants & Organizations
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
              Active: {currentTenant?.name || 'Default'}
            </span>
          </h3>

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
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'bg-brand-500/10 border-brand-500/40 text-brand-300'
                      : 'bg-slate-850/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate text-white">{tenant.name}</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Slug: <span className="font-mono text-slate-300">{tenant.slug}</span> • Plan:{' '}
                      <span className="uppercase font-semibold text-brand-400">{tenant.plan || 'Enterprise'}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {tenant.project_count || 0} projects
                    </span>
                    {isActive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 hover:text-slate-300 font-semibold">Switch</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Members & Role Context */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" />
              Team Members & Role Access
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {usersList.length} Accounts
            </span>
          </h3>

          <div className="space-y-2 max-h-72 overflow-y-auto">
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
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isCurrent
                      ? 'bg-brand-500/10 border-brand-500/40'
                      : 'bg-slate-850/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{user.name}</span>
                      <span className="text-[11px] text-slate-400 truncate">{user.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getRoleBadgeStyle(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sparkles className="w-4 h-4 text-brand-400" />
            Branding & Visual Theme
          </h3>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Application Name</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Organization / Studio</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
              />
            </div>

            {/* Visual Theme Selection */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="font-semibold text-slate-200">Color Theme</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    theme === 'dark'
                      ? 'bg-brand-600/20 border-brand-500 text-white shadow-md shadow-brand-500/20'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <div className="text-left">
                    <div className="font-bold text-xs">Dark Graphite</div>
                    <div className="text-[10px] text-slate-400">High contrast for vision lab</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    theme === 'light'
                      ? 'bg-amber-500/20 border-amber-500 text-slate-900 shadow-md shadow-amber-500/20'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun className="w-5 h-5 text-amber-500" />
                  <div className="text-left">
                    <div className="font-bold text-xs">Clean Light</div>
                    <div className="text-[10px] text-slate-400">Crisp daytime daylight mode</div>
                  </div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold shadow-md shadow-brand-600/30 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Preferences</span>
            </button>
          </form>
        </div>

        {/* Google Stitch Design System */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Google Stitch Design System
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              DESIGN.md v1.0
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            VisionForge implements the open <span className="font-mono text-slate-200">DESIGN.md</span> specification popularized by Google Stitch. It standardizes design tokens, surface elevations, Apple-inspired glassmorphism, and Cupertino spring curves across the entire UI/UX.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStitchModalOpen(true)}
              className="stitch-pill bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Open Stitch Inspector</span>
            </button>
          </div>
        </div>

        {/* Global Keyboard Shortcuts Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-800">
            <Keyboard className="w-4 h-4 text-brand-400" />
            Global Keyboard Shortcuts
          </h3>

          <div className="divide-y divide-slate-800/80 max-h-80 overflow-y-auto">
            {shortcuts.map((sc, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-300">{sc.action}</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
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
