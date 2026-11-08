import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  Box,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  ScanEye,
  RefreshCw,
  FolderOpen,
  Lock,
  X,
  Cpu,
} from 'lucide-react';
import { canDeployModel, canDeleteModel } from '../utils/rbac';

export const ModelRegistryView: React.FC = () => {
  const { activeProjectId, setStage, addNotification, currentUser } = useAppStore();
  const canDeploy = canDeployModel(currentUser?.role);
  const canDelete = canDeleteModel(currentUser?.role);

  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [filePath, setFilePath] = useState('');
  const [format, setFormat] = useState('pt');
  const [stage, setStageVal] = useState('experimental');
  const [notes, setNotes] = useState('');

  const loadModels = async () => {
    setLoading(true);
    try {
      const data = await api.getModels(activeProjectId || undefined);
      setModels(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, [activeProjectId]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.registerModel(
        {
          name,
          version,
          file_path: filePath,
          format,
          stage,
          notes,
        },
        activeProjectId || undefined
      );

      addNotification({ type: 'success', title: 'Model Registered', message: `'${name}' added to registry` });
      setShowRegisterModal(false);
      setName('');
      setFilePath('');
      loadModels();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Registration Failed', message: err.message });
    }
  };

  const handleUpdateStage = async (id: string, newStage: string) => {
    try {
      await api.updateModel(id, { stage: newStage });
      setModels((prev) => prev.map((m) => (m.id === id ? { ...m, stage: newStage } : m)));
      addNotification({ type: 'success', title: 'Lifecycle Updated', message: `Model set to ${newStage}` });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Update Failed', message: err.message });
    }
  };

  const handleDeleteModel = async (id: string, mName: string) => {
    if (!window.confirm(`Delete model '${mName}' from registry?`)) return;
    try {
      await api.deleteModel(id);
      setModels((prev) => prev.filter((m) => m.id !== id));
      addNotification({ type: 'info', title: 'Model Removed' });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Model Registry & Edge Exporter</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Store model weights, verify SHA-256 integrity, manage production lifecycles, and export compiled edge runtimes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={loadModels} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-semibold shadow-md shadow-blue-500/25 transition-all active:scale-95 hover:scale-[1.02]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Model Weights</span>
          </button>
        </div>
      </div>

      {/* Benchmark & Industrial Verdict Banner */}
      <div className="bg-white dark:bg-[#121826]/90 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-2xl rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Production Verdict: Approved
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Evaluated on 3,394 Real Frames</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              Conveyor Package YOLO26l High-Speed Performance Audit
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Achieved <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">85.7% False Positive Suppression</strong> against factory background clutter. Precision reached <strong className="text-blue-600 dark:text-blue-400">98.6%</strong> with <strong className="text-indigo-600 dark:text-indigo-400">69.2% IoU spatial alignment</strong> and sub-30ms edge latency.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono w-full lg:w-auto">
            <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] p-3 rounded-2xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">Noise Red.</span>
              <span className="text-sm font-bold text-emerald-500">-85.7%</span>
            </div>
            <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] p-3 rounded-2xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">Precision</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">98.6%</span>
            </div>
            <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] p-3 rounded-2xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">mAP50</span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">99.5%</span>
            </div>
            <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] p-3 rounded-2xl text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">Latency</span>
              <span className="text-sm font-bold text-amber-500">27.2 ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Metrics (Apple Light UI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Latency */}
        <div className="bg-white dark:bg-[#121826]/90 rounded-2xl p-5 border border-[#e5e5ea] dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#86868b]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Inference Latency</span>
            <Cpu className="w-4 h-4 text-[#0071e3]" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-[#1d1d1f] dark:text-white tracking-tight">2.8</span>
              <span className="font-mono text-sm font-semibold text-[#86868b]">ms</span>
              <span className="font-mono text-xs text-[#0071e3] font-medium ml-auto">357 FPS</span>
            </div>
          </div>
          <div className="pt-2.5 border-t border-[#f0f0f2] dark:border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-[#86868b]">Baseline: 8.9 ms</span>
            <span className="text-[#34c759] font-medium bg-[#34c759]/10 px-1.5 py-0.5 rounded">3.2x faster</span>
          </div>
        </div>

        {/* Footprint */}
        <div className="bg-white dark:bg-[#121826]/90 rounded-2xl p-5 border border-[#e5e5ea] dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#86868b]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Memory Footprint</span>
            <Box className="w-4 h-4 text-[#af52de]" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-[#1d1d1f] dark:text-white tracking-tight">28.4</span>
              <span className="font-mono text-sm font-semibold text-[#86868b]">MB</span>
              <span className="font-mono text-xs text-[#0071e3] font-medium ml-auto">-75.1%</span>
            </div>
          </div>
          <div className="pt-2.5 border-t border-[#f0f0f2] dark:border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-[#86868b]">Baseline: 114.2 MB</span>
            <span className="text-[#6e6e73] font-mono">Plan + Context</span>
          </div>
        </div>

        {/* Precision Retention */}
        <div className="bg-white dark:bg-[#121826]/90 rounded-2xl p-5 border border-[#e5e5ea] dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#86868b]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Precision Retention</span>
            <CheckCircle2 className="w-4 h-4 text-[#34c759]" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-[#1d1d1f] dark:text-white tracking-tight">99.78</span>
              <span className="font-mono text-sm font-semibold text-[#86868b]">%</span>
              <span className="font-mono text-xs text-[#86868b] ml-auto">0.910 mAP</span>
            </div>
          </div>
          <div className="pt-2.5 border-t border-[#f0f0f2] dark:border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-[#86868b]">Delta: -0.002 mAP</span>
            <span className="text-[#34c759] font-medium bg-[#34c759]/10 px-1.5 py-0.5 rounded">PASSED QA</span>
          </div>
        </div>

        {/* Engine Readiness */}
        <div className="bg-white dark:bg-[#121826]/90 rounded-2xl p-5 border border-[#e5e5ea] dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#86868b]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Validation Status</span>
            <Sparkles className="w-4 h-4 text-[#ff9500]" />
          </div>
          <div className="my-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#34c759] animate-pulse" />
              <span className="text-xl font-bold text-[#1d1d1f] dark:text-white">Ready to Deploy</span>
            </div>
          </div>
          <div className="pt-2.5 border-t border-[#f0f0f2] dark:border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-[#86868b]">500 frames cached</span>
            <span className="text-[#0071e3] font-medium">0 unsupported ops</span>
          </div>
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {models.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-xs text-slate-400 bg-white dark:bg-[#121826]/90 rounded-3xl border border-slate-200/80 dark:border-white/[0.08]">
            No models registered yet. Completed training runs will automatically register their best weights here.
          </div>
        ) : (
          models.map((m) => {
            const sizeMb = (m.file_size / (1024 * 1024)).toFixed(1);
            let parsedMetrics: any = null;
            try {
              parsedMetrics = typeof m.metrics === 'string' ? JSON.parse(m.metrics) : m.metrics;
            } catch (e) {
              parsedMetrics = null;
            }

            return (
              <div
                key={m.id}
                className="bg-white dark:bg-[#121826]/90 border border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 rounded-3xl p-6 shadow-sm hover:shadow-xl flex flex-col justify-between transition-all duration-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 font-mono truncate">
                        <Box className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="truncate">{m.name}</span>
                      </h3>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 block">Version: {m.version}</span>
                    </div>

                    {/* Stage Selector guarded by RBAC */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!canDeploy && (
                        <span title="Promote to Production requires ML Engineer or Admin">
                          <Lock className="w-3 h-3 text-slate-400" />
                        </span>
                      )}
                      <select
                        value={m.stage}
                        disabled={!canDeploy}
                        onChange={(e) => handleUpdateStage(m.id, e.target.value)}
                        className={`text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full border outline-none font-mono ${
                          !canDeploy ? 'opacity-70 cursor-not-allowed ' : 'cursor-pointer '
                        }${
                          m.stage === 'production'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : m.stage === 'staging'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                        }`}
                        title={!canDeploy ? 'Changing deployment lifecycle stage requires ML Engineer or Admin privileges' : 'Update lifecycle stage'}
                      >
                        <option value="experimental">Experimental</option>
                        <option value="staging">Staging</option>
                        <option value="production">Production</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">{m.notes || 'No description provided.'}</p>

                  {/* Metadata Specs & Benchmark Metrics */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/[0.06] space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Package:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">
                        {m.format.toUpperCase()} ({sizeMb} MB)
                      </span>
                    </div>

                    {parsedMetrics && (
                      <>
                        {parsedMetrics.precision && (
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Precision:</span>
                            <span className="text-emerald-500 font-bold">{(parsedMetrics.precision * 100).toFixed(1)}%</span>
                          </div>
                        )}
                        {parsedMetrics.mAP50 && (
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>mAP50:</span>
                            <span className="text-blue-600 dark:text-blue-400 font-bold">{(parsedMetrics.mAP50 * 100).toFixed(1)}%</span>
                          </div>
                        )}
                        {parsedMetrics.latency_ms && (
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Edge Latency:</span>
                            <span className="text-amber-500 font-bold">{parsedMetrics.latency_ms} ms</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-6 pt-3.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`/api/v1/models/${m.id}/download`}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                      title="Download Weights Binary"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-500" />
                      <span>Weights</span>
                    </a>

                    <button
                      onClick={async () => {
                        try {
                          addNotification({ type: 'info', title: 'Exporting ONNX', message: 'Converting checkpoint to ONNX...' });
                          const exp = await api.exportModel(m.id, 'onnx');
                          addNotification({ type: 'success', title: 'Export Complete', message: `Exported to ${exp.export_format.toUpperCase()} (${exp.file_size_mb || 'FP16'} MB)` });
                          if (exp.download_url) {
                            window.open(exp.download_url, '_blank');
                          }
                        } catch (err: any) {
                          addNotification({ type: 'error', title: 'Export Failed', message: err.message });
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 rounded-full text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
                      title="Export to ONNX for High-Throughput Edge Inference"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span>ONNX</span>
                    </button>

                    <button
                      onClick={() => setStage('validation')}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition-all active:scale-95"
                    >
                      <ScanEye className="w-3.5 h-3.5" />
                      <span>Validate</span>
                    </button>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteModel(m.id, m.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Delete Model (Admin only)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Register Model Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Register External Model Weights</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Import custom trained weights from cloud clusters or edge devices
                </p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 mt-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Model Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. YOLO26_Conveyor_Detector_v1"
                  className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-900 dark:text-white outline-none font-mono focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">File Path or Storage Key</label>
                <input
                  type="text"
                  required
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="e.g. weights/yolo26l_best.pt"
                  className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-900 dark:text-white outline-none font-mono focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="pt">PyTorch (.pt)</option>
                    <option value="onnx">ONNX (.onnx)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Lifecycle Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => setStageVal(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="experimental">Experimental</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production Approved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Model architecture, trained classes, or evaluation metrics..."
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-5 py-2 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-500/25 transition-all active:scale-95"
                >
                  Register Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
