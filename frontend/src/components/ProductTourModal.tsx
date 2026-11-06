import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Sliders,
  Layers,
  Compass,
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
  icon: React.ElementType;
  accentColor: string;
  previewType: 'overview' | 'video' | 'annotation' | 'dataset' | 'training' | 'registry' | 'validation';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    stageId: 'overview',
    badge: 'Enterprise Architecture',
    title: 'Welcome to VisionForge Studio',
    subtitle: 'Production-Grade In-Motion CV & Conveyor AI Suite',
    description:
      'VisionForge is engineered for high-velocity industrial inspection, conveyor tracking, and automated edge intelligence. From raw multi-camera video streams to compiled TensorRT weights in a single cohesive platform.',
    keyFeatures: [
      'Dual Licensed: AGPLv3 Copyleft + Commercial Enterprise License',
      'Zero Cloud Lock-in: Runs on local GPU or cloud clusters',
      'End-to-end auditability across videos, annotations, and checkpoints',
    ],
    ctaLabel: 'Explore Studio Overview',
    icon: Sparkles,
    accentColor: 'from-blue-500 to-indigo-600',
    previewType: 'overview',
  },
  {
    id: 2,
    stageId: 'video_lab',
    badge: 'Video Lab & Frame Studio',
    title: 'High-Throughput Ingestion & Deduplication',
    subtitle: 'Transform Raw 4K Video into Curated Industrial Training Sets',
    description:
      'Ingest continuous production video streams, designate regions of interest (ROI), and automatically isolate pristine keyframes using Laplacian variance sharpness scoring and perceptual hash deduplication.',
    keyFeatures: [
      'Interactive ROI boundary cropping for targeted conveyor belts',
      'Laplacian variance filter: discards motion-blurred or distorted frames',
      'Perceptual hash (pHash) decimation: reduces duplicate frames by up to 90%',
    ],
    ctaLabel: 'Go to Video Lab',
    icon: Film,
    accentColor: 'from-sky-500 to-blue-600',
    previewType: 'video',
  },
  {
    id: 3,
    stageId: 'annotation',
    badge: 'AI Annotation Studio',
    title: 'Prompt Grounding & Keyframe Interpolation',
    subtitle: 'Zero-Shot Florence-2, SAM 2 Masks, and Rigid-Body Tracking',
    description:
      'Label conveyor items in minutes rather than days. Ground zero-shot bounding boxes via natural language with Microsoft Florence-2, refine boundaries with Meta SAM 2, and interpolate rigid bounding boxes across 60 FPS motion.',
    keyFeatures: [
      'Open-vocabulary zero-shot grounding with Microsoft Florence-2',
      'Pixel-level mask segmentation via Meta SAM 2 interactive prompts',
      'Rigid-body trajectory interpolation locks dimensions across fast conveyor velocity',
    ],
    ctaLabel: 'Open Annotation Studio',
    icon: PencilRuler,
    accentColor: 'from-violet-500 to-purple-600',
    previewType: 'annotation',
  },
  {
    id: 4,
    stageId: 'datasets',
    badge: 'Dataset Studio',
    title: 'Audit-Proof Temporal Partitioning',
    subtitle: 'Zero-Leak Train/Val Splits Engineered for Continuous Video Streams',
    description:
      'Standard random dataset splits create catastrophic data leakage on continuous conveyor footage. VisionForge enforces contiguous chronological chunk splitting with temporal safety buffers.',
    keyFeatures: [
      'Temporal chunk splitting (split_strategy="temporal") prevents frame leakage',
      'Automated YOLO format generation (data.yaml, class bounding coordinates)',
      'Multi-format export: YOLOv8 / YOLOv11 / YOLO26, COCO JSON, Pascal VOC',
    ],
    ctaLabel: 'Inspect Dataset Studio',
    icon: Database,
    accentColor: 'from-amber-500 to-orange-600',
    previewType: 'dataset',
  },
  {
    id: 5,
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
    ctaLabel: 'View Training Hub',
    icon: Cpu,
    accentColor: 'from-rose-500 to-pink-600',
    previewType: 'training',
  },
  {
    id: 6,
    stageId: 'model_registry',
    badge: 'Model Registry',
    title: 'Checkpoint Registry & 1-Click Edge Exporter',
    subtitle: 'Deploy Production Checkpoints to ONNX, TensorRT, and OpenVINO',
    description:
      'Track model checkpoints with immutable lineage, confusion matrices, and epoch comparisons. Export models directly in your browser to ONNX or hardware-accelerated runtimes with 1-click downloads.',
    keyFeatures: [
      'Immutable checkpoint registry with full training telemetry history',
      '1-Click direct browser download for compiled ONNX models (50.8 MB)',
      'Optimized edge runtimes: NVIDIA Jetson TensorRT FP16 & Intel OpenVINO',
    ],
    ctaLabel: 'Explore Model Registry',
    icon: Box,
    accentColor: 'from-emerald-500 to-teal-600',
    previewType: 'registry',
  },
  {
    id: 7,
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
    icon: ScanEye,
    accentColor: 'from-indigo-500 to-cyan-600',
    previewType: 'validation',
  },
];

