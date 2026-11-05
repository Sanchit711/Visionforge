import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  ScanEye,
  Upload,
  Play,
  Sliders,
  Sparkles,
  Zap,
  Clock,
  Layers,
  ArrowRight,
  Split,
  Eye,
  RefreshCw,
  FileText,
  Download,
  CheckCircle2,
  Award,
  Video,
  ShieldAlert,
  Activity,
  Copy,
  Check,
  CheckSquare,
  Square,
  BarChart3,
  Flame,
} from 'lucide-react';

export const ValidationView: React.FC = () => {
  const { activeProjectId, addNotification } = useAppStore();

  // Mode: 'single' | 'multi_model' | 'video_benchmark'
  const [activeTab, setActiveTab] = useState<'single' | 'multi_model' | 'video_benchmark'>('multi_model');

  // Common Data
  const [models, setModels] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [frames, setFrames] = useState<any[]>([]);

  // 1. Single Frame Inspector State
  const [selectedModel, setSelectedModel] = useState('best_8.pt');
  const [selectedFramePath, setSelectedFramePath] = useState('');
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [confThreshold, setConfThreshold] = useState(0.25);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  const [inferring, setInferring] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<any | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [modelB, setModelB] = useState('best_9.pt');
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);

  // 2. Multi-Model (.pt) Studio State
  const [selectedMultiModels, setSelectedMultiModels] = useState<string[]>([
    'best_8.pt',
    'best_9.pt',
  ]);
  const [sampleCount, setSampleCount] = useState(15);
  const [benchmarkingMulti, setBenchmarkingMulti] = useState(false);
  const [multiBenchmarkResult, setMultiBenchmarkResult] = useState<any | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // 3. In-Motion Video Benchmark State
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedVideoModels, setSelectedVideoModels] = useState<string[]>([
    'best_8.pt',
    'best_9.pt',
  ]);
  const [videoMaxFrames, setVideoMaxFrames] = useState(150);
  const [runningVideoBench, setRunningVideoBench] = useState(false);
  const [videoBenchResult, setVideoBenchResult] = useState<any | null>(null);
  const [copiedVideoReport, setCopiedVideoReport] = useState(false);

  const loadData = async () => {
    try {
      const mList = await api.getModels();
      setModels(mList);

      if (activeProjectId) {
        const vList = await api.getVideos(activeProjectId);
        setVideos(vList);
        if (vList.length > 0 && !selectedVideoId) {
          setSelectedVideoId(vList[0].id);
        }

        const fList = await api.getFrames(activeProjectId, 0, 30);
        setFrames(fList);
        if (fList.length > 0 && !selectedFramePath) {
          setSelectedFramePath(fList[0].file_path);
        }
      }
    } catch (err) {
      console.error('Error loading validation data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProjectId]);

  // Pre-populate available model options
  const defaultModelOptions = [
    { id: 'best_8.pt', label: 'best_8.pt (Industrial Conveyor Baseline - 40ep)', path: 'best_8.pt' },
    { id: 'best_9.pt', label: 'best_9.pt (Conveyor Package Fine-Tuned - 60ep)', path: 'best_9.pt' },
    { id: 'yolo26l_conveyor_best8.pt', label: 'yolo26l_conveyor_best8.pt (Production Master)', path: 'yolo26l_conveyor_best8.pt' },
    { id: 'yolov8s.pt', label: 'yolov8s.pt (Ultralytics Small Pretrained)', path: 'yolov8s.pt' },
    { id: 'yolov8n.pt', label: 'yolov8n.pt (Ultralytics Nano Fast)', path: 'yolov8n.pt' },
    ...models.map((m) => ({
      id: m.file_path,
      label: `${m.name} (${m.version || 'v1.0'})`,
      path: m.file_path,
    })),
  ];

  // Distinct palette colors for up to 4 models
  const modelPaletteColors = [
    { name: 'Cyan', border: 'border-cyan-500/50', text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { name: 'Emerald', border: 'border-emerald-500/50', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { name: 'Amber', border: 'border-amber-500/50', text: 'text-amber-400', bg: 'bg-amber-500/10' },
    { name: 'Pink', border: 'border-pink-500/50', text: 'text-pink-400', bg: 'bg-pink-500/10' },
  ];

  // --- Handlers: Single Image ---
  const handleRunSingleInference = async () => {
    if (!customFile && !selectedFramePath) {
      addNotification({ type: 'warning', title: 'Image Required', message: 'Select a project frame or upload an image.' });
      return;
    }

    setInferring(true);
    const formData = new FormData();
    if (customFile) {
      formData.append('file', customFile);
    } else {
      formData.append('image_path', selectedFramePath);
    }
    formData.append('model_name_or_path', selectedModel);
    formData.append('confidence_threshold', confThreshold.toString());
    formData.append('iou_threshold', iouThreshold.toString());

    try {
      if (compareMode) {
        formData.append('model_a_path', selectedModel);
        formData.append('model_b_path', modelB);
        const comp = await api.compareModels(formData);
        setComparisonResult(comp);
        setInferenceResult(null);
      } else {
        const res = await api.inferValidation(formData);
        setInferenceResult(res);
        setComparisonResult(null);
      }
      addNotification({ type: 'success', title: 'Inference Complete' });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Inference Failed', message: err.message });
    } finally {
      setInferring(false);
    }
  };

  // --- Handlers: Multi-Model Benchmark ---
  const toggleMultiModel = (modelPath: string) => {
    if (selectedMultiModels.includes(modelPath)) {
      if (selectedMultiModels.length <= 1) {
        addNotification({ type: 'warning', title: 'Minimum 1 Model', message: 'Select at least one model.' });
        return;
      }
      setSelectedMultiModels(selectedMultiModels.filter((m) => m !== modelPath));
    } else {
      if (selectedMultiModels.length >= 4) {
        addNotification({ type: 'warning', title: 'Limit Reached', message: 'You can compare at most 4 models simultaneously.' });
        return;
      }
      setSelectedMultiModels([...selectedMultiModels, modelPath]);
    }
  };

  const handleRunMultiModelBenchmark = async () => {
    if (selectedMultiModels.length === 0) {
      addNotification({ type: 'warning', title: 'Models Required', message: 'Select 2 to 4 models to compare.' });
      return;
    }

    setBenchmarkingMulti(true);
    try {
      const res = await api.benchmarkModelsOnFrames({
        models: selectedMultiModels,
        project_id: activeProjectId || undefined,
        sample_count: sampleCount,
        conf_threshold: confThreshold,
        iou_threshold: iouThreshold,
      });

      setMultiBenchmarkResult(res);
      addNotification({
        type: 'success',
        title: 'Multi-Model Benchmark Complete',
        message: `Audited ${res.num_models} models across ${res.num_frames_evaluated} test frames.`,
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Benchmark Failed',
        message: err.message || 'Error executing multi-model evaluation',
      });
    } finally {
      setBenchmarkingMulti(false);
    }
  };

  // --- Handlers: Video Benchmark ---
  const toggleVideoModel = (modelPath: string) => {
    if (selectedVideoModels.includes(modelPath)) {
      if (selectedVideoModels.length <= 1) {
        addNotification({ type: 'warning', title: 'Minimum 1 Model', message: 'Select at least one model.' });
        return;
      }
      setSelectedVideoModels(selectedVideoModels.filter((m) => m !== modelPath));
    } else {
      if (selectedVideoModels.length >= 4) {
        addNotification({ type: 'warning', title: 'Limit Reached', message: 'At most 4 models for split-screen video benchmark.' });
        return;
      }
      setSelectedVideoModels([...selectedVideoModels, modelPath]);
    }
  };

  const handleRunVideoBenchmark = async () => {
    if (selectedVideoModels.length === 0) {
      addNotification({ type: 'warning', title: 'Models Required', message: 'Select at least 1-4 models.' });
      return;
    }

    setRunningVideoBench(true);
    try {
      const res = await api.runVideoBenchmark({
        video_id: selectedVideoId || undefined,
        models: selectedVideoModels,
        max_frames: videoMaxFrames,
        conf_threshold: confThreshold,
        iou_threshold: iouThreshold,
        generate_video: true,
      });

      setVideoBenchResult(res);
      addNotification({
        type: 'success',
        title: 'In-Motion Video Benchmark Complete',
        message: `Evaluated ${res.models_evaluated} models across ${res.evaluated_frames} frames. Split video synthesized!`,
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Video Benchmark Failed',
        message: err.message || 'Error processing video stream',
      });
    } finally {
      setRunningVideoBench(false);
    }
  };

  const handleCopyReport = (text: string, isVideo = false) => {
    navigator.clipboard.writeText(text);
    if (isVideo) {
      setCopiedVideoReport(true);
      setTimeout(() => setCopiedVideoReport(false), 2000);
    } else {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    }
    addNotification({ type: 'info', title: 'Report Copied', message: 'Markdown report copied to clipboard.' });
  };

  const handleDownloadMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Bar with Apple-Styled Segmented Control */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-white tracking-tight">Model Forensic Laboratory &amp; Video Suite</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Forensic v2.0
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-checkpoint .pt architecture inspection, static frame scorecard, and in-motion video stress testing with live split-HUD
          </p>
        </div>

        {/* 3-Tab Segmented Control (Apple UI Design) */}
        <div className="flex p-1 bg-slate-950/80 rounded-full border border-white/10 text-xs shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('multi_model')}
            className={`py-1.5 px-3.5 rounded-full font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'multi_model'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Multi-Model (.pt) Studio</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('video_benchmark')}
            className={`py-1.5 px-3.5 rounded-full font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'video_benchmark'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>In-Motion Video Lab</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`py-1.5 px-3.5 rounded-full font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'single'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ScanEye className="w-3.5 h-3.5" />
            <span>Single Frame Inspector</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MULTI-MODEL (.PT) DETAIL COMPARISON GENERATOR                      */}
      {/* ========================================================================= */}
      {activeTab === 'multi_model' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Model Selection & Settings */}
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Select Models to Audit (2 to 4)
              </h3>
              <span className="text-[10px] font-mono text-cyan-400">
                {selectedMultiModels.length} / 4 Selected
              </span>
            </div>

            {/* Checkbox List of Available Models */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {defaultModelOptions.map((opt, i) => {
                const isSelected = selectedMultiModels.includes(opt.path);
                const colorIdx = selectedMultiModels.indexOf(opt.path);
                const color = colorIdx >= 0 ? modelPaletteColors[colorIdx] : null;

                return (
                  <div
                    key={opt.id + i}
                    onClick={() => toggleMultiModel(opt.path)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs font-mono ${
                      isSelected
                        ? `${color?.border || 'border-cyan-500'} ${color?.bg || 'bg-cyan-950/20'} text-white font-semibold`
                        : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isSelected ? (
                        <CheckSquare className={`w-4 h-4 ${color?.text || 'text-cyan-400'}`} />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isSelected && (
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded-full ${color?.bg} ${color?.text} font-bold`}>
                        Model {colorIdx + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Evaluation Parameters */}
            <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>Sample Frames Count</span>
                  <span className="font-mono text-cyan-400">{sampleCount} frames</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={sampleCount}
                  onChange={(e) => setSampleCount(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>Confidence Threshold</span>
                  <span className="font-mono text-cyan-400">{Math.round(confThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>IoU NMS Threshold</span>
                  <span className="font-mono text-indigo-400">{Math.round(iouThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={iouThreshold}
                  onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none"
                />
              </div>
            </div>

            {/* Launch Action Button (Apple Pill Shape) */}
            <button
              onClick={handleRunMultiModelBenchmark}
              disabled={benchmarkingMulti || selectedMultiModels.length === 0}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-full text-xs font-bold shadow-lg shadow-cyan-900/40 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-cyan-200" />
              <span>{benchmarkingMulti ? 'Auditing Weights & Latency...' : 'Run Forensic Comparison & Introspect'}</span>
            </button>
          </div>

          {/* Right 2 Columns: Audit Dashboard & Scorecard */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-white/10 rounded-2xl p-5 shadow-xl space-y-5">
            {multiBenchmarkResult ? (
              <div className="space-y-5">
                {/* Header & Export Actions */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-400" />
                      Forensic Audit Matrix ({multiBenchmarkResult.num_models} Models Audited)
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Evaluated on {multiBenchmarkResult.num_frames_evaluated} conveyor test frames
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyReport(multiBenchmarkResult.markdown_report)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                      <span>{copiedReport ? 'Copied!' : 'Copy Markdown'}</span>
                    </button>

                    <button
                      onClick={() => handleDownloadMarkdown(multiBenchmarkResult.markdown_report, 'visionforge_forensic_report.md')}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .md</span>
                    </button>
                  </div>
                </div>

                {/* 1. Architectural Introspection Grid */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Deep Weights Introspection
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {multiBenchmarkResult.introspection.map((spec: any, idx: number) => {
                      const color = modelPaletteColors[idx % modelPaletteColors.length];
                      return (
                        <div key={idx} className={`p-3 rounded-xl border ${color.border} ${color.bg} space-y-1.5`}>
                          <div className={`text-xs font-bold font-mono truncate ${color.text}`}>
                            {spec.name}
                          </div>
                          <div className="text-[11px] text-slate-300 space-y-0.5 font-mono">
                            <div>Params: <strong className="text-white">{spec.param_count_human}</strong></div>
                            <div>Size: <strong className="text-white">{spec.file_size_mb} MB</strong></div>
                            <div>Conv Layers: <strong className="text-white">{spec.conv_layers_count}</strong></div>
                            <div>Est. GFLOPs: <strong className="text-white">{spec.estimated_gflops}</strong></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Static In-Flight Benchmark Table */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    In-Flight Inference Performance
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Model Checkpoint</th>
                          <th className="p-3">Avg Latency</th>
                          <th className="p-3">Throughput (FPS)</th>
                          <th className="p-3">Detections</th>
                          <th className="p-3">Mean Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {multiBenchmarkResult.benchmark_results.map((b: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="p-3 font-bold text-white flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${modelPaletteColors[idx % modelPaletteColors.length].bg}`} />
                              <span>{b.model_name}</span>
                            </td>
                            <td className="p-3 text-cyan-300 font-bold">{b.avg_latency_ms} ms</td>
                            <td className="p-3 text-emerald-400 font-bold">{b.throughput_fps} FPS</td>
                            <td className="p-3 text-slate-200">{b.total_detections}</td>
                            <td className="p-3 text-brand-300">{(b.avg_confidence * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Executive Winner Badges */}
                <div className="p-4 bg-slate-950/90 border border-white/10 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    Executive Metric Winners
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-medium">🚀 Speed Leader</div>
                      <div className="font-bold text-cyan-400 truncate mt-0.5">
                        {multiBenchmarkResult.winners.fastest_inference}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-medium">⚡ Highest Throughput</div>
                      <div className="font-bold text-emerald-400 truncate mt-0.5">
                        {multiBenchmarkResult.winners.highest_fps}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-medium">💾 Compact Footprint</div>
                      <div className="font-bold text-indigo-400 truncate mt-0.5">
                        {multiBenchmarkResult.winners.most_compact_size}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-medium">🎯 Confidence Leader</div>
                      <div className="font-bold text-amber-400 truncate mt-0.5">
                        {multiBenchmarkResult.winners.highest_confidence}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-24 space-y-3">
                <BarChart3 className="w-12 h-12 text-slate-600 animate-pulse" />
                <p className="max-w-md text-center leading-relaxed">
                  Select 2 to 4 trained YOLO model checkpoints (.pt) and click <strong>&quot;Run Forensic Comparison &amp; Introspect&quot;</strong> to inspect architecture parameters, GFLOPs, layers, and evaluate detection metrics side-by-side.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: IN-MOTION VIDEO BENCHMARK & SPLIT-VIEW SYNTHESIZER                 */}
      {/* ========================================================================= */}
      {activeTab === 'video_benchmark' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Video & Model Selection */}
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-400" />
                In-Motion Temporal Setup
              </h3>
              <span className="text-[10px] font-mono text-purple-400">Quad-Split Synthesizer</span>
            </div>

            {/* Select Ingested Video */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">Conveyor Video Stream</label>
              <select
                value={selectedVideoId}
                onChange={(e) => setSelectedVideoId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none text-xs"
              >
                {videos.length === 0 && <option value="">No videos in project yet</option>}
                {videos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.original_filename || v.filename} ({v.total_frames || 'N/A'} frames)
                  </option>
                ))}
              </select>
            </div>

            {/* Models to Benchmark (Up to 4) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300 font-semibold">
                <span>Select Models (2 to 4)</span>
                <span className="font-mono text-purple-400">{selectedVideoModels.length}/4</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {defaultModelOptions.map((opt, i) => {
                  const isSelected = selectedVideoModels.includes(opt.path);
                  const colorIdx = selectedVideoModels.indexOf(opt.path);
                  const color = colorIdx >= 0 ? modelPaletteColors[colorIdx] : null;

                  return (
                    <div
                      key={opt.id + i}
                      onClick={() => toggleVideoModel(opt.path)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs font-mono ${
                        isSelected
                          ? `${color?.border || 'border-purple-500'} ${color?.bg || 'bg-purple-950/20'} text-white font-semibold`
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isSelected ? (
                          <CheckSquare className={`w-4 h-4 ${color?.text || 'text-purple-400'}`} />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {isSelected && (
                        <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded-full ${color?.bg} ${color?.text} font-bold`}>
                          Pane {colorIdx + 1}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Frame Limit Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <div className="flex justify-between text-slate-300 font-medium">
                <span>Frames to Process</span>
                <span className="font-mono text-purple-400">{videoMaxFrames} frames</span>
              </div>
              <input
                type="range"
                min="60"
                max="300"
                step="30"
                value={videoMaxFrames}
                onChange={(e) => setVideoMaxFrames(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none"
              />
              <p className="text-[10px] text-slate-500">
                Processes ~{((videoMaxFrames / 25) || 1).toFixed(1)} seconds of high-speed conveyor footage.
              </p>
            </div>

            {/* Launch Button (Apple Pill Shape) */}
            <button
              onClick={handleRunVideoBenchmark}
              disabled={runningVideoBench || selectedVideoModels.length === 0}
              className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-full text-xs font-bold shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
            >
              <Video className="w-4 h-4 text-purple-200" />
              <span>{runningVideoBench ? 'Synthesizing Multi-Split Video...' : 'Launch In-Motion Video Benchmark'}</span>
            </button>
          </div>

          {/* Right 2 Columns: Video Player & Temporal Scorecard */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-white/10 rounded-2xl p-5 shadow-xl space-y-5">
            {videoBenchResult ? (
              <div className="space-y-5">
                {/* Header & Export Actions */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Flame className="w-4 h-4 text-purple-400" />
                      In-Motion Temporal Audit: {videoBenchResult.video_filename}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Evaluated {videoBenchResult.models_evaluated} models across {videoBenchResult.evaluated_frames} frames @ {videoBenchResult.video_fps.toFixed(1)} FPS
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyReport(videoBenchResult.markdown_report, true)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      {copiedVideoReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
                      <span>{copiedVideoReport ? 'Copied!' : 'Copy Markdown'}</span>
                    </button>

                    <button
                      onClick={() => handleDownloadMarkdown(videoBenchResult.markdown_report, 'visionforge_video_benchmark_report.md')}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .md</span>
                    </button>
                  </div>
                </div>

                {/* Synthesized Video Player with Live Telemetry HUD */}
                {videoBenchResult.comparison_video_url && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-purple-400" />
                        Synchronized Multi-Pane Video Player
                      </span>
                      <a
                        href={videoBenchResult.comparison_video_url}
                        download={`benchmark_${videoBenchResult.video_filename}`}
                        className="text-purple-400 hover:text-purple-300 text-[11px] flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Download MP4
                      </a>
                    </div>

                    <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
                      <video
                        controls
                        autoPlay
                        loop
                        src={videoBenchResult.comparison_video_url}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Temporal Performance Table */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                    Temporal In-Motion Benchmark Matrix
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Model</th>
                          <th className="p-3">Ingress Lock</th>
                          <th className="p-3">Jitter (σ)</th>
                          <th className="p-3">Continuity</th>
                          <th className="p-3">Dropouts</th>
                          <th className="p-3">Roller Bleed</th>
                          <th className="p-3">Latency</th>
                          <th className="p-3">FPS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {videoBenchResult.scores.map((s: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="p-3 font-bold text-white flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${modelPaletteColors[idx % modelPaletteColors.length].bg}`} />
                              <span>{s.model_name}</span>
                            </td>
                            <td className="p-3 text-cyan-300">
                              {s.ingress_frame >= 0 ? `Frm ${s.ingress_frame} (${s.ingress_time_sec}s)` : 'N/A'}
                            </td>
                            <td className="p-3 text-emerald-400 font-bold">{s.sigma_jitter_px} px</td>
                            <td className="p-3 text-indigo-300">{s.tracking_continuity_pct}%</td>
                            <td className="p-3 text-slate-300">{s.dropout_count}</td>
                            <td className="p-3 text-rose-400">{s.roller_bleed_count}</td>
                            <td className="p-3 text-cyan-400">{s.avg_latency_ms} ms</td>
                            <td className="p-3 text-emerald-300 font-bold">{s.throughput_fps}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* In-Motion Winner Badges */}
                <div className="p-4 bg-slate-950/90 border border-white/10 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    In-Motion Forensic Winners
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-medium">🎯 Fastest Ingress Lock</div>
                      <div className="font-bold text-cyan-400 truncate mt-0.5">
                        {videoBenchResult.winners.fastest_ingress}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-medium">🛡️ Rock-Solid Tracking (Lowest σ)</div>
                      <div className="font-bold text-emerald-400 truncate mt-0.5">
                        {videoBenchResult.winners.lowest_jitter}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-medium">🔒 Best Continuity</div>
                      <div className="font-bold text-purple-400 truncate mt-0.5">
                        {videoBenchResult.winners.highest_continuity}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-medium">✨ Fewest Dropouts</div>
                      <div className="font-bold text-indigo-400 truncate mt-0.5">
                        {videoBenchResult.winners.least_dropouts}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-medium">🧹 Cleanest (Lowest Roller Bleed)</div>
                      <div className="font-bold text-amber-400 truncate mt-0.5">
                        {videoBenchResult.winners.least_roller_bleed}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-medium">⚡ Speed Leader</div>
                      <div className="font-bold text-cyan-300 truncate mt-0.5">
                        {videoBenchResult.winners.fastest_latency}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-24 space-y-3">
                <Video className="w-12 h-12 text-slate-600 animate-pulse" />
                <p className="max-w-md text-center leading-relaxed">
                  Select an industrial conveyor video stream and click <strong>&quot;Launch In-Motion Video Benchmark&quot;</strong> to evaluate tracking stability, bounding box jitter ($\sigma$), package ingress latency, and synthesize a synchronized multi-pane video.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SINGLE FRAME INSPECTOR (ORIGINAL VIEW ENHANCED)                   */}
      {/* ========================================================================= */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Input Selection & Parameters */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-400" />
                Single Frame Setup
              </h3>
              <span className="text-[10px] font-mono text-emerald-400">Ultralytics Predictor</span>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Primary Model */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {compareMode ? 'Model A' : 'Model Weights'}
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                >
                  <option value="best_8.pt">best_8.pt (Industrial Conveyor Baseline)</option>
                  <option value="best_9.pt">best_9.pt (Conveyor Package Fine-Tuned)</option>
                  <option value="yolo26l_conveyor_best8.pt">yolo26l_conveyor_best8.pt (Production Master)</option>
                  <option value="yolov8s.pt">yolov8s.pt (Pretrained Small)</option>
                  <option value="yolov8n.pt">yolov8n.pt (Pretrained Nano)</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.file_path}>
                      {m.name} ({m.version})
                    </option>
                  ))}
                </select>
              </div>

              {/* Model B if Comparison Mode */}
              {compareMode && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Model B (Comparison Candidate)</label>
                  <select
                    value={modelB}
                    onChange={(e) => setModelB(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  >
                    <option value="best_9.pt">best_9.pt (Conveyor Package Fine-Tuned)</option>
                    <option value="best_8.pt">best_8.pt (Industrial Conveyor Baseline)</option>
                    <option value="yolo26l_conveyor_best8.pt">yolo26l_conveyor_best8.pt (Production Master)</option>
                    <option value="yolov8s.pt">yolov8s.pt (Pretrained Small)</option>
                    <option value="yolov8n.pt">yolov8n.pt (Pretrained Nano)</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.file_path}>
                        {m.name} ({m.version})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Test Image Source */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Select Project Frame</label>
                <select
                  value={selectedFramePath}
                  onChange={(e) => {
                    setSelectedFramePath(e.target.value);
                    setCustomFile(null);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                >
                  {frames.map((f, i) => (
                    <option key={f.id} value={f.file_path}>
                      Frame {i + 1} ({f.timestamp_sec.toFixed(2)}s)
                    </option>
                  ))}
                </select>
              </div>

              {/* Or Upload Custom Image */}
              <div className="pt-2 border-t border-slate-800/80">
                <label className="block text-[11px] text-slate-400 mb-1">Or Upload Custom Image File</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setCustomFile(e.target.files[0]);
                      setSelectedFramePath('');
                    }
                  }}
                  className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-300 file:font-semibold hover:file:bg-slate-700"
                />
              </div>

              {/* Sliders */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-slate-300 font-medium mb-1">
                    <span>Confidence Threshold</span>
                    <span className="font-mono text-brand-400">{Math.round(confThreshold * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={confThreshold}
                    onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 font-medium mb-1">
                    <span>IoU NMS Threshold</span>
                    <span className="font-mono text-indigo-400">{Math.round(iouThreshold * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={iouThreshold}
                    onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none"
                  />
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setCompareMode(!compareMode);
                    setInferenceResult(null);
                    setComparisonResult(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>{compareMode ? 'Disable Comparison' : 'Enable Dual Compare'}</span>
                </button>
              </div>

              <button
                onClick={handleRunSingleInference}
                disabled={inferring}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-full text-xs font-semibold shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-4 active:scale-98"
              >
                <ScanEye className="w-4 h-4" />
                <span>{inferring ? 'Benchmarking Inference...' : compareMode ? 'Compare Both Models' : 'Run Inference'}</span>
              </button>
            </div>
          </div>

          {/* Right 2 Columns: Single Frame Output */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
            {comparisonResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Split className="w-4 h-4 text-brand-400" />
                    Dual Model Comparison Output
                  </h3>
                  <span className="text-[11px] font-mono text-indigo-400">
                    Latency Diff: {comparisonResult.latency_diff_ms} ms
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{comparisonResult.model_a.name}</span>
                      <span className="font-mono text-brand-400">
                        {comparisonResult.model_a.detection_count} detections
                      </span>
                    </div>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={comparisonResult.model_a.result.annotated_image_url}
                        alt="Model A Result"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
                      <span>Latency: {comparisonResult.model_a.result.latency_ms} ms</span>
                      <span>FPS: {comparisonResult.model_a.result.fps}</span>
                    </div>
                  </div>

                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{comparisonResult.model_b.name}</span>
                      <span className="font-mono text-indigo-400">
                        {comparisonResult.model_b.detection_count} detections
                      </span>
                    </div>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={comparisonResult.model_b.result.annotated_image_url}
                        alt="Model B Result"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
                      <span>Latency: {comparisonResult.model_b.result.latency_ms} ms</span>
                      <span>FPS: {comparisonResult.model_b.result.fps}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : inferenceResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Latency</div>
                    <div className="text-base font-bold text-emerald-400 font-mono mt-1">
                      {inferenceResult.latency_ms} ms
                    </div>
                  </div>
                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Throughput</div>
                    <div className="text-base font-bold text-brand-400 font-mono mt-1">
                      {inferenceResult.fps} FPS
                    </div>
                  </div>
                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Compute Device</div>
                    <div className="text-base font-bold text-indigo-400 font-mono mt-1">
                      {inferenceResult.device_used}
                    </div>
                  </div>
                </div>

                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                  <img
                    src={inferenceResult.annotated_image_url}
                    alt="Inference visualization"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="bg-slate-850/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Detected Objects ({inferenceResult.detections.length})</span>
                    <span className="text-[10px] font-mono text-slate-400">Class &bull; Conf &bull; Coordinates</span>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                    {inferenceResult.detections.map((d: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5"
                      >
                        <span className="font-semibold text-white capitalize">{d.class_name}</span>
                        <span className="text-emerald-400">{(d.confidence * 100).toFixed(0)}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs py-24">
                Select an image and click &apos;Run Inference&apos; to benchmark detection latency and visualize predictions.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
