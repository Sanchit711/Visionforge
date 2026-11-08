import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, StageId } from '../stores/useAppStore';
import {
  Sparkles,
  Video,
  Film,
  PencilRuler,
  Database,
  Cpu,
  Box,
  ScanEye,
  ChevronRight,
  ChevronLeft,
  X,
  ShieldCheck,
  Activity,
  Download,
  ArrowRight,
  Play,
  Pause,
  CheckCircle2,
  Sliders,
  Layers,
  Compass,
  Maximize2,
  Minimize2,
  MousePointer,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface TourStep {
  id: number;
  stageId: StageId;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  keyFeatures: string[];
  ctaLabel: string;
  interactiveTip: string;
  icon: React.ElementType;
  accentColor: string;
  accentHex: string;
  previewType: 'overview' | 'video' | 'frame' | 'annotation' | 'dataset' | 'training' | 'registry' | 'validation';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    stageId: 'overview',
    badge: 'Enterprise Architecture',
    title: 'VisionForge Studio Overview',
    subtitle: 'Industrial Computer Vision & Conveyor AI Platform',
    description:
      'VisionForge is built for high-velocity industrial inspection, conveyor tracking, and edge intelligence. From multi-camera video streams to compiled TensorRT weights in a unified interface.',
    keyFeatures: [
      'Dual Licensed: AGPLv3 Copyleft + Commercial Enterprise License',
      'Zero Cloud Lock-in: Runs on local GPU or cloud clusters',
      'End-to-end telemetry across videos, annotations, and model weights',
    ],
    ctaLabel: 'Explore Overview Metrics',
    interactiveTip: 'Observe real-time CPU/GPU telemetry, KPI statistics, and active project workflows.',
    icon: Sparkles,
    accentColor: 'from-blue-500 to-indigo-600',
    accentHex: '#0071e3',
    previewType: 'overview',
  },
  {
    id: 2,
    stageId: 'video_lab',
    badge: 'Video Lab & ROI Framing',
    title: 'High-Throughput Ingestion & ROI Framing',
    subtitle: 'Transform Raw 4K Video into Industrial Training Sets',
    description:
      'Ingest continuous production video streams, designate normalized regions of interest (ROI), and isolate camera angles with persistent boundary presets.',
    keyFeatures: [
      'Interactive ROI boundary cropping for targeted conveyor belts',
      'Synthetic demo video generator with simulated conveyor motion',
      'Timestamp trimming and frame interval synchronization',
    ],
    ctaLabel: 'Inspect Video Lab',
    interactiveTip: 'Click "Generate Demo Video" or upload a production MP4 to try ROI boundary cropping.',
    icon: Film,
    accentColor: 'from-sky-500 to-blue-600',
    accentHex: '#0284c7',
    previewType: 'video',
  },
  {
    id: 3,
    stageId: 'frame_studio',
    badge: 'Frame Studio & Sharpness Decimation',
    title: 'Laplacian Sharpness & Smart Decimation',
    subtitle: 'Curate Pristine Training Keyframes Automatically',
    description:
      'Discard motion-blurred conveyor frames using automated Laplacian variance filtering, and decimate redundant stationary frames using perceptual hash (pHash) analysis.',
    keyFeatures: [
      'Laplacian variance filter: discards motion-blurred or distorted frames',
      'Perceptual hash (pHash) decimation: reduces duplicate frames by up to 90%',
      'Single-click batch extraction from multiple video clips',
    ],
    ctaLabel: 'View Frame Studio',
    interactiveTip: 'Tune the Laplacian variance threshold slider to automatically filter blurred frames.',
    icon: Layers,
    accentColor: 'from-cyan-500 to-teal-600',
    accentHex: '#0d9488',
    previewType: 'frame',
  },
  {
    id: 4,
    stageId: 'annotation',
    badge: 'AI Annotation Studio',
    title: 'Prompt Grounding & Keyframe Tracking',
    subtitle: 'Zero-Shot Florence-2, SAM 2 Masks, and Rigid Tracking',
    description:
      'Label conveyor items in minutes rather than days. Ground zero-shot bounding boxes via natural language with Microsoft Florence-2, refine boundaries with Meta SAM 2, and interpolate rigid bounding boxes across motion.',
    keyFeatures: [
      'Open-vocabulary zero-shot grounding with Microsoft Florence-2',
      'Pixel-level mask segmentation via Meta SAM 2 interactive prompts',
      'Rigid-body trajectory interpolation locks dimensions across conveyor velocity',
    ],
    ctaLabel: 'Test Annotation Canvas',
    interactiveTip: 'Press "B" to draw bounding boxes or click the AI Wand icon for Florence-2 prompt grounding.',
    icon: PencilRuler,
    accentColor: 'from-violet-500 to-purple-600',
    accentHex: '#7c3aed',
    previewType: 'annotation',
  },
  {
    id: 5,
    stageId: 'datasets',
    badge: 'Dataset Studio',
    title: 'Audit-Proof Temporal Partitioning',
    subtitle: 'Zero-Leak Train/Val Splits for Continuous Video Streams',
    description:
      'Standard random dataset splits create catastrophic data leakage on continuous conveyor footage. VisionForge enforces contiguous chronological chunk splitting with temporal safety buffers.',
    keyFeatures: [
      'Temporal chunk splitting (split_strategy="temporal") prevents frame leakage',
      'Automated YOLO format generation (data.yaml, class bounding coordinates)',
      'Multi-format export: YOLOv8 / YOLOv11 / YOLO26, COCO JSON, Pascal VOC',
    ],
    ctaLabel: 'Inspect Dataset Versions',
    interactiveTip: 'Choose between Temporal Chunk Splitting and Stratified Splitting for 0% data leakage.',
    icon: Database,
    accentColor: 'from-amber-500 to-orange-600',
    accentHex: '#d97706',
    previewType: 'dataset',
  },
  {
    id: 6,
    stageId: 'training',
    badge: 'Training Hub',
    title: 'Cloud GPU Training & Telemetry Streaming',
    subtitle: '1-Click Headless Kaggle Dual-T4 & P100 Cluster Execution',
    description:
      'Dispatch training jobs directly to remote cloud GPU clusters with one click. Stream real-time loss curves, learning rate dynamics, and validation mAP50 telemetry back to your local workstation.',
    keyFeatures: [
      'Automated headless Kaggle API submission and artifact retrieval',
      'Dual NVIDIA T4 GPU acceleration (32GB VRAM aggregate)',
      'Real-time loss curve streaming and automatic checkpoint synchronization',
    ],
    ctaLabel: 'Launch Training Hub',
    interactiveTip: 'Select YOLO26 Large, set epochs to 50, and hit "Start Cloud Training" for dual-T4 dispatch.',
    icon: Cpu,
    accentColor: 'from-rose-500 to-pink-600',
    accentHex: '#e11d48',
    previewType: 'training',
  },
  {
    id: 7,
    stageId: 'model_registry',
    badge: 'Model Registry',
    title: 'Checkpoint Registry & Edge Exporter',
    subtitle: 'Deploy Production Checkpoints to ONNX, TensorRT, and OpenVINO',
    description:
      'Track model checkpoints with immutable lineage, confusion matrices, and epoch comparisons. Export models directly in your browser to ONNX or hardware-accelerated runtimes with 1-click downloads.',
    keyFeatures: [
      'Immutable checkpoint registry with full training telemetry history',
      '1-Click direct browser download for compiled ONNX models (50.8 MB)',
      'Optimized edge runtimes: NVIDIA Jetson TensorRT FP16 & Intel OpenVINO',
    ],
    ctaLabel: 'View Model Registry',
    interactiveTip: 'Click the "Download ONNX" pill badge to obtain the pre-compiled 50.8 MB production model.',
    icon: Box,
    accentColor: 'from-emerald-500 to-teal-600',
    accentHex: '#059669',
    previewType: 'registry',
  },
  {
    id: 8,
    stageId: 'validation',
    badge: 'Validation & Forensics',
    title: 'In-Motion Forensics & Quad-Split Stress Lab',
    subtitle: 'Quad-Split Synchronized Video Benchmarking & Jitter Auditing',
    description:
      'Test your models under real-world factory conveyor stress. Run 4 model checkpoints side-by-side in synchronized video playback, measure sub-pixel bounding box jitter, and verify zero roller bleed.',
    keyFeatures: [
      'Quad-split synchronized video playback comparing 4 model iterations',
      'Sub-pixel spatial jitter analysis (verified σ < 0.8 px on conveyor stream)',
      '3,394-frame raw video continuity audit with 100% detection stability',
    ],
    ctaLabel: 'Launch Validation Lab',
    interactiveTip: 'Press Play in the Quad-Split lab to benchmark 4 model checkpoints synchronized frame-by-frame.',
    icon: ScanEye,
    accentColor: 'from-indigo-500 to-cyan-600',
    accentHex: '#4f46e5',
    previewType: 'validation',
  },
];

