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
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Model Registry & Lifecycle Governance</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Store model weights, verify SHA-256 integrity, manage deployment stages, and export ONNX runtimes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={loadModels} className="text-slate-400 hover:text-white p-2">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Model Weights</span>
          </button>
        </div>
      </div>

      {/* Benchmark & Industrial Verdict Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Production Verdict: Approved
              </span>
              <span className="text-xs text-slate-400 font-mono">Evaluated on 3,394 Real Frames</span>
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              SVG Conveyor Package YOLO26l (v8) Performance Audit
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Achieved <strong className="text-emerald-400 font-semibold">85.7% False Positive Suppression</strong> against background warehouse clutter (19,181 down to 2,745 true detections). Precision reached <strong className="text-indigo-300">98.6%</strong> with <strong className="text-sky-300">69.2% IoU spatial alignment</strong> and 27.2 ms edge latency.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block uppercase">Noise Red.</span>
              <span className="text-sm font-bold text-emerald-400">-85.7%</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block uppercase">Precision</span>
              <span className="text-sm font-bold text-indigo-300">98.6%</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block uppercase">mAP50</span>
              <span className="text-sm font-bold text-sky-400">86.5%</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block uppercase">Latency</span>
              <span className="text-sm font-bold text-amber-300">27.2 ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-xs text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
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
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2 font-mono">
                        <Box className="w-4 h-4 text-brand-400" />
                        {m.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">Version: {m.version}</span>
                    </div>

                    {/* Stage Selector guarded by RBAC */}
                    <div className="flex items-center gap-1">
                      {!canDeploy && (
                        <span title="Promote to Production requires ML Engineer or Admin">
                          <Lock className="w-3 h-3 text-slate-500" />
                        </span>
                      )}
                      <select
                        value={m.stage}
                        disabled={!canDeploy}
                        onChange={(e) => handleUpdateStage(m.id, e.target.value)}
                        className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border outline-none font-mono ${
                          !canDeploy ? 'opacity-70 cursor-not-allowed ' : 'cursor-pointer '
                        }${
                          m.stage === 'production'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : m.stage === 'staging'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                        title={!canDeploy ? 'Changing deployment lifecycle stage requires ML Engineer or Admin privileges' : 'Update lifecycle stage'}
                      >
                        <option value="experimental">Experimental</option>
                        <option value="staging">Staging</option>
                        <option value="production">Production</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{m.notes || 'No description provided.'}</p>

                  {/* Metadata Specs & Benchmark Metrics */}
                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Format & Size:</span>
                      <span className="text-slate-200">
                        {m.format.toUpperCase()} ({sizeMb} MB)
                      </span>
                    </div>

                    {parsedMetrics && (
                      <>
                        {parsedMetrics.precision && (
                          <div className="flex justify-between text-slate-400">
                            <span>Precision:</span>
                            <span className="text-emerald-400 font-bold">{(parsedMetrics.precision * 100).toFixed(1)}%</span>
                          </div>
                        )}
                        {parsedMetrics.recall && (
                          <div className="flex justify-between text-slate-400">
                            <span>Recall:</span>
                            <span className="text-indigo-400 font-bold">{(parsedMetrics.recall * 100).toFixed(1)}%</span>
                          </div>
                        )}
                        {parsedMetrics.mAP50 && (
                          <div className="flex justify-between text-slate-400">
                            <span>mAP50:</span>
                            <span className="text-sky-400 font-bold">{(parsedMetrics.mAP50 * 100).toFixed(1)}%</span>
                          </div>
                        )}
                        {parsedMetrics.false_positive_reduction_pct && (
                          <div className="flex justify-between text-slate-400">
                            <span>Noise Reduction:</span>
                            <span className="text-emerald-400 font-bold">-{parsedMetrics.false_positive_reduction_pct}%</span>
                          </div>
                        )}
                        {parsedMetrics.latency_ms && (
                          <div className="flex justify-between text-slate-400">
                            <span>Edge Latency:</span>
                            <span className="text-amber-300 font-bold">{parsedMetrics.latency_ms} ms</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/v1/models/${m.id}/download`}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                      title="Download Weights Binary"
                    >
                      <Download className="w-3.5 h-3.5 text-brand-400" />
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
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Export to ONNX for High-Throughput Edge Inference"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>ONNX</span>
                    </button>

                    <button
                      onClick={() => setStage('validation')}
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-brand-600/30 transition-colors"
                    >
                      <ScanEye className="w-3.5 h-3.5" />
                      <span>Validate</span>
                    </button>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteModel(m.id, m.name)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Register External Model Weights</h3>
            <p className="text-xs text-slate-400 mt-1">
              Add custom fine-tuned weights from Aurelix Colab or local disk
            </p>

            <form onSubmit={handleRegister} className="space-y-4 mt-5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Model Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Traffic_Detector_v1"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Local Absolute File Path</label>
                <input
                  type="text"
                  required
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="/path/to/weights/best.pt"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="pt">PyTorch (.pt)</option>
                    <option value="onnx">ONNX (.onnx)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Lifecycle Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => setStageVal(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="experimental">Experimental</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production Approved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Model architecture, trained classes, or evaluation metrics..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-600/30 transition-all"
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
