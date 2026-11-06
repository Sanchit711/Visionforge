import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  FolderKanban,
  Video,
  Film,
  PencilRuler,
  Database,
  Cpu,
  Box,
  Server,
  Activity,
  HardDrive,
  Layers,
  ArrowRight,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const OverviewView: React.FC = () => {
  const { setStage, setActiveProject } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      const res = await api.getOverview();
      setData(res);
    } catch (err) {
      console.error('Failed to load overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <Activity className="w-6 h-6 animate-spin text-brand-500 mr-3" />
        <span className="text-sm">Loading VisionForge Studio telemetry...</span>
      </div>
    );
  }

  const { metrics, telemetry, recent_projects, recent_experiments, recent_activities } = data;

  const kpis = [
    { label: 'Total Projects', value: metrics.projects, icon: FolderKanban, stage: 'projects', color: 'from-blue-500 to-indigo-600' },
    { label: 'Source Videos', value: metrics.videos, icon: Video, stage: 'video_lab', color: 'from-indigo-500 to-purple-600' },
    { label: 'Extracted Frames', value: metrics.frames, icon: Film, stage: 'frame_studio', color: 'from-purple-500 to-pink-600' },
    { label: 'Annotated Items', value: metrics.annotations, icon: PencilRuler, stage: 'annotation', color: 'from-pink-500 to-rose-600' },
    { label: 'Dataset Versions', value: metrics.datasets, icon: Database, stage: 'datasets', color: 'from-emerald-500 to-teal-600' },
    { label: 'Training Runs', value: metrics.experiments, icon: Cpu, stage: 'training', color: 'from-amber-500 to-orange-600' },
    { label: 'Model Weights', value: metrics.registered_models, icon: Box, stage: 'model_registry', color: 'from-cyan-500 to-blue-600' },
    { label: 'Online Runtimes', value: metrics.online_runtimes, icon: Server, stage: 'runtimes', color: 'from-emerald-400 to-green-600' },
  ];

  const pipelineStages = [
    { name: '1. Video Ingest', desc: 'Raw Video Upload & Trimming', stage: 'video_lab' },
    { name: '2. ROI Crop', desc: 'Normalized Coordinates & Presets', stage: 'video_lab' },
    { name: '3. Frame Studio', desc: 'FPS Intervals & Deduplication', stage: 'frame_studio' },
    { name: '4. AI Annotation', desc: 'YOLO & SAM Assisted Labeling', stage: 'annotation' },
    { name: '5. Datasets', desc: 'Video-Leakage Free Splits & YAML', stage: 'datasets' },
    { name: '6. YOLO Training', desc: 'Pretrained & Safeguard Fine-Tune', stage: 'training' },
    { name: '7. Validation', desc: 'Latency Benchmark & Comparison', stage: 'validation' },
    { name: '8. Deployment', desc: 'Registry & Colab Runtime Sync', stage: 'model_registry' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div
              key={i}
              onClick={() => setStage(k.stage as any)}
              className="group cursor-pointer bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-white/[0.16] backdrop-blur-xl rounded-[20px] p-4 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#86868b] tracking-tight">{k.label}</span>
                <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${k.color} flex items-center justify-center text-white shadow-sm`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-white tracking-tight mt-3">{k.value}</div>
            </div>
          );
        })}
      </div>

      {/* Main Row: End-to-End Pipeline & Hardware Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* End-to-End Workflow Pipeline Tracker */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.07] backdrop-blur-2xl rounded-[24px] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0071e3]" />
                Unified Vision Pipeline Flow
              </h2>
              <p className="text-xs text-[#86868b] mt-0.5">Continuous handoff from raw video to deployed model weights</p>
            </div>
            <button
              onClick={() => setStage('projects')}
              className="text-xs font-medium text-[#0071e3] hover:text-blue-400 flex items-center gap-1 transition-colors"
            >
              Manage Projects <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 flex-1">
            {pipelineStages.map((stg, idx) => (
              <div
                key={idx}
                onClick={() => setStage(stg.stage as any)}
                className="cursor-pointer bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.18] rounded-[18px] p-4 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {stg.name}
                  </div>
                  <div className="text-[11px] text-[#86868b] mt-1 leading-snug">{stg.desc}</div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-[#0071e3] font-medium">
                  <span>Enter Stage</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real Hardware & Compute Telemetry */}
        <div className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-2xl rounded-[24px] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Hardware Telemetry
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Real-Time
            </span>
          </div>

          <div className="space-y-4 pt-4 text-xs">
            {/* CPU */}
            <div>
              <div className="flex justify-between text-slate-300 font-medium mb-1">
                <span>CPU Usage ({telemetry.cpu_count} Logical Cores)</span>
                <span className="font-mono text-brand-400">{telemetry.cpu_percent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, telemetry.cpu_percent)}%` }}
                />
              </div>
            </div>

            {/* RAM */}
            <div>
              <div className="flex justify-between text-slate-300 font-medium mb-1">
                <span>Memory ({telemetry.ram_used_gb} / {telemetry.ram_total_gb} GB)</span>
                <span className="font-mono text-indigo-400">{telemetry.ram_percent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, telemetry.ram_percent)}%` }}
                />
              </div>
            </div>

            {/* Disk */}
            <div>
              <div className="flex justify-between text-slate-300 font-medium mb-1">
                <span>Storage Free ({telemetry.disk_free_gb} GB remaining)</span>
                <span className="font-mono text-emerald-400">{telemetry.disk_percent}% used</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, telemetry.disk_percent)}%` }}
                />
              </div>
            </div>

            {/* Framework Versions */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
              <div className="bg-slate-850 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">PyTorch</span>
                <span className="text-slate-200">{telemetry.pytorch_version}</span>
              </div>
              <div className="bg-slate-850 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Ultralytics YOLO</span>
                <span className="text-slate-200">{telemetry.ultralytics_version}</span>
              </div>
              <div className="bg-slate-850 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">OpenCV</span>
                <span className="text-slate-200">{telemetry.opencv_version}</span>
              </div>
              <div className="bg-slate-850 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">CUDA Status</span>
                <span className={telemetry.cuda_available ? 'text-emerald-400' : 'text-amber-400'}>
                  {telemetry.cuda_available ? 'Active GPU' : 'CPU Mode'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Projects & Recent Training Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-2xl rounded-[24px] p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-[#0071e3]" />
              Active Projects
            </h3>
            <button
              onClick={() => setStage('projects')}
              className="text-xs font-medium text-[#0071e3] hover:text-blue-400 flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-white/[0.05] mt-2">
            {recent_projects.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#86868b]">No projects created yet.</div>
            ) : (
              recent_projects.map((p: any) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setActiveProject(p);
                    setStage('video_lab');
                  }}
                  className="py-3 px-3 flex items-center justify-between hover:bg-white/[0.04] rounded-xl cursor-pointer transition-colors"
                >
                  <div>
                    <div className="text-xs font-semibold text-white hover:text-[#0071e3] transition-colors">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-[#86868b] mt-0.5">
                      {p.video_count} videos &bull; {p.frame_count} frames &bull; {p.annotation_count} annotations
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {p.task_type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Training Runs */}
        <div className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-2xl rounded-[24px] p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#6366f1]" />
              Recent Training Experiments
            </h3>
            <button
              onClick={() => setStage('experiments')}
              className="text-xs font-medium text-[#0071e3] hover:text-blue-400 flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-white/[0.05] mt-2">
            {recent_experiments.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#86868b]">No training runs recorded yet.</div>
            ) : (
              recent_experiments.map((e: any) => (
                <div
                  key={e.id}
                  onClick={() => setStage('training')}
                  className="py-3 px-3 flex items-center justify-between hover:bg-white/[0.04] rounded-xl cursor-pointer transition-colors"
                >
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-2">
                      <span>{e.name}</span>
                      <span className="font-mono text-[10px] text-[#86868b]">({e.model_variant})</span>
                    </div>
                    <div className="text-[11px] text-[#86868b] mt-0.5">
                      Epoch {e.current_epoch} / {e.total_epochs} &bull; Best mAP50:{' '}
                      <span className="text-emerald-400 font-mono font-medium">
                        {e.best_map50 ? `${(e.best_map50 * 100).toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-medium px-2 py-0.5 rounded-full font-mono ${
                      e.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : e.status === 'running'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                        : 'bg-white/[0.05] text-[#86868b]'
                    }`}
                  >
                    {e.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