export const ProductTourModal: React.FC = () => {
  const { productTourOpen, setProductTourOpen, setStage, addNotification } = useAppStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [tourMode, setTourMode] = useState<'spotlight' | 'blueprint'>('spotlight');
  const [isPlayingAuto, setIsPlayingAuto] = useState(false);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState(6);

  const step = TOUR_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  // Auto-trigger on initial user landing after 800ms if not completed previously
  useEffect(() => {
    const isCompleted = localStorage.getItem('vf_tour_completed');
    if (!isCompleted) {
      const timer = setTimeout(() => {
        setProductTourOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [setProductTourOpen]);

  // Synchronize live application stage with tour step
  useEffect(() => {
    if (productTourOpen && step) {
      setStage(step.stageId);
    }
  }, [productTourOpen, currentStepIndex]);

  // Keyboard navigation: Left, Right, Escape, Space (auto-play toggle)
  useEffect(() => {
    if (!productTourOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlayingAuto((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [productTourOpen, currentStepIndex, isLast, isFirst]);

  // Auto-play timer loop
  useEffect(() => {
    if (!productTourOpen || !isPlayingAuto) {
      setAutoPlayCountdown(6);
      return;
    }

    const interval = setInterval(() => {
      setAutoPlayCountdown((prev) => {
        if (prev <= 1) {
          if (isLast) {
            setIsPlayingAuto(false);
            return 6;
          }
          setCurrentStepIndex((idx) => idx + 1);
          return 6;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [productTourOpen, isPlayingAuto, isLast]);

  if (!productTourOpen) return null;

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('vf_tour_completed', 'true');
    }
    setIsPlayingAuto(false);
    setProductTourOpen(false);
  };

  const handleNext = () => {
    setAutoPlayCountdown(6);
    if (isLast) {
      localStorage.setItem('vf_tour_completed', 'true');
      handleClose();
      addNotification({
        type: 'success',
        title: 'Tour Completed!',
        message: 'You have explored all 8 VisionForge pipeline stages.',
      });
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setAutoPlayCountdown(6);
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleStepClick = (index: number) => {
    setAutoPlayCountdown(6);
    setCurrentStepIndex(index);
  };

  // Render Visual Previews for Blueprint Mode
  const renderVisualPreview = () => {
    switch (step.previewType) {
      case 'overview':
        return (
          <div className="relative h-full flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-blue-950/40 border border-white/[0.08] text-white overflow-hidden shadow-inner">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-400 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Enterprise CV Pipeline</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">v2.4.0 High-Speed Core</span>
            </div>

            <div className="my-6 z-10">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">End-to-End Factory Cycle</div>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <Film className="w-4 h-4 mx-auto text-sky-400 mb-1" />
                  <span className="font-medium text-slate-200">Video Ingest</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <PencilRuler className="w-4 h-4 mx-auto text-purple-400 mb-1" />
                  <span className="font-medium text-slate-200">Florence-2 AI</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <Cpu className="w-4 h-4 mx-auto text-rose-400 mb-1" />
                  <span className="font-medium text-slate-200">Cloud Train</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <ScanEye className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                  <span className="font-medium text-slate-200">Edge Verify</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 z-10">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                <div className="text-xl font-bold font-mono text-emerald-400">99.50%</div>
                <div className="text-[10px] text-slate-400 mt-0.5">mAP50 Accuracy</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                <div className="text-xl font-bold font-mono text-sky-400">3,394</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Frames Evaluated</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                <div className="text-xl font-bold font-mono text-indigo-400">&lt; 0.8 px</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Spatial Jitter σ</div>
              </div>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="relative h-full flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-sky-950/40 border border-white/[0.08] text-white overflow-hidden shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-sky-400 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                conveyor_test_stream.mp4
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ROI Active
              </span>
            </div>

            <div className="my-4 relative h-32 rounded-xl bg-black/60 border border-slate-800 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
              <div className="w-48 h-20 border-2 border-dashed border-sky-400 rounded-lg bg-sky-500/10 flex flex-col items-center justify-center p-2">
                <span className="text-[11px] font-mono text-sky-300 font-semibold">Conveyor Track ROI</span>
                <span className="text-[9px] font-mono text-slate-400">[X: 120, Y: 80, W: 850, H: 420]</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Laplacian Blur Filter:</span>
                <span className="text-emerald-400 font-semibold">Passed (Score 384.2)</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-sky-400 to-blue-500 h-full w-[90%]" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>3,394 Raw Frames</span>
                <span className="text-sky-300 font-semibold">350 Curated Keyframes (90% Saved)</span>
              </div>
            </div>
          </div>
        );

      case 'frame':
        return (
          <div className="relative h-full flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-teal-950/40 border border-white/[0.08] text-white overflow-hidden shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-teal-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Sharpness Decimation Engine
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                pHash Deduplicated
              </span>
            </div>

            <div className="my-4 grid grid-cols-3 gap-2">
              <div className="p-2 rounded-xl bg-black/60 border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">Raw Stream</div>
                <div className="text-lg font-bold font-mono text-slate-200 mt-1">3,394</div>
                <div className="text-[8px] text-slate-500">Continuous 60fps</div>
              </div>
              <div className="p-2 rounded-xl bg-rose-950/30 border border-rose-500/30 text-center">
                <div className="text-[10px] text-rose-300">Blur Discarded</div>
                <div className="text-lg font-bold font-mono text-rose-400 mt-1">-1,820</div>
                <div className="text-[8px] text-rose-300">Variance &lt; 100</div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center">
                <div className="text-[10px] text-emerald-300">Curated Keys</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-1">350</div>
                <div className="text-[8px] text-emerald-300">Optimal diversity</div>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Storage Optimization:</span>
              <span className="text-emerald-400 font-semibold">89.7% redundancy reduced</span>
            </div>
          </div>
        );

      case 'annotation':
        return (
          <div className="relative h-full flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-purple-950/40 border border-white/[0.08] text-white overflow-hidden shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-purple-300 font-medium">
                <PencilRuler className="w-3.5 h-3.5" />
                <span>Florence-2 Grounding + Meta SAM 2</span>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Rigid Interpolation
              </span>
            </div>

            <div className="my-4 relative h-32 rounded-xl bg-slate-950 border border-purple-900/30 flex items-center justify-center">
              <div className="relative w-40 h-24 border-2 border-emerald-400 rounded bg-emerald-500/10 flex flex-col justify-between p-1.5 shadow-[0_0_15px_rgba(52,211,153,0.2)]">
                <div className="flex items-center justify-between">
                  <span className="bg-emerald-500 text-slate-950 font-bold font-mono text-[9px] px-1 rounded">
                    conveyor_item 0.98
                  </span>
                  <span className="text-[8px] font-mono text-emerald-300">[120x85 px]</span>
                </div>
                <div className="flex items-center justify-between text-[8px] text-slate-300 font-mono">
                  <span>Track ID #04</span>
                  <span className="text-amber-300">DIMENSIONS LOCKED</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300">Keyframe Interpolation:</span>
              </div>
              <span className="text-purple-300">Frame 15 ➔ Frame 45 (60 FPS)</span>
            </div>
          </div>
        );

      case 'dataset':
        return (
          <div className="relative h-full flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-amber-950/40 border border-white/[0.08] text-white overflow-hidden shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-amber-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                split_strategy="temporal"
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                0% Leakage
              </span>
            </div>

            <div className="my-4 space-y-2">
              <div className="text-[10px] font-mono text-slate-400">Contiguous Chronological Split Partition:</div>
              <div className="flex h-9 rounded-xl overflow-hidden border border-white/10 font-mono text-[10px] font-semibold text-center leading-9">
                <div className="w-[70%] bg-blue-600/80 text-blue-100 border-r border-slate-900">
                  TRAIN (70%)
                </div>
                <div className="w-[5%] bg-amber-500/40 text-amber-200 border-r border-slate-900 text-[8px]">
                  GAP
                </div>
                <div className="w-[25%] bg-emerald-600/80 text-emerald-100">
                  VAL (25%)
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>00:00 - 02:45 (Training Sequence)</span>
                <span>03:00 - 03:55 (Val Holdout)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <span className="text-slate-400">Export Standard: </span>
                <span className="text-amber-300 font-semibold">YOLOv8 / YOLO26</span>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <span className="text-slate-400">Class Balance: </span>
                <span className="text-emerald-300 font-semibold">Optimal (1:1.04)</span>
              </div>
            </div>
          </div>
        );

      case 'training':
        return (
          <div className="relative h-full flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-rose-950/40 border border-white/[0.08] text-white overflow-hidden shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                <Cpu className="w-3.5 h-3.5" />
                <span>Kaggle Dual-T4 GPU Engine</span>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                COMPLETED
              </span>
            </div>

            <div className="my-4 p-3 rounded-xl bg-black/70 border border-slate-800 font-mono text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>Job Status:</span>
                <span className="text-emerald-400 font-semibold">Epoch 50/50 [100%]</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Validation mAP50:</span>
                <span className="text-emerald-300 font-bold text-sm">0.9950 (99.50%)</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Box Loss / Cls Loss:</span>
                <span className="text-sky-300">0.0124 / 0.0031</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span>Hardware: Dual Nvidia T4 (32GB)</span>
              <span className="text-rose-400">Headless API Push</span>
            </div>
          </div>
        );

      case 'registry':
        return (
          <div className="relative h-full flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-emerald-950/40 border border-white/[0.08] text-white overflow-hidden shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5" />
                yolo26l_conveyor_best50.pt
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Production Ready
              </span>
            </div>

            <div className="my-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Model Architecture:</span>
                <span className="font-mono text-white font-semibold">YOLOv26 Large</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">mAP50 / mAP50-95:</span>
                <span className="font-mono text-emerald-400 font-semibold">99.50% / 88.20%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Direct ONNX Package:</span>
                <span className="font-mono text-sky-400 font-semibold">50.8 MB (Optimized)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold flex items-center justify-center gap-1">
                <Download className="w-3 h-3" />
                <span>ONNX</span>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-semibold">
                TensorRT FP16
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold">
                OpenVINO IR
              </div>
            </div>
          </div>
        );

      case 'validation':
        return (
          <div className="relative h-full flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-cyan-950/40 border border-white/[0.08] text-white overflow-hidden shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
                <ScanEye className="w-3.5 h-3.5" />
                <span>Quad-Split In-Motion Benchmark</span>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Continuity
              </span>
            </div>

            <div className="my-3 grid grid-cols-2 gap-2 font-mono text-[10px]">
              <div className="p-2 rounded-xl bg-black/60 border border-slate-800 text-center">
                <div className="text-slate-400">Epoch 10</div>
                <div className="text-amber-400 font-bold mt-0.5">91.2% mAP</div>
                <div className="text-[8px] text-slate-500">Noticeable jitter</div>
              </div>
              <div className="p-2 rounded-xl bg-black/60 border border-slate-800 text-center">
                <div className="text-slate-400">Epoch 25</div>
                <div className="text-sky-400 font-bold mt-0.5">96.4% mAP</div>
                <div className="text-[8px] text-slate-500">Minor boundary bleed</div>
              </div>
              <div className="p-2 rounded-xl bg-black/60 border border-slate-800 text-center">
                <div className="text-slate-400">Epoch 35</div>
                <div className="text-indigo-400 font-bold mt-0.5">98.1% mAP</div>
                <div className="text-[8px] text-slate-500">High stability</div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                <div className="text-emerald-300 font-semibold">Epoch 50 (Best)</div>
                <div className="text-emerald-400 font-bold mt-0.5">99.50% mAP</div>
                <div className="text-[8px] text-emerald-400">Zero roller bleed</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="text-slate-400">Sub-pixel Jitter: σ = 0.72 px</span>
              <span className="text-emerald-400 font-semibold">3,394/3,394 Frames Tracked</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Minimized Floating Pill View
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-bounce-subtle">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/95 dark:bg-[#121826]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-2xl hover:scale-105 active:scale-95 transition-all group"
        >
          <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${step.accentColor} flex items-center justify-center text-white shadow-md`}>
            <step.icon className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-semibold text-slate-400">
              Interactive Tour &bull; Step {step.id}/8
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-blue-500 transition-colors">
              {step.badge} (Resume)
            </span>
          </div>
          <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white ml-1 transition-colors" />
        </button>
      </div>
    );
  }

  // SPOTLIGHT DYNAMIC HUD MODE: Non-blocking Floating HUD driving the live application
  if (tourMode === 'spotlight') {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end p-4 sm:p-6 md:p-8">
        {/* Subtle Ambient Vignette to emphasize live application stage */}
        <div className="absolute inset-0 bg-black/25 pointer-events-none transition-opacity duration-300" />

        {/* Floating Spotlight Glass HUD */}
        <div className="pointer-events-auto relative w-full max-w-3xl mx-auto bg-white/95 dark:bg-[#0c121e]/95 backdrop-blur-2xl border border-[#e5e5ea] dark:border-white/15 rounded-[28px] shadow-2xl shadow-black/20 dark:shadow-black/50 overflow-hidden transition-all duration-300 animate-slide-up">
          {/* Top Bar with Stage Navigator, Mode Switcher & Auto-Play */}
          <div className="px-5 py-3 border-b border-[#e5e5ea] dark:border-white/[0.08] flex items-center justify-between gap-3 bg-[#f6f3f5] dark:bg-white/[0.02]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${step.accentColor} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                <step.icon className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Live Stage {step.id} of {TOUR_STEPS.length}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    ACTIVE SCREEN
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {step.badge}
                </h3>
              </div>
            </div>

            {/* Controls: Mode Switcher, Auto-Play, Minimize, Close */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Auto-Play Toggle */}
              <button
                onClick={() => setIsPlayingAuto(!isPlayingAuto)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  isPlayingAuto
                    ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/30'
                    : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title="Toggle Auto-Play Walkthrough (Space)"
              >
                {isPlayingAuto ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span className="hidden sm:inline">{isPlayingAuto ? `Auto (${autoPlayCountdown}s)` : 'Auto-Play'}</span>
              </button>

              {/* Mode Switcher */}
              <button
                onClick={() => setTourMode('blueprint')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-[11px] font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                title="Switch to Architecture Blueprint Mode"
              >
                <Layers className="w-3 h-3" />
                <span className="hidden md:inline">Blueprint</span>
              </button>

              {/* Minimize to Canvas Pill */}
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                title="Minimize Tour (Interact with live canvas)"
              >
                <Minimize2 className="w-4 h-4" />
              </button>

              {/* Close Tour */}
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                title="Exit Tour (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {step.subtitle}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {step.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Interactive Action Tip Pill */}
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-500/20 text-xs text-blue-950 dark:text-blue-200">
              <MousePointer className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-semibold text-blue-600 dark:text-blue-400 mr-1.5">Try on this screen:</span>
                <span>{step.interactiveTip}</span>
              </div>
            </div>

            {/* Key Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {step.keyFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.05] text-[11px] text-slate-700 dark:text-slate-300"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="leading-snug">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Footer: Segmented Step Indicators & Action Controls */}
          <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Step Pills */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((s, idx) => {
                const isActive = idx === currentStepIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => handleStepClick(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'w-7 bg-[#0071e3] shadow-sm'
                        : 'w-2 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40'
                    }`}
                    title={`Stage ${idx + 1}: ${s.badge}`}
                  />
                );
              })}
            </div>

            {/* Prev / Next Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handlePrev}
                disabled={isFirst}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isFirst
                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.08] active:scale-95'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={() => setIsMinimized(true)}
                className="px-3.5 py-1.5 rounded-full bg-slate-200/80 dark:bg-white/[0.08] hover:bg-slate-300 dark:hover:bg-white/[0.12] text-slate-800 dark:text-slate-200 text-xs font-medium transition-all cursor-pointer"
                title="Interact directly with the live view"
              >
                Test Stage Live
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-md shadow-[#0071e3]/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <span>{isLast ? 'Complete Tour' : 'Next Stage'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ARCHITECTURAL BLUEPRINT MODE: Comprehensive 2-Column Forensic View
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-[#121826]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col max-h-[92vh] transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${step.accentColor} flex items-center justify-center text-white shadow-sm`}>
              <step.icon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Architectural Blueprint &bull; Stage {step.id} of {TOUR_STEPS.length}
              </span>
              <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {step.badge}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch to Spotlight Mode */}
            <button
              onClick={() => setTourMode('spotlight')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-blue-500" />
              <span>Live Spotlight Mode</span>
            </button>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              title="Close Tour (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Two-Column Responsive Layout */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-stretch">
          {/* Left Column: Visual Mockup / Interactive Telemetry */}
          <div className="md:col-span-6 min-h-[260px] md:min-h-[320px]">
            {renderVisualPreview()}
          </div>

          {/* Right Column: Explanatory Content & Feature Highlights */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08]">
                <Compass className="w-3.5 h-3.5 text-blue-500" />
                <span>{step.subtitle}</span>
              </div>

              <h1 id="tour-title" className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                {step.title}
              </h1>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {step.description}
              </p>

              {/* Bullet Points */}
              <div className="space-y-2 pt-2">
                {step.keyFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-tight">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stage Action Shortcut */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setStage(step.stageId);
                  setTourMode('spotlight');
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>Switch to Live Stage</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Cupertino Footer: Pill Indicators & Nav Buttons */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Checkbox: Don't show again */}
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
            />
            <span>Don't show tour on startup</span>
          </label>

          {/* Segmented Pill Step Indicators */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => {
              const isActive = idx === currentStepIndex;
              return (
                <button
                  key={idx}
                  onClick={() => handleStepClick(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-7 bg-[#0071e3]'
                      : 'w-2 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40'
                  }`}
                  title={`Go to stage ${idx + 1}`}
                />
              );
            })}
          </div>

          {/* Prev / Next Pill Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className={`flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isFirst
                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.08] active:scale-95'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-md shadow-[#0071e3]/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <span>{isLast ? 'Complete Tour' : 'Next Stage'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
