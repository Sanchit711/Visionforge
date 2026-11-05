import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  Database,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Layers,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  RefreshCw,
  FolderArchive,
} from 'lucide-react';

export const DatasetsView: React.FC = () => {
  const { activeProjectId, activeProject, setStage, addNotification } = useAppStore();

  const [versions, setVersions] = useState<any[]>([]);
  const [quality, setQuality] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedYaml, setSelectedYaml] = useState<string | null>(null);

  // Form state
  const [versionName, setVersionName] = useState('v1.0');
  const [description, setDescription] = useState('');
  const [trainRatio, setTrainRatio] = useState(0.7);
  const [valRatio, setValRatio] = useState(0.2);
  const [testRatio, setTestRatio] = useState(0.1);
  const [randomSeed, setRandomSeed] = useState(42);
  const [preventLeakage, setPreventLeakage] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const vList = await api.getDatasets(activeProjectId);
      setVersions(vList);
      const qSummary = await api.getDatasetQuality(activeProjectId);
      setQuality(qSummary);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProjectId]);

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) return;

    setCreating(true);
    try {
      const res = await api.createDatasetVersion(activeProjectId, {
        version_name: versionName,
        description,
        train_ratio: trainRatio,
        val_ratio: valRatio,
        test_ratio: testRatio,
        random_seed: randomSeed,
        prevent_video_leakage: preventLeakage,
      });

      addNotification({
        type: 'success',
        title: 'Dataset Version Frozen',
        message: `Version '${versionName}' created with valid YOLO data.yaml`,
      });
      setShowCreateModal(false);
      setVersionName(`v1.${versions.length + 1}`);
      loadData();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Snapshot Failed', message: err.message });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Dataset Curation & Version Snapshots</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit class balance, prevent cross-video leakage, generate reproducible splits, and export YOLO/COCO packages
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Freeze Dataset Version</span>
          </button>

          <button
            onClick={() => setStage('training')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all"
          >
            <span>Proceed to Training</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quality Summary & Class Imbalance Card */}
      {quality && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Class Distribution Bar Chart */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                Class Distribution & Balance
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {quality.total_annotations} total annotations across {quality.total_images} images
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {Object.keys(quality.class_distribution).length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">No annotations available to calculate distribution.</div>
              ) : (
                Object.entries(quality.class_distribution).map(([cName, count]: [string, any]) => {
                  const maxCount = Math.max(...Object.values(quality.class_distribution).map((v: any) => Number(v) || 1));
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={cName}>
                      <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                        <span className="capitalize">{cName}</span>
                        <span className="font-mono text-brand-400 font-semibold">{count} instances</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quality Audit & Warnings */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Dataset Quality Audit
                </h3>
                {quality.imbalance_warning && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Imbalance: {quality.class_imbalance_ratio}:1
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
                  <span>Total Curated Images</span>
                  <span className="font-mono text-white font-semibold">{quality.total_images}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
                  <span>Unannotated Images</span>
                  <span className="font-mono text-amber-400">{quality.unannotated_images}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
                  <span>Detected Anomalies</span>
                  <span className="font-mono text-rose-400">{quality.anomalies.length}</span>
                </div>
              </div>

              {/* Anomaly list */}
              {quality.anomalies.length > 0 && (
                <div className="mt-4 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {quality.anomalies.map((anom: any, idx: number) => (
                    <div
                      key={idx}
                      className="text-[11px] p-2 rounded-lg bg-slate-850/80 border border-slate-800 text-slate-300 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>{anom.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800">
              <span className="text-[11px] text-slate-400 block">
                Leakage Protection is enabled by default to keep frames from the same video in identical splits.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dataset Versions List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-brand-400" />
            Immutable Dataset Versions ({versions.length})
          </h3>
          <button onClick={loadData} className="text-slate-400 hover:text-white p-1">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {versions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No immutable versions created yet. Click 'Freeze Dataset Version' above to snapshot.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {versions.map((ver) => (
              <div key={ver.id} className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-white font-mono">{ver.version_name}</span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      Frozen Snapshot
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{ver.description || 'No version description provided.'}</p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono mt-2">
                    <span>Total: {ver.total_images} imgs</span>
                    <span>&bull;</span>
                    <span className="text-blue-400">Train: {ver.train_count}</span>
                    <span>&bull;</span>
                    <span className="text-indigo-400">Val: {ver.val_count}</span>
                    <span>&bull;</span>
                    <span className="text-purple-400">Test: {ver.test_count}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/api/v1/datasets/versions/${ver.id}/download-zip`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-brand-400" />
                    <span>Download YOLO ZIP</span>
                  </a>

                  <button
                    onClick={() => {
                      setStage('training');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/30 transition-all"
                  >
                    <span>Train on this Version</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Version Snapshot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Freeze Immutable Dataset Version</h3>
            <p className="text-xs text-slate-400 mt-1">
              Computes reproducible splits, exports YOLO annotations, and prevents cross-video leakage
            </p>

            <form onSubmit={handleCreateVersion} className="space-y-4 mt-5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Version Name</label>
                <input
                  type="text"
                  required
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="v1.0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description / Release Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Balanced dataset with 120 curated workplace annotations"
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              {/* Splits */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Train Ratio</label>
                  <input
                    type="number"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={trainRatio}
                    onChange={(e) => setTrainRatio(parseFloat(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Val Ratio</label>
                  <input
                    type="number"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={valRatio}
                    onChange={(e) => setValRatio(parseFloat(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Test Ratio</label>
                  <input
                    type="number"
                    min="0.0"
                    max="0.4"
                    step="0.05"
                    value={testRatio}
                    onChange={(e) => setTestRatio(parseFloat(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>
              </div>

              {/* Leakage Prevention & Seed */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={preventLeakage}
                    onChange={(e) => setPreventLeakage(e.target.checked)}
                    className="rounded text-brand-500"
                  />
                  <span>Prevent Video Leakage (Keep video frames together)</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Seed:</span>
                  <input
                    type="number"
                    value={randomSeed}
                    onChange={(e) => setRandomSeed(parseInt(e.target.value))}
                    className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
                >
                  {creating ? 'Generating YOLO Archive...' : 'Create Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
