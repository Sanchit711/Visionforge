import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  LineChart,
  Cpu,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart2,
  RefreshCw,
  FolderArchive,
  Download,
} from 'lucide-react';

export const ExperimentsView: React.FC = () => {
  const { activeProjectId, setStage } = useAppStore();
  const [experiments, setExperiments] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadExperiments = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const exps = await api.getExperiments(activeProjectId);
      setExperiments(exps);
      if (exps.length >= 2 && selectedIds.length === 0) {
        setSelectedIds([exps[0].id, exps[1].id]);
      } else if (exps.length === 1 && selectedIds.length === 0) {
        setSelectedIds([exps[0].id]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExperiments();
  }, [activeProjectId]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const comparedExperiments = experiments.filter((e) => selectedIds.includes(e.id));

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Experiment Tracking & Comparison</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit historical training runs, compare hyperparameter differences, and analyze mAP50 performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadExperiments}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
            title="Refresh Experiments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setStage('training')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-semibold shadow-md shadow-blue-600/25 transition-all active:scale-95"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Launch New Run</span>
          </button>
        </div>
      </div>

      {/* Experiments List Table */}
      <div className="bg-white dark:bg-[#121826]/90 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-2xl rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            <span>Project Experiment Runs ({experiments.length})</span>
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Select checkboxes below to compare</span>
        </div>

        {experiments.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
            No experiments found in this project. Run training from the Training Control Center.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                  <th className="py-3 px-3">Compare</th>
                  <th className="py-3 px-3">Experiment Name</th>
                  <th className="py-3 px-3">Model Variant</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Epochs</th>
                  <th className="py-3 px-3">Best mAP50</th>
                  <th className="py-3 px-3">mAP50-95</th>
                  <th className="py-3 px-3">Box Loss</th>
                  <th className="py-3 px-3">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] font-mono">
                {experiments.map((exp) => {
                  const isChecked = selectedIds.includes(exp.id);
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(exp.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-3 font-sans font-bold text-slate-900 dark:text-white">{exp.name}</td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">{exp.model_variant}</td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full font-mono ${
                            exp.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : exp.status === 'running'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10'
                          }`}
                        >
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                        {exp.current_epoch} / {exp.total_epochs}
                      </td>
                      <td className="py-3.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                        {exp.best_map50 ? `${(exp.best_map50 * 100).toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="py-3.5 px-3 text-teal-600 dark:text-teal-400 font-semibold">
                        {exp.map50_95 ? `${(exp.map50_95 * 100).toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="py-3.5 px-3 text-rose-600 dark:text-rose-400">
                        {exp.train_box_loss ? exp.train_box_loss.toFixed(4) : 'N/A'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400">
                        {exp.duration_seconds ? `${Math.round(exp.duration_seconds)}s` : '0s'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side-by-Side Experiment Comparison Matrix */}
      {comparedExperiments.length >= 2 && (
        <div className="bg-white dark:bg-[#121826]/90 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-2xl rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-500" />
              <span>Side-by-Side Model Comparison Matrix ({comparedExperiments.length} Runs)</span>
            </h3>
            <span className="text-[11px] text-blue-500 font-mono font-semibold">Aligned Metrics & Differentials</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-3 px-4 bg-slate-50/80 dark:bg-white/[0.02] rounded-l-xl">Parameter / Metric</th>
                  {comparedExperiments.map((e) => (
                    <th key={e.id} className="py-3 px-4 font-bold text-slate-900 dark:text-white font-mono">
                      {e.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] font-mono text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-white/[0.02]">Model Architecture</td>
                  {comparedExperiments.map((e) => (
                    <td key={e.id} className="py-3 px-4">{e.model_variant}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-white/[0.02]">Epochs Configured</td>
                  {comparedExperiments.map((e) => (
                    <td key={e.id} className="py-3 px-4">{e.epochs}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-white/[0.02]">Batch Size</td>
                  {comparedExperiments.map((e) => (
                    <td key={e.id} className="py-3 px-4">{e.batch_size}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-white/[0.02]">Image Resolution</td>
                  {comparedExperiments.map((e) => (
                    <td key={e.id} className="py-3 px-4">{e.img_size} px</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-white/[0.02]">Optimizer / LR</td>
                  {comparedExperiments.map((e) => (
                    <td key={e.id} className="py-3 px-4">{e.optimizer} (lr: {e.lr0})</td>
                  ))}
                </tr>
                <tr className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
                  <td className="py-3 px-4 font-sans bg-emerald-500/15">Final Best mAP50</td>
                  {comparedExperiments.map((e) => (
                    <td key={e.id} className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {e.best_map50 ? `${(e.best_map50 * 100).toFixed(1)}%` : '0.0%'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-white/[0.02]">mAP50-95</td>
                  {comparedExperiments.map((e) => (
                    <td key={e.id} className="py-3 px-4">{e.map50_95 ? `${(e.map50_95 * 100).toFixed(1)}%` : '0.0%'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-white/[0.02]">Precision / Recall</td>
                  {comparedExperiments.map((e) => (
                    <td key={e.id} className="py-3 px-4">
                      {Math.round((e.precision || 0) * 100)}% / {Math.round((e.recall || 0) * 100)}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
