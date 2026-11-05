import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  Server,
  Cpu,
  RefreshCw,
  Plus,
  Play,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  HardDrive,
  Download,
} from 'lucide-react';

export const ComputeRuntimesView: React.FC = () => {
  const { activeProjectId, addNotification } = useAppStore();

  const [runtimes, setRuntimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [failoverStatus, setFailoverStatus] = useState<any | null>(null);

  const loadRuntimes = async () => {
    setLoading(true);
    try {
      const data = await api.getRuntimes();
      setRuntimes(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuntimes();
  }, []);

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await api.testRuntime(id);
      if (res.success) {
        addNotification({ type: 'success', title: 'Connection Verified', message: 'Heartbeat online' });
      } else {
        addNotification({ type: 'error', title: 'Connection Unreachable', message: res.message });
      }
      loadRuntimes();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Test Failed', message: err.message });
    } finally {
      setTestingId(null);
    }
  };

  const handleSimulateFailover = async (failedId: string) => {
    try {
      const res = await api.triggerFailover(failedId, 'demo_exp');
      setFailoverStatus(res);
      addNotification({
        type: 'warning',
        title: 'Failover Orchestrated',
        message: res.message,
      });
      loadRuntimes();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Failover Failed', message: err.message });
    }
  };

  const handleGenerateColabNotebook = async () => {
    try {
      const res = await api.generateColabNotebook(activeProjectId || 'default_proj', 'v1.0', 'visionforge_training');
      addNotification({
        type: 'success',
        title: 'Colab Notebook Created',
        message: `Saved to ${res.filename}. Ready for Google Drive GPU training!`,
      });
      window.open(res.colab_url, '_blank');
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Notebook Generation Failed', message: err.message });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Compute Runtime Manager & Failover</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Orchestrate local workstations, Google Colab Pro GPU runtimes, remote servers, and edge Jetson devices
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={loadRuntimes} className="text-slate-400 hover:text-white p-2">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleGenerateColabNotebook}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate Colab Notebook (.ipynb)</span>
          </button>
        </div>
      </div>

      {/* Failover Status Alert Box if triggered */}
      {failoverStatus && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 shadow-2xl flex items-start justify-between gap-4 animate-slide-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-white text-sm">Automatic Failover Migration Successful</div>
              <p className="text-slate-300 leading-relaxed">{failoverStatus.message}</p>
              <div className="flex items-center gap-3 font-mono text-[11px] text-amber-300 pt-1">
                <span>Migrated: {failoverStatus.failed_runtime} &rarr; {failoverStatus.target_runtime}</span>
                <span>&bull;</span>
                <span>Epoch Recovered: {failoverStatus.recovered_epoch}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setFailoverStatus(null)}
            className="text-xs text-amber-400 hover:text-white font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Runtimes Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {runtimes.map((rt) => {
          const isOnline = rt.status === 'online';
          const isColab = rt.provider === 'colab';
          return (
            <div
              key={rt.id}
              className={`bg-slate-900/90 border rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all ${
                isOnline ? 'border-slate-800' : 'border-slate-800/60 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Server className="w-4 h-4 text-brand-400" />
                      {rt.name}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">{rt.host}</span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded font-mono flex items-center gap-1.5 ${
                      isOnline
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : rt.status === 'busy'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`}
                    />
                    {rt.status}
                  </span>
                </div>

                {/* Device & Hardware Specifications */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Compute Device:</span>
                    <span className="text-white font-semibold">{rt.device_name}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GPU Model:</span>
                    <span className="text-slate-200">{rt.gpu_model || 'Integrated'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>VRAM / Memory:</span>
                    <span className="text-slate-200">
                      {rt.vram_total_mb > 0 ? `${Math.round(rt.vram_total_mb / 1024)} GB VRAM` : 'Shared Host RAM'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Storage Remaining:</span>
                    <span className="text-slate-300">{rt.disk_free_gb} GB</span>
                  </div>
                </div>

                {rt.error_reason && (
                  <div className="mt-3 p-2 rounded-lg bg-rose-950/30 border border-rose-500/20 text-[10px] text-rose-300">
                    {rt.error_reason}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleTestConnection(rt.id)}
                  disabled={testingId === rt.id}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingId === rt.id ? 'animate-spin' : ''}`} />
                  <span>{testingId === rt.id ? 'Pinging...' : 'Test Heartbeat'}</span>
                </button>

                {isColab ? (
                  <button
                    onClick={handleGenerateColabNotebook}
                    className="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Launch Colab</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSimulateFailover(rt.id)}
                    className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-xl text-[11px] font-semibold border border-slate-800 transition-colors"
                    title="Simulate Quota Limit / Connection Drop and Trigger Automated Checkpoint Failover"
                  >
                    Simulate Failover
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Google Colab Integration Explanatory Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Google Colab Quota Exceeded & Seamless Migration Architecture
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          When training models on Google Colab free or Pro accounts, GPU timeouts and usage limits frequently interrupt long-running runs.
          VisionForge Studio solves this by generating reproducible checkpoint snapshots (`last.pt`) and self-contained runner notebooks.
          If your Colab instance reaches its usage limit, one click migrates to a second authorized account or fallback local GPU without losing progress!
        </p>
      </div>
    </div>
  );
};
