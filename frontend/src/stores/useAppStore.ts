import { create } from 'zustand';

export type StageId =
  | 'overview'
  | 'projects'
  | 'video_lab'
  | 'frame_studio'
  | 'annotation'
  | 'datasets'
  | 'training'
  | 'experiments'
  | 'model_registry'
  | 'validation'
  | 'runtimes'
  | 'integrations'
  | 'settings';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

export interface TenantModel {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings_json?: Record<string, any>;
  user_count?: number;
  project_count?: number;
}

export interface UserModel {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  is_active?: boolean;
  tenant_name?: string;
}

export interface WorkspaceModel {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string;
  is_shared: boolean;
  owner_user_id?: string;
  project_count?: number;
  settings_json?: Record<string, any>;
  created_at?: string;
}

interface AppState {
  currentStage: StageId;
  activeProjectId: string | null;
  activeProject: any | null;
  projectsList: any[];

  // Multi-Tenant & User
  currentTenant: TenantModel | null;
  tenantsList: TenantModel[];
  currentUser: UserModel | null;
  usersList: UserModel[];

  // Workspaces (Shared & Private)
  currentWorkspace: WorkspaceModel | null;
  workspacesList: WorkspaceModel[];

  // Auth & Roles
  authToken: string | null;
  isAuthenticated: boolean;
  rolesList: any[];
  loginModalOpen: boolean;
  rolesModalOpen: boolean;

  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  productTourOpen: boolean;
  stitchModalOpen: boolean;
  notifications: ToastNotification[];

  setStage: (stage: StageId) => void;
  setActiveProjectId: (id: string | null) => void;
  setActiveProject: (project: any | null) => void;
  setProjectsList: (projects: any[]) => void;

  setCurrentTenant: (tenant: TenantModel | null) => void;
  setTenantsList: (tenants: TenantModel[]) => void;
  setCurrentUser: (user: UserModel | null) => void;
  setUsersList: (users: UserModel[]) => void;

  setCurrentWorkspace: (workspace: WorkspaceModel | null) => void;
  setWorkspacesList: (workspaces: WorkspaceModel[]) => void;

  setAuthToken: (token: string | null) => void;
  setRolesList: (roles: any[]) => void;
  setLoginModalOpen: (open: boolean) => void;
  setRolesModalOpen: (open: boolean) => void;
  login: (user: UserModel, token: string) => void;
  logout: () => void;

  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setProductTourOpen: (open: boolean) => void;
  setStitchModalOpen: (open: boolean) => void;
  addNotification: (notification: Omit<ToastNotification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

// Initial theme resolution
const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('vf_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  }
  return 'dark';
};

const initialTheme = getInitialTheme();
if (typeof document !== 'undefined') {
  if (initialTheme === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }
}

export const useAppStore = create<AppState>((set) => ({
  currentStage: 'overview',
  activeProjectId: null,
  activeProject: null,
  projectsList: [],

  // Multi-Tenant & User
  currentTenant: null,
  tenantsList: [],
  currentUser: null,
  usersList: [],

  // Workspaces (Shared & Private)
  currentWorkspace: null,
  workspacesList: [],

  // Auth & Roles
  authToken: typeof window !== 'undefined' ? localStorage.getItem('vf_auth_token') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('vf_auth_token') : false,
  rolesList: [],
  loginModalOpen: false,
  rolesModalOpen: false,

  theme: initialTheme,
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  productTourOpen: false,
  stitchModalOpen: false,
  notifications: [],

  setStage: (stage) => set({ currentStage: stage }),
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setActiveProject: (project) => set({ activeProject: project, activeProjectId: project ? project.id : null }),
  setProjectsList: (projects) => set({ projectsList: projects }),

  setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
  setTenantsList: (tenants) => set({ tenantsList: tenants }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setUsersList: (users) => set({ usersList: users }),

  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setWorkspacesList: (workspaces) => set({ workspacesList: workspaces }),

  setAuthToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('vf_auth_token', token);
      else localStorage.removeItem('vf_auth_token');
    }
    set({ authToken: token, isAuthenticated: !!token });
  },
  setRolesList: (roles) => set({ rolesList: roles }),
  setLoginModalOpen: (open) => set({ loginModalOpen: open }),
  setRolesModalOpen: (open) => set({ rolesModalOpen: open }),

  login: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vf_auth_token', token);
    }
    set({ currentUser: user, authToken: token, isAuthenticated: true, loginModalOpen: false });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vf_auth_token');
    }
    set({ currentUser: null, authToken: null, isAuthenticated: false });
  },

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        if (next === 'dark') {
          document.documentElement.classList.remove('light');
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('vf_theme', next);
      }
      return { theme: next };
    }),

  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('vf_theme', theme);
    }
    set({ theme });
  },

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setProductTourOpen: (open) => set({ productTourOpen: open }),
  setStitchModalOpen: (open) => set({ stitchModalOpen: open }),
  addNotification: (notification) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 4500);
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
