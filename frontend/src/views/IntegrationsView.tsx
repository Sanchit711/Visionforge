import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Blocks,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Video,
  Database,
  Server,
  Sparkles,
} from 'lucide-react';

export const IntegrationsView: React.FC = () => {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const data = await api.getIntegrations();
      setIntegrations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e5ea] dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-white tracking-tight">Pluggable Integrations Catalog</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Decoupled service adapters for video processors, AI models, compute runtimes, and storage
          </p>
        </div>

        <button
          onClick={loadIntegrations}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          title="Refresh Integrations"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {integrations.map((item) => {
          const isConnected = item.status === 'connected';
          return (
            <div
              key={item.id}
              className="bg-white dark:bg-[#121826]/90 border border-[#e5e5ea] dark:border-white/[0.08] backdrop-blur-2xl rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-[#0071e3]/30 transition-all flex flex-col justify-between space-y-5"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{item.name}</h3>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 block mt-0.5">
                      {item.category}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full font-mono ${
                      isConnected
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : item.status === 'available'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">{item.details}</p>

                {/* Capabilities Badges */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
                  <div className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Capabilities</div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.capabilities.map((cap: string, i: number) => (
                      <span
                        key={i}
                        className="text-[10px] px-2.5 py-0.5 rounded-full font-mono bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>Version: {item.version}</span>
                <span className={`font-semibold ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {isConnected ? 'Active' : 'Standby'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
