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
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Compute Runtime Manager & Failover</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Orchestrate local workstations, Google Colab Pro GPU runtimes, remote servers, and edge Jetson devices
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadRuntimes}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
            title="Refresh Runtimes"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleGenerateColabNotebook}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-full text-xs font-semibold shadow-md shadow-amber-500/20 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate Colab Notebook (.ipynb)</span>
          </button>
        </div>
      </div>

      {/* Failover Status Alert Box if triggered */}
      {failoverStatus && (
        <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/50 shadow-md flex items-start justify-between gap-4 animate-slide-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-slate-900 dark:text-white text-sm">Automatic Failover Migration Successful</div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{failoverStatus.message}</p>
              <div className="flex items-center gap-3 font-mono text-[11px] text-amber-700 dark:text-amber-300 pt-1">
                <span>Migrated: {failoverStatus.failed_runtime} &rarr; {failoverStatus.target_runtime}</span>
                <span>&bull;</span>
                <span>Epoch Recovered: {failoverStatus.recovered_epoch}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setFailoverStatus(null)}
            className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
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
              className={`bg-white dark:bg-[#121826]/90 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-2xl rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                isOnline ? '' : 'opacity-85'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <Server className="w-4 h-4 text-blue-500" />
                      <span>{rt.name}</span>
                    </h3>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 block">{rt.host}</span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5 ${
                      isOnline
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : rt.status === 'busy'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}
                    />
                    {rt.status}
                  </span>
                </div>

                {/* Device & Hardware Specifications */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.06] space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Compute Device:</span>
                    <span className="text-slate-900 dark:text-white font-semibold">{rt.device_name}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>GPU Model:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">{rt.gpu_model || 'Integrated'}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>VRAM / Memory:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">
                      {rt.vram_total_mb > 0 ? `${Math.round(rt.vram_total_mb / 1024)} GB VRAM` : 'Shared Host RAM'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Storage Remaining:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{rt.disk_free_gb} GB</span>
                  </div>
                </div>

                {rt.error_reason && (
                  <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 text-[10px] text-rose-600 dark:text-rose-300">
                    {rt.error_reason}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between gap-2">
                <button
                  onClick={() => handleTestConnection(rt.id)}
                  disabled={testingId === rt.id}
                  className="px-4 py-1.5 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 dark:border-white/10 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingId === rt.id ? 'animate-spin' : ''}`} />
                  <span>{testingId === rt.id ? 'Pinging...' : 'Test Heartbeat'}</span>
                </button>

                {isColab ? (
                  <button
                    onClick={handleGenerateColabNotebook}
                    className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Launch Colab</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSimulateFailover(rt.id)}
                    className="px-3.5 py-1.5 bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-full text-[11px] font-semibold border border-slate-200 dark:border-white/10 transition-all active:scale-95"
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
      <div className="bg-white dark:bg-[#121826]/90 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-2xl rounded-3xl p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Google Colab Quota Exceeded & Seamless Migration Architecture</span>
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          When training models on Google Colab free or Pro accounts, GPU timeouts and usage limits frequently interrupt long-running runs.
          VisionForge Studio solves this by generating reproducible checkpoint snapshots (<code className="font-mono text-blue-500 bg-slate-100 dark:bg-black/30 px-1.5 py-0.5 rounded">last.pt</code>) and self-contained runner notebooks.
          If your Colab instance reaches its usage limit, one click migrates to a second authorized account or fallback local GPU without losing progress!
        </p>
      </div>
    </div>
  );
};