export const ProductTourModal: React.FC = () => {
  const { productTourOpen, setProductTourOpen, setStage, addNotification } = useAppStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Check if tour was completed previously
  useEffect(() => {
    const isCompleted = localStorage.getItem('vf_tour_completed');
    if (!isCompleted) {
      // Auto-trigger on initial user landing after 800ms
      const timer = setTimeout(() => {
        setProductTourOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [setProductTourOpen]);

  // Keyboard navigation: Left, Right, Escape
  useEffect(() => {
    if (!productTourOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [productTourOpen, currentStepIndex, dontShowAgain]);

  if (!productTourOpen) return null;

  const step = TOUR_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('vf_tour_completed', 'true');
    }
    setProductTourOpen(false);
  };

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem('vf_tour_completed', 'true');
      handleClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleJumpToStage = (stageId: StageId) => {
    setStage(stageId);
    if (dontShowAgain) {
      localStorage.setItem('vf_tour_completed', 'true');
    }
    setProductTourOpen(false);
    addNotification({
      type: 'info',
      title: `Navigated to ${step.badge}`,
      message: `Switched active view to ${stageId.replace('_', ' ').toUpperCase()}`,
    });
  };

  const renderVisualPreview = () => {
    switch (step.previewType) {
      case 'overview':
        return (
          <div className="relative h-full flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-blue-950/40 border border-white/[0.08] text-white overflow-hidden shadow-inner">
            {/* Background Glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
            
            {/* Header Badge */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-400 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Enterprise CV Pipeline</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">v2.4.0 High-Speed Core</span>
            </div>

            {/* Pipeline Flow Visualization */}
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

            {/* Core Verification Telemetry */}
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

            {/* Simulated Frame Studio Ingestion Visual */}
            <div className="my-4 relative h-32 rounded-xl bg-black/60 border border-slate-800 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
              {/* ROI Box */}
              <div className="w-48 h-20 border-2 border-dashed border-sky-400 rounded-lg bg-sky-500/10 flex flex-col items-center justify-center p-2">
                <span className="text-[11px] font-mono text-sky-300 font-semibold">Conveyor Track ROI</span>
                <span className="text-[9px] font-mono text-slate-400">[X: 120, Y: 80, W: 850, H: 420]</span>
              </div>
            </div>

            {/* Smart Decimation Metric */}
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

            {/* Simulated Bounding Box Canvas */}
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

            {/* Keyframe Timeline Strip */}
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

            {/* Contiguous Temporal Split Timeline Bar */}
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

            {/* Export Ready Specs */}
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

            {/* Live Terminal & Metrics */}
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

            {/* Cloud Cluster Specs */}
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

            {/* Checkpoint Detail Card */}
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

            {/* Export Pill Badges */}
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

            {/* Synchronized 4-Model Comparison Grid */}
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

            {/* Forensic Indicator */}
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-fade-in">
      {/* Apple-styled Glassmorphism Card */}
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
                Feature Tour &bull; Step {step.id} of {TOUR_STEPS.length}
              </span>
              <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {step.badge}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
                onClick={() => handleJumpToStage(step.stageId)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>{step.ctaLabel}</span>
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
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-7 bg-blue-500'
                      : 'w-2 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40'
                  }`}
                  title={`Go to step ${idx + 1}`}
                />
              );
            })}
          </div>

          {/* Prev / Next Pill Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className={`flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
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
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>{isLast ? 'Complete Tour' : 'Next Step'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
