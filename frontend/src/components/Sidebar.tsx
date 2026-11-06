import React from 'react';
import { useAppStore, StageId } from '../stores/useAppStore';
import { isStageAllowed, getRoleDefinition } from '../utils/rbac';
import {
  LayoutDashboard,
  FolderKanban,
  Video,
  Film,
  PencilRuler,
  Database,
  Cpu,
  LineChart,
  Box,
  ScanEye,
  Server,
  Blocks,
  Settings,
  ChevronLeft,
  ChevronRight,
  Flame,
  Lock,
} from 'lucide-react';

interface NavItem {
  id: StageId;
  label: string;
  icon: React.ElementType;
  badge?: string;
  category?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'video_lab', label: 'Video Lab', icon: Video, category: 'Data Pipeline' },
  { id: 'frame_studio', label: 'Frame Studio', icon: Film, category: 'Data Pipeline' },
  { id: 'annotation', label: 'AI Annotation', icon: PencilRuler, category: 'Data Pipeline' },
  { id: 'datasets', label: 'Datasets', icon: Database, category: 'Data Pipeline' },
  { id: 'training', label: 'Training Center', icon: Cpu, category: 'Model & Train' },
  { id: 'experiments', label: 'Experiments', icon: LineChart, category: 'Model & Train' },
  { id: 'model_registry', label: 'Model Registry', icon: Box, category: 'Model & Train' },
  { id: 'validation', label: 'Validation Lab', icon: ScanEye, category: 'Model & Train' },
  { id: 'runtimes', label: 'Compute Runtimes', icon: Server, category: 'System' },
  { id: 'integrations', label: 'Integrations', icon: Blocks, category: 'System' },
  { id: 'settings', label: 'Settings', icon: Settings, category: 'System' },
];

export const Sidebar: React.FC = () => {
  const {
    currentStage,
    setStage,
    sidebarCollapsed,
    toggleSidebar,
    activeProject,
    currentTenant,
    currentUser,
  } = useAppStore();

  const roleDef = getRoleDefinition(currentUser?.role);

  return (
    <aside
      className={`relative flex flex-col border-r border-white/[0.08] bg-[#0c0e14]/95 backdrop-blur-2xl transition-all duration-300 z-30 select-none ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => setStage('overview')}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0071e3] to-[#6366f1] flex items-center justify-center shadow-lg shadow-blue-500/15 flex-shrink-0">
            <Flame className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-semibold text-[15px] tracking-tight text-white flex items-center gap-1.5">
                VisionForge <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">STUDIO</span>
              </span>
              <span className="text-[11px] text-[#86868b] truncate">Computer Vision Suite</span>
            </div>
          )}
        </div>
      </div>

      {/* Active Workspace & User Role Banner */}
      {!sidebarCollapsed && (
        <div className="px-3.5 py-3 mx-3 mt-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider">Workspace</span>
            <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/[0.08]">
              {currentTenant?.plan || 'ENTERPRISE'}
            </span>
          </div>
          <div className="text-xs font-semibold text-white truncate">
            {currentTenant ? currentTenant.name : 'SVG Enterprise Global'}
          </div>

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-[#86868b]">Role:</span>
            <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${roleDef.badgeClass}`}>
              {roleDef.badge}
            </span>
          </div>

          {activeProject && (
            <div className="pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
              <span className="text-[#86868b]">Project:</span>
              <span className="font-medium text-slate-200 truncate max-w-[130px]">{activeProject.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const isActive = currentStage === item.id;
          const isAllowed = isStageAllowed(currentUser?.role, item.id);
          const showCategoryHeader =
            !sidebarCollapsed &&
            item.category &&
            (idx === 0 || NAV_ITEMS[idx - 1].category !== item.category);

          return (
            <React.Fragment key={item.id}>
              {showCategoryHeader && (
                <div className="pt-3 pb-1 px-3 text-[10px] uppercase font-semibold text-[#86868b] tracking-wider">
                  {item.category}
                </div>
              )}
              <button
                onClick={() => setStage(item.id)}
                title={
                  sidebarCollapsed
                    ? `${item.label}${!isAllowed ? ' (Locked by Role)' : ''}`
                    : undefined
                }
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-[#0071e3] text-white shadow-md shadow-blue-500/20 font-medium'
                    : isAllowed
                    ? 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                    : 'text-slate-600 hover:text-slate-500 hover:bg-white/[0.02] opacity-60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105 ${
                    isActive
                      ? 'text-white'
                      : isAllowed
                      ? 'text-[#86868b] group-hover:text-white'
                      : 'text-slate-600'
                  }`}
                />
                {!sidebarCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {/* Lock icon if role is restricted */}
                {!sidebarCollapsed && !isAllowed && (
                  <Lock className="w-3 h-3 text-slate-600 flex-shrink-0" />
                )}

                {isActive && (
                  <span className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Collapse Toggle Footer */}
      <div className="p-3 border-t border-white/[0.06] flex items-center justify-between">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-[#86868b] hover:text-white transition-all text-xs gap-2"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /> <span>Collapse Sidebar</span></>}
        </button>
      </div>
    </aside>
  );
};
