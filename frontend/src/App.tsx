import React, { useEffect, useState } from 'react';
import { useAppStore } from './stores/useAppStore';
import { api } from './services/api';
import { isStageAllowed } from './utils/rbac';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CommandPalette } from './components/CommandPalette';
import { NotificationToast } from './components/NotificationToast';
import { LoginModal } from './components/LoginModal';
import { RolesModal } from './components/RolesModal';
import { ProductTourModal } from './components/ProductTourModal';

import { LoginView } from './views/LoginView';
import { RBACRestrictedView } from './views/RBACRestrictedView';

import { OverviewView } from './views/OverviewView';
import { ProjectsView } from './views/ProjectsView';
import { VideoLabView } from './views/VideoLabView';
import { FrameStudioView } from './views/FrameStudioView';
import { AnnotationView } from './views/AnnotationView';
import { DatasetsView } from './views/DatasetsView';
import { TrainingView } from './views/TrainingView';
import { ExperimentsView } from './views/ExperimentsView';
import { ModelRegistryView } from './views/ModelRegistryView';
import { ValidationView } from './views/ValidationView';
import { ComputeRuntimesView } from './views/ComputeRuntimesView';
import { IntegrationsView } from './views/IntegrationsView';
import { SettingsView } from './views/SettingsView';
import { Flame } from 'lucide-react';

export function App() {
  const {
    currentStage,
    isAuthenticated,
    currentUser,
    setCurrentUser,
    setCurrentTenant,
    setWorkspacesList,
    setCurrentWorkspace,
    logout,
  } = useAppStore();

  const [authChecking, setAuthChecking] = useState(true);

  // Hydrate authenticated user session on initial application load
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('vf_auth_token') : null;
    if (!token) {
      setAuthChecking(false);
      return;
    }

    api
      .authMe()
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
        }
        if (data.tenant) {
          setCurrentTenant(data.tenant);
        }
        if (data.workspaces && data.workspaces.length > 0) {
          setWorkspacesList(data.workspaces);
          setCurrentWorkspace(data.workspaces[0]);
        }
      })
      .catch((err) => {
        console.warn('Session verification rejected:', err);
        logout();
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, []);

  // Show sleek splash screen while restoring session token
  if (authChecking) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#080c14] text-white">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-brand-500/20 mb-4 animate-pulse">
          <Flame className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          <span>Verifying VisionForge Enterprise Session...</span>
        </div>
      </div>
    );
  }

  // Gate application behind dedicated full-screen Login View
  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <LoginView />
        <NotificationToast />
      </>
    );
  }

  // Check RBAC permission for current stage
  const stageAllowed = isStageAllowed(currentUser.role, currentStage);

  const renderCurrentView = () => {
    if (!stageAllowed) {
      return <RBACRestrictedView attemptedStage={currentStage} />;
    }

    switch (currentStage) {
      case 'overview':
        return <OverviewView />;
      case 'projects':
        return <ProjectsView />;
      case 'video_lab':
        return <VideoLabView />;
      case 'frame_studio':
        return <FrameStudioView />;
      case 'annotation':
        return <AnnotationView />;
      case 'datasets':
        return <DatasetsView />;
      case 'training':
        return <TrainingView />;
      case 'experiments':
        return <ExperimentsView />;
      case 'model_registry':
        return <ModelRegistryView />;
      case 'validation':
        return <ValidationView />;
      case 'runtimes':
        return <ComputeRuntimesView />;
      case 'integrations':
        return <IntegrationsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Collapsible Left Sidebar with 13 Stages & RBAC Indicators */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header with RBAC User Pill & Quick Switcher */}
        <Header />

        {/* Dynamic Stage View (Guarded by RBAC Policy) */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-[#0b0f19] transition-colors duration-200">
          {renderCurrentView()}
        </main>
      </div>

      {/* Modals */}
      <LoginModal />
      <RolesModal />
      <ProductTourModal />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Toast Notification Stack */}
      <NotificationToast />
    </div>
  );
}
