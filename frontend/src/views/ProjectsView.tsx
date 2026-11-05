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
  const [classesInput, setClassesInput] = useState('person, vehicle, helmet');

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
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Project Workspaces</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage datasets, model workflows, and version snapshots</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectsList.map((p) => {
          const isActive = activeProjectId === p.id;
          return (
            <div
              key={p.id}
              className={`bg-slate-900/90 border rounded-2xl p-5 transition-all flex flex-col justify-between shadow-xl ${
                isActive ? 'border-brand-500/80 shadow-brand-500/10' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-white hover:text-brand-400 cursor-pointer transition-colors" onClick={() => setActiveProject(p)}>
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description || 'No description provided.'}</p>
                  </div>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono flex-shrink-0">
                    {p.task_type}
                  </span>
                </div>

                {/* Counts */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center">
                  <div className="bg-slate-850/60 p-2 rounded-lg">
                    <div className="text-xs font-bold text-slate-200">{p.video_count || 0}</div>
                    <div className="text-[10px] text-slate-400">Videos</div>
                  </div>
                  <div className="bg-slate-850/60 p-2 rounded-lg">
                    <div className="text-xs font-bold text-slate-200">{p.frame_count || 0}</div>
                    <div className="text-[10px] text-slate-400">Frames</div>
                  </div>
                  <div className="bg-slate-850/60 p-2 rounded-lg">
                    <div className="text-xs font-bold text-slate-200">{p.annotation_count || 0}</div>
                    <div className="text-[10px] text-slate-400">Annotations</div>
                  </div>
                </div>

                {/* Class badges */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(p.classes || []).slice(0, 5).map((cls: any, i: number) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md font-mono flex items-center gap-1.5 bg-slate-800 text-slate-300"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cls.color || '#3b82f6' }} />
                      {cls.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => {
                    setActiveProject(p);
                    setStage('video_lab');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-200'
                  }`}
                >
                  <span>{isActive ? 'Workspace Active' : 'Select Project'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                Workflow Pipeline Graph: <span className="text-brand-300">{timeline.project_name}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Stage dependencies and progress tracker</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
            {timeline.stages.map((stg: any, i: number) => {
              const isCompleted = stg.status === 'completed';
              return (
                <div
                  key={i}
                  onClick={() => setStage(stg.id)}
                  className="cursor-pointer bg-slate-850/70 hover:bg-slate-800 border border-slate-800 hover:border-brand-500/50 rounded-xl p-3.5 flex flex-col justify-between transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">Stage 0{i + 1}</span>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-200 mt-2 group-hover:text-brand-400 transition-colors">
                      {stg.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{stg.description}</div>
                  </div>
                  <div className="mt-3 text-[10px] font-semibold text-brand-400 flex items-center justify-between">
                    <span>Open Stage</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create New Project</h3>
            <p className="text-xs text-slate-400 mt-1">Configure your computer vision dataset and classes</p>

            <form onSubmit={handleCreate} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Warehouse Worker Safety"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Goals, camera details, or target site..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Task Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="detection">Object Detection (BBox)</option>
                    <option value="segmentation">Instance Segmentation (Polygon)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Classes</label>
                  <input
                    type="text"
                    value={classesInput}
                    onChange={(e) => setClassesInput(e.target.value)}
                    placeholder="person, car, helmet"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30 transition-all"
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
