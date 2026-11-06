import React from 'react';
import { useAppStore, StageId } from '../stores/useAppStore';
import { getRoleDefinition, normalizeRole } from '../utils/rbac';
import { api } from '../services/api';
import {
  ShieldAlert,
  Lock,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface Props {
  attemptedStage: StageId;
}

export const RBACRestrictedView: React.FC<Props> = ({ attemptedStage }) => {
  const { currentUser, setStage, login, addNotification } = useAppStore();
  const currentRoleDef = getRoleDefinition(currentUser?.role);

  const getRequiredRole = (stage: StageId): string => {
    switch (stage) {
      case 'training':
      case 'runtimes':
        return 'ML Systems Engineer or Administrator';
      case 'settings':
        return 'Organization Administrator';
      case 'experiments':
      case 'model_registry':
      case 'validation':
        return 'QA Reviewer, ML Engineer, or Administrator';
      default:
        return 'Elevated Workspace Permissions';
    }
  };

  const handleQuickSwitch = async (targetEmail: string) => {
    try {
      const res = await api.authLogin({ email: targetEmail, password: 'password123' });
      login(res.user, res.token);
      addNotification({
        type: 'success',
        title: 'Role Switched',
        message: `Switched perspective to ${res.user.name} (${res.user.role.toUpperCase()})`,
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Switch Failed',
        message: err.message,
      });
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-md">
      <div className="max-w-2xl w-full bg-slate-850/90 border border-slate-750 rounded-2xl shadow-2xl p-8 relative overflow-hidden text-center">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-28 bg-rose-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-6 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>

        <span className="text-[11px] font-mono uppercase tracking-widest text-rose-400 font-bold px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
          RBAC Access Boundary
        </span>

        <h2 className="text-2xl font-black text-white mt-4 tracking-tight">
          Stage Access Restricted
        </h2>

        <p className="text-slate-300 text-sm mt-2 max-w-lg mx-auto leading-relaxed">
          The <span className="font-semibold text-white uppercase tracking-wider">{attemptedStage.replace('_', ' ')}</span> stage is restricted under your active role policy.
        </p>

        {/* Current Role vs Required Role Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 text-left">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400">Your Active Role</span>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${currentRoleDef.badgeClass}`}>
                {currentRoleDef.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {currentRoleDef.description}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[10px] uppercase font-bold text-amber-400">Required Role Access</span>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-white">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>{getRequiredRole(attemptedStage)}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              This stage executes compute runtimes or modifies critical pipeline parameters.
            </p>
          </div>
        </div>

        {/* Quick Auditing / Switcher Buttons */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 mb-6 text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>Audit Permission Perspectives</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">1-Click Test Login</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickSwitch('admin@visionforge.ai')}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-all"
            >
              Switch to Organization Admin
            </button>
            <button
              onClick={() => handleQuickSwitch('alex@visionforge.ai')}
              className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-medium transition-all"
            >
              Switch to ML Engineer (Alex)
            </button>
            <button
              onClick={() => handleQuickSwitch('marcus@visionforge.ai')}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-medium transition-all"
            >
              Switch to Reviewer (Marcus)
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setStage('overview')}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-md shadow-brand-600/30 flex items-center gap-2"
          >
            <span>Return to Mission Overview</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
