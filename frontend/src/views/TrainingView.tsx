import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  Cpu,
  Play,
  Square,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  LineChart,
  HardDrive,
  FileCode,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Box,
  Terminal,
  Cloud,
  Download,
  ExternalLink,
  UploadCloud,
  Copy,
  Check,
  FolderArchive,
  Layers,
  Database,
  Lock,
  Zap,
  Key,
} from 'lucide-react';
import { canTrain } from '../utils/rbac';

export const TrainingView: React.FC = () => {
  const { activeProjectId, setStage, addNotification, currentUser } = useAppStore();
  const hasTrainAccess = canTrain(currentUser?.role);

  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [experiments, setExperiments] = useState<any[]>([]);
  const [activeExperiment, setActiveExperiment] = useState<any | null>(null);

  // Training Target Engine: 'kaggle' | 'colab' | 'local'
  const [trainingTarget, setTrainingTarget] = useState<'kaggle' | 'colab' | 'local'>('kaggle');

  // Kaggle Cloud Engine State (Apple UI Design)
  const [kaggleStatus, setKaggleStatus] = useState<{ authenticated: boolean; username?: string; message: string }>({ authenticated: false, message: 'Checking...' });
  const [kaggleModel, setKaggleModel] = useState('yolo26l.pt');
  const [kaggleEpochs, setKaggleEpochs] = useState(50);
  const [kaggleBatchSize, setKaggleBatchSize] = useState(8);
  const [kaggleOptimizer, setKaggleOptimizer] = useState('AdamW');
  const [kaggleLr, setKaggleLr] = useState(0.0008);
  const [kagglePatience, setKagglePatience] = useState(15);
  const [isLaunchingKaggle, setIsLaunchingKaggle] = useState(false);
  const [kaggleJob, setKaggleJob] = useState<{
    experiment_id?: string;
    kernel_slug?: string;
    kernel_url?: string;
    dataset_full_slug?: string;
    status?: string;
    is_complete?: boolean;
  } | null>(null);
  const [isPollingKaggle, setIsPollingKaggle] = useState(false);
  const [isDownloadingKaggle, setIsDownloadingKaggle] = useState(false);
  const [showKaggleCredsModal, setShowKaggleCredsModal] = useState(false);
  const [kaggleUsernameInput, setKaggleUsernameInput] = useState('');
  const [kaggleKeyInput, setKaggleKeyInput] = useState('');
  const [savingCreds, setSavingCreds] = useState(false);

  // Local Form State
  const [name, setName] = useState('exp_conveyor_yolo_40ep');
  const [modelVariant, setModelVariant] = useState('yolo26l_conveyor_best8.pt');
  const [epochs, setEpochs] = useState(40);
  const [batchSize, setBatchSize] = useState(8);
  const [imgSize, setImgSize] = useState(640);
  const [learningRate, setLearningRate] = useState(0.0008);
  const [optimizer, setOptimizer] = useState('AdamW');
  const [device, setDevice] = useState('auto');

  // Google Colab Master Training Parameters (matching user's script)
  const [colabModel, setColabModel] = useState('yolo26l.pt');
  const [colabEpochs, setColabEpochs] = useState(40);
  const [colabBatchSize, setColabBatchSize] = useState(8);
  const [colabOptimizer, setColabOptimizer] = useState('AdamW');
  const [colabLr, setColabLr] = useState(0.0008);
  const [colabPatience, setColabPatience] = useState(12);
  const [colabSavePeriod, setColabSavePeriod] = useState(5);

  // Sync Colab Metrics Form State
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncExpName, setSyncExpName] = useState('SVG_YOLO_Colab_Master');
  const [syncMap50, setSyncMap50] = useState(0.92);
  const [syncPrecision, setSyncPrecision] = useState(0.94);
  const [syncRecall, setSyncRecall] = useState(0.89);
  const [syncing, setSyncing] = useState(false);

  // Upload best.pt weights
  const [uploadingModel, setUploadingModel] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Safeguards
  const [compatCheck, setCompatCheck] = useState<any | null>(null);
  const [checkingCompat, setCheckingCompat] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [liveLogs, setLiveLogs] = useState('');

  const loadData = async () => {
    if (!activeProjectId) return;
    try {
      const dsList = await api.getDatasets(activeProjectId);
      setDatasets(dsList);
      if (dsList.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(dsList[0].id);
      }
      const expList = await api.getExperiments(activeProjectId);
      setExperiments(expList);
      if (expList.length > 0 && !activeExperiment) {
        setActiveExperiment(expList[0]);
      }
      try {
        const kStatus = await api.getKaggleStatus();
        setKaggleStatus(kStatus);
      } catch (kErr) {
        console.warn('Could not fetch Kaggle status', kErr);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProjectId]);

  // Polling for Kaggle Job Status
  useEffect(() => {
    if (!kaggleJob || !kaggleJob.kernel_slug || kaggleJob.is_complete) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.getKaggleJobStatus(kaggleJob.kernel_slug!);
        setKaggleJob((prev) => (prev ? { ...prev, status: res.status, is_complete: res.is_complete } : null));
        if (res.is_complete) {
          addNotification({
            type: 'success',
            title: 'Kaggle Cloud Training Complete!',
            message: 'Your YOLO model finished training on Kaggle Dual-T4. Click "Download Model" to ingest weights.',
          });
          loadData();
        }
      } catch (e) {
        console.warn('Error polling Kaggle status', e);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [kaggleJob?.kernel_slug, kaggleJob?.is_complete]);

  // Polling for active experiment updates
  useEffect(() => {
    if (!activeExperiment || activeExperiment.status !== 'running') return;

    const interval = setInterval(async () => {
      try {
        const updated = await api.getExperiment(activeExperiment.id);
        setActiveExperiment(updated);
        const logsRes = await api.getExperimentLogs(activeExperiment.id);
        setLiveLogs(logsRes.logs);
        if (updated.status !== 'running') {
          loadData();
        }
      } catch (err) {
        console.error(err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeExperiment?.id, activeExperiment?.status]);

  const handleCheckCompatibility = async () => {
    if (!selectedDatasetId) return;
    setCheckingCompat(true);
    try {
      const res = await api.checkCompatibility(modelVariant, selectedDatasetId);
      setCompatCheck(res);
      addNotification({
        type: 'info',
        title: 'Compatibility Safeguard Check',
        message: res.recommendation,
      });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Check Failed', message: err.message });
    } finally {
      setCheckingCompat(false);
    }
  };

  const handleStartTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId || !selectedDatasetId) {
      addNotification({ type: 'warning', title: 'Dataset Required', message: 'Please select a dataset version.' });
      return;
    }

    setStarting(true);
    try {
      const newExp = await api.startTraining(activeProjectId, {
        dataset_version_id: selectedDatasetId,
        name,
        model_variant: modelVariant,
        epochs,
        batch_size: batchSize,
        img_size: imgSize,
        lr0: learningRate,
        optimizer,
        device,
      });

      addNotification({
        type: 'success',
        title: 'Training Run Queued',
        message: `Ultralytics YOLO training launched: '${name}'`,
      });
      setActiveExperiment(newExp);
      loadData();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Failed to launch training', message: err.message });
    } finally {
      setStarting(false);
    }
  };

  const handleStopTraining = async () => {
    if (!activeExperiment) return;
    setStopping(true);
    try {
      await api.stopTraining(activeExperiment.id);
      addNotification({ type: 'info', title: 'Safe Stop Requested', message: 'Gracefully aborting training loop...' });
      const updated = await api.getExperiment(activeExperiment.id);
      setActiveExperiment(updated);
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Stop Failed', message: err.message });
    } finally {
      setStopping(false);
    }
  };

  // Kaggle Cloud Engine Handlers (Apple UI Design)
  const handleSaveKaggleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kaggleUsernameInput || !kaggleKeyInput) return;
    setSavingCreds(true);
    try {
      const res = await api.saveKaggleCredentials({
        username: kaggleUsernameInput.trim(),
        key: kaggleKeyInput.trim(),
      });
      setKaggleStatus(res);
      setShowKaggleCredsModal(false);
      addNotification({
        type: res.authenticated ? 'success' : 'error',
        title: res.authenticated ? 'Kaggle Connected' : 'Authentication Failed',
        message: res.message,
      });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error Saving Credentials', message: err.message });
    } finally {
      setSavingCreds(false);
    }
  };

  const handleLaunchKaggleTraining = async () => {
    if (!activeProjectId) return;
    if (!selectedDatasetId) {
      addNotification({
        type: 'warning',
        title: 'Dataset Required',
        message: 'Please select a frozen dataset version before launching training.',
      });
      return;
    }
    if (!kaggleStatus.authenticated) {
      setShowKaggleCredsModal(true);
      return;
    }

    setIsLaunchingKaggle(true);
    try {
      const res = await api.launchKaggleTrain({
        project_id: activeProjectId,
        dataset_version_id: selectedDatasetId,
        experiment_name: `Kaggle_YOLO_${Date.now()}`,
        model_variant: kaggleModel,
        epochs: kaggleEpochs,
        batch_size: kaggleBatchSize,
        img_size: imgSize,
        optimizer: kaggleOptimizer,
        learning_rate: kaggleLr,
        patience: kagglePatience,
      });

      setKaggleJob({
        experiment_id: res.experiment_id,
        kernel_slug: res.kernel_slug,
        kernel_url: res.kernel_url,
        dataset_full_slug: res.dataset_full_slug,
        status: 'queued',
        is_complete: false,
      });

      addNotification({
        type: 'success',
        title: '🚀 Dispatched to Kaggle Dual-T4 GPU',
        message: res.message,
      });

      loadData();
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Kaggle Launch Failed',
        message: err.message,
      });
    } finally {
      setIsLaunchingKaggle(false);
    }
  };

  const handlePollKaggleJobManually = async () => {
    if (!kaggleJob?.kernel_slug) return;
    setIsPollingKaggle(true);
    try {
      const res = await api.getKaggleJobStatus(kaggleJob.kernel_slug);
      setKaggleJob((prev) => (prev ? { ...prev, status: res.status, is_complete: res.is_complete } : null));
      addNotification({
        type: 'info',
        title: 'Kaggle Job Status',
        message: `Execution state: ${res.status.toUpperCase()}`,
      });
      if (res.is_complete) {
        loadData();
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Polling Failed', message: err.message });
    } finally {
      setIsPollingKaggle(false);
    }
  };

  const handleDownloadKaggleModelWeights = async () => {
    if (!kaggleJob?.kernel_slug || !activeProjectId) return;
    setIsDownloadingKaggle(true);
    try {
      const res = await api.downloadKaggleModel(
        kaggleJob.kernel_slug,
        activeProjectId,
        kaggleJob.experiment_id
      );
      addNotification({
        type: 'success',
        title: 'Model Weights Ingested!',
        message: res.message,
      });
      loadData();
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: err.message,
      });
    } finally {
      setIsDownloadingKaggle(false);
    }
  };

  // Colab Handlers
  const handleDownloadColabNotebook = () => {
    if (!activeProjectId) return;
    const url = api.getColabNotebookUrl(activeProjectId, selectedDatasetId, {
      model_default: colabModel,
      epochs: colabEpochs,
      batch_size: colabBatchSize,
      img_size: imgSize,
      optimizer: colabOptimizer,
      learning_rate: colabLr,
    });
    window.open(url, '_blank');
    addNotification({
      type: 'success',
      title: 'YOLO Master Colab Notebook Generated',
      message: 'Downloaded VisionForge_YOLO_Master_Colab.ipynb pre-configured with Drive checkpointing.',
    });
  };

  const handleOpenGoogleColab = () => {
    window.open('https://colab.research.google.com/', '_blank');
  };

  const handleDownloadDatasetZip = () => {
    if (!selectedDatasetId) {
      addNotification({ type: 'warning', title: 'No Dataset Selected', message: 'Please select a dataset version.' });
      return;
    }
    const url = api.getDatasetDownloadUrl(selectedDatasetId);
    window.open(url, '_blank');
    addNotification({
      type: 'info',
      title: 'Downloading YOLO Dataset ZIP',
      message: 'ZIP contains images/, labels/, and data.yaml formatted for YOLO Master Training.',
    });
  };

  const handleSyncColabMetricsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) return;
    setSyncing(true);
    try {
      const synced = await api.syncColabMetrics({
        project_id: activeProjectId,
        dataset_version_id: selectedDatasetId || undefined,
        experiment_name: syncExpName || `Colab_YOLO_${Date.now()}`,
        model_variant: colabModel,
        epochs: colabEpochs,
        precision: parseFloat(syncPrecision.toString()) || 0.94,
        recall: parseFloat(syncRecall.toString()) || 0.89,
        map50: parseFloat(syncMap50.toString()) || 0.92,
        map50_95: parseFloat((syncMap50 * 0.72).toFixed(3)),
        notes: `Trained on Google Colab GPU with Google Drive checkpoints (${colabEpochs} epochs, ${colabOptimizer})`,
      });

      addNotification({
        type: 'success',
        title: 'Colab Metrics Synced',
        message: `Registered training run '${synced.name}' with mAP50 ${(synced.map50 * 100).toFixed(1)}%`,
      });
      setShowSyncModal(false);
      setActiveExperiment(synced);
      loadData();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Sync Failed', message: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleUploadModelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;

    setUploadingModel(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', activeProjectId);
      if (activeExperiment) formData.append('experiment_id', activeExperiment.id);
      formData.append('model_name', file.name.replace('.pt', '') || 'colab_best');
      formData.append('version', 'v1.0');
      formData.append('stage', 'candidate');
      formData.append('notes', 'Trained on Google Colab with GPU acceleration and Drive checkpoints');

      const res = await api.uploadColabModel(formData);
      addNotification({
        type: 'success',
        title: 'Model Weights Registered',
        message: `Imported '${res.name}' (${(res.file_size / 1048576).toFixed(1)} MB) into VisionForge Model Registry!`,
      });
      loadData();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Upload Failed', message: err.message });
    } finally {
      setUploadingModel(false);
      if (e.target) e.target.value = '';
    }
  };

  const selectedDsObj = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-white tracking-tight">Training Control Center</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              YOLO Master
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Ultralytics YOLO engine with fine-tuning safeguards, Google Colab Cloud GPU, and Google Drive checkpointing
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadColabNotebook}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all"
            title="Download ready-to-run Jupyter Notebook for Colab"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Colab Notebook (.ipynb)</span>
          </button>

          <button
            onClick={handleOpenGoogleColab}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold transition-all"
            title="Open Google Colab in a new tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Colab</span>
          </button>

          <button
            onClick={() => setStage('experiments')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all"
          >
            <LineChart className="w-3.5 h-3.5 text-brand-400" />
            <span>Experiments</span>
          </button>

          <button
            onClick={() => setStage('validation')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
          >
            <span>Model Validation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Trainer Configuration & Engine Selector */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-400" />
              Configure Training Run
            </h3>
            <span className="text-[10px] font-mono text-emerald-400">Ultralytics v8.4</span>
          </div>

          {/* Segmented Control: Kaggle Cloud vs Google Colab vs Local Station (Apple UI Design) */}
          <div className="flex p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setTrainingTarget('kaggle')}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                trainingTarget === 'kaggle'
                  ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kaggle Dual-T4</span>
            </button>
            <button
              type="button"
              onClick={() => setTrainingTarget('colab')}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                trainingTarget === 'colab'
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-amber-400" />
              <span>Colab GPU</span>
            </button>
            <button
              type="button"
              onClick={() => setTrainingTarget('local')}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                trainingTarget === 'local'
                  ? 'bg-brand-600/25 text-brand-300 border border-brand-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-brand-400" />
              <span>Local Station</span>
            </button>
          </div>

          {trainingTarget === 'kaggle' ? (
            /* ================= KAGGLE CLOUD TRAINING HUB (Apple UI Design) ================= */
            <div className="space-y-3.5 text-xs">
              {/* Kaggle Engine Specs & Auth Status Badge */}
              <div className="p-3 bg-gradient-to-br from-cyan-950/40 via-blue-950/20 to-slate-900 border border-cyan-500/25 rounded-2xl shadow-inner space-y-2">
                <div className="flex items-center justify-between font-semibold text-cyan-200">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                    Kaggle Cloud Dual-T4 Acceleration
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 font-mono border border-cyan-500/30">
                    2x Tesla T4 &bull; 32GB VRAM
                  </span>
                </div>
                <p className="text-[11px] text-slate-300/80 leading-relaxed">
                  Headless GPU cluster training via Kaggle API. Automatically zips datasets, generates PyTorch DDP scripts, trains YOLO models, and downloads weights.
                </p>

                {/* Kaggle Auth Status Pill */}
                <div className="pt-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${kaggleStatus.authenticated ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-400'}`} />
                    <span className="text-[11px] text-slate-300 font-medium">
                      {kaggleStatus.authenticated ? (
                        <>Connected as <strong className="text-cyan-300 font-mono">@{kaggleStatus.username}</strong></>
                      ) : (
                        <span className="text-rose-300">API Credentials Required</span>
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowKaggleCredsModal(true)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center gap-1 transition-all active:scale-95"
                  >
                    <Key className="w-3 h-3 text-cyan-400" />
                    <span>{kaggleStatus.authenticated ? 'Config API' : 'Enter API Key'}</span>
                  </button>
                </div>
              </div>

              {/* Dataset Version Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">Frozen Dataset Version</label>
                  {selectedDatasetId && (
                    <button
                      type="button"
                      onClick={handleDownloadDatasetZip}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download ZIP</span>
                    </button>
                  )}
                </div>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 transition-colors"
                >
                  {datasets.length === 0 && <option value="">No dataset versions frozen yet</option>}
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.version_name} ({d.total_images} frames &bull; {d.total_annotations} anns)
                    </option>
                  ))}
                </select>
                {selectedDsObj && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Train: {selectedDsObj.train_count} | Val: {selectedDsObj.val_count} | Test: {selectedDsObj.test_count} | Classes: package
                  </p>
                )}
              </div>

              {/* Base Model Weights Selection */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Base Model Checkpoint</label>
                <select
                  value={kaggleModel}
                  onChange={(e) => setKaggleModel(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono focus:border-cyan-500 transition-colors"
                >
                  <option value="yolo26l.pt">yolo26l.pt (YOLO Master Default - Large)</option>
                  <option value="yolov8s.pt">yolov8s.pt (Small - 11.2M params - Balanced)</option>
                  <option value="yolov8m.pt">yolov8m.pt (Medium - 25.9M params)</option>
                  <option value="yolov8x.pt">yolov8x.pt (XLarge - 68.2M params - Maximum Accuracy)</option>
                  <option value="yolov8n.pt">yolov8n.pt (Nano - 3.2M params - Ultra Fast)</option>
                </select>
              </div>

              {/* Fine-Tuning Preset */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs text-slate-400 font-medium">Cloud Hyperparameters</span>
                <button
                  type="button"
                  onClick={() => {
                    setKaggleEpochs(50);
                    setKaggleBatchSize(8);
                    setKaggleLr(0.0008);
                    setKagglePatience(15);
                    setKaggleOptimizer('AdamW');
                    addNotification({
                      type: 'success',
                      title: 'Dual-T4 Cloud Preset Applied',
                      message: 'Optimized for Dual-T4 Kaggle Cluster (50 Epochs, Batch 8, AdamW, lr 0.0008)',
                    });
                  }}
                  className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Apply 50-Epoch Dual-GPU Preset
                </button>
              </div>

              {/* Hyperparameter Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-0.5 font-medium">Epochs</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={kaggleEpochs}
                    onChange={(e) => setKaggleEpochs(parseInt(e.target.value) || 50)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5 font-medium">Batch Size (Total)</label>
                  <input
                    type="number"
                    min="1"
                    max="64"
                    value={kaggleBatchSize}
                    onChange={(e) => setKaggleBatchSize(parseInt(e.target.value) || 8)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5 font-medium">Optimizer</label>
                  <select
                    value={kaggleOptimizer}
                    onChange={(e) => setKaggleOptimizer(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none font-mono focus:border-cyan-500"
                  >
                    <option value="AdamW">AdamW (Recommended)</option>
                    <option value="SGD">SGD</option>
                    <option value="Adam">Adam</option>
                    <option value="auto">auto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5 font-medium">Learning Rate</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={kaggleLr}
                    onChange={(e) => setKaggleLr(parseFloat(e.target.value) || 0.0008)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none font-mono focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Launch Button (Apple Pill Shape) */}
              <button
                type="button"
                onClick={handleLaunchKaggleTraining}
                disabled={isLaunchingKaggle || !kaggleStatus.authenticated || !selectedDatasetId}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-full text-xs font-bold shadow-lg shadow-cyan-900/40 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-cyan-200" />
                <span>
                  {isLaunchingKaggle
                    ? 'Packaging Dataset & Pushing Kernel...'
                    : !kaggleStatus.authenticated
                    ? 'Enter Kaggle API Key to Launch'
                    : 'Launch Headless Cloud Training on Kaggle'}
                </span>
              </button>

              {/* Active Kaggle Job Card (if dispatched) */}
              {kaggleJob && (
                <div className="p-4 bg-slate-950/90 border border-cyan-500/30 rounded-2xl space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      Active Cloud Kernel
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                        kaggleJob.status === 'complete'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : kaggleJob.status === 'running'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {kaggleJob.status || 'queued'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 font-mono truncate">
                    Slug: <span className="text-cyan-400">{kaggleJob.kernel_slug}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {kaggleJob.kernel_url && (
                      <a
                        href={kaggleJob.kernel_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-full text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <ExternalLink className="w-3 h-3 text-cyan-400" />
                        <span>View on Kaggle</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={handlePollKaggleJobManually}
                      disabled={isPollingKaggle}
                      className="py-1.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isPollingKaggle ? 'animate-spin text-cyan-400' : ''}`} />
                      <span>Check Status</span>
                    </button>
                  </div>

                  {kaggleJob.is_complete && (
                    <button
                      type="button"
                      onClick={handleDownloadKaggleModelWeights}
                      disabled={isDownloadingKaggle}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full text-xs font-bold shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isDownloadingKaggle ? 'Downloading best.pt & Metrics...' : '📥 Ingest best.pt to Model Registry'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : trainingTarget === 'colab' ? (
            /* ================= GOOGLE COLAB TRAINING HUB ================= */
            <div className="space-y-3.5 text-xs">
              {/* Colab Engine Badge */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                <div className="flex items-center justify-between font-semibold text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-amber-400" />
                    Google Colab + Google Drive
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 font-mono">
                    Free Cloud T4 GPU
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/70 leading-relaxed">
                  Executes YOLO Master script in Colab with automatic Google Drive checkpoints (every 5 epochs) and metric sync.
                </p>
              </div>

              {/* Dataset Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">Dataset Version</label>
                  {selectedDatasetId && (
                    <button
                      type="button"
                      onClick={handleDownloadDatasetZip}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download ZIP</span>
                    </button>
                  )}
                </div>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                >
                  {datasets.length === 0 && <option value="">No dataset versions frozen yet</option>}
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.version_name} ({d.total_images} frames &bull; {d.total_annotations} anns)
                    </option>
                  ))}
                </select>
                {selectedDsObj && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Train: {selectedDsObj.train_count} | Val: {selectedDsObj.val_count} | Test: {selectedDsObj.test_count} | Classes: package
                  </p>
                )}
              </div>

              {/* Colab Base Model Weights */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Base Model Weights</label>
                <select
                  value={colabModel}
                  onChange={(e) => setColabModel(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                >
                  <option value="yolo26l.pt">yolo26l.pt (YOLO Master Default - Large)</option>
                  <option value="yolov8n.pt">yolov8n.pt (Nano - 3.2M params - Fast)</option>
                  <option value="yolov8s.pt">yolov8s.pt (Small - 11.2M params)</option>
                  <option value="yolov8m.pt">yolov8m.pt (Medium - 25.9M params)</option>
                  <option value="yolov8x.pt">yolov8x.pt (XLarge - 68.2M params)</option>
                  <option value="best.pt">Aurelix / Drive Checkpoint (best.pt - Fine-tune)</option>
                </select>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs text-slate-400 font-medium">Fine-Tuning Preset</span>
                <button
                  type="button"
                  onClick={() => {
                    setColabEpochs(40);
                    setColabBatchSize(8);
                    setColabLr(0.0008);
                    setColabPatience(15);
                    setColabOptimizer('AdamW');
                    addNotification({
                      type: 'success',
                      title: 'Industrial Preset Loaded',
                      message: 'Configured for conveyor package detection (40 Epochs, Batch 8, lr 0.0008)'
                    });
                  }}
                  className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Industrial Conveyor Preset
                </button>
              </div>

              {/* Colab Hyperparameters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-0.5 font-medium">Epochs</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={colabEpochs}
                    onChange={(e) => setColabEpochs(parseInt(e.target.value) || 50)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5 font-medium">Batch Size</label>
                  <input
                    type="number"
                    min="1"
                    max="64"
                    value={colabBatchSize}
                    onChange={(e) => setColabBatchSize(parseInt(e.target.value) || 4)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5 font-medium">Optimizer</label>
                  <select
                    value={colabOptimizer}
                    onChange={(e) => setColabOptimizer(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none font-mono"
                  >
                    <option value="AdamW">AdamW (Recommended)</option>
                    <option value="SGD">SGD</option>
                    <option value="Adam">Adam</option>
                    <option value="auto">auto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5 font-medium">Learning Rate</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={colabLr}
                    onChange={(e) => setColabLr(parseFloat(e.target.value) || 0.001)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none font-mono"
                  />
                </div>
              </div>

              {/* Colab Drive Checkpointing Controls */}
              <div className="p-3 bg-slate-850/80 rounded-xl border border-slate-800 text-[11px] space-y-1.5">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                    Drive Checkpoint Frequency
                  </span>
                  <span className="font-mono text-indigo-300">Every {colabSavePeriod} Epochs</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Backed up to <code className="text-slate-300">/content/drive/MyDrive/YOLO_MASTER_TRAINING/</code>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadColabNotebook}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Colab Notebook (.ipynb)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleOpenGoogleColab}
                    className="py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Colab</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDatasetZip}
                    disabled={!selectedDatasetId}
                    className="py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <FolderArchive className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dataset ZIP</span>
                  </button>
                </div>
              </div>

              {/* Sync Bridge Action */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(true)}
                  className="text-brand-400 hover:text-brand-300 font-semibold text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync Colab Results</span>
                </button>

                <label className="text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer">
                  <UploadCloud className="w-3 h-3" />
                  <span>{uploadingModel ? 'Uploading...' : 'Import best.pt'}</span>
                  <input
                    type="file"
                    accept=".pt"
                    className="hidden"
                    onChange={handleUploadModelFile}
                    disabled={uploadingModel}
                  />
                </label>
              </div>
            </div>
          ) : (
            /* ================= LOCAL ENGINE TRAINING FORM ================= */
            <form onSubmit={handleStartTraining} className="space-y-3.5 text-xs">
              {/* Quick Preset */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/20">
                <span className="text-indigo-300 font-semibold flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Industrial Conveyor Preset
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEpochs(40);
                    setBatchSize(8);
                    setLearningRate(0.0008);
                    setOptimizer('AdamW');
                    setModelVariant('yolo26l_conveyor_best8.pt');
                    addNotification({
                      type: 'success',
                      title: 'Industrial Preset Loaded',
                      message: 'Applied: 40 Epochs, Batch 8, lr 0.0008, AdamW, best (8).pt base',
                    });
                  }}
                  className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] transition-colors"
                >
                  Load 40-Epoch Preset
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Experiment Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Dataset Version</label>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                >
                  {datasets.length === 0 && <option value="">No dataset versions frozen yet</option>}
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.version_name} ({d.total_images} images)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Base Model Weights</label>
                <select
                  value={modelVariant}
                  onChange={(e) => setModelVariant(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                >
                  <option value="yolo26l_conveyor_best8.pt">yolo26l_conveyor_best8.pt (Production best (8).pt - Fine-tune)</option>
                  <option value="yolo26l.pt">yolo26l.pt (YOLO Master Default)</option>
                  <option value="yolov8s.pt">yolov8s.pt (Small - 11.2M params)</option>
                  <option value="yolov8n.pt">yolov8n.pt (Nano - 3.2M params)</option>
                  <option value="best.pt">Aurelix Checkpoint (best.pt)</option>
                </select>
              </div>

              {/* Safeguard Verification */}
              <div className="p-3 bg-slate-850/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                    Class Alignment Safeguard
                  </span>
                  <button
                    type="button"
                    onClick={handleCheckCompatibility}
                    disabled={checkingCompat || !selectedDatasetId}
                    className="px-2 py-0.5 rounded text-[10px] bg-brand-600/80 hover:bg-brand-600 text-white font-semibold transition-colors disabled:opacity-50"
                  >
                    {checkingCompat ? 'Verifying...' : 'Verify Classes'}
                  </button>
                </div>

                {compatCheck && (
                  <div className="text-[11px] space-y-1 pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5 font-semibold">
                      {compatCheck.compatible ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Classes Fully Compatible
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Class Remapping Notice
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[10px] leading-relaxed">{compatCheck.recommendation}</p>
                  </div>
                )}
              </div>

              {/* Hyperparameters Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-0.5 font-medium">Epochs</label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={epochs}
                    onChange={(e) => setEpochs(parseInt(e.target.value) || 10)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5 font-medium">Batch Size</label>
                  <input
                    type="number"
                    min="1"
                    max="128"
                    value={batchSize}
                    onChange={(e) => setBatchSize(parseInt(e.target.value) || 16)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5 font-medium">Image Size</label>
                  <select
                    value={imgSize}
                    onChange={(e) => setImgSize(parseInt(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none font-mono"
                  >
                    <option value={416}>416 x 416</option>
                    <option value={640}>640 x 640</option>
                    <option value={1024}>1024 x 1024</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5 font-medium">Device</label>
                  <select
                    value={device}
                    onChange={(e) => setDevice(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none"
                  >
                    <option value="auto">Auto (CUDA / CPU)</option>
                    <option value="cpu">Force CPU</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={starting || datasets.length === 0 || !hasTrainAccess}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {!hasTrainAccess ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Training Restricted (Requires ML Engineer)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>{starting ? 'Launching...' : 'Start Local Training Run'}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right 2 Columns: Training Results & Colab Workflow Guide */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-5">
          {activeExperiment ? (
            <div className="space-y-4">
              {/* Header with status pill and stop button */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{activeExperiment.name}</h3>
                    <span
                      className={`text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded ${
                        activeExperiment.status === 'running'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                          : activeExperiment.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {activeExperiment.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Model: {activeExperiment.model_variant} &bull; Device: {activeExperiment.device}
                  </span>
                </div>

                {activeExperiment.status === 'running' && (
                  <button
                    onClick={handleStopTraining}
                    disabled={stopping}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>{stopping ? 'Stopping...' : 'Safe Stop'}</span>
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 font-mono mb-1">
                  <span>Epoch {activeExperiment.current_epoch} / {activeExperiment.total_epochs}</span>
                  <span>
                    {activeExperiment.total_epochs > 0
                      ? Math.round((activeExperiment.current_epoch / activeExperiment.total_epochs) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 via-indigo-500 to-emerald-500 transition-all duration-300"
                    style={{
                      width: `${
                        activeExperiment.total_epochs > 0
                          ? (activeExperiment.current_epoch / activeExperiment.total_epochs) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Metric Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Best mAP50</div>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-1">
                    {activeExperiment.best_map50
                      ? `${(activeExperiment.best_map50 * 100).toFixed(1)}%`
                      : activeExperiment.map50
                      ? `${(activeExperiment.map50 * 100).toFixed(1)}%`
                      : '0.0%'}
                  </div>
                </div>
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">mAP50-95</div>
                  <div className="text-base font-bold text-teal-400 font-mono mt-1">
                    {activeExperiment.map50_95
                      ? `${(activeExperiment.map50_95 * 100).toFixed(1)}%`
                      : '0.0%'}
                  </div>
                </div>
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Precision</div>
                  <div className="text-base font-bold text-brand-400 font-mono mt-1">
                    {Math.round((activeExperiment.precision || 0) * 100)}%
                  </div>
                </div>
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Recall</div>
                  <div className="text-base font-bold text-indigo-400 font-mono mt-1">
                    {Math.round((activeExperiment.recall || 0) * 100)}%
                  </div>
                </div>
              </div>

              {/* Streaming Log Terminal or Colab Drive info */}
              <div className="bg-black/90 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto space-y-1">
                <div className="text-slate-500 text-[10px] uppercase font-bold flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-brand-400" />
                    Training Diagnostics & Logs
                  </span>
                  <span className="text-slate-400 font-normal">
                    Checkpoints: {activeExperiment.best_weights_path || 'Google Drive / Local'}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap leading-tight text-slate-400">
                  {liveLogs || (activeExperiment.status === 'completed'
                    ? `Training completed successfully with final weights.\nPrecision: ${(activeExperiment.precision * 100).toFixed(1)}%\nRecall: ${(activeExperiment.recall * 100).toFixed(1)}%\nmAP50: ${(activeExperiment.map50 * 100).toFixed(1)}%`
                    : 'Waiting for training subprocess output...')}
                </pre>
              </div>
            </div>
          ) : (
            /* ================= COLAB MASTER SYSTEM WORKFLOW GUIDE ================= */
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-amber-400" />
                    Google Colab Master Training System
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Step-by-step workflow for zero-setup cloud GPU training with Google Drive backup
                  </p>
                </div>

                <button
                  onClick={handleDownloadColabNotebook}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .ipynb</span>
                </button>
              </div>

              {/* 4 Step Workflow Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-slate-850/70 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-200 text-xs">
                    <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-[10px] font-bold">1</span>
                    Mount Google Drive & GPU
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Notebook automatically mounts <code className="text-slate-300">/content/drive</code> and verifies NVIDIA T4 / A100 GPU acceleration.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-850/70 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-200 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">2</span>
                    Dataset ZIP Extraction
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Downloads <code className="text-slate-300">SVG_v1.0_yolo.zip</code> via direct curl or file prompt, unpacking images, labels, and <code className="text-slate-300">data.yaml</code>.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-850/70 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-200 text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">3</span>
                    Periodic Drive Checkpoints
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Every 5 epochs, <code className="text-slate-300">epoch_XXX_best.pt</code> and <code className="text-slate-300">last.pt</code> are backed up to Drive so training progress is never lost.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-850/70 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-200 text-xs">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">4</span>
                    Validation & Model Sync
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Computes precision, recall, and mAP50, saving metrics to <code className="text-slate-300">validation_metrics.json</code> and syncing back to VisionForge.
                  </p>
                </div>
              </div>

              {/* Instructions banner */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-2">
                <div className="font-semibold text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Quick Launch in 3 Clicks:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                  <li>Click <strong className="text-white">Download Colab Notebook (.ipynb)</strong> above.</li>
                  <li>Go to <a href="https://colab.research.google.com/" target="_blank" rel="noreferrer" className="text-amber-400 underline">colab.research.google.com</a> and upload the notebook.</li>
                  <li>Select <strong className="text-white">Runtime &rarr; Run all</strong>. Checkpoints will auto-save to your Google Drive!</li>
                </ol>
              </div>
            </div>
          )}

          {/* Bottom Bar: Recent Experiments List */}
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-semibold">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-brand-400" />
                Recent Project Experiments ({experiments.length})
              </span>
              <button
                onClick={loadData}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {experiments.length === 0 ? (
              <p className="text-[11px] text-slate-500">No experiments executed yet. Launch in Colab or Local station above.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {experiments.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => setActiveExperiment(exp)}
                    className={`px-3 py-1.5 rounded-xl text-left border text-xs font-mono transition-all flex items-center gap-2 flex-shrink-0 ${
                      activeExperiment?.id === exp.id
                        ? 'bg-slate-800 border-brand-500 text-white'
                        : 'bg-slate-850/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        exp.status === 'completed'
                          ? 'bg-emerald-400'
                          : exp.status === 'running'
                          ? 'bg-blue-400 animate-ping'
                          : 'bg-slate-500'
                      }`}
                    />
                    <span className="font-semibold">{exp.name}</span>
                    {exp.map50 > 0 && (
                      <span className="text-emerald-400 text-[10px]">mAP: {(exp.map50 * 100).toFixed(1)}%</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Sync Modal for Colab Runs */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cloud className="w-4 h-4 text-amber-400" />
                Sync Google Colab Run Metrics
              </h3>
              <button
                onClick={() => setShowSyncModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSyncColabMetricsSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Colab Run Name</label>
                <input
                  type="text"
                  required
                  value={syncExpName}
                  onChange={(e) => setSyncExpName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-0.5">mAP50</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={syncMap50}
                    onChange={(e) => setSyncMap50(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none font-mono text-emerald-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">Precision</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={syncPrecision}
                    onChange={(e) => setSyncPrecision(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">Recall</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={syncRecall}
                    onChange={(e) => setSyncRecall(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                Values are automatically recorded into VisionForge's Experiment comparison and Model Validation dashboard.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold shadow"
                >
                  {syncing ? 'Saving...' : 'Save Run Metrics'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kaggle Credentials Configuration Modal (Apple UI Design) */}
      {showKaggleCredsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900/95 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                Configure Kaggle API Credentials
              </h3>
              <button
                onClick={() => setShowKaggleCredsModal(false)}
                className="text-slate-400 hover:text-white text-base leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              To train models on Kaggle Dual-T4 GPUs for free, enter your Kaggle username and API key. You can generate a key at{' '}
              <a
                href="https://www.kaggle.com/settings/api"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 underline font-medium"
              >
                kaggle.com/settings/api
              </a>{' '}
              (click &quot;Create New Token&quot; to get your <code className="text-cyan-300">kaggle.json</code>).
            </p>

            <form onSubmit={handleSaveKaggleCredentials} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Kaggle Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. sushantgabhane"
                  value={kaggleUsernameInput}
                  onChange={(e) => setKaggleUsernameInput(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Kaggle API Key (32-char hex)</label>
                <input
                  type="password"
                  required
                  placeholder="e.g. 78a1bc49d..."
                  value={kaggleKeyInput}
                  onChange={(e) => setKaggleKeyInput(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono focus:border-cyan-500"
                />
              </div>

              <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl text-[11px] text-cyan-200/80">
                Credentials are saved to your local machine at <code className="text-cyan-300 font-mono">~/.kaggle/kaggle.json</code> and never shared.
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKaggleCredsModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-full font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCreds}
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full font-semibold shadow-md shadow-cyan-900/30 transition-all active:scale-98 disabled:opacity-50"
                >
                  {savingCreds ? 'Authenticating...' : 'Save & Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
