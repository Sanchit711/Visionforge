import React, { useEffect, useState, useRef } from 'react';
import { useAppStore, TenantModel, UserModel, WorkspaceModel } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  Folder,
  Search,
  Sun,
  Moon,
  Building2,
  Users,
  Plus,
  ChevronDown,
  Check,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
  LogIn,
  LogOut,
  KeyRound,
  Lock,
  User,
  Briefcase,
  Share2,
  Compass,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentStage,
    setStage,
    activeProjectId,
    activeProject,
    setActiveProject,
    projectsList,
    setProjectsList,
    currentTenant,
    setCurrentTenant,
    tenantsList,
    setTenantsList,
    currentUser,
    setCurrentUser,
    usersList,
    setUsersList,
    currentWorkspace,
    setCurrentWorkspace,
    workspacesList,
    setWorkspacesList,
    theme,
    toggleTheme,
    setCommandPaletteOpen,
    setProductTourOpen,
    setLoginModalOpen,
    setRolesModalOpen,
    login,
    logout,
    addNotification,
  } = useAppStore();

  const [telemetry, setTelemetry] = useState<any>(null);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);

  // New workspace form
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [newWorkspaceIsShared, setNewWorkspaceIsShared] = useState(true);

  // New user form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('annotator');

  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(e.target as Node)) {
        setShowWorkspaceMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial Tenants, Workspaces, and Users
  useEffect(() => {
    // 1. Load Tenants
    api
      .getTenants()
      .then((tenants) => {
        setTenantsList(tenants);
        if (tenants.length > 0) {
          const matched = currentTenant
            ? tenants.find((t: any) => t.id === currentTenant.id) || tenants[0]
            : tenants[0];
          setCurrentTenant(matched);
        }
      })
      .catch((err) => console.error('Failed to load tenants:', err));

    // 2. Load Workspaces
    api
      .getWorkspaces()
      .then((workspaces) => {
        setWorkspacesList(workspaces);
        if (workspaces.length > 0 && !currentWorkspace) {
          const defShared = workspaces.find((w: any) => w.is_shared) || workspaces[0];
          setCurrentWorkspace(defShared);
        }
      })
      .catch((err) => console.error('Failed to load workspaces:', err));

    // 3. Load Users
    api
      .getUsers()
      .then((users) => {
        setUsersList(users);
        if (users.length > 0 && !currentUser) {
          const admin = users.find((u: any) => u.role === 'admin') || users[0];
          setCurrentUser(admin);
        }
      })
      .catch((err) => console.error('Failed to load users:', err));

    // 4. Load Hardware telemetry
    api
      .getTelemetry()
      .then((data) => setTelemetry(data))
      .catch((err) => console.error('Failed to load telemetry:', err));

    const interval = setInterval(() => {
      api.getTelemetry().then(setTelemetry).catch(() => {});
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  // When active tenant or workspace changes, fetch projects
  useEffect(() => {
    const tenantId = currentTenant ? currentTenant.id : undefined;
    api
      .getProjects(tenantId)
      .then((projects) => {
        setProjectsList(projects);
        if (projects.length > 0) {
          const isCurrentInList = projects.some((p: any) => p.id === activeProjectId);
          if (!isCurrentInList) {
            setActiveProject(projects[0]);
          }
        } else {
          setActiveProject(null);
        }
      })
      .catch((err) => console.error('Failed to load projects:', err));
  }, [currentTenant?.id, currentWorkspace?.id]);

  const handleSelectWorkspace = (ws: WorkspaceModel) => {
    setCurrentWorkspace(ws);
    setShowWorkspaceMenu(false);
    addNotification({
      type: 'info',
      title: 'Workspace Activated',
      message: `Active workspace: "${ws.name}" (${ws.is_shared ? 'Shared Team' : 'Private Sandbox'})`,
    });
  };

  const handleSelectUser = async (user: UserModel) => {
    try {
      const res = await api.authLogin({ email: user.email, password: 'password123' });
      login(res.user, res.token);
    } catch {
      setCurrentUser(user);
    }
    setShowUserMenu(false);
    addNotification({
      type: 'success',
      title: 'User Context Switched',
      message: `Signed in as ${user.name} (${user.role.toUpperCase()})`,
    });
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim() || !currentTenant) return;
    try {
      const created = await api.createWorkspace({
        tenant_id: currentTenant.id,
        name: newWorkspaceName.trim(),
        description: newWorkspaceDesc.trim() || `${newWorkspaceName} workspace`,
        is_shared: newWorkspaceIsShared,
      });
      const updatedList = await api.getWorkspaces(currentTenant.id);
      setWorkspacesList(updatedList);
      setCurrentWorkspace(created);
      setShowNewWorkspaceModal(false);
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      addNotification({
        type: 'success',
        title: 'Workspace Created',
        message: `Created "${created.name}" (${created.is_shared ? 'Shared' : 'Private'})`,
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Error Creating Workspace',
        message: err.message,
      });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !currentTenant) return;
    try {
      const created = await api.authRegister({
        tenant_id: currentTenant.id,
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: 'password123',
        role: newUserRole,
      });
      const updatedUsers = await api.getUsers();
      setUsersList(updatedUsers);
      setCurrentUser(created.user);
      setShowNewUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      addNotification({
        type: 'success',
        title: 'Member Added',
        message: `Added ${created.user.name} (${newUserRole.toUpperCase()}) with password: password123`,
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Error Adding Member',
        message: err.message,
      });
    }
  };

  const stageTitles: Record<string, string> = {
    overview: 'Mission Control Overview',
    projects: 'Projects & Workspaces',
    video_lab: 'Video Ingestion & Crop Lab',
    frame_studio: 'Frame Studio & Deduplication',
    annotation: 'AI-Assisted Annotation Canvas',
    datasets: 'Dataset Curation & Versioning',
    training: 'Training Control Center (YOLO)',
    experiments: 'Experiment Tracking & Analysis',
    model_registry: 'Model Registry & Deployment',
    validation: 'Validation & Inference Benchmark',
    runtimes: 'Compute Runtime Manager & Failover',
    integrations: 'Pluggable Integrations Catalog',
    settings: 'Settings & System Preferences',
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
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'viewer':
      default:
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    }
  };

  const sharedWorkspaces = workspacesList.filter((w) => w.is_shared);
  const privateWorkspaces = workspacesList.filter((w) => !w.is_shared);

  return (
    <header className="h-16 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-[#0c0e14]/90 backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between z-20 transition-colors">
      {/* Left: Breadcrumb & Stage Title */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 mr-2">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-500 dark:text-[#86868b] flex-shrink-0">
          <span className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer" onClick={() => setStage('overview')}>
            VisionForge
          </span>
          <span>/</span>
          <span className="text-[#0071e3] font-medium capitalize truncate max-w-[100px] sm:max-w-none">{currentStage.replace('_', ' ')}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-white/[0.1] flex-shrink-0 hidden sm:block" />
        <h1 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white tracking-tight truncate hidden sm:block">
          {stageTitles[currentStage] || currentStage}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 max-w-[75%] justify-end">
        {/* Workspace Switcher: Partitioned into Shared & Personal */}
        <div className="relative hidden lg:block" ref={workspaceMenuRef} data-tour="workspace-selector">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-300/80 dark:border-white/[0.08] rounded-full px-3 py-1.5 shadow-sm transition-all text-left"
            title="Switch Workspace (Shared Team or Private)"
          >
            {currentWorkspace?.is_shared ? (
              <Share2 className="w-3.5 h-3.5 text-[#0071e3] flex-shrink-0" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            )}
            <div className="flex flex-col min-w-0 max-w-[120px] xl:max-w-[160px]">
              <span className="text-[9px] uppercase font-semibold text-slate-500 dark:text-[#86868b] leading-none flex items-center gap-1">
                Workspace
                <span className="text-[8px] px-1 py-0.2 rounded-full bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300">
                  {currentWorkspace?.is_shared ? 'Shared' : 'Private'}
                </span>
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight mt-0.5">
                {currentWorkspace ? currentWorkspace.name : 'Production Workspace'}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-[#86868b] flex-shrink-0" />
          </button>

          {showWorkspaceMenu && (
            <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    {currentTenant?.name || 'SVG Global Enterprise'}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400">
                  {currentTenant?.plan || 'Enterprise'}
                </span>
              </div>

              {/* Shared Workspaces Section */}
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-3 h-3 text-brand-400" />
                <span>Shared Team Workspaces</span>
              </div>
              <div className="py-0.5">
                {sharedWorkspaces.map((ws) => {
                  const isSelected = currentWorkspace?.id === ws.id;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSelectWorkspace(ws)}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                        isSelected ? 'bg-brand-500/10 text-brand-500 dark:text-brand-400 font-semibold' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="truncate">{ws.name}</span>
                        <span className="text-[10px] text-slate-400 truncate">{ws.description}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-brand-400 flex-shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>

              {/* Personal / Private Sandboxes Section */}
              <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-800">
                <Lock className="w-3 h-3 text-purple-400" />
                <span>Personal & Sandbox Workspaces</span>
              </div>
              <div className="py-0.5">
                {privateWorkspaces.map((ws) => {
                  const isSelected = currentWorkspace?.id === ws.id;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSelectWorkspace(ws)}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                        isSelected ? 'bg-purple-500/10 text-purple-400 font-semibold' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="truncate">{ws.name}</span>
                        <span className="text-[10px] text-slate-400 truncate">{ws.description}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-purple-400 flex-shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>

              {/* Create New Workspace */}
              <div className="px-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setShowWorkspaceMenu(false);
                    setShowNewWorkspaceModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 dark:text-brand-400 text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Workspace (Shared / Private)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Project Selector Dropdown */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-white/[0.04] border border-slate-300/80 dark:border-white/[0.08] rounded-full px-3 py-1.5 shadow-sm">
          <Folder className="w-3.5 h-3.5 text-[#0071e3] flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] uppercase font-semibold text-slate-500 dark:text-[#86868b] leading-none">Project</span>
            <select
              value={activeProjectId || ''}
              onChange={(e) => {
                const selected = projectsList.find((p) => p.id === e.target.value);
                if (selected) setActiveProject(selected);
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer max-w-[110px] sm:max-w-[150px] truncate leading-tight mt-0.5"
            >
              {projectsList.length === 0 && <option value="">No Projects</option>}
              {projectsList.map((p) => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* User Profile, Login & RBAC Badge */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-300 dark:border-white/[0.08] rounded-full px-2.5 py-1.5 shadow-sm transition-all text-left"
            title="User Profile & Role Context"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#0071e3] to-[#6366f1] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:flex flex-col min-w-0 max-w-[110px]">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-none">
                {currentUser ? currentUser.name : 'Admin'}
              </span>
              <span
                className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.2 rounded-full border w-fit leading-tight mt-0.5 ${getRoleBadgeStyle(
                  currentUser?.role || 'admin'
                )}`}
              >
                {currentUser?.role || 'admin'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#86868b] flex-shrink-0" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {currentUser?.name || 'Admin'}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate">
                      {currentUser?.email || 'admin@visionforge.ai'}
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getRoleBadgeStyle(
                      currentUser?.role || 'admin'
                    )}`}
                  >
                    Role: {currentUser?.role || 'admin'}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {currentTenant?.name || 'SVG Global'}
                  </span>
                </div>
              </div>

              {/* Roles & Responsibilities Matrix Trigger */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setRolesModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 dark:text-brand-400 text-xs font-semibold transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-400" />
                    <span>Roles & Permissions Matrix</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-500/20">RBAC</span>
                </button>
              </div>

              {/* Quick Switch Team Member */}
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Switch Seeded User
              </div>

              <div className="max-h-44 overflow-y-auto py-0.5">
                {usersList.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                        isCurrent ? 'bg-brand-500/10 text-brand-500 dark:text-brand-400 font-semibold' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{u.name}</span>
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(u.role)}`}>
                        {u.role}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sign In with Password / New Account */}
              <div className="p-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setLoginModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Login with Email / Password</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                    addNotification({
                      type: 'info',
                      title: 'Signed Out',
                      message: 'Session token invalidated',
                    });
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-500 dark:text-rose-400 text-xs font-semibold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Product Tour Trigger */}
        <button
          onClick={() => setProductTourOpen(true)}
          className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-full px-3 py-1.5 text-xs font-medium transition-all shadow-sm active:scale-95"
          title="Start Interactive Product Tour"
        >
          <Compass className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">Tour</span>
        </button>

        {/* Spotlight Search Style (Stitch Apple Light UI) */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f5f5f7] hover:bg-[#eaeaea] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-[#e5e5ea] dark:border-white/10 text-[#86868b] transition-all w-56 justify-between text-xs"
          title="Spotlight Search (Ctrl+K)"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-[#86868b]" />
            <span className="text-[11px] truncate">Search runs, layers...</span>
          </div>
          <kbd className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.1] text-[#86868b] border border-[#d2d2d7]/50 shadow-xs">
            ⌘K
          </kbd>
        </button>

        {/* Device Pulse Badge (Stitch Apple Light UI) */}
        <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] px-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.04] border border-[#e5e5ea] dark:border-white/10 text-[#6e6e73] dark:text-[#86868b] shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" />
          <span className="font-semibold text-[#1d1d1f] dark:text-white">RTX 4090</span>
          <span className="text-[#d2d2d7] dark:text-white/20">•</span>
          <span>68% Util</span>
          <span className="text-[#d2d2d7] dark:text-white/20">•</span>
          <span className="text-[#1d1d1f] dark:text-white">62°C</span>
        </div>

        {/* Compute Telemetry Badge */}
        {telemetry && (
          <div className="hidden 2xl:flex items-center gap-2 bg-[#f5f5f7] dark:bg-white/[0.04] border border-[#e5e5ea] dark:border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px] font-medium">
              {telemetry.cuda_available ? 'CUDA GPU' : 'Host CPU'}
            </span>
            <span className="text-slate-400 dark:text-slate-600">|</span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-[#86868b]">
              RAM {telemetry.ram_percent}%
            </span>
          </div>
        )}

        {/* Theme Toggle (Dark / Light) */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-[#f5f5f7] hover:bg-[#eaeaea] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-[#e5e5ea] dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-[#1d1d1f] dark:hover:text-white transition-all shadow-xs active:scale-95"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500 transition-transform hover:-rotate-12" />
          )}
        </button>
      </div>

      {/* Modal: Create Workspace (Shared / Private) */}
      {showNewWorkspaceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowNewWorkspaceModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Workspace</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Partition projects into Shared Team or Private Sandbox workspaces
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g. SVG Conveyor Inspection Unit"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={newWorkspaceDesc}
                  onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                  placeholder="e.g. Dedicated conveyor tracking and package labeling"
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Workspace Scope & Access
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewWorkspaceIsShared(true)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newWorkspaceIsShared
                        ? 'bg-brand-500/10 border-brand-500 text-brand-500 dark:text-brand-400'
                        : 'bg-slate-50 dark:bg-slate-850 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Shared Team</span>
                    </div>
                    <span className="text-[10px] block opacity-80">
                      Accessible by all members in organization
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewWorkspaceIsShared(false)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      !newWorkspaceIsShared
                        ? 'bg-purple-500/10 border-purple-500 text-purple-500 dark:text-purple-400'
                        : 'bg-slate-50 dark:bg-slate-850 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Private Sandbox</span>
                    </div>
                    <span className="text-[10px] block opacity-80">
                      Isolated to your personal account
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewWorkspaceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-lg shadow-brand-500/25 transition-all"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};