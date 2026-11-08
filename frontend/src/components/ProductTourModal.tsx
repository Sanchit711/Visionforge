import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  MapPin,
  Workflow,
  Search,
  Share2,
  Lock,
  Crop,
  Check,
} from 'lucide-react';

export interface HowItWorksStep {
  stepNumber: number;
  title: string;
  description: string;
}

export interface TourStep {
  id: number;
  stageId: StageId;
  target: string;
  locationName: string;
  badge: string;
  title: string;
  subtitle: string;
  whereLocated: string;
  whatItDoes: string;
  howItWorks: HowItWorksStep[];
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
    target: 'overview-kpis',
    locationName: 'Overview Console › Metric Bento Row',
    badge: 'Executive Telemetry',
    title: 'Factory Dashboard & Real-Time KPIs',
    subtitle: 'Unified Telemetry Across 8 Pipeline Stages',
    whereLocated: 'Top bento grid directly beneath the main title bar on the Overview console.',
    whatItDoes: 'Continuously aggregates factory video ingestion counts, frame decimation rates, annotated items, trained model weights, and online compute nodes across all industrial conveyor lines.',
    howItWorks: [
      {
        stepNumber: 1,
        title: 'Background Daemon Polling',
        description: 'SQLite transactions and GPU metrics are polled every 10 seconds without locking the UI thread.',
      },
      {
        stepNumber: 2,
        title: 'Bento Telemetry Cards',
        description: 'Displays live counts for Videos, Extracted Frames, Annotations, Datasets, and Checkpoints.',
      },
      {
        stepNumber: 3,
        title: '1-Click Stage Handoff',
        description: 'Clicking any KPI card instantly transitions your workspace to that operational workstation.',
      },
    ],
    interactiveTip: 'Click on any KPI card to immediately jump into that pipeline stage.',
    icon: Sparkles,
    accentColor: 'from-blue-500 to-indigo-600',
    accentHex: '#0071e3',
    previewType: 'overview',
  },
  {
    id: 2,
    stageId: 'overview',
    target: 'pipeline-flow',
    locationName: 'Overview Console › Pipeline Flow Matrix',
    badge: 'Factory Lifecycle',
    title: '8-Stage Sequential Vision Pipeline',
    subtitle: 'End-to-End Lineage from 4K Video to TensorRT',
    whereLocated: 'Large central bento container on the left of the Overview view.',
    whatItDoes: 'Enforces a strict engineering lifecycle that transforms raw 4K production video streams into optimized, zero-leakage TensorRT edge weights for factory conveyor sorting.',
    howItWorks: [
      {
        stepNumber: 1,
        title: 'Continuous Upstream Ingest',
        description: 'Video Lab & Frame Studio filter out blur and redundant stationary conveyor frames.',
      },
      {
        stepNumber: 2,
        title: 'Assisted Annotation & Splitting',
        description: 'SAM 2 and YOLO auto-label objects; datasets split chronologically to prevent accuracy inflation.',
      },
      {
        stepNumber: 3,
        title: 'GPU Training & Edge Verification',
        description: 'Models train on Kaggle Dual-T4 or Colab, validate in quad-split sync, and register for Jetson deployment.',
      },
    ],
    interactiveTip: 'Click any stage tile (e.g. "4. AI Annotation") to navigate straight into that phase.',
    icon: Workflow,
    accentColor: 'from-blue-600 to-cyan-600',
    accentHex: '#0071e3',
    previewType: 'overview',
  },
  {
    id: 3,
    stageId: 'overview',
    target: 'workspace-selector',
    locationName: 'Top Navigation Header › Workspace Switcher',
    badge: 'Security & Multi-Tenancy',
    title: 'Multi-Tenant Workspaces & RBAC',
    subtitle: 'Enterprise Team & Plant Line Segregation',
    whereLocated: 'Top navigation header bar on the left, next to the VisionForge logo and breadcrumbs.',
    whatItDoes: 'Isolates computer vision camera streams, models, and datasets across distinct factory facilities, client organizations, and engineering teams under strict role-based access control.',
    howItWorks: [
      {
        stepNumber: 1,
        title: 'Partitioned Workspaces',
        description: 'Segregates production lines into Shared Team Workspaces and Private Sandboxes.',
      },
      {
        stepNumber: 2,
        title: 'Role-Based Access Control',
        description: 'Five strict RBAC tiers: Admin, Reviewer, ML Engineer, Annotator, and Auditor Viewer.',
      },
      {
        stepNumber: 3,
        title: 'Cryptographic Tenant Isolation',
        description: 'All database queries, S3 video assets, and model weights enforce strict tenant authorization.',
      },
    ],
    interactiveTip: 'Click the Workspace pill in the header to view shared vs private sandboxes.',
    icon: Share2,
    accentColor: 'from-purple-500 to-indigo-600',
    accentHex: '#8b5cf6',
    previewType: 'overview',
  },
  {
    id: 4,
    stageId: 'overview',
    target: 'spotlight-search',
    locationName: 'Top Navigation Header › Center Spotlight Search',
    badge: 'Command Center',
    title: 'Global Spotlight Search (⌘K / Ctrl+K)',
    subtitle: 'Instant Universal Fuzzy Navigation & Actions',
    whereLocated: 'Center-right of the top navigation bar, featuring the ⌘K shortcut badge.',
    whatItDoes: 'Provides macOS Spotlight-style keyboard navigation across all vision projects, training experiments, dataset versions, registered model checkpoints, and studio commands.',
    howItWorks: [
      {
        stepNumber: 1,
        title: 'Instant Summon (⌘K / Ctrl+K)',
        description: 'Press ⌘K anywhere in the application to summon the frosted spotlight palette without touching your mouse.',
      },
      {
        stepNumber: 2,
        title: 'Universal Fuzzy Indexing',
        description: 'Searches across models (yolo26l.pt), datasets (v1.2), pipeline stages, and documentation topics.',
      },
      {
        stepNumber: 3,
        title: 'Keyboard Execution',
        description: 'Use Arrow keys to browse and Enter to immediately execute workflows or navigate.',
      },
    ],
    interactiveTip: 'Press ⌘K or click the search box to test the global spotlight launcher.',
    icon: Search,
    accentColor: 'from-slate-700 to-blue-600',
    accentHex: '#0071e3',
    previewType: 'overview',
  },
  {
    id: 5,
    stageId: 'video_lab',
    target: 'video-source-list',
    locationName: 'Video Lab › Left Ingestion Drawer',
    badge: 'Video Ingestion',
    title: 'Industrial Video Stream Ingestion',
    subtitle: 'High-Throughput Camera Feed Management',
    whereLocated: 'Far-left panel in the Video Ingestion & Crop Lab.',
    whatItDoes: 'Ingests high-framerate 4K/1080p production streams from conveyor IP cameras, RTSP feeds, or test MP4 video uploads.',
    howItWorks: [
      {
        stepNumber: 1,
        title: 'Stream Upload & Synthetic Simulation',
        description: 'Upload industrial camera videos or click "Generate Demo Video" for instant simulated conveyor footage.',
      },
      {
        stepNumber: 2,
        title: 'OpenCV Metadata Extraction',
        description: 'Automatically detects video codec, resolution (e.g. 1920x1080), framerate (e.g. 60 FPS), and timestamp duration.',
      },
      {
        stepNumber: 3,
        title: 'Stream Lineage Indexing',
        description: 'Computes cryptographic SHA-256 hash to guarantee provenance for regulatory compliance.',
      },
    ],
    interactiveTip: 'Click "Generate Demo Video" in the top bar to synthesize an industrial conveyor video.',
    icon: Film,
    accentColor: 'from-sky-500 to-blue-600',
    accentHex: '#0284c7',
    previewType: 'video',
  },
  {
    id: 6,
    stageId: 'video_lab',
    target: 'video-crop-controls',
    locationName: 'Video Lab › Central Video Viewport & ROI Sliders',
    badge: 'ROI Cropping',
    title: 'Interactive Normalized ROI Framing',
    subtitle: 'Conveyor Isolation & Reusable Camera Presets',
    whereLocated: 'Central video player and the lower ROI coordinates panel in Video Lab.',
    whatItDoes: 'Isolates the active conveyor belt zone, discarding extraneous factory background, and trims timestamps before frame extraction.',
    howItWorks: [
      {
        stepNumber: 1,
        title: 'Interactive Cyan ROI Box',
        description: 'Drag the rectangular ROI box directly over the conveyor belt or tune the normalized coordinate sliders.',
      },
      {
        stepNumber: 2,
        title: 'Normalized Coordinate Math',
        description: 'Bounding coordinates are stored as floats (0.00 to 1.00), ensuring crops remain resolution-independent.',
      },
      {
        stepNumber: 3,
        title: 'Persistent Camera Angle Presets',
        description: 'Save presets (e.g. "Entrance Focus 16:9") to reuse identical cropping across dozens of cameras.',
      },
    ],
    interactiveTip: 'Click 1:1, 16:9, or 4:3 buttons above the scrubber to test aspect ratio presets.',
    icon: Crop,
    accentColor: 'from-blue-500 to-indigo-600',
    accentHex: '#0071e3',
    previewType: 'video',
  },
  {
    id: 7,
    stageId: 'frame_studio',
    target: 'frame-studio-filters',
    locationName: 'Frame Studio › Extraction Configuration Parameters',
    badge: 'Smart Decimation',
    title: 'Laplacian Sharpness & pHash Decimation',
    subtitle: 'Automated Blur Rejection & Frame Deduplication',
    whereLocated: 'Top configuration panel in the Frame Studio view.',
    whatItDoes: 'Extracts pristine keyframes from video streams while automatically discarding motion blur and redundant stationary conveyor frames.',
    howItWorks: [
      {
        stepNumber: 1,
        title: 'Laplacian Variance (∇²) Filter',
        description: 'Measures pixel edge sharpness gradients; conveyor frames below threshold (e.g. < 100) are flagged as blurry rejects.',
      },
      {
        stepNumber: 2,
        title: 'Perceptual Hash (pHash) Deduplication',
        description: 'Calculates 64-bit DCT image fingerprints; duplicate frames (Hamming distance ≤ 3) are filtered out automatically.',
      },
      {
        stepNumber: 3,
        title: '85% Cost & Storage Reduction',
        description: 'Downsamples thousands of raw video frames into the top 300-500 most informative, distinct training frames.',
      },
    ],
    interactiveTip: 'Adjust the Min Sharpness slider and click "Extract Target Frames" to see real-time extraction.',
    icon: Layers,
    accentColor: 'from-teal-500 to-emerald-600',
    accentHex: '#0d9488',
    previewType: 'frame',
  },
  {
    id: 8,
    stageId: 'annotation',
    target: 'annotation-canvas-tools',
    locationName: 'Annotation Studio › Top Floating Command HUD',
    badge: 'Spatial Labeling',
    title: 'Precision Canvas HUD & Spatial Tools',
    subtitle: 'Sub-Pixel Bounding Boxes & Instance Polygons',
    whereLocated: 'Floating top command toolbar positioned directly above the canvas viewport.',
    whatItDoes: 'Provides high-speed annotation tools including Bounding Box (B), Polygon Segmentation (P), Point Prompting, Sub-pixel Zoom, Pan, and 100-step Undo/Redo.',
    howItWorks: [
      {
        stepNumber: 1,
        title: 'Fast Keyboard Hotkeys',
        description: 'Press "B" for Bounding Box or "P" for Polygon. Keys 1-9 switch classes instantly without mouse movement.',
      },
      {
        stepNumber: 2,
        title: 'Sub-Pixel Canvas Engine',
        description: 'Draw coordinates on conveyor packages; automatic vertex snapping and boundary edge detection.',
      },
      {
        stepNumber: 3,
        title: '100% History Stack',
        description: 'Full undo (⌘Z) and redo (⌘Y) history preserves every edit with zero state corruption.',
      },
    ],
    interactiveTip: 'Press "B" on your keyboard to switch to Box mode, or "P" for Polygon mode.',
    icon: PencilRuler,
    accentColor: 'from-blue-600 to-indigo-600',
    accentHex: '#0071e3',
    previewType: 'annotation',
  },
  {
    id: 9,
    stageId: 'annotation',
    target: 'annotation-ai-assist',
    locationName: 'Annotation Studio › Right Inspector Sidebar',
    badge: 'Zero-Shot AI Assist',
    title: 'Meta SAM 2 & YOLO Auto-Labeling Engine',
    subtitle: 'Zero-Shot Prompt Grounding & Video Propagation',
    whereLocated: 'Right-hand sidebar drawer in the Annotation Studio.',
    whatItDoes: 'Accelerates annotation velocity up to 10x using Meta SAM 2 point prompts, Florence-2 natural language grounding, and automated video trajectory propagation.',
    howItWorks: [
      {
        stepNumber: 1,
        title: 'Single-Click Point Prompting',
        description: 'Select SAM 2 mode and single-click any conveyor package; SAM 2 computes pixel-perfect boundary polygons in < 50ms.',
      },
      {
        stepNumber: 2,
        title: 'YOLO World Open-Vocabulary',
        description: 'Type natural language prompts (e.g. "damaged cardboard box") to detect unseen defect categories automatically.',
      },
      {
        stepNumber: 3,
        title: 'Rigid Trajectory Propagation',
        description: 'Locks box dimensions and propagates coordinates across subsequent conveyor frames using motion vectors.',
      },
    ],
    interactiveTip: 'Click the "SAM 2 Point Prompt" toggle in the right sidebar to try interactive AI labeling.',
    icon: Zap,
    accentColor: 'from-purple-500 to-pink-600',
    accentHex: '#a855f7',
    previewType: 'annotation',
  },
  {
    id: 10,
    stageId: 'datasets',
    target: 'dataset-split-controls',
    locationName: 'Datasets View › Temporal Timeline Partition Bar',
    badge: 'Zero Leakage',
    title: 'Leakage-Free Temporal Video Splitting',
    subtitle: 'Chronological Video Partitions vs Random Shuffling',
    whereLocated: 'Top bento container in the Datasets Management view.',
    whatItDoes: 'Partitions annotated frames into Train, Validation, and Test splits without chronological video leakage between adjacent frames.',
    howItWorks: [
      {
        stepNumber: 1,
        title: 'The Data Leakage Hazard',
        description: 'Random frame shuffling puts consecutive 60fps frames into both Train and Test, producing fake 99% scores that fail in production.',
      },
      {
        stepNumber: 2,
        title: 'Contiguous Temporal Partitions',
        description: 'VisionForge enforces continuous timeline blocks (70% Train, 20% Val, 10% Test) with time buffer gaps between splits.',
      },
      {
        stepNumber: 3,
        title: 'YOLO data.yaml Export',
        description: 'Generates standardized YOLO format directories, label text files, and yaml descriptors ready for training.',
      },
    ],
    interactiveTip: 'Inspect the 70/20/10 timeline distribution partition bar in Datasets.',
    icon: Database,
    accentColor: 'from-emerald-500 to-teal-600',
    accentHex: '#10b981',
    previewType: 'dataset',
  },
  {
    id: 11,
    stageId: 'training',
    target: 'training-engine-selector',
    locationName: 'Model Training › Left Configuration & Engine Switcher',
    badge: 'Cloud GPU Engine',
    title: 'Kaggle Dual-T4 & Colab Pro GPU Clusters',
    subtitle: 'Headless Cloud GPU Training with Checkpoint Failover',
    whereLocated: 'Left configuration panel in the Training Center view.',
    whatItDoes: 'Dispatches model training to Kaggle Dual Nvidia T4 clusters (32GB VRAM), Google Colab Pro GPUs, or local RTX workstations.',
    howItWorks: [
      {
        stepNumber: 1,
        title: 'Compute Target Switcher',
        description: 'Select Kaggle Dual-T4, Google Colab, or Local Station using the segmented control.',
      },
      {
        stepNumber: 2,
        title: 'Headless Script & Dataset Push',
        description: 'Packages your dataset version, base weights, and hyperparameter recipe (batch size, image resolution, learning rate).',
      },
      {
        stepNumber: 3,
        title: 'Automated Checkpoint Failover',
        description: 'Syncs live epoch metrics (mAP50, Box Loss); auto-migrates checkpoints (last.pt) if cloud timeout limits occur.',
      },
    ],
    interactiveTip: 'Toggle between Kaggle Dual-T4 and Colab GPU segmented buttons to see hyperparameter presets.',
    icon: Cpu,
    accentColor: 'from-amber-500 to-orange-600',
    accentHex: '#f59e0b',
    previewType: 'training',
  },
  {
    id: 12,
    stageId: 'validation',
    target: 'validation-quad-split',
    locationName: 'Validation Lab › Multi-Model Forensic Matrix',
    badge: 'Forensic Audit',
    title: 'In-Motion Temporal Forensic Benchmark',
    subtitle: 'Parallel Multi-Model Video Audit & Tracking Stability',
    whereLocated: 'Top model audit configuration panel of the Model Validation view.',
    whatItDoes: 'Simultaneously benchmarks 2 to 4 model checkpoints against raw industrial conveyor video streams, measuring jitter, latency, and tracking stability.',
    howItWorks: [
      {
        stepNumber: 1,
        title: 'Multi-Model Checkpoint Audit',
        description: 'Select baseline (best_8.pt), fine-tuned (best_9.pt), and production master (yolo26l.pt) candidates.',
      },
      {
        stepNumber: 2,
        title: 'Synchronized Parallel Inference',
        description: 'Feeds identical video frames simultaneously to all models, synthesizing a 4-pane split comparison video.',
      },
      {
        stepNumber: 3,
        title: 'Forensic In-Motion Metrics',
        description: 'Measures Bounding Box Centroid Jitter (σ), Package Ingress Latency (ms), and Tracking Continuity (%).',
      },
    ],
    interactiveTip: 'Click "Launch Multi-Model Benchmark" in Validation to evaluate models side-by-side.',
    icon: ScanEye,
    accentColor: 'from-indigo-500 to-cyan-600',
    accentHex: '#4f46e5',
    previewType: 'validation',
  },
  {
    id: 13,
    stageId: 'model_registry',
    target: 'registry-model-cards',
    locationName: 'Model Registry › Registered Weights Grid',
    badge: 'Model Governance',
    title: 'Model Registry & TensorRT FP16 Compilation',
    subtitle: 'Production Staging Gates & Nvidia Jetson Export',
    whereLocated: 'Central cards grid in the Model Registry view.',
    whatItDoes: 'Version-controls validated models, enforces RBAC production promotion gates, and compiles PyTorch checkpoints into high-speed TensorRT engines.',
    howItWorks: [
      {
        stepNumber: 1,
        title: 'Automated Checkpoint Ingestion',
        description: 'Completed training runs automatically register their best weights with mAP metrics and validation logs.',
      },
      {
        stepNumber: 2,
        title: 'Production Promotion Gates',
        description: 'RBAC controls allow only ML Engineers and Admins to promote models from Staging to Active Production.',
      },
      {
        stepNumber: 3,
        title: '1-Click Engine Compilation',
        description: 'Exports direct ONNX, TensorRT FP16/INT8, and OpenVINO packages for sub-2ms edge deployment on Jetson Orin AGX.',
      },
    ],
    interactiveTip: 'Click the ONNX or TensorRT download pills on any model card to inspect export formats.',
    icon: Box,
    accentColor: 'from-emerald-500 to-cyan-600',
    accentHex: '#10b981',
    previewType: 'registry',
  },
  {
    id: 14,
    stageId: 'overview',
    target: 'sidebar-navigation',
    locationName: 'Far-Left Vertical Navigation Rail',
    badge: 'System Architecture',
    title: 'Studio Navigation Rail & Edge Status',
    subtitle: 'One-Click Pipeline Flow & Jetson Hardware Telemetry',
    whereLocated: 'Leftmost vertical sidebar spanning the full height of your screen.',
    whatItDoes: 'Provides instant one-click switching across all 8 factory stages, settings, compute runtimes, and displays live Jetson Orin AGX edge deployment status.',
    howItWorks: [
      {
        stepNumber: 1,
        title: 'Sequential Stage Rail',
        description: 'Follows the factory manufacturing progression from Ingest to Deployment.',
      },
      {
        stepNumber: 2,
        title: 'Jetson Orin AGX Readiness Indicator',
        description: 'Footer monitors edge hardware heartbeat, active TensorRT engine compatibility, and latency targets.',
      },
      {
        stepNumber: 3,
        title: 'Collapsible Rail for Wide Workspaces',
        description: 'Can be collapsed to provide maximum widescreen space during intense annotation sessions.',
      },
    ],
    interactiveTip: 'You can click any sidebar stage icon or use keyboard shortcuts to jump anywhere in VisionForge.',
    icon: Compass,
    accentColor: 'from-blue-600 to-indigo-600',
    accentHex: '#0071e3',
    previewType: 'overview',
  },
];

