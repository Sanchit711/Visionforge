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
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Pluggable Integrations Catalog</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Decoupled service adapters for video processors, AI models, compute runtimes, and storage
          </p>
        </div>

        <button onClick={loadIntegrations} className="text-slate-400 hover:text-white p-2">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {integrations.map((item) => {
          const isConnected = item.status === 'connected';
          return (
            <div
              key={item.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-white">{item.name}</h3>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mt-0.5">
                      {item.category}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded font-mono ${
                      isConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : item.status === 'available'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">{item.details}</p>

                {/* Capabilities Badges */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Capabilities</div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.capabilities.map((cap: string, i: number) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-slate-850 border border-slate-800 text-slate-300"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Version: {item.version}</span>
                <span className="text-emerald-400 font-semibold">{isConnected ? 'Active' : 'Standby'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
