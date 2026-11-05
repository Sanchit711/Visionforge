import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  Square,
  Pentagon,
  Hand,
  MousePointer,
  Undo2,
  Redo2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bot,
  Layers,
  CheckCircle2,
  XCircle,
  Wand2,
  Loader2,
  Crosshair,
  Copy,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  RotateCcw,
  Download,
  AlertTriangle,
  Move,
  CornerUpRight,
  Sliders,
  Check,
  X,
  Filter,
  ShieldCheck,
  Lock,
  Zap,
  GitCommit,
  Waypoints,
} from 'lucide-react';
import { isReadOnlyRole } from '../utils/rbac';

export const AnnotationView: React.FC = () => {
  const { activeProjectId, activeProject, addNotification, currentUser } = useAppStore();
  const isReadOnly = isReadOnlyRole(currentUser?.role);

  const [frames, setFrames] = useState<any[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Canvas tool state
  const [tool, setTool] = useState<'bbox' | 'polygon' | 'sam_point' | 'sam_box' | 'select' | 'pan'>('bbox');
  const [activeClassId, setActiveClassId] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Drawing & Selection state
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<number[][]>([]);
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);

  // Precision Manual Tweaking & 8-Handle Drag State
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStartMouse, setDragStartMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStartBox, setDragStartBox] = useState<number[] | null>(null);
  const [showCrosshairs, setShowCrosshairs] = useState(false);
  const [cursorNormPos, setCursorNormPos] = useState<{ x: number; y: number } | null>(null);
  const [nudgeCoarse, setNudgeCoarse] = useState(false); // false = 0.2% (fine), true = 1.0% (coarse)

  // Conveyor Belt ROI Corridor & Confidence Filtering
  const [showConveyorRoi, setShowConveyorRoi] = useState(false);
  const [filterOutsideRoi, setFilterOutsideRoi] = useState(false);
  const [minConfidenceFilter, setMinConfidenceFilter] = useState(0.25);
  const [conveyorRoiPolygon] = useState<number[][]>([
    [0.05, 0.22],
    [0.95, 0.18],
    [0.98, 0.88],
    [0.02, 0.92],
  ]);

  const isInsideRoi = useCallback(
    (x: number, y: number, w: number, h: number) => {
      const cx = x + w / 2;
      const cy = y + h / 2;
      let inside = false;
      const pts = conveyorRoiPolygon;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i][0];
        const yi = pts[i][1];
        const xj = pts[j][0];
        const yj = pts[j][1];
        const intersect = yi > cy !== yj > cy && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    },
    [conveyorRoiPolygon]
  );

  // Undo / Redo history
  const [history, setHistory] = useState<any[][]>([]);
  const [historyStep, setHistoryStep] = useState(0);

  // Confirmation Modals
  const [showClearProjectModal, setShowClearProjectModal] = useState(false);

  // AI Assist & Engine State
  const [aiProvider, setAiProvider] = useState<'florence2' | 'sam2' | 'ultralytics_yolo'>('florence2');
  const [aiModel, setAiModel] = useState('sam2.1_t.pt');
  const [aiConfidence, setAiConfidence] = useState(0.25);
  const [runningAi, setRunningAi] = useState(false);
  const [propagating, setPropagating] = useState(false);

  // Unified Model Catalog
  const [modelCatalog, setModelCatalog] = useState<any[]>([]);
  const [selectedFlorenceModel, setSelectedFlorenceModel] = useState('microsoft/Florence-2-base');
  const [florencePrompt, setFlorencePrompt] = useState('package on conveyor');
  const [florenceOutputType, setFlorenceOutputType] = useState<'bbox' | 'polygon' | 'both'>('bbox');
  const [florenceRefineWithSam, setFlorenceRefineWithSam] = useState<boolean>(true);
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  // SAM 2 Models
  const [samModels, setSamModels] = useState<any[]>([]);
  const [selectedSamModel, setSelectedSamModel] = useState('sam2.1_t.pt');
  const [downloadingSam, setDownloadingSam] = useState(false);
  const [segmentingSam, setSegmentingSam] = useState(false);

  // Video Tracking & Keyframe Interpolation
  const [videoTrackingTab, setVideoTrackingTab] = useState<'interpolator' | 'sam_tracker'>('interpolator');
  const [anchorA, setAnchorA] = useState<any | null>(null);
  const [anchorB, setAnchorB] = useState<any | null>(null);
  const [interpMode, setInterpMode] = useState<'linear' | 'spline'>('linear');
  const [lockDimensions, setLockDimensions] = useState(true);
  const [isInterpolating, setIsInterpolating] = useState(false);
  const [interpolationResult, setInterpolationResult] = useState<any | null>(null);

  const [trackDirection, setTrackDirection] = useState<'forward' | 'all' | 'next_10' | 'next_30' | 'backward'>('forward');
  const [trackOutputType, setTrackOutputType] = useState<'bbox' | 'polygon' | 'both'>('bbox');
  const [trackerEngine, setTrackerEngine] = useState<'optical_flow' | 'tracker_mil'>('optical_flow');
  const [isTracking, setIsTracking] = useState(false);
  const [trackingProgress, setTrackingProgress] = useState<number | null>(null);
  const [trackingMessage, setTrackingMessage] = useState<string>('');
  const [reviewing, setReviewing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const classes = activeProject?.classes || [
    { id: 0, name: 'package', color: '#0071e3', hotkey: '1' },
    { id: 1, name: 'conveyor', color: '#34c759', hotkey: '2' },
    { id: 2, name: 'worker', color: '#ff9f0a', hotkey: '3' },
  ];

  const currentFrame = frames[currentFrameIndex] || null;
  const activeClass = classes.find((c: any) => c.id === activeClassId) || classes[0];

  const roundCoord = (val: number) => Math.round(val * 10000) / 10000;

  // Load frames
  useEffect(() => {
    if (!activeProjectId) return;
    setLoading(true);
    api
      .getFrames(activeProjectId, 0, 5000)
      .then((fList) => {
        setFrames(fList);
        setCurrentFrameIndex(0);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [activeProjectId]);

  // Load annotations when current frame changes
  useEffect(() => {
    if (!currentFrame) {
      setAnnotations([]);
      setSelectedAnnId(null);
      return;
    }
    setSelectedAnnId(null);
    api
      .getAnnotations(currentFrame.id)
      .then((anns) => {
        setAnnotations(anns);
        setHistory([anns]);
        setHistoryStep(0);
      })
      .catch((err) => console.error(err));
  }, [currentFrame?.id]);

  const pushHistory = (newAnns: any[]) => {
    const updated = history.slice(0, historyStep + 1);
    updated.push(newAnns);
    setHistory(updated);
    setHistoryStep(updated.length - 1);
    setAnnotations(newAnns);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setAnnotations(history[historyStep - 1]);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setAnnotations(history[historyStep + 1]);
    }
  };

  // Load Model Catalogs
  const loadModelCatalog = useCallback(() => {
    api
      .getModelCatalog()
      .then((cat) => setModelCatalog(cat))
      .catch((err) => console.error('Failed to load model catalog:', err));
  }, []);

  const loadSamModels = useCallback(() => {
    api
      .getSamModels()
      .then((m) => {
        setSamModels(m);
        const downloaded = m.find((x: any) => x.is_downloaded);
        if (downloaded) setSelectedSamModel(downloaded.file_name);
      })
      .catch((err) => console.error('Failed to load SAM models:', err));
  }, []);

  useEffect(() => {
    loadModelCatalog();
    loadSamModels();
  }, [loadModelCatalog, loadSamModels]);

  // Normalized coordinate helper
  const getNormalizedPoint = useCallback((e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x: roundCoord(x), y: roundCoord(y) };
  }, []);

  // Universal Cancel / Escape Function
  const handleUniversalCancel = useCallback(() => {
    setSelectedAnnId(null);
    setCurrentBox(null);
    setDrawingStart(null);
    setIsDraggingBox(false);
    setResizeHandle(null);
    setDragStartBox(null);
    setPolygonPoints([]);
    setIsPanning(false);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Escape key cancels all interactions unconditionally
      if (e.key === 'Escape') {
        e.preventDefault();
        handleUniversalCancel();
        return;
      }

      // Tool Switching
      if (e.key === 'b' || e.key === 'B') { setTool('bbox'); setSelectedAnnId(null); return; }
      if (e.key === 'p' || e.key === 'P') { setTool('polygon'); setSelectedAnnId(null); return; }
      if (e.key === 's' || e.key === 'S') { setTool('sam_point'); setSelectedAnnId(null); return; }
      if (e.key === 'x' || e.key === 'X') { setTool('sam_box'); setSelectedAnnId(null); return; }
      if (e.key === 'v' || e.key === 'V') { setTool('select'); return; }
      if (e.key === 'h' || e.key === 'H') { setTool('pan'); return; }
      if (e.key === 'c' || e.key === 'C') { setShowCrosshairs((prev) => !prev); return; }

      // Frame Review shortcuts
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); handleReviewFrame('approved'); return; }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); handleReviewFrame('rejected'); return; }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      // Selected annotation nudging and precision adjustments
      if (selectedAnnId) {
        const step = nudgeCoarse ? (e.shiftKey ? 0.05 : 0.01) : (e.shiftKey ? 0.01 : 0.002);

        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          handleDeleteAnnotation(selectedAnnId);
          return;
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
          e.preventDefault();
          handleDuplicateToNextFrame();
          return;
        }

        if (e.altKey) {
          if (e.key === 'ArrowUp') { e.preventDefault(); handleResizeBox(0, -step); return; }
          if (e.key === 'ArrowDown') { e.preventDefault(); handleResizeBox(0, step); return; }
          if (e.key === 'ArrowLeft') { e.preventDefault(); handleResizeBox(-step, 0); return; }
          if (e.key === 'ArrowRight') { e.preventDefault(); handleResizeBox(step, 0); return; }
        } else {
          if (e.key === 'ArrowUp') { e.preventDefault(); handleNudge(0, -step); return; }
          if (e.key === 'ArrowDown') { e.preventDefault(); handleNudge(0, step); return; }
          if (e.key === 'ArrowLeft') { e.preventDefault(); handleNudge(-step, 0); return; }
          if (e.key === 'ArrowRight') { e.preventDefault(); handleNudge(step, 0); return; }
        }
      } else {
        // Frame navigation when no box is actively selected
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
          if (currentFrameIndex > 0) setCurrentFrameIndex((prev) => prev - 1);
        }
        if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
          if (currentFrameIndex < frames.length - 1) setCurrentFrameIndex((prev) => prev + 1);
        }
      }

      // Class hotkeys 1-9
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= classes.length) {
        setActiveClassId(classes[num - 1].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnId, currentFrameIndex, frames.length, classes, historyStep, history, nudgeCoarse, handleUniversalCancel]);

  // Global Mouse Up Listener to catch drags ending outside container
  useEffect(() => {
    const handleGlobalMouseUp = async () => {
      if (isDraggingBox || resizeHandle) {
        setIsDraggingBox(false);
        setResizeHandle(null);
        setDragStartBox(null);
        if (selectedAnnId) {
          const ann = annotations.find((a) => a.id === selectedAnnId);
          if (ann) {
            try {
              await api.updateAnnotation(ann.id, { coordinates: ann.coordinates });
              pushHistory(annotations);
            } catch (err) {
              console.error('Failed to sync updated box coordinates:', err);
            }
          }
        }
      }
      if (isPanning) {
        setIsPanning(false);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDraggingBox, resizeHandle, selectedAnnId, annotations, isPanning]);

  // Precision Nudge selected box position
  const handleNudge = async (dx: number, dy: number) => {
    if (!selectedAnnId) return;
    const ann = annotations.find((a) => a.id === selectedAnnId);
    if (!ann || ann.annotation_type !== 'bbox') return;
    const [x, y, w, h] = ann.coordinates;
    const newX = Math.max(0, Math.min(1 - w, roundCoord(x + dx)));
    const newY = Math.max(0, Math.min(1 - h, roundCoord(y + dy)));
    const updatedCoords = [newX, newY, w, h];

    const next = annotations.map((a) => (a.id === ann.id ? { ...a, coordinates: updatedCoords } : a));
    setAnnotations(next);
    try {
      await api.updateAnnotation(ann.id, { coordinates: updatedCoords });
    } catch (e) {
      console.error(e);
    }
  };

  // Precision Resize selected box dimensions
  const handleResizeBox = async (dw: number, dh: number) => {
    if (!selectedAnnId) return;
    const ann = annotations.find((a) => a.id === selectedAnnId);
    if (!ann || ann.annotation_type !== 'bbox') return;
    const [x, y, w, h] = ann.coordinates;
    const newW = Math.max(0.005, Math.min(1 - x, roundCoord(w + dw)));
    const newH = Math.max(0.005, Math.min(1 - y, roundCoord(h + dh)));
    const updatedCoords = [x, y, newW, newH];

    const next = annotations.map((a) => (a.id === ann.id ? { ...a, coordinates: updatedCoords } : a));
    setAnnotations(next);
    try {
      await api.updateAnnotation(ann.id, { coordinates: updatedCoords });
    } catch (e) {
      console.error(e);
    }
  };

  // Scale selected box percentage
  const handleScaleBox = async (factor: number) => {
    if (!selectedAnnId) return;
    const ann = annotations.find((a) => a.id === selectedAnnId);
    if (!ann || ann.annotation_type !== 'bbox') return;
    const [x, y, w, h] = ann.coordinates;
    const nw = Math.max(0.005, Math.min(1, roundCoord(w * factor)));
    const nh = Math.max(0.005, Math.min(1, roundCoord(h * factor)));
    const cx = x + w / 2;
    const cy = y + h / 2;
    const nx = Math.max(0, Math.min(1 - nw, roundCoord(cx - nw / 2)));
    const ny = Math.max(0, Math.min(1 - nh, roundCoord(cy - nh / 2)));
    const updatedCoords = [nx, ny, nw, nh];

    const next = annotations.map((a) => (a.id === ann.id ? { ...a, coordinates: updatedCoords } : a));
    pushHistory(next);
    try {
      await api.updateAnnotation(ann.id, { coordinates: updatedCoords });
    } catch (e) {
      console.error(e);
    }
  };

  // Duplicate to Next Frame
  const handleDuplicateToNextFrame = async () => {
    if (!selectedAnnId || currentFrameIndex >= frames.length - 1) return;
    const ann = annotations.find((a) => a.id === selectedAnnId);
    if (!ann) return;
    const nextFrame = frames[currentFrameIndex + 1];
    try {
      await api.createAnnotation({
        frame_id: nextFrame.id,
        class_id: ann.class_id,
        class_name: ann.class_name,
        annotation_type: ann.annotation_type,
        coordinates: ann.coordinates,
        confidence: ann.confidence,
        source: 'manual_cloned',
        is_reviewed: true,
      });
      addNotification({
        type: 'success',
        title: 'Cloned to Next Frame',
        message: `Annotation copied to Frame ${currentFrameIndex + 2}.`,
      });
      setCurrentFrameIndex((prev) => prev + 1);
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Clone Failed', message: err.message });
    }
  };

  // Canvas Mouse Down
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Middle click or Pan tool: start pan
    if (e.button === 1 || tool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    // Left click on empty canvas when a box was selected: deselect first
    if (selectedAnnId !== null) {
      setSelectedAnnId(null);
      setDrawingStart(null);
      setCurrentBox(null);
      return;
    }

    if (tool === 'select') {
      // Nothing selected, just neutral
      return;
    }

    if (tool === 'sam_point') {
      const pt = getNormalizedPoint(e);
      handleSamPointClick(pt.x, pt.y);
      return;
    }

    if (tool === 'bbox' || tool === 'sam_box') {
      const pt = getNormalizedPoint(e);
      setDrawingStart(pt);
      setCurrentBox({ x: pt.x, y: pt.y, w: 0, h: 0 });
    } else if (tool === 'polygon') {
      const pt = getNormalizedPoint(e);
      setPolygonPoints((prev) => [...prev, [pt.x, pt.y]]);
    }
  };

  // Canvas Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const normPt = getNormalizedPoint(e);
    setCursorNormPos(normPt);

    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    // Drag-to-Move active box
    if (isDraggingBox && dragStartBox && selectedAnnId && imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const dx = (e.clientX - dragStartMouse.x) / rect.width;
      const dy = (e.clientY - dragStartMouse.y) / rect.height;
      const bw = dragStartBox[2];
      const bh = dragStartBox[3];
      const newX = Math.max(0, Math.min(1 - bw, roundCoord(dragStartBox[0] + dx)));
      const newY = Math.max(0, Math.min(1 - bh, roundCoord(dragStartBox[1] + dy)));
      const updated = [newX, newY, bw, bh];
      setAnnotations((prev) => prev.map((a) => (a.id === selectedAnnId ? { ...a, coordinates: updated } : a)));
      return;
    }

    // 8-Handle Resizing
    if (resizeHandle && dragStartBox && selectedAnnId && imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const dx = (e.clientX - dragStartMouse.x) / rect.width;
      const dy = (e.clientY - dragStartMouse.y) / rect.height;
      let [x, y, w, h] = dragStartBox;

      if (resizeHandle.includes('e')) w = Math.max(0.005, Math.min(1 - x, roundCoord(dragStartBox[2] + dx)));
      if (resizeHandle.includes('s')) h = Math.max(0.005, Math.min(1 - y, roundCoord(dragStartBox[3] + dy)));
      if (resizeHandle.includes('w')) {
        const potentialX = roundCoord(dragStartBox[0] + dx);
        const potentialW = roundCoord(dragStartBox[2] - dx);
        if (potentialW >= 0.005 && potentialX >= 0) {
          x = potentialX;
          w = potentialW;
        }
      }
      if (resizeHandle.includes('n')) {
        const potentialY = roundCoord(dragStartBox[1] + dy);
        const potentialH = roundCoord(dragStartBox[3] - dy);
        if (potentialH >= 0.005 && potentialY >= 0) {
          y = potentialY;
          h = potentialH;
        }
      }

      const updated = [x, y, w, h];
      setAnnotations((prev) => prev.map((a) => (a.id === selectedAnnId ? { ...a, coordinates: updated } : a)));
      return;
    }

    // Drawing box in progress
    if ((tool === 'bbox' || tool === 'sam_box') && drawingStart) {
      const pt = getNormalizedPoint(e);
      const x = Math.min(drawingStart.x, pt.x);
      const y = Math.min(drawingStart.y, pt.y);
      const w = Math.abs(pt.x - drawingStart.x);
      const h = Math.abs(pt.y - drawingStart.y);
      setCurrentBox({ x, y, w, h });
    }
  };

  // Canvas Mouse Up
  const handleMouseUp = async () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDraggingBox || resizeHandle) {
      setIsDraggingBox(false);
      setResizeHandle(null);
      setDragStartBox(null);
      if (selectedAnnId) {
        const ann = annotations.find((a) => a.id === selectedAnnId);
        if (ann) {
          try {
            await api.updateAnnotation(ann.id, { coordinates: ann.coordinates });
            pushHistory(annotations);
          } catch (e) {
            console.error(e);
          }
        }
      }
      return;
    }

    // Handle SAM Box Completion
    if (tool === 'sam_box' && drawingStart && currentBox) {
      const boxToSegment = { ...currentBox };
      setDrawingStart(null);
      setCurrentBox(null);
      if (boxToSegment.w > 0.01 && boxToSegment.h > 0.01) {
        handleSamBoxComplete(boxToSegment);
      }
      return;
    }

    // Handle Bounding Box Completion
    if (tool === 'bbox' && drawingStart && currentBox) {
      const boxToSave = { ...currentBox };
      setDrawingStart(null);
      setCurrentBox(null);

      if (boxToSave.w > 0.01 && boxToSave.h > 0.01 && currentFrame) {
        const newAnn = {
          frame_id: currentFrame.id,
          class_id: activeClass.id,
          class_name: activeClass.name,
          annotation_type: 'bbox',
          coordinates: [boxToSave.x, boxToSave.y, boxToSave.w, boxToSave.h],
          confidence: 1.0,
          source: 'manual',
          is_reviewed: true,
        };

        try {
          const saved = await api.createAnnotation(newAnn);
          pushHistory([...annotations, saved]);
          setSelectedAnnId(saved.id);
        } catch (err: any) {
          addNotification({ type: 'error', title: 'Save failed', message: err.message });
        }
      }
      return;
    }

    // Clean any dangling box state unconditionally
    setDrawingStart(null);
    setCurrentBox(null);
  };

  // Close Polygon
  const handleFinishPolygon = async () => {
    if (polygonPoints.length < 3 || !currentFrame) return;

    const newAnn = {
      frame_id: currentFrame.id,
      class_id: activeClass.id,
      class_name: activeClass.name,
      annotation_type: 'polygon',
      coordinates: polygonPoints,
      confidence: 1.0,
      source: 'manual',
      is_reviewed: true,
    };

    try {
      const saved = await api.createAnnotation(newAnn);
      pushHistory([...annotations, saved]);
      setSelectedAnnId(saved.id);
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Polygon save failed', message: err.message });
    }

    setPolygonPoints([]);
  };

  // Interactive SAM 2 Point Click
  const handleSamPointClick = async (normX: number, normY: number) => {
    if (!currentFrame) return;
    setSegmentingSam(true);
    try {
      const res = await api.samSegment({
        frame_id: currentFrame.id,
        model_name: selectedSamModel,
        point_prompts: [[normX, normY]],
        point_labels: [1],
        class_id: activeClass.id,
        class_name: activeClass.name,
      });

      if (res.predictions && res.predictions.length > 0) {
        const pred = res.predictions[0];
        const saved = await api.createAnnotation({
          frame_id: currentFrame.id,
          class_id: activeClass.id,
          class_name: activeClass.name,
          annotation_type: 'polygon',
          coordinates: pred.coordinates,
          confidence: pred.confidence,
          source: 'sam2_assisted',
          is_reviewed: false,
        });
        pushHistory([...annotations, saved]);
        setSelectedAnnId(saved.id);
        addNotification({
          type: 'success',
          title: 'SAM 2 Segmented',
          message: `Generated mask for '${activeClass.name}'.`,
        });
      } else {
        addNotification({
          type: 'info',
          title: 'SAM 2 Notice',
          message: 'No boundary found at clicked point. Try clicking closer to object center.',
        });
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'SAM 2 Failed', message: err.message });
    } finally {
      setSegmentingSam(false);
    }
  };

  // Interactive SAM 2 Box Prompt Complete
  const handleSamBoxComplete = async (box: { x: number; y: number; w: number; h: number }) => {
    if (!currentFrame) return;
    setSegmentingSam(true);
    try {
      const res = await api.samSegment({
        frame_id: currentFrame.id,
        model_name: selectedSamModel,
        box_prompt: [box.x, box.y, box.w, box.h],
        class_id: activeClass.id,
        class_name: activeClass.name,
      });

      if (res.predictions && res.predictions.length > 0) {
        const pred = res.predictions[0];
        const isBboxOutput = trackOutputType === 'bbox';
        let finalType: 'bbox' | 'polygon' = isBboxOutput ? 'bbox' : 'polygon';
        let finalCoords: any = pred.coordinates;

        if (isBboxOutput) {
          if (Array.isArray(pred.coordinates) && pred.coordinates.length >= 3) {
            const xs = pred.coordinates.map((p: any) => p[0]);
            const ys = pred.coordinates.map((p: any) => p[1]);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            finalCoords = [
              Number(minX.toFixed(4)),
              Number(minY.toFixed(4)),
              Number((maxX - minX).toFixed(4)),
              Number((maxY - minY).toFixed(4)),
            ];
          } else {
            finalCoords = [box.x, box.y, box.w, box.h];
          }
        }

        const saved = await api.createAnnotation({
          frame_id: currentFrame.id,
          class_id: activeClass.id,
          class_name: activeClass.name,
          annotation_type: finalType,
          coordinates: finalCoords,
          confidence: pred.confidence,
          source: 'sam2_assisted',
          is_reviewed: false,
        });

        pushHistory([...annotations, saved]);
        setSelectedAnnId(saved.id);
        addNotification({
          type: 'success',
          title: isBboxOutput ? 'SAM 2 Tight Bounding Box' : 'SAM 2 Box Segmented',
          message: isBboxOutput
            ? `Generated tight YOLO box for '${activeClass.name}'.`
            : `Fitted exact boundary for '${activeClass.name}'.`,
        });
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'SAM 2 Failed', message: err.message });
    } finally {
      setSegmentingSam(false);
    }
  };

  // Review Frame (Approve / Reject)
  const handleReviewFrame = async (newStatus: 'approved' | 'rejected') => {
    if (!currentFrame || reviewing) return;
    setReviewing(true);
    try {
      await api.reviewFrame(currentFrame.id, newStatus);

      setFrames((prev) =>
        prev.map((f) => (f.id === currentFrame.id ? { ...f, status: newStatus } : f))
      );

      setAnnotations((prev) =>
        prev.map((a) => ({ ...a, is_reviewed: newStatus === 'approved' }))
      );

      addNotification({
        type: newStatus === 'approved' ? 'success' : 'info',
        title: newStatus === 'approved' ? 'Frame Approved' : 'Frame Rejected',
        message: `Frame ${currentFrameIndex + 1} marked as ${newStatus}.`,
      });

      if (currentFrameIndex < frames.length - 1) {
        setTimeout(() => {
          setCurrentFrameIndex((prev) => Math.min(frames.length - 1, prev + 1));
        }, 180);
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Review failed',
        message: err.message || 'Could not update review status',
      });
    } finally {
      setReviewing(false);
    }
  };

  // Delete single annotation
  const handleDeleteAnnotation = async (annId: string) => {
    try {
      await api.deleteAnnotation(annId);
      const next = annotations.filter((a) => a.id !== annId);
      pushHistory(next);
      if (selectedAnnId === annId) setSelectedAnnId(null);
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Delete failed', message: err.message });
    }
  };

  // Clear all annotations on current frame
  const handleClearFrameAnnotations = async () => {
    if (!currentFrame) return;
    try {
      await api.clearFrameAnnotations(currentFrame.id);
      setAnnotations([]);
      pushHistory([]);
      setSelectedAnnId(null);
      addNotification({
        type: 'info',
        title: 'Frame Cleared',
        message: `Removed all annotations from Frame ${currentFrameIndex + 1}.`,
      });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Clear Frame Failed', message: err.message });
    }
  };

  // Wipe All Annotations in Project
  const handleWipeAllProjectAnnotations = async () => {
    if (!activeProjectId) return;
    try {
      const res = await api.clearAllProjectAnnotations(activeProjectId);
      setAnnotations([]);
      setHistory([[]]);
      setHistoryStep(0);
      setSelectedAnnId(null);
      setFrames((prev) => prev.map((f) => ({ ...f, status: 'unreviewed' })));
      setShowClearProjectModal(false);
      addNotification({
        type: 'success',
        title: 'Project Annotations Wiped',
        message: res.message || 'All annotations across all frames have been completely cleared.',
      });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Project Wipe Failed', message: err.message });
    }
  };

  // Convert Polygon to YOLO Bounding Box
  const handleConvertPolyToBbox = async (ann: any) => {
    if (!Array.isArray(ann.coordinates) || ann.coordinates.length < 3) return;
    const xs = ann.coordinates.map((p: any) => p[0]);
    const ys = ann.coordinates.map((p: any) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const bbox = [
      Number(minX.toFixed(4)),
      Number(minY.toFixed(4)),
      Number((maxX - minX).toFixed(4)),
      Number((maxY - minY).toFixed(4)),
    ];
    try {
      const updated = await api.updateAnnotation(ann.id, {
        annotation_type: 'bbox',
        coordinates: bbox,
      });
      const next = annotations.map((a) => (a.id === ann.id ? updated : a));
      pushHistory(next);
      addNotification({
        type: 'success',
        title: 'Converted to BBox',
        message: 'Successfully converted polygon boundary to rectangular YOLO bounding box.',
      });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Conversion failed', message: err.message });
    }
  };

  // Sub-pixel SAM 2 Edge Snapping
  const handleSnapBBoxWithSam = async () => {
    if (!currentFrame || !selectedAnnId) return;
    const ann = annotations.find((a) => a.id === selectedAnnId);
    if (!ann) return;

    let box = null;
    if (ann.annotation_type === 'bbox' && ann.coordinates.length === 4) {
      box = ann.coordinates;
    } else if (ann.annotation_type === 'polygon' && ann.coordinates.length >= 3) {
      const xs = ann.coordinates.map((pt: number[]) => pt[0]);
      const ys = ann.coordinates.map((pt: number[]) => pt[1]);
      box = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
    }

    if (!box) return;

    setSegmentingSam(true);
    try {
      const res = await api.refineBBox({
        frame_id: currentFrame.id,
        bbox: box,
        model_name: selectedSamModel,
      });

      if (res.bbox) {
        const updated = await api.updateAnnotation(ann.id, {
          coordinates: res.bbox,
          annotation_type: 'bbox',
          confidence: res.confidence || 0.98,
        });
        const next = annotations.map((a) => (a.id === ann.id ? updated : a));
        pushHistory(next);
        addNotification({
          type: 'success',
          title: 'Sub-Pixel SAM 2 Edge Snapping',
          message: `Bounding box snapped to physical edges (${Math.round((res.confidence || 0.98) * 100)}% confidence).`,
        });
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Edge Snapping Failed', message: err.message });
    } finally {
      setSegmentingSam(false);
    }
  };

  // Refine box into polygon contour
  const handleRefineSelectedWithSam = async () => {
    if (!currentFrame || !selectedAnnId) return;
    const ann = annotations.find((a) => a.id === selectedAnnId);
    if (!ann) return;

    let box = null;
    if (ann.annotation_type === 'bbox' && ann.coordinates.length === 4) {
      box = ann.coordinates;
    } else if (ann.annotation_type === 'polygon' && ann.coordinates.length >= 3) {
      const xs = ann.coordinates.map((pt: number[]) => pt[0]);
      const ys = ann.coordinates.map((pt: number[]) => pt[1]);
      box = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
    }

    if (!box) return;

    setSegmentingSam(true);
    try {
      const res = await api.samSegment({
        frame_id: currentFrame.id,
        model_name: selectedSamModel,
        box_prompt: box,
        class_id: ann.class_id,
        class_name: ann.class_name,
      });

      if (res.predictions && res.predictions.length > 0) {
        const pred = res.predictions[0];
        const updated = await api.updateAnnotation(ann.id, {
          coordinates: pred.coordinates,
          annotation_type: 'polygon',
          confidence: pred.confidence,
        });
        const next = annotations.map((a) => (a.id === ann.id ? updated : a));
        pushHistory(next);
        addNotification({
          type: 'success',
          title: 'SAM 2 Refined',
          message: `Object contour refined into polygon.`,
        });
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Refinement Failed', message: err.message });
    } finally {
      setSegmentingSam(false);
    }
  };

  // Florence-2 Single Frame Grounding
  const handleFlorencePredict = async () => {
    if (!currentFrame || !activeProjectId) return;
    setRunningAi(true);
    try {
      const res = await api.florencePredict({
        frame_id: currentFrame.id,
        project_id: activeProjectId,
        model_id: selectedFlorenceModel,
        prompt_text: florencePrompt || activeClass.name,
        output_type: florenceOutputType,
        refine_with_sam: florenceRefineWithSam,
      });

      if (res.detections && res.detections.length > 0) {
        addNotification({
          type: 'success',
          title: 'Florence-2 Grounding Success',
          message: `Detected ${res.detections.length} annotation(s) for '${florencePrompt || activeClass.name}'.`,
        });
        api.getAnnotations(currentFrame.id).then((anns) => pushHistory(anns));
      } else {
        addNotification({
          type: 'info',
          title: 'No Objects Grounded',
          message: `Florence-2 did not locate '${florencePrompt || activeClass.name}' on this frame.`,
        });
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Florence-2 Inference Failed', message: err.message });
    } finally {
      setRunningAi(false);
    }
  };

  // Florence-2 Batch Grounding
  const handleFlorencePropagate = async () => {
    if (!activeProjectId) return;
    setPropagating(true);
    try {
      await api.florencePropagate({
        project_id: activeProjectId,
        model_id: selectedFlorenceModel,
        prompt_text: florencePrompt || activeClass.name,
        class_name: activeClass.name,
        output_type: florenceOutputType,
        refine_with_sam: florenceRefineWithSam,
      });
      addNotification({
        type: 'success',
        title: 'Florence-2 Batch Grounding Queued',
        message: `Detecting annotations for '${florencePrompt || activeClass.name}' across all frames in background...`,
      });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Florence-2 Batch Failed', message: err.message });
    } finally {
      setPropagating(false);
    }
  };

  // Video Tracking
  const handleTrackAndPropagate = async () => {
    if (!currentFrame || !activeProjectId) return;
    if (annotations.length === 0) {
      addNotification({
        type: 'warning',
        title: 'No Object to Track',
        message: 'Please draw a bounding box around the object on this frame first.',
      });
      return;
    }

    setIsTracking(true);
    setTrackingProgress(0);
    setTrackingMessage(`Initializing SAM 2 tracking for ${annotations.length} object(s)...`);

    try {
      const res = await api.propagateTrack({
        source_frame_id: currentFrame.id,
        project_id: activeProjectId,
        direction: trackDirection,
        model_name: selectedSamModel,
        output_type: trackOutputType,
        match_threshold: 0.35,
        clear_existing_tracked: true,
        tracker_engine: trackerEngine,
      });

      addNotification({
        type: 'success',
        title: 'SAM 2 Tracking Started',
        message: `Tracking ${annotations.length} object(s) across frames...`,
      });

      const jobId = res.job_id;
      const pollInterval = setInterval(async () => {
        try {
          const job = await api.getJob(jobId);
          if (job) {
            setTrackingProgress(job.progress || 0);
            if (job.message) setTrackingMessage(job.message);

            if (job.status === 'completed') {
              clearInterval(pollInterval);
              setIsTracking(false);
              setTrackingProgress(null);
              addNotification({
                type: 'success',
                title: 'SAM 2 Tracking Complete!',
                message: job.message || 'Objects identified and tracked across frames.',
              });
              api.getAnnotations(currentFrame.id).then((anns) => setAnnotations(anns));
            } else if (job.status === 'failed') {
              clearInterval(pollInterval);
              setIsTracking(false);
              setTrackingProgress(null);
              addNotification({
                type: 'error',
                title: 'Tracking Failed',
                message: job.error_detail || 'Tracking encountered an error.',
              });
            }
          }
        } catch (err) {
          console.error('Job polling error:', err);
        }
      }, 1500);
    } catch (err: any) {
      setIsTracking(false);
      setTrackingProgress(null);
      addNotification({ type: 'error', title: 'Tracking Request Failed', message: err.message });
    }
  };

  // Clear Automated Tracked Annotations
  const handleClearTracked = async () => {
    if (!activeProjectId) return;
    try {
      const res = await api.clearTrackedAnnotations(activeProjectId);
      addNotification({
        type: 'success',
        title: 'Auto-Tracks Cleared',
        message: res.message || 'Removed previous automated annotations.',
      });
      if (currentFrame) {
        api.getAnnotations(currentFrame.id).then((anns) => pushHistory(anns));
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Clear Failed', message: err.message });
    }
  };

  // Enterprise Keyframe Interpolation Handlers
  const handleSetAnchorA = () => {
    if (!currentFrame) return;
    setAnchorA(currentFrame);
    addNotification({
      type: 'info',
      title: 'Anchor A Set',
      message: `Set Frame #${currentFrame.frame_index} as Start Keyframe`,
    });
  };

  const handleSetAnchorB = () => {
    if (!currentFrame) return;
    setAnchorB(currentFrame);
    addNotification({
      type: 'info',
      title: 'Anchor B Set',
      message: `Set Frame #${currentFrame.frame_index} as End Keyframe`,
    });
  };

  const handleExecuteInterpolation = async () => {
    if (!activeProjectId) return;
    if (!anchorA || !anchorB) {
      addNotification({
        type: 'warning',
        title: 'Missing Anchors',
        message: 'Please set both Start Anchor A and End Anchor B before running interpolation.',
      });
      return;
    }

    if (anchorA.id === anchorB.id) {
      addNotification({
        type: 'warning',
        title: 'Identical Anchors',
        message: 'Start Anchor A and End Anchor B are set to the exact same frame! Navigate forward to a downstream frame (e.g., Frame 250 or 500) where the package has moved, draw or adjust the box, and click "Set Current" for Anchor B.',
      });
      return;
    }

    setIsInterpolating(true);
    setInterpolationResult(null);
    try {
      const res = await api.interpolateKeyframes({
        project_id: activeProjectId,
        start_frame_id: anchorA.id,
        end_frame_id: anchorB.id,
        mode: interpMode,
        lock_dimensions: lockDimensions,
        clear_existing: true,
      });

      setInterpolationResult(res);
      if (res.status === 'warning') {
        addNotification({
          type: 'warning',
          title: '⚠️ Keyframe Notice',
          message: res.message,
        });
      } else {
        addNotification({
          type: 'success',
          title: '⚡ Keyframe Interpolation Finished',
          message: res.message,
        });
      }

      // Reload current frame annotations
      if (currentFrame) {
        const updated = await api.getAnnotations(currentFrame.id);
        pushHistory(updated);
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Interpolation Error',
        message: err.message,
      });
    } finally {
      setIsInterpolating(false);
    }
  };

  const selectedAnnotation = annotations.find((a) => a.id === selectedAnnId);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#090d16] text-slate-100 select-none">
      {/* Central Canvas Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Auditor Read-Only Mode Banner */}
        {isReadOnly && (
          <div className="bg-cyan-500/10 border-b border-cyan-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-cyan-300 z-30">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>
                <strong>Auditor Read-Only Mode:</strong> You are viewing annotations in audit mode. Canvas edits and object tracking are restricted for the Viewer role.
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              AUDIT PERSPECTIVE
            </span>
          </div>
        )}

        {/* Apple-Style Glass Floating Command Bar */}
        <div className="h-14 border-b border-white/[0.08] bg-[#0c121e]/85 backdrop-blur-2xl px-4 flex items-center justify-between z-20 shadow-lg">
          {/* Tool Segmented Switcher */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/[0.08] shadow-inner">
            <button
              onClick={() => { setTool('bbox'); setSelectedAnnId(null); }}
              title="Bounding Box Tool (B)"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                tool === 'bbox'
                  ? 'bg-blue-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>Box</span>
            </button>

            <button
              onClick={() => { setTool('polygon'); setSelectedAnnId(null); }}
              title="Polygon Tool (P)"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                tool === 'polygon'
                  ? 'bg-blue-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Pentagon className="w-3.5 h-3.5" />
              <span>Polygon</span>
            </button>

            <button
              onClick={() => { setTool('sam_point'); setSelectedAnnId(null); }}
              title="SAM 2 Point (S) - Click object to generate segment mask"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                tool === 'sam_point'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-[0_2px_12px_rgba(99,102,241,0.4)]'
                  : 'text-indigo-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>SAM Point</span>
            </button>

            <button
              onClick={() => { setTool('sam_box'); setSelectedAnnId(null); }}
              title="SAM 2 Box (X) - Drag box around object to fit tight contour"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                tool === 'sam_box'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-[0_2px_12px_rgba(99,102,241,0.4)]'
                  : 'text-indigo-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>SAM Box</span>
            </button>

            <button
              onClick={() => setTool('select')}
              title="Select / Move Tool (V)"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all duration-200 ${
                tool === 'select'
                  ? 'bg-blue-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Select</span>
            </button>

            <button
              onClick={() => setTool('pan')}
              title="Pan Tool (H or Middle Mouse)"
              className={`p-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                tool === 'pan'
                  ? 'bg-blue-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Hand className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center Utilities: Undo/Redo & Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={historyStep <= 0}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-xl hover:bg-white/[0.06] transition-colors"
              title="Undo (Ctrl+Z / ⌘Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleRedo}
              disabled={historyStep >= history.length - 1}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-xl hover:bg-white/[0.06] transition-colors"
              title="Redo (Ctrl+Y / ⇧⌘Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-white/[0.1] mx-1" />

            <button
              onClick={() => setShowCrosshairs(!showCrosshairs)}
              title="Laser Crosshair Alignment (C)"
              className={`p-1.5 rounded-xl transition-all ${
                showCrosshairs
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Crosshair className="w-4 h-4" />
            </button>

            {/* Conveyor Belt ROI Corridor Toggle */}
            <button
              onClick={() => setShowConveyorRoi(!showConveyorRoi)}
              title="Toggle Conveyor Belt Inspection Corridor (ROI)"
              className={`px-2 py-1 rounded-xl text-xs flex items-center gap-1.5 border transition-all ${
                showConveyorRoi
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border-transparent'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Conveyor ROI</span>
            </button>

            {/* Quick Confidence Filter Slider */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Conf:</span>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={minConfidenceFilter}
                onChange={(e) => setMinConfidenceFilter(parseFloat(e.target.value))}
                className="w-14 h-1 accent-blue-500 bg-white/10 rounded-lg cursor-pointer"
                title={`Filter detections below ${Math.round(minConfidenceFilter * 100)}% confidence`}
              />
              <span className="text-[10px] font-mono text-blue-400 min-w-[28px]">
                {Math.round(minConfidenceFilter * 100)}%
              </span>
            </div>

            <button
              onClick={() => {
                setZoom(1.0);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 rounded-xl text-xs font-mono font-medium border border-white/[0.06] transition-all"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>

            {polygonPoints.length >= 3 && (
              <button
                onClick={handleFinishPolygon}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-[0_2px_12px_rgba(16,185,129,0.35)] animate-pulse"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Close Polygon</span>
              </button>
            )}
          </div>

          {/* Right Frame Navigator Pill */}
          <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-2xl border border-white/[0.08]">
            <button
              onClick={() => currentFrameIndex > 0 && setCurrentFrameIndex(currentFrameIndex - 1)}
              disabled={currentFrameIndex <= 0}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-20 rounded-lg hover:bg-white/[0.08] transition-colors"
              title="Previous Frame (A or ←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono text-slate-200 px-2 min-w-[70px] text-center font-medium">
              {frames.length > 0 ? `${currentFrameIndex + 1} / ${frames.length}` : '0 / 0'}
            </span>

            <button
              onClick={() => currentFrameIndex < frames.length - 1 && setCurrentFrameIndex(currentFrameIndex + 1)}
              disabled={currentFrameIndex >= frames.length - 1}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-20 rounded-lg hover:bg-white/[0.08] transition-colors"
              title="Next Frame (D or →)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Center Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 0.1 : -0.1;
              setZoom((prev) => Math.max(0.2, Math.min(5.0, prev + delta)));
            }
          }}
          className={`flex-1 relative overflow-hidden flex items-center justify-center p-6 select-none ${
            tool === 'pan' || isPanning ? 'cursor-grab active:cursor-grabbing' : (tool === 'select' ? 'cursor-default' : 'cursor-crosshair')
          }`}
        >
          {currentFrame ? (
            <div
              className="relative shadow-2xl rounded-2xl overflow-hidden border border-white/[0.08] bg-black/40"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            >
              <img
                ref={imageRef}
                src={`/api/v1/files/raw?path=${encodeURIComponent(currentFrame.file_path)}`}
                alt="Frame to annotate"
                className="max-h-[74vh] max-w-[70vw] object-contain block pointer-events-none select-none rounded-xl"
                draggable={false}
              />

              {/* Laser Crosshair Guidelines */}
              {showCrosshairs && imageRef.current && (
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                  {(() => {
                    const cur = annotations.find((a) => a.id === selectedAnnId);
                    const cy = cur && cur.coordinates ? (cur.coordinates[1] + cur.coordinates[3] / 2) : (cursorNormPos ? cursorNormPos.y : 0.5);
                    const cx = cur && cur.coordinates ? (cur.coordinates[0] + cur.coordinates[2] / 2) : (cursorNormPos ? cursorNormPos.x : 0.5);
                    return (
                      <>
                        <div
                          className="absolute left-0 right-0 border-t border-dashed border-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                          style={{ top: `${cy * 100}%` }}
                        />
                        <div
                          className="absolute top-0 bottom-0 border-l border-dashed border-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                          style={{ left: `${cx * 100}%` }}
                        />
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Conveyor Belt ROI Corridor Overlay */}
              {showConveyorRoi && (
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <polygon
                      points={conveyorRoiPolygon.map((pt) => `${pt[0] * 100},${pt[1] * 100}`).join(' ')}
                      fill="rgba(59, 130, 246, 0.08)"
                      stroke="#3b82f6"
                      strokeWidth="0.4"
                      strokeDasharray="2, 2"
                    />
                  </svg>
                  <div className="absolute top-2 left-3 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase border border-blue-500/40 bg-blue-950/85 text-blue-300 backdrop-blur-sm flex items-center gap-1.5 shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    CONVEYOR INSPECTION CORRIDOR (ACTIVE ROI)
                  </div>
                </div>
              )}

              {/* Render Saved Annotations */}
              {annotations.map((ann) => {
                const isSelected = selectedAnnId === ann.id;
                const cls = classes.find((c: any) => c.id === ann.class_id) || { color: '#0071e3', name: ann.class_name };
                const color = cls.color || '#0071e3';

                const isBelowConf = ann.confidence !== undefined && ann.confidence < minConfidenceFilter;
                const isOutside = ann.coordinates && ann.coordinates.length === 4
                  ? !isInsideRoi(ann.coordinates[0], ann.coordinates[1], ann.coordinates[2], ann.coordinates[3])
                  : false;

                if (filterOutsideRoi && isOutside) return null;

                if (ann.annotation_type === 'bbox' && ann.coordinates && ann.coordinates.length === 4) {
                  const [x, y, w, h] = ann.coordinates;
                  return (
                    <div
                      key={ann.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAnnId(ann.id);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedAnnId(ann.id);
                        setIsDraggingBox(true);
                        setDragStartMouse({ x: e.clientX, y: e.clientY });
                        setDragStartBox([...ann.coordinates]);
                      }}
                      className={`absolute pointer-events-auto border-2 transition-all select-none rounded-sm ${
                        isSelected
                          ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-black z-30 cursor-move shadow-[0_0_24px_rgba(0,113,227,0.4)]'
                          : 'cursor-pointer hover:border-white z-20'
                      } ${isBelowConf ? 'opacity-35 border-dashed' : 'opacity-100'}`}
                      style={{
                        left: `${x * 100}%`,
                        top: `${y * 100}%`,
                        width: `${w * 100}%`,
                        height: `${h * 100}%`,
                        borderColor: color,
                        backgroundColor: `${color}25`,
                      }}
                    >
                      {/* Floating Apple-Style Badge */}
                      <div
                        className="absolute -top-6 left-0 px-2 py-0.5 text-[10px] font-bold text-white rounded-lg shadow-md flex items-center gap-1.5 font-mono leading-tight whitespace-nowrap backdrop-blur-md"
                        style={{ backgroundColor: isBelowConf ? '#475569' : color }}
                      >
                        <span>{ann.class_name}</span>
                        {ann.confidence < 1.0 && (
                          <span className="opacity-90 text-[9px] bg-black/30 px-1 py-0.2 rounded">
                            {Math.round(ann.confidence * 100)}%
                          </span>
                        )}
                        {isOutside && showConveyorRoi && (
                          <span className="text-[8px] bg-amber-500/80 px-1 py-0.2 rounded text-black font-sans font-bold uppercase">
                            Out-ROI
                          </span>
                        )}
                      </div>

                      {/* 8 Precision Resize Handles (Apple Style) */}
                      {isSelected && (
                        <>
                          {/* Corner Handles */}
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizeHandle('nw');
                              setDragStartMouse({ x: e.clientX, y: e.clientY });
                              setDragStartBox([...ann.coordinates]);
                            }}
                            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-900 rounded-full cursor-nwse-resize shadow-md z-40 hover:scale-130 transition-transform"
                            title="Resize Top-Left"
                          />
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizeHandle('ne');
                              setDragStartMouse({ x: e.clientX, y: e.clientY });
                              setDragStartBox([...ann.coordinates]);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-900 rounded-full cursor-nesw-resize shadow-md z-40 hover:scale-130 transition-transform"
                            title="Resize Top-Right"
                          />
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizeHandle('se');
                              setDragStartMouse({ x: e.clientX, y: e.clientY });
                              setDragStartBox([...ann.coordinates]);
                            }}
                            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-900 rounded-full cursor-nwse-resize shadow-md z-40 hover:scale-130 transition-transform"
                            title="Resize Bottom-Right"
                          />
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizeHandle('sw');
                              setDragStartMouse({ x: e.clientX, y: e.clientY });
                              setDragStartBox([...ann.coordinates]);
                            }}
                            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-900 rounded-full cursor-nesw-resize shadow-md z-40 hover:scale-130 transition-transform"
                            title="Resize Bottom-Left"
                          />

                          {/* Edge Handles */}
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizeHandle('n');
                              setDragStartMouse({ x: e.clientX, y: e.clientY });
                              setDragStartBox([...ann.coordinates]);
                            }}
                            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-slate-900 rounded-full cursor-ns-resize shadow-md z-40 hover:scale-130 transition-transform"
                            title="Resize Top"
                          />
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizeHandle('s');
                              setDragStartMouse({ x: e.clientX, y: e.clientY });
                              setDragStartBox([...ann.coordinates]);
                            }}
                            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-slate-900 rounded-full cursor-ns-resize shadow-md z-40 hover:scale-130 transition-transform"
                            title="Resize Bottom"
                          />
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizeHandle('w');
                              setDragStartMouse({ x: e.clientX, y: e.clientY });
                              setDragStartBox([...ann.coordinates]);
                            }}
                            className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border border-slate-900 rounded-full cursor-ew-resize shadow-md z-40 hover:scale-130 transition-transform"
                            title="Resize Left"
                          />
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizeHandle('e');
                              setDragStartMouse({ x: e.clientX, y: e.clientY });
                              setDragStartBox([...ann.coordinates]);
                            }}
                            className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border border-slate-900 rounded-full cursor-ew-resize shadow-md z-40 hover:scale-130 transition-transform"
                            title="Resize Right"
                          />
                        </>
                      )}
                    </div>
                  );
                } else if (ann.annotation_type === 'polygon' && Array.isArray(ann.coordinates)) {
                  return (
                    <svg
                      key={ann.id}
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ overflow: 'visible' }}
                    >
                      <polygon
                        points={ann.coordinates.map((pt: number[]) => `${pt[0] * 100},${pt[1] * 100}`).join(' ')}
                        fill={isBelowConf ? `${color}10` : `${color}30`}
                        stroke={isBelowConf ? '#64748b' : color}
                        strokeWidth={isBelowConf ? '0.2' : '0.4'}
                        strokeDasharray={isBelowConf ? '1, 1' : undefined}
                        className="pointer-events-auto cursor-pointer hover:stroke-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnId(ann.id);
                        }}
                      />
                    </svg>
                  );
                }
                return null;
              })}

              {/* In-progress bounding box drawing (cleanly scoped, never leaves ghost boxes) */}
              {currentBox && (
                <div
                  className="absolute border-2 border-dashed pointer-events-none z-30 rounded-sm"
                  style={{
                    left: `${currentBox.x * 100}%`,
                    top: `${currentBox.y * 100}%`,
                    width: `${currentBox.w * 100}%`,
                    height: `${currentBox.h * 100}%`,
                    borderColor: activeClass.color,
                    backgroundColor: `${activeClass.color}30`,
                  }}
                >
                  <span
                    className="absolute -top-5 left-0 px-1.5 py-0.5 text-[9px] font-bold text-white rounded-md shadow flex items-center gap-1 font-mono leading-tight whitespace-nowrap"
                    style={{ backgroundColor: activeClass.color }}
                  >
                    {activeClass.name} ({Math.round(currentBox.w * 100)}% × {Math.round(currentBox.h * 100)}%)
                  </span>
                </div>
              )}

              {/* In-progress polygon points */}
              {polygonPoints.length > 0 && (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-30">
                  {polygonPoints.map((pt, i) => (
                    <circle key={i} cx={pt[0] * 100} cy={pt[1] * 100} r="0.6" fill={activeClass.color} />
                  ))}
                  {polygonPoints.length > 1 && (
                    <polyline
                      points={polygonPoints.map((pt) => `${pt[0] * 100},${pt[1] * 100}`).join(' ')}
                      fill="none"
                      stroke={activeClass.color}
                      strokeWidth="0.4"
                      strokeDasharray="1"
                    />
                  )}
                </svg>
              )}
            </div>
          ) : (
            <div className="text-center text-xs text-slate-400">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span>Loading frames...</span>
                </div>
              ) : (
                'No frames loaded. Upload a video in Video Lab to extract frames.'
              )}
            </div>
          )}

          {/* Real-time SAM 2 Segmenting Overlay */}
          {segmentingSam && (
            <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
              <div className="bg-[#0f172a]/95 border border-indigo-500/40 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-2xl">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                <div>
                  <p className="text-xs font-bold text-white">Segmenting with Meta SAM 2...</p>
                  <p className="text-[10px] text-slate-400">Delineating sub-pixel boundary contour</p>
                </div>
              </div>
            </div>
          )}

          {/* Apple-Style Precision Inspector HUD (Appears when box is selected) */}
          {selectedAnnId && selectedAnnotation && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#0c121e]/90 border border-white/[0.12] backdrop-blur-2xl px-4 py-2.5 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center gap-3 text-xs text-white animate-in fade-in slide-in-from-bottom-2 duration-150">
              {/* Object Tag & Color Pill */}
              <div className="flex items-center gap-2 pr-2.5 border-r border-white/[0.1]">
                <span
                  className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20"
                  style={{
                    backgroundColor:
                      classes.find((c: any) => c.id === selectedAnnotation.class_id)?.color || '#0071e3',
                  }}
                />
                <span className="font-bold text-slate-100">{selectedAnnotation.class_name}</span>
                <span className="text-[10px] text-slate-400 font-mono bg-white/[0.08] px-1.5 py-0.5 rounded-md">
                  {Math.round((selectedAnnotation.confidence || 1.0) * 100)}%
                </span>
              </div>

              {/* Position Nudge D-Pad */}
              {selectedAnnotation.annotation_type === 'bbox' && (
                <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-xl border border-white/[0.06]">
                  <span className="text-[10px] font-mono text-slate-400 mr-0.5">Nudge:</span>
                  <button
                    onClick={() => handleNudge(nudgeCoarse ? -0.01 : -0.002, 0)}
                    className="w-5 h-5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-slate-200 transition-colors"
                    title="Nudge Left (Left Arrow)"
                  >
                    ◄
                  </button>
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleNudge(0, nudgeCoarse ? -0.01 : -0.002)}
                      className="w-5 h-2.5 rounded bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-[7px] text-slate-200 transition-colors"
                      title="Nudge Up (Up Arrow)"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleNudge(0, nudgeCoarse ? 0.01 : 0.002)}
                      className="w-5 h-2.5 rounded bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-[7px] text-slate-200 transition-colors"
                      title="Nudge Down (Down Arrow)"
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    onClick={() => handleNudge(nudgeCoarse ? 0.01 : 0.002, 0)}
                    className="w-5 h-5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-slate-200 transition-colors"
                    title="Nudge Right (Right Arrow)"
                  >
                    ►
                  </button>
                  <button
                    onClick={() => setNudgeCoarse(!nudgeCoarse)}
                    className={`px-1.5 py-0.5 rounded-lg text-[9px] font-mono ml-1 font-bold transition-colors ${
                      nudgeCoarse
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                    title="Toggle Step Size: Fine (0.2%) vs Coarse (1.0%)"
                  >
                    {nudgeCoarse ? '1.0%' : '0.2%'}
                  </button>
                </div>
              )}

              {/* Scale Pill */}
              {selectedAnnotation.annotation_type === 'bbox' && (
                <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-xl border border-white/[0.06]">
                  <span className="text-[10px] font-mono text-slate-400 mr-0.5">Scale:</span>
                  <button
                    onClick={() => handleScaleBox(0.95)}
                    className="px-1.5 py-0.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-[10px] font-bold text-slate-200 transition-colors"
                    title="Shrink box 5%"
                  >
                    -5%
                  </button>
                  <button
                    onClick={() => handleScaleBox(1.05)}
                    className="px-1.5 py-0.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-[10px] font-bold text-slate-200 transition-colors"
                    title="Expand box 5%"
                  >
                    +5%
                  </button>
                </div>
              )}

              {/* Sub-Pixel Snap to Edges */}
              <button
                onClick={handleSnapBBoxWithSam}
                disabled={segmentingSam}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-[0_2px_12px_rgba(99,102,241,0.35)] transition-all active:scale-95 disabled:opacity-50"
                title="Automatically snap bounding box tightly to object physical edges (SAM 2)"
              >
                {segmentingSam ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                <span>Snap to Edges</span>
              </button>

              {/* Utility Action Buttons */}
              <div className="flex items-center gap-1 pl-2 border-l border-white/[0.1]">
                <button
                  onClick={handleDuplicateToNextFrame}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors"
                  title="Clone to Next Frame (Ctrl+D / ⌘D)"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteAnnotation(selectedAnnId)}
                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-xl transition-colors"
                  title="Delete Box (Backspace / Del)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setSelectedAnnId(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors"
                  title="Deselect (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Interactive Tool Banner Hint */}
          {tool === 'sam_point' && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 bg-[#0f172a]/95 border border-indigo-500/40 px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 pointer-events-none">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="text-xs text-indigo-200">
                SAM 2 Point: Click anywhere on object to segment <strong>{activeClass.name}</strong>
              </span>
            </div>
          )}

          {tool === 'sam_box' && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 bg-[#0f172a]/95 border border-indigo-500/40 px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 pointer-events-none">
              <Wand2 className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="text-xs text-indigo-200">
                SAM 2 Box: Drag a box around any object for fine contour segmentation
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: AI Studio & Enterprise Inspector */}
      <div className="w-84 border-l border-white/[0.08] bg-[#0c121e]/95 backdrop-blur-2xl flex flex-col justify-between p-4 space-y-4 overflow-y-auto">
        <div className="space-y-4">
          {/* Class Palette */}
          <div>
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Classes</span>
              <span className="text-[10px] text-slate-400 font-mono">Keys 1-9</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {classes.map((cls: any) => {
                const isCur = cls.id === activeClassId;
                return (
                  <button
                    key={cls.id}
                    onClick={() => setActiveClassId(cls.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                      isCur
                        ? 'border-blue-500/80 bg-blue-600/15 text-white shadow-sm ring-1 ring-blue-500/50'
                        : 'border-white/[0.06] bg-black/20 text-slate-300 hover:bg-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                    <span className="truncate flex-1 font-semibold">{cls.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{cls.hotkey}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI-Assisted Studio Card */}
          <div className="p-3.5 bg-black/30 rounded-2xl border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-indigo-400" />
                AI Annotation Studio
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold">
                {aiProvider === 'florence2' ? 'Florence-2 LLM' : aiProvider === 'sam2' ? 'Meta SAM 2' : 'YOLO'}
              </span>
            </div>

            {/* Architecture Selector */}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Architecture / Engine</label>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value as any)}
                className="w-full bg-[#131b2e] border border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-semibold text-indigo-300 focus:border-indigo-500 transition-colors"
              >
                <option value="florence2">Microsoft Florence-2 Vision LLM (CPU SOTA)</option>
                <option value="sam2">Meta SAM 2 (Tracking & Segmentation)</option>
                <option value="ultralytics_yolo">Ultralytics YOLO (Object Detection)</option>
              </select>
            </div>

            {/* Florence-2 Configuration */}
            {aiProvider === 'florence2' && (
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-slate-400">Florence-2 Vision Model</label>
                    {modelCatalog.find((m) => m.id === selectedFlorenceModel)?.is_installed ? (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Ready
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Needs Install
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedFlorenceModel}
                    onChange={(e) => setSelectedFlorenceModel(e.target.value)}
                    className="w-full bg-[#131b2e] border border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="microsoft/Florence-2-base">Florence-2 Base (~460MB - Fast Phrase Grounding)</option>
                    <option value="microsoft/Florence-2-large">Florence-2 Large (~1.5GB - High Accuracy Grounding)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-slate-400">Target Object Phrase</label>
                    <span className="text-[9px] text-indigo-300 font-mono uppercase">{florenceOutputType} Mode</span>
                  </div>
                  <input
                    type="text"
                    value={florencePrompt}
                    onChange={(e) => setFlorencePrompt(e.target.value)}
                    placeholder="e.g. package on conveyor"
                    className="w-full bg-[#131b2e] border border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                  />
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Grounding focuses strictly on your target object phrase.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Output Format</label>
                    <select
                      value={florenceOutputType}
                      onChange={(e) => setFlorenceOutputType(e.target.value as any)}
                      className="w-full bg-[#131b2e] border border-white/[0.1] rounded-xl px-2 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                    >
                      <option value="bbox">Bounding Box</option>
                      <option value="polygon">Fine Polygon</option>
                      <option value="both">Both (Box + Poly)</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">SAM 2 Snapping</label>
                    <button
                      type="button"
                      onClick={() => setFlorenceRefineWithSam(!florenceRefineWithSam)}
                      className={`w-full py-1.5 px-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-colors ${
                        florenceRefineWithSam
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-[#131b2e] border-white/[0.1] text-slate-400'
                      }`}
                    >
                      <span>{florenceRefineWithSam ? 'Enabled' : 'Disabled'}</span>
                      <span className={`w-2 h-2 rounded-full ${florenceRefineWithSam ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={handleFlorencePredict}
                    disabled={runningAi || !currentFrame}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{runningAi ? 'Grounding with Florence-2...' : 'Detect Box on Current Frame'}</span>
                  </button>

                  <button
                    onClick={handleFlorencePropagate}
                    disabled={propagating}
                    className="w-full py-2 bg-white/[0.08] hover:bg-white/[0.12] text-slate-200 border border-white/[0.1] rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
                  >
                    <Play className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{propagating ? 'Grounding Across Frames...' : 'Batch Ground All Frames (Florence-2)'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Video Motion & Keyframe Trajectory Engine */}
            <div className="pt-2 border-t border-white/[0.08] space-y-2">
              {/* Tab Selector */}
              <div className="flex items-center p-0.5 bg-black/40 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setVideoTrackingTab('interpolator')}
                  className={`flex-1 py-1 px-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                    videoTrackingTab === 'interpolator'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3 h-3 text-cyan-300" />
                  <span>⚡ Keyframe Interpolator</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVideoTrackingTab('sam_tracker')}
                  className={`flex-1 py-1 px-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                    videoTrackingTab === 'sam_tracker'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Play className="w-3 h-3 text-emerald-300" />
                  <span>SAM 2 Tracker</span>
                </button>
              </div>

              {videoTrackingTab === 'interpolator' ? (
                /* ================= ENTERPRISE KEYFRAME INTERPOLATION ENGINE ================= */
                <div className="space-y-2.5 p-3 rounded-2xl bg-[#0b1220]/95 border border-cyan-500/30 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <Waypoints className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Mathematical Trajectory Engine</span>
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      Zero-Drift
                    </span>
                  </div>

                  {/* Anchor Setup Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          Anchor A (Start)
                        </span>
                        <span className="font-mono text-[10px] text-white font-bold">
                          {anchorA ? `#${anchorA.frame_index}` : 'None'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSetAnchorA}
                        className="w-full mt-1 py-1 px-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-semibold transition-all flex items-center justify-center gap-1"
                        title="Set current viewing frame as Start Anchor"
                      >
                        <GitCommit className="w-3 h-3" />
                        <span>Set Current (F#{currentFrame?.frame_index || 0})</span>
                      </button>
                    </div>

                    <div className="p-2 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                          Anchor B (End)
                        </span>
                        <span className="font-mono text-[10px] text-white font-bold">
                          {anchorB ? `#${anchorB.frame_index}` : 'None'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSetAnchorB}
                        className="w-full mt-1 py-1 px-2 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold transition-all flex items-center justify-center gap-1"
                        title="Set current viewing frame as End Anchor"
                      >
                        <GitCommit className="w-3 h-3" />
                        <span>Set Current (F#{currentFrame?.frame_index || 0})</span>
                      </button>
                    </div>
                  </div>

                  {/* Options: Mode & Rigid Dimension Lock */}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <label className="text-slate-400 block mb-0.5 font-medium">Trajectory Mode</label>
                      <select
                        value={interpMode}
                        onChange={(e) => setInterpMode(e.target.value as any)}
                        className="w-full bg-[#131b2e] border border-white/[0.1] rounded-xl px-2 py-1 text-[11px] text-white outline-none"
                      >
                        <option value="linear">Linear (Constant Speed)</option>
                        <option value="spline">Catmull-Rom Spline</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-start pt-3">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
                        <input
                          type="checkbox"
                          checked={lockDimensions}
                          onChange={(e) => setLockDimensions(e.target.checked)}
                          className="w-3.5 h-3.5 rounded bg-black/40 border-white/[0.2] text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                        <span title="Guarantees bounding box dimensions never wobble or deform along the conveyor belt">
                          Rigid (w, h) Lock
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Execute Button */}
                  <button
                    type="button"
                    onClick={handleExecuteInterpolation}
                    disabled={isInterpolating || !anchorA || !anchorB}
                    className="w-full py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                  >
                    {isInterpolating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Computing Mathematical Trajectory...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-cyan-300 text-cyan-300" />
                        <span>⚡ Interpolate Intermediate Frames</span>
                      </>
                    )}
                  </button>

                  {/* Telemetry Result Card */}
                  {interpolationResult && (
                    <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[10px] space-y-1">
                      <div className="flex items-center justify-between text-cyan-300 font-bold">
                        <span>✓ Interpolated {interpolationResult.interpolated_frames_count} Frames</span>
                        <span className="font-mono text-cyan-400">{interpolationResult.execution_time_ms} ms</span>
                      </div>
                      <div className="text-slate-400 flex items-center justify-between">
                        <span>Annotations Created:</span>
                        <span className="font-mono text-white font-bold">{interpolationResult.total_annotations_created}</span>
                      </div>
                      {interpolationResult.telemetry && interpolationResult.telemetry.length > 0 && (
                        <div className="text-slate-400 text-[9px] pt-1 border-t border-white/[0.08] truncate">
                          Conveyor Velocity: {Math.round(interpolationResult.telemetry[0].velocity_vector[0] * 1000) / 1000} dx / frame
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reset Anchors Link */}
                  {(anchorA || anchorB) && (
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setAnchorA(null);
                          setAnchorB(null);
                          setInterpolationResult(null);
                        }}
                        className="text-[10px] text-slate-400 hover:text-rose-300 transition-colors"
                      >
                        Reset Anchors
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* ================= SAM 2 TRACKER PANEL ================= */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      Auto-Track Across Video
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      SAM 2 Propagator
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[9px] font-semibold text-slate-400 block mb-0.5">Range / Direction</label>
                      <select
                        value={trackDirection}
                        onChange={(e) => setTrackDirection(e.target.value as any)}
                        className="w-full bg-[#131b2e] border border-white/[0.1] rounded-xl px-2 py-1 text-[11px] text-white outline-none"
                      >
                        <option value="forward">Forward (to end)</option>
                        <option value="next_10">Next 10 Frames</option>
                        <option value="next_30">Next 30 Frames</option>
                        <option value="all">All Frames (Both ways)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-semibold text-slate-400 block mb-0.5">Output Type</label>
                      <select
                        value={trackOutputType}
                        onChange={(e) => setTrackOutputType(e.target.value as any)}
                        className="w-full bg-[#131b2e] border border-white/[0.1] rounded-xl px-2 py-1 text-[11px] text-white outline-none"
                      >
                        <option value="bbox">Bounding Box (Clean)</option>
                        <option value="both">Box + Mask</option>
                        <option value="polygon">SAM 2 Mask Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Tracking Progress */}
                  {isTracking && (
                    <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          Tracking Object...
                        </span>
                        <span className="font-mono text-emerald-300 font-bold">{Math.round(trackingProgress || 0)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                          style={{ width: `${Math.max(5, trackingProgress || 0)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{trackingMessage}</p>
                    </div>
                  )}

                  <button
                    onClick={handleTrackAndPropagate}
                    disabled={isTracking || annotations.length === 0}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                  >
                    {isTracking ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Tracking in Progress...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Auto-Track Across Frames</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1 pt-1">
                    <button
                      onClick={handleClearTracked}
                      className="flex-1 py-1 text-[11px] text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all flex items-center justify-center gap-1"
                      title="Clear auto-tracked annotations"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear Auto-Tracks</span>
                    </button>

                    <button
                      onClick={() => setShowClearProjectModal(true)}
                      className="py-1 px-2 text-[11px] text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg transition-all flex items-center gap-1 font-medium"
                      title="Wipe all annotations from this project across all frames"
                    >
                      <span>Wipe All SVG</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Real-time ROI & Confidence Filter Bar */}
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5 font-semibold">
                <Filter className="w-3 h-3 text-blue-400" />
                <span>Confidence Threshold</span>
              </span>
              <span className="font-mono text-blue-400 font-bold">
                {Math.round(minConfidenceFilter * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.90"
              step="0.05"
              value={minConfidenceFilter}
              onChange={(e) => setMinConfidenceFilter(parseFloat(e.target.value))}
              className="w-full h-1 accent-blue-500 bg-white/10 rounded-lg cursor-pointer"
            />
            <div className="flex items-center justify-between pt-0.5 text-[10px]">
              <button
                onClick={() => setShowConveyorRoi(!showConveyorRoi)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-colors ${
                  showConveyorRoi
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'text-slate-400 border-white/[0.08] hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>{showConveyorRoi ? 'ROI Visible' : 'ROI Hidden'}</span>
              </button>
              <button
                onClick={() => setFilterOutsideRoi(!filterOutsideRoi)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-colors ${
                  filterOutsideRoi
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'text-slate-400 border-white/[0.08] hover:text-white'
                }`}
              >
                <span>Filter Exterior {filterOutsideRoi ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Objects on Current Frame List */}
          <div>
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Objects on Frame ({annotations.length})</span>
              {annotations.length > 0 && (
                <button
                  onClick={handleClearFrameAnnotations}
                  className="text-[10px] text-slate-400 hover:text-rose-300 transition-colors"
                >
                  Clear Frame
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {annotations.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No objects labeled on this frame yet.
                </div>
              ) : (
                annotations.map((ann) => {
                  const isSel = selectedAnnId === ann.id;
                  const cls = classes.find((c: any) => c.id === ann.class_id) || { color: '#0071e3', name: ann.class_name };
                  const isBelow = ann.confidence !== undefined && ann.confidence < minConfidenceFilter;
                  const isOutside = ann.coordinates && ann.coordinates.length === 4
                    ? !isInsideRoi(ann.coordinates[0], ann.coordinates[1], ann.coordinates[2], ann.coordinates[3])
                    : false;

                  return (
                    <div
                      key={ann.id}
                      onClick={() => setSelectedAnnId(ann.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                        isSel
                          ? 'border-blue-500/80 bg-blue-600/15 text-white ring-1 ring-blue-500/40 shadow-sm'
                          : isBelow
                          ? 'border-white/[0.03] bg-black/10 text-slate-500 opacity-60'
                          : 'border-white/[0.06] bg-black/20 hover:bg-white/[0.06] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: isBelow ? '#64748b' : cls.color }} />
                        <span className="font-semibold truncate">{ann.class_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({ann.annotation_type})</span>
                        {isOutside && showConveyorRoi && (
                          <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded">Out</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {ann.confidence < 1.0 && (
                          <span className="text-[10px] font-mono text-emerald-400">
                            {Math.round(ann.confidence * 100)}%
                          </span>
                        )}
                        {ann.annotation_type === 'polygon' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConvertPolyToBbox(ann);
                            }}
                            title="Convert Polygon to YOLO Bounding Box"
                            className="text-[9px] font-medium text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-1 transition-all"
                          >
                            <Square className="w-2.5 h-2.5" />
                            To BBox
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAnnotation(ann.id);
                          }}
                          className="text-slate-400 hover:text-rose-400 p-1 rounded-md hover:bg-white/[0.08] transition-colors"
                          title="Delete annotation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Apple-Style Frame Review Footer Controls */}
        {currentFrame && (
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono text-[11px]">Status:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide border transition-all ${
                  currentFrame.status === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : currentFrame.status === 'rejected'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                    : 'bg-black/40 text-slate-400 border-white/[0.1]'
                }`}
              >
                {currentFrame.status || 'unreviewed'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleReviewFrame('approved')}
                disabled={reviewing}
                title="Approve this frame and jump to next (F key)"
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all duration-200 active:scale-95 disabled:opacity-50 ${
                  currentFrame.status === 'approved'
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/80 shadow-[0_2px_12px_rgba(16,185,129,0.4)]'
                    : 'bg-emerald-600/80 hover:bg-emerald-600 text-white hover:shadow-md'
                }`}
              >
                {reviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{currentFrame.status === 'approved' ? 'Approved' : 'Approve (F)'}</span>
              </button>

              <button
                onClick={() => handleReviewFrame('rejected')}
                disabled={reviewing}
                title="Reject this frame and jump to next (R key)"
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all duration-200 active:scale-95 disabled:opacity-50 ${
                  currentFrame.status === 'rejected'
                    ? 'bg-rose-500 text-white ring-2 ring-rose-400/80 shadow-[0_2px_12px_rgba(244,63,94,0.4)]'
                    : 'bg-rose-600/80 hover:bg-rose-600 text-white hover:shadow-md'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{currentFrame.status === 'rejected' ? 'Rejected' : 'Reject (R)'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Project Wipe */}
      {showClearProjectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/[0.12] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Wipe All Annotations in Project?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently delete all annotations across all 126 frames for project{' '}
              <strong className="text-white">{activeProject?.name || 'SVG'}</strong> and reset frame review statuses back to
              unreviewed. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearProjectModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                Cancel (Esc)
              </button>
              <button
                onClick={handleWipeAllProjectAnnotations}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/50 transition-all active:scale-95"
              >
                Yes, Wipe Everything Clean
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