export const ProductTourModal: React.FC = () => {
  const { productTourOpen, setProductTourOpen, setStage, addNotification } = useAppStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [tourMode, setTourMode] = useState<'spotlight' | 'blueprint'>('spotlight');
  const [isPlayingAuto, setIsPlayingAuto] = useState(false);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState(7);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  // Measure target DOM element
  const measureTarget = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement;
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
        return;
      }
    }
    setTargetRect(null);
  }, [step?.target]);

  // Synchronize live application stage and scroll element into view
  useEffect(() => {
    if (!productTourOpen || !step) return;

    // Switch stage
    setStage(step.stageId);

    // Initial check after short delay to allow React state updates to render the view
    const t1 = setTimeout(() => {
      const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
        }
      }
    }, 120);

    // Secondary measurement after animations settle
    const t2 = setTimeout(() => {
      measureTarget();
    }, 380);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [productTourOpen, currentStepIndex, step?.stageId, step?.target, measureTarget, setStage]);

  // Window resize & scroll listeners to keep spotlight aligned
  useEffect(() => {
    if (!productTourOpen) return;
    const handleUpdate = () => measureTarget();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [productTourOpen, measureTarget]);

  // Auto-play timer loop
  useEffect(() => {
    if (!productTourOpen || !isPlayingAuto) {
      setAutoPlayCountdown(7);
      return;
    }

    const interval = setInterval(() => {
      setAutoPlayCountdown((prev) => {
        if (prev <= 1) {
          if (isLast) {
            setIsPlayingAuto(false);
            return 7;
          }
          setCurrentStepIndex((idx) => idx + 1);
          return 7;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [productTourOpen, isPlayingAuto, isLast]);

  // Keyboard navigation
  useEffect(() => {
    if (!productTourOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
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

  if (!productTourOpen) return null;

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('vf_tour_completed', 'true');
    }
    setIsPlayingAuto(false);
    setProductTourOpen(false);
  };

  const handleNext = () => {
    setAutoPlayCountdown(7);
    if (isLast) {
      localStorage.setItem('vf_tour_completed', 'true');
      handleClose();
      addNotification({
        type: 'success',
        title: 'Interactive Tour Completed!',
        message: 'You have explored all 14 VisionForge industrial CV stations.',
      });
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setAutoPlayCountdown(7);
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleStepClick = (index: number) => {
    setAutoPlayCountdown(7);
    setCurrentStepIndex(index);
  };

  // Compute popover card position relative to targetRect
  const getTooltipPositionStyle = (): React.CSSProperties => {
    if (!targetRect || typeof window === 'undefined') {
      return {
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(560px, calc(100vw - 32px))',
        maxHeight: 'calc(100vh - 48px)',
        zIndex: 55,
      };
    }

    const padding = 16;
    const cardWidth = Math.min(560, window.innerWidth - 32);
    const cardHeightEstimate = 480;

    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const spaceRight = window.innerWidth - targetRect.right;
    const spaceLeft = targetRect.left;

    let top = 0;
    let left = 0;

    // Decide if below, above, or beside
    if (spaceBelow >= 360) {
      top = targetRect.bottom + padding;
      left = Math.max(padding, Math.min(targetRect.left, window.innerWidth - cardWidth - padding));
    } else if (spaceAbove >= 360) {
      top = Math.max(padding, targetRect.top - cardHeightEstimate - padding);
      left = Math.max(padding, Math.min(targetRect.left, window.innerWidth - cardWidth - padding));
    } else if (spaceRight >= cardWidth + padding) {
      top = Math.max(padding, Math.min(targetRect.top, window.innerHeight - cardHeightEstimate - padding));
      left = targetRect.right + padding;
    } else if (spaceLeft >= cardWidth + padding) {
      top = Math.max(padding, Math.min(targetRect.top, window.innerHeight - cardHeightEstimate - padding));
      left = targetRect.left - cardWidth - padding;
    } else {
      top = Math.max(padding, window.innerHeight - cardHeightEstimate - padding);
      left = Math.max(padding, (window.innerWidth - cardWidth) / 2);
    }

    top = Math.max(padding, Math.min(top, window.innerHeight - 300));
    left = Math.max(padding, Math.min(left, window.innerWidth - cardWidth - padding));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
      maxHeight: `calc(100vh - ${top + padding}px)`,
      zIndex: 55,
    };
  };

  // Minimized Floating Pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-bounce-subtle">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/95 dark:bg-[#121826]/95 backdrop-blur-2xl border border-[#e5e5ea] dark:border-white/10 shadow-2xl hover:scale-105 active:scale-95 transition-all group cursor-pointer"
        >
          <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${step.accentColor} flex items-center justify-center text-white shadow-md`}>
            <step.icon className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              Interactive Tour &bull; Step {step.id}/{TOUR_STEPS.length}
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-[#0071e3] transition-colors">
              {step.badge} (Resume)
            </span>
          </div>
          <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white ml-1 transition-colors" />
        </button>
      </div>
    );
  }

  // SPOTLIGHT DYNAMIC ANCHORED HUD MODE
  if (tourMode === 'spotlight') {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Fullscreen SVG Spotlight Cutout Mask */}
        <svg className="fixed inset-0 w-full h-full pointer-events-none z-40 transition-all duration-300">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={Math.max(0, targetRect.left - 6)}
                  y={Math.max(0, targetRect.top - 6)}
                  width={targetRect.width + 12}
                  height={targetRect.height + 12}
                  rx="18"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.65)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>

        {/* Target Glowing Halo & Pulsing Beacon */}
        {targetRect && (
          <div
            style={{
              top: `${Math.max(0, targetRect.top - 6)}px`,
              left: `${Math.max(0, targetRect.left - 6)}px`,
              width: `${targetRect.width + 12}px`,
              height: `${targetRect.height + 12}px`,
            }}
            className="fixed z-40 pointer-events-none rounded-[18px] border-2 border-[#0071e3] shadow-[0_0_30px_rgba(0,113,227,0.5)] ring-4 ring-[#0071e3]/20 transition-all duration-300"
          >
            <div className="absolute -top-3 -right-3 flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-[#0071e3] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#0071e3] border-2 border-white shadow-md"></span>
            </div>
          </div>
        )}

        {/* Anchored Enterprise Guidance Popover Card */}
        <div
          style={getTooltipPositionStyle()}
          className="pointer-events-auto bg-white/95 dark:bg-[#0c121e]/95 backdrop-blur-2xl border border-[#e5e5ea] dark:border-white/15 rounded-[28px] shadow-2xl shadow-black/30 overflow-hidden flex flex-col transition-all duration-300 animate-slide-up"
        >
          {/* Header Bar */}
          <div className="px-5 py-3 border-b border-[#e5e5ea] dark:border-white/[0.08] flex items-center justify-between gap-3 bg-[#f6f3f5] dark:bg-white/[0.02]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${step.accentColor} flex items-center justify-center text-white shadow-sm shrink-0`}>
                <step.icon className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Stage {step.id} of {TOUR_STEPS.length}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                    SPOTLIGHT ACTIVE
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[#1d1d1f] dark:text-white truncate">
                  {step.title}
                </h3>
              </div>
            </div>

            {/* Quick Action Tools */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Auto-Play Toggle */}
              <button
                onClick={() => setIsPlayingAuto(!isPlayingAuto)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  isPlayingAuto
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                    : 'bg-white dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-[#e5e5ea] dark:border-transparent'
                }`}
                title="Toggle Auto-Play Walkthrough (Space)"
              >
                {isPlayingAuto ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span className="hidden sm:inline">{isPlayingAuto ? `${autoPlayCountdown}s` : 'Auto'}</span>
              </button>

              {/* Blueprint Mode Switcher */}
              <button
                onClick={() => setTourMode('blueprint')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-300 border border-[#0071e3]/20 text-[11px] font-medium hover:bg-[#0071e3]/20 transition-colors cursor-pointer"
                title="Switch to Blueprint Architecture View"
              >
                <Layers className="w-3 h-3" />
                <span className="hidden md:inline">Blueprint</span>
              </button>

              {/* Minimize to live interact */}
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                title="Minimize Tour (Interact with live UI)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>

              {/* Close Tour */}
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                title="Exit Tour (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content - Scrollable if compact */}
          <div className="p-5 space-y-3.5 overflow-y-auto text-xs leading-relaxed">
            {/* WHERE IT IS LOCATED */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-500/20 text-[#1d1d1f] dark:text-blue-200">
              <MapPin className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0071e3] block mb-0.5">
                  📍 Where It Is Located
                </span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{step.whereLocated}</span>
              </div>
            </div>

            {/* WHAT IT DOES */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                ⚙️ What It Does
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {step.whatItDoes}
              </p>
            </div>

            {/* HOW IT WORKS (Sequential Step-by-Step Flow) */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>🔄 How It Works (Industrial Pipeline Flow)</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {step.howItWorks.map((hw, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2 rounded-xl bg-[#f6f3f5] dark:bg-white/[0.03] border border-[#e5e5ea] dark:border-white/[0.06]"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#0071e3] text-white flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5 shadow-xs">
                      {hw.stepNumber}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-[#1d1d1f] dark:text-white leading-tight">
                        {hw.title}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                        {hw.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* INTERACTIVE ACTION TIP */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 min-w-0">
                <MousePointer className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                <span className="truncate">
                  <strong className="text-amber-700 dark:text-amber-300">Live Test:</strong> {step.interactiveTip}
                </span>
              </div>
              <button
                onClick={() => setIsMinimized(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 font-semibold text-[10px] shrink-0 ml-2 transition-colors cursor-pointer"
              >
                Test Now
              </button>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="px-5 py-3 bg-[#f6f3f5]/80 dark:bg-white/[0.02] border-t border-[#e5e5ea] dark:border-white/[0.08] flex items-center justify-between gap-3">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[180px] sm:max-w-none pr-1">
              {TOUR_STEPS.map((s, idx) => {
                const isActive = idx === currentStepIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => handleStepClick(idx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'w-6 bg-[#0071e3] shadow-xs'
                        : 'w-2 bg-slate-300 dark:bg-white/20 hover:bg-slate-400'
                    }`}
                    title={`Stage ${idx + 1}: ${s.badge}`}
                  />
                );
              })}
            </div>

            {/* Previous / Next Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePrev}
                disabled={isFirst}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isFirst
                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.08] active:scale-95'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-md shadow-[#0071e3]/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <span>{isLast ? 'Complete Tour' : 'Next Stage'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ARCHITECTURAL BLUEPRINT 2-COLUMN VIEW
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-[#121826]/95 backdrop-blur-2xl border border-[#e5e5ea] dark:border-white/10 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col max-h-[92vh] transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5ea] dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${step.accentColor} flex items-center justify-center text-white shadow-sm`}>
              <step.icon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Architectural Blueprint &bull; Stage {step.id} of {TOUR_STEPS.length}
              </span>
              <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {step.badge}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTourMode('spotlight')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#0071e3]/10 hover:bg-[#0071e3]/20 text-xs font-semibold text-[#0071e3] transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Live Spotlight Mode</span>
            </button>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
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
            <div className="relative h-full flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-950 to-blue-950/40 border border-white/[0.08] text-white overflow-hidden shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#0071e3] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0071e3]" />
                  <span>{step.locationName}</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  VERIFIED
                </span>
              </div>

              <div className="my-4 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Operational Step Progression
                </div>
                {step.howItWorks.map((hw, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
                    <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] flex items-center justify-center font-bold">
                        {hw.stepNumber}
                      </span>
                      <span>{hw.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">{hw.description}</div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Hardware Target: Nvidia Jetson Orin AGX</span>
                <span className="text-emerald-400">60 FPS Rigid</span>
              </div>
            </div>
          </div>

          {/* Right Column: Explanatory Content & Feature Highlights */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f6f3f5] dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-[#e5e5ea] dark:border-white/[0.08]">
                <MapPin className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>{step.whereLocated}</span>
              </div>

              <h1 id="tour-title" className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                {step.title}
              </h1>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {step.whatItDoes}
              </p>

              <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-500/20 text-xs text-[#0071e3]">
                <strong>Interactive Recommendation:</strong> {step.interactiveTip}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setStage(step.stageId);
                  setTourMode('spotlight');
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-md shadow-[#0071e3]/20 transition-all cursor-pointer"
              >
                <span>Switch to Live Spotlight on Screen</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#f6f3f5] dark:bg-white/[0.02] border-t border-[#e5e5ea] dark:border-white/[0.06] flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-[#0071e3] focus:ring-0 cursor-pointer"
            />
            <span>Don't show tour on startup</span>
          </label>

          <div className="flex items-center gap-2">
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
