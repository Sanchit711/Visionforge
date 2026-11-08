import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  FolderKanban,
  Plus,
  Video,
  Film,
  PencilRuler,
  Database,
  Cpu,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
  Sparkles,
  X,
  Boxes,
} from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const {
    projectsList,
    setProjectsList,
    activeProjectId,
    setActiveProject,
    setStage,
    addNotification,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [timeline, setTimeline] = useState<any>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState('detection');
  const [classesInput, setClassesInput] = useState('conveyor_item, defect, package, barcode');

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjectsList(data);
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Failed to load projects', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async (pId: string) => {
    try {
      const tl = await api.getProjectTimeline(pId);
      setTimeline(tl);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      loadTimeline(activeProjectId);
    }
  }, [activeProjectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const classNames = classesInput
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    const formattedClasses = classNames.map((cName, idx) => ({
      id: idx,
      name: cName,
      color: colors[idx % colors.length],
      hotkey: (idx + 1).toString(),
    }));

    try {
      const newProj = await api.createProject({
        name,
        description,
        task_type: taskType,
        classes: formattedClasses,
      });
      addNotification({ type: 'success', title: 'Project Created', message: `Created '${newProj.name}'` });
      setShowCreateModal(false);
      setName('');
      setDescription('');
      await loadProjects();
      setActiveProject(newProj);
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error creating project', message: err.message });
    }
  };

  const handleDelete = async (id: string, pName: string) => {
    if (!window.confirm(`Are you sure you want to delete project '${pName}'? This cannot be undone.`)) return;
    try {
      await api.deleteProject(id);
      addNotification({ type: 'info', title: 'Project Deleted', message: `Removed '${pName}'` });
      loadProjects();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Delete failed', message: err.message });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Vision Project Workspaces</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Architect computer vision datasets, model training runs, and deployment lineages
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-semibold shadow-md shadow-blue-500/25 transition-all active:scale-95 hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projectsList.map((p) => {
          const isActive = activeProjectId === p.id;
          return (
            <div
              key={p.id}
              className={`bg-white dark:bg-[#121826]/90 border rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-xl ${
                isActive
                  ? 'border-blue-500/80 ring-1 ring-blue-500/20 shadow-blue-500/5'
                  : 'border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className="font-bold text-sm text-slate-900 dark:text-white hover:text-blue-500 cursor-pointer transition-colors truncate"
                        onClick={() => setActiveProject(p)}
                      >
                        {p.name}
                      </h3>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {p.description || 'Continuous production vision inspection pipeline.'}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono flex-shrink-0">
                    {p.task_type}
                  </span>
                </div>

                {/* Metric Summary Bar */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.06] text-center">
                  <div className="bg-slate-50 dark:bg-white/[0.03] p-2.5 rounded-2xl border border-slate-100 dark:border-white/[0.04]">
                    <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">{p.video_count || 0}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Videos</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.03] p-2.5 rounded-2xl border border-slate-100 dark:border-white/[0.04]">
                    <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">{p.frame_count || 0}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Frames</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.03] p-2.5 rounded-2xl border border-slate-100 dark:border-white/[0.04]">
                    <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">{p.annotation_count || 0}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Annotations</div>
                  </div>
                </div>

                {/* Class Badges */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {(p.classes || []).slice(0, 5).map((cls: any, i: number) => (
                    <span
                      key={i}
                      className="text-[10px] px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/[0.06]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cls.color || '#3b82f6' }} />
                      {cls.name}
                    </span>
                  ))}
                  {(p.classes || []).length > 5 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 font-mono">
                      +{(p.classes || []).length - 5} more
                    </span>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-6 pt-3.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                <button
                  onClick={() => {
                    setActiveProject(p);
                    setStage('video_lab');
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                    isActive
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25'
                      : 'bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span>{isActive ? 'Workspace Active' : 'Enter Workspace'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  className="p-2 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Project Workflow Timeline Graph */}
      {timeline && (
        <div className="bg-white dark:bg-[#121826]/90 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-2xl rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Pipeline Dependency Tracker: <span className="text-blue-600 dark:text-blue-400">{timeline.project_name}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">End-to-end stage verification status</p>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Verified Graph
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
            {timeline.stages.map((stg: any, i: number) => {
              const isCompleted = stg.status === 'completed';
              return (
                <div
                  key={i}
                  onClick={() => setStage(stg.id)}
                  className="cursor-pointer bg-slate-50/70 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.06] hover:border-blue-400 dark:hover:border-white/20 rounded-2xl p-4 flex flex-col justify-between transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">Step 0{i + 1}</span>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2.5 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">
                      {stg.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{stg.description}</div>
                  </div>
                  <div className="mt-4 text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                    <span>Enter Stage</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Project Modal (Cupertino Glass Sheet) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Vision Project</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configure dataset coordinates & class definitions</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Conveyor Inspection Line 04"
                  className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Goals, camera details, conveyor speed, or packaging specifications..."
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Task Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="detection">Object Detection (BBox)</option>
                    <option value="segmentation">Instance Segmentation (Polygon)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Initial Classes</label>
                  <input
                    type="text"
                    value={classesInput}
                    onChange={(e) => setClassesInput(e.target.value)}
                    placeholder="package, defect, label"
                    className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 transition-all active:scale-95"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
