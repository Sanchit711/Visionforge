import React, { useEffect, useState } from 'react';

import { useAppStore } from '../stores/useAppStore';

import { api } from '../services/api';

import {

  Film,

  Play,

  Sliders,

  CheckCircle2,

  XCircle,

  Eye,

  Trash2,

  ArrowRight,

  RefreshCw,

  Sparkles,

  Layers,

  FileSpreadsheet,

  AlertTriangle,

  Clock,

  Scissors,

  RotateCcw,

  Timer,

  Check,
  CheckSquare,
  Copy,
  Loader2,
} from 'lucide-react';

export const FrameStudioView: React.FC = () => {

  const { activeProjectId, setStage, addNotification } = useAppStore();

  const [videos, setVideos] = useState<any[]>([]);

  const [selectedVideoId, setSelectedVideoId] = useState<string>('');

  const [frames, setFrames] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  const [extracting, setExtracting] = useState(false);

  // Extraction options

  const [mode, setMode] = useState('interval_sec');

  const [intervalVal, setIntervalVal] = useState(1.0);

  const [minSharpness, setMinSharpness] = useState(10.0);

  const [deduplicate, setDeduplicate] = useState(true);

  const [useCrop, setUseCrop] = useState(true);

  const [clearExisting, setClearExisting] = useState(true);
  const [extractionProgress, setExtractionProgress] = useState<number | null>(null);
  const [extractionMessage, setExtractionMessage] = useState<string>('');
  const [selectedFrameIds, setSelectedFrameIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Custom Time Selection state

  const [timeSelectionMode, setTimeSelectionMode] = useState<'range' | 'full' | 'custom_timestamps'>('range');

  const [startTime, setStartTime] = useState<number>(0);

  const [endTime, setEndTime] = useState<number>(0);

  const [customTimestampsStr, setCustomTimestampsStr] = useState<string>('');

  // Gallery filters

  const [splitFilter, setSplitFilter] = useState('');

  const [statusFilter, setStatusFilter] = useState('');

  const [selectedFrame, setSelectedFrame] = useState<any | null>(null);

  const [showContactSheet, setShowContactSheet] = useState(false);

  const selectedVideo = videos.find((v) => v.id === selectedVideoId) || videos[0];

  const loadData = async () => {

    if (!activeProjectId) return;

    setLoading(true);

    try {

      const vids = await api.getVideos(activeProjectId);

      setVideos(vids);

      if (vids.length > 0 && !selectedVideoId) {

        setSelectedVideoId(vids[0].id);

        setStartTime(vids[0].trim_start || 0);

        setEndTime(vids[0].trim_end || vids[0].duration || 10);

      }

      const fList = await api.getFrames(activeProjectId, 0, 5000, splitFilter, statusFilter);

      setFrames(fList);

    } catch (err: any) {

      addNotification({ type: 'error', title: 'Failed to load frame data', message: err.message });

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    loadData();

  }, [activeProjectId, splitFilter, statusFilter]);

  useEffect(() => {

    if (selectedVideo) {

      setStartTime(selectedVideo.trim_start || 0);

      setEndTime(selectedVideo.trim_end || selectedVideo.duration || 10);

    }

  }, [selectedVideoId]);

  const formatTime = (seconds: number) => {

    const s = Math.max(0, seconds || 0);

    const mins = Math.floor(s / 60);

    const secs = (s % 60).toFixed(1);

    return `${mins.toString().padStart(2, '0')}:${parseFloat(secs) < 10 ? '0' : ''}${secs}`;

  };

  const getEstimatedFrameCount = () => {

    if (!selectedVideo) return 0;

    const dur =

      timeSelectionMode === 'full'

        ? selectedVideo.duration || 0

        : Math.max(0, endTime - startTime);

    const fps = selectedVideo.fps || 24;

    if (timeSelectionMode === 'custom_timestamps') {

      const ts = customTimestampsStr

        .split(',')

        .map((s) => parseFloat(s.trim()))

        .filter((n) => !isNaN(n) && n >= 0 && n <= (selectedVideo.duration || 999999));

      return ts.length;

    }

    if (mode === 'all_frames') {
      return selectedVideo.total_frames || Math.round(dur * fps);
    } else if (mode === 'interval_sec') {
      return intervalVal > 0 ? Math.ceil(dur / intervalVal) : 0;
    } else if (mode === 'fps') {
      return Math.ceil(dur * intervalVal);
    } else if (mode === 'interval_frame') {
      const totalF = Math.round(dur * fps);
      return intervalVal > 0 ? Math.ceil(totalF / intervalVal) : 0;
    }

    return Math.ceil(dur);

  };

  // Selection helpers
  const toggleFrameSelection = (frameId: string) => {
    setSelectedFrameIds((prev) => {
      const next = new Set(prev);
      if (next.has(frameId)) {
        next.delete(frameId);
      } else {
        next.add(frameId);
      }
      return next;
    });
  };

  const selectAllFrames = () => {
    setSelectedFrameIds(new Set(frames.map((f) => f.id)));
  };

  const deselectAllFrames = () => {
    setSelectedFrameIds(new Set());
  };

  const selectDuplicateFrames = () => {
    const seen = new Set<number>();
    const dupIds = new Set<string>();
    frames.forEach((f) => {
      const roundedTs = Math.round(f.timestamp_sec * 100) / 100;
      if (f.is_duplicate || seen.has(roundedTs)) {
        dupIds.add(f.id);
      } else {
        seen.add(roundedTs);
      }
    });
    setSelectedFrameIds(dupIds);
    addNotification({
      type: 'info',
      title: 'Duplicates Selected',
      message: `Selected ${dupIds.size} duplicate frame(s). Click 'Delete Selected' to remove them.`,
    });
  };

  const handleBulkDelete = async () => {
    if (selectedFrameIds.size === 0) return;
    const count = selectedFrameIds.size;
    if (!confirm(`Are you sure you want to permanently delete ${count} selected frame(s) and their files from disk?`)) return;

    setBulkDeleting(true);
    try {
      const res = await api.bulkDeleteFrames(Array.from(selectedFrameIds));
      addNotification({
        type: 'success',
        title: 'Bulk Deletion Complete',
        message: res.message || `Deleted ${count} frame(s) successfully.`,
      });
      setSelectedFrameIds(new Set());
      loadData();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Bulk Delete Failed', message: err.message });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkSplit = async (split: string) => {
    if (selectedFrameIds.size === 0) return;
    try {
      await api.bulkUpdateFrames({ frame_ids: Array.from(selectedFrameIds), split });
      addNotification({
        type: 'success',
        title: 'Split Assigned',
        message: `Assigned ${selectedFrameIds.size} frame(s) to ${split.toUpperCase()}`,
      });
      setSelectedFrameIds(new Set());
      loadData();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Bulk Update Failed', message: err.message });
    }
  };

  const handleDeduplicate = async () => {
    if (!activeProjectId) return;
    try {
      const res = await api.deduplicateFrames(activeProjectId);
      addNotification({
        type: 'success',
        title: 'Deduplication Complete',
        message: res.message || 'Duplicate frames removed.',
      });
      setSelectedFrameIds(new Set());
      loadData();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Deduplication Failed', message: err.message });
    }
  };

  // Real-Time Live Polling Frame Extraction
  const handleExtract = async () => {
    if (!selectedVideoId) {
      addNotification({ type: 'warning', title: 'No Video Selected', message: 'Please select a source video first' });
      return;
    }
    setExtracting(true);
    setExtractionProgress(0);
    setExtractionMessage('Initializing frame extraction engine...');
    setSelectedFrameIds(new Set());

    try {
      const payload: any = {
        video_id: selectedVideoId,
        mode: timeSelectionMode === 'custom_timestamps' ? 'custom_timestamps' : mode,
        interval_value: intervalVal,
        min_sharpness: minSharpness,
        deduplicate,
        use_crop: useCrop,
        clear_existing: clearExisting,
      };

      if (timeSelectionMode === 'range') {
        payload.start_time = Math.max(0, startTime);
        payload.end_time = Math.min(selectedVideo?.duration || 999999, Math.max(startTime, endTime));
      } else if (timeSelectionMode === 'custom_timestamps') {
        const ts = customTimestampsStr
          .split(',')
          .map((s) => parseFloat(s.trim()))
          .filter((n) => !isNaN(n) && n >= 0);
        if (ts.length === 0) {
          addNotification({
            type: 'warning',
            title: 'No Timestamps Provided',
            message: 'Please enter at least one valid timestamp in seconds',
          });
          setExtracting(false);
          return;
        }
        payload.custom_timestamps = ts;
      } else {
        payload.start_time = 0;
        payload.end_time = selectedVideo?.duration || 0;
      }

      const res = await api.extractFrames(payload);
      const jobId = res.job_id;

      addNotification({
        type: 'info',
        title: 'Extraction In Progress',
        message: `Extracting frames (${timeSelectionMode === 'range' ? `${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s` : timeSelectionMode}) with live updates...`,
      });

      // Poll background job every 700ms for true live progress
      const pollInterval = setInterval(async () => {
        try {
          const job = await api.getJob(jobId);
          if (job) {
            setExtractionProgress(job.progress || 0);
            if (job.message) setExtractionMessage(job.message);

            // Periodically refresh frames list so user sees extracted frames appearing live!
            if ((job.progress || 0) > 5 && Math.random() > 0.5) {
              api.getFrames(activeProjectId, 0, 2000, splitFilter, statusFilter).then(setFrames);
            }

            if (job.status === 'completed') {
              clearInterval(pollInterval);
              setExtracting(false);
              setExtractionProgress(null);
              addNotification({
                type: 'success',
                title: 'Extraction Complete!',
                message: job.message || 'All target frames successfully extracted.',
              });
              loadData();
            } else if (job.status === 'failed') {
              clearInterval(pollInterval);
              setExtracting(false);
              setExtractionProgress(null);
              addNotification({
                type: 'error',
                title: 'Extraction Failed',
                message: job.error_detail || 'Error during extraction.',
              });
            }
          }
        } catch (err) {
          console.error('Job polling error:', err);
        }
      }, 700);
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Extraction Failed', message: err.message });
      setExtracting(false);
      setExtractionProgress(null);
    }
  };

  const handleReviewStatus = async (frameId: string, status: 'approved' | 'rejected') => {

    try {

      await api.reviewFrame(frameId, status);

      setFrames((prev) => prev.map((f) => (f.id === frameId ? { ...f, status } : f)));

    } catch (err: any) {

      addNotification({ type: 'error', title: 'Review Failed', message: err.message });

    }

  };

  const handleDeleteFrame = async (frameId: string) => {

    try {

      await api.deleteFrame(frameId);

      setFrames((prev) => prev.filter((f) => f.id !== frameId));

      addNotification({ type: 'info', title: 'Frame Deleted' });

    } catch (err: any) {

      addNotification({ type: 'error', title: 'Delete Failed', message: err.message });

    }

  };

  return (

    <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* Top Bar */}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">

        <div>

          <h2 className="text-lg font-bold text-white tracking-tight">Frame Studio & Deduplication</h2>

          <p className="text-xs text-slate-400 mt-0.5">

            Extract high-fidelity image sequences, filter out blurry or redundant frames, and inspect contact sheets

          </p>

        </div>

        <div className="flex items-center gap-3">

          <button

            onClick={() => setShowContactSheet(true)}

            className="flex items-center gap-2 px-3 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all"

          >

            <FileSpreadsheet className="w-3.5 h-3.5 text-brand-400" />

            <span>Contact Sheet</span>

          </button>

          <button

            onClick={() => setStage('annotation')}

            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all"

          >

            <span>Annotate Frames</span>

            <ArrowRight className="w-3.5 h-3.5" />

          </button>

        </div>

      </div>

      {/* Extraction Configuration Panel */}

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">

        <div className="flex items-center justify-between pb-3 border-b border-slate-800">

          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">

            <Sliders className="w-4 h-4 text-brand-400" />

            Extraction Configuration Parameters

          </h3>

          <span className="text-[11px] text-slate-400">OpenCV Native Engine</span>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">

          {/* Video Selector */}

          <div>

            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Source Video</label>

            <select

              value={selectedVideoId}

              onChange={(e) => setSelectedVideoId(e.target.value)}

              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"

            >

              {videos.map((v) => (

                <option key={v.id} value={v.id}>

                  {v.original_filename} ({v.duration}s)

                </option>

              ))}

            </select>

          </div>

          {/* Mode */}

          <div>

            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Extraction Mode</label>

            <select
              value={mode}
              onChange={(e) => {
                const val = e.target.value;
                setMode(val);
                if (val === 'all_frames') {
                  setIntervalVal(1);
                  setDeduplicate(false);
                  setMinSharpness(0);
                  setTimeSelectionMode('full');
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
            >
              <option value="all_frames">⚡ All Raw Frames (100% - Every Single Frame)</option>
              <option value="interval_frame">Interval (Every N Frames)</option>
              <option value="interval_sec">Interval (Every N Seconds)</option>
              <option value="fps">Target FPS (e.g. 1 frame/sec)</option>
            </select>

          </div>

          {/* Value */}

          <div>

            <label className="text-[11px] font-semibold text-slate-300 block mb-1">

              Interval Value: <span className="font-mono text-brand-400">{intervalVal}</span>

            </label>

            <input

              type="number"

              min="0.1"

              step="0.5"

              value={intervalVal}

              onChange={(e) => setIntervalVal(parseFloat(e.target.value) || 1.0)}

              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"

            />

          </div>

          {/* Sharpness Threshold */}

          <div>

            <label className="text-[11px] font-semibold text-slate-300 block mb-1">

              Min Sharpness: <span className="font-mono text-indigo-400">{minSharpness}</span>

            </label>

            <input

              type="number"

              min="0"

              step="5"

              value={minSharpness}

              onChange={(e) => setMinSharpness(parseFloat(e.target.value) || 0)}

              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"

            />

          </div>

          {/* Checkboxes & Run Button */}

          <div className="flex flex-col justify-end gap-2">

            <div className="flex items-center gap-3 text-[11px] text-slate-300">

              <label className="flex items-center gap-1.5 cursor-pointer">

                <input

                  type="checkbox"

                  checked={deduplicate}

                  onChange={(e) => setDeduplicate(e.target.checked)}

                  className="rounded text-brand-500"

                />

                <span>Deduplicate</span>

              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">

                <input

                  type="checkbox"

                  checked={useCrop}

                  onChange={(e) => setUseCrop(e.target.checked)}

                  className="rounded text-brand-500"

                />

                <span>Apply Crop</span>

              </label>

            </div>

            <button

              onClick={handleExtract}

              disabled={extracting}

              className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"

            >

              <Film className="w-3.5 h-3.5" />

              <span>{extracting ? 'Extracting...' : 'Extract Frames'}</span>

            </button>

          </div>

        </div>

        {/* Custom Time Selection Section */}

        <div className="pt-4 border-t border-slate-800 space-y-3">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">

            <div className="flex items-center gap-2">

              <Clock className="w-4 h-4 text-brand-400" />

              <span className="text-xs font-bold text-white uppercase tracking-wider">

                Time Window & Temporal Selection

              </span>

              <span className="text-[11px] text-slate-400 hidden md:inline">

                • Target specific seconds, intervals, or timestamps

              </span>

            </div>

            {/* Selection Mode Pills */}

            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">

              <button

                onClick={() => setTimeSelectionMode('range')}

                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${

                  timeSelectionMode === 'range'

                    ? 'bg-brand-600 text-white shadow-sm'

                    : 'text-slate-400 hover:text-white'

                }`}

              >

                <Scissors className="w-3.5 h-3.5" />

                <span>Time Range</span>

              </button>

              <button

                onClick={() => {

                  setTimeSelectionMode('full');

                  if (selectedVideo) {

                    setStartTime(0);

                    setEndTime(selectedVideo.duration || 0);

                  }

                }}

                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${

                  timeSelectionMode === 'full'

                    ? 'bg-brand-600 text-white shadow-sm'

                    : 'text-slate-400 hover:text-white'

                }`}

              >

                <Timer className="w-3.5 h-3.5" />

                <span>Full Video</span>

              </button>

              <button

                onClick={() => setTimeSelectionMode('custom_timestamps')}

                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${

                  timeSelectionMode === 'custom_timestamps'

                    ? 'bg-brand-600 text-white shadow-sm'

                    : 'text-slate-400 hover:text-white'

                }`}

              >

                <span>Specific Timestamps</span>

              </button>

            </div>

          </div>

          {/* Mode 1: Time Range */}

          {timeSelectionMode === 'range' && (

            <div className="bg-slate-850/70 border border-slate-800 rounded-xl p-4 space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Start Time Box */}

                <div className="bg-slate-900/80 border border-slate-750 p-3 rounded-xl flex items-center gap-3">

                  {selectedVideo && (

                    <div className="w-20 h-12 bg-black rounded-lg overflow-hidden border border-slate-700 flex-shrink-0 relative group">

                      <img

                        src={`/api/v1/videos/${selectedVideo.id}/frame-preview?timestamp_sec=${startTime}`}

                        alt="Start frame preview"

                        className="w-full h-full object-cover"

                        loading="lazy"

                      />

                      <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono bg-black/80 px-1 rounded text-slate-300">

                        START

                      </span>

                    </div>

                  )}

                  <div className="flex-1 space-y-1">

                    <div className="flex items-center justify-between text-xs">

                      <label className="font-semibold text-slate-300">

                        Start Time: <span className="font-mono text-brand-400">{startTime.toFixed(2)}s</span>

                      </label>

                      <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">

                        {formatTime(startTime)}

                      </span>

                    </div>

                    <div className="flex items-center gap-2">

                      <input

                        type="range"

                        min="0"

                        max={endTime > 0 ? endTime : selectedVideo?.duration || 100}

                        step="0.1"

                        value={startTime}

                        onChange={(e) => {

                          const val = parseFloat(e.target.value);

                          setStartTime(Math.min(val, endTime));

                        }}

                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer"

                      />

                      <input

                        type="number"

                        min="0"

                        max={endTime}

                        step="0.5"

                        value={startTime}

                        onChange={(e) => {

                          const val = parseFloat(e.target.value) || 0;

                          setStartTime(Math.max(0, Math.min(val, endTime)));

                        }}

                        className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white text-right font-mono outline-none"

                      />

                    </div>

                  </div>

                </div>

                {/* End Time Box */}

                <div className="bg-slate-900/80 border border-slate-750 p-3 rounded-xl flex items-center gap-3">

                  {selectedVideo && (

                    <div className="w-20 h-12 bg-black rounded-lg overflow-hidden border border-slate-700 flex-shrink-0 relative group">

                      <img

                        src={`/api/v1/videos/${selectedVideo.id}/frame-preview?timestamp_sec=${endTime}`}

                        alt="End frame preview"

                        className="w-full h-full object-cover"

                        loading="lazy"

                      />

                      <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono bg-black/80 px-1 rounded text-slate-300">

                        END

                      </span>

                    </div>

                  )}

                  <div className="flex-1 space-y-1">

                    <div className="flex items-center justify-between text-xs">

                      <label className="font-semibold text-slate-300">

                        End Time: <span className="font-mono text-emerald-400">{endTime.toFixed(2)}s</span>

                      </label>

                      <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">

                        {formatTime(endTime)}

                      </span>

                    </div>

                    <div className="flex items-center gap-2">

                      <input

                        type="range"

                        min={startTime}

                        max={selectedVideo?.duration || 100}

                        step="0.1"

                        value={endTime}

                        onChange={(e) => {

                          const val = parseFloat(e.target.value);

                          setEndTime(Math.max(startTime, val));

                        }}

                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer"

                      />

                      <input

                        type="number"

                        min={startTime}

                        max={selectedVideo?.duration || 9999}

                        step="0.5"

                        value={endTime}

                        onChange={(e) => {

                          const val = parseFloat(e.target.value) || 0;

                          setEndTime(Math.max(startTime, val));

                        }}

                        className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white text-right font-mono outline-none"

                      />

                    </div>

                  </div>

                </div>

              </div>

              {/* Visual Timeline Range Bar */}

              {selectedVideo && selectedVideo.duration > 0 && (

                <div className="space-y-1">

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">

                    <span>0.00s</span>

                    <span>

                      Window: <strong className="text-white">{(endTime - startTime).toFixed(2)}s</strong> ({Math.round(((endTime - startTime) / selectedVideo.duration) * 100)}% of video)

                    </span>

                    <span>{selectedVideo.duration.toFixed(2)}s</span>

                  </div>

                  <div className="w-full h-2.5 bg-slate-800 rounded-full relative overflow-hidden">

                    <div

                      className="absolute top-0 bottom-0 bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full shadow-md"

                      style={{

                        left: `${(startTime / selectedVideo.duration) * 100}%`,

                        width: `${Math.max(1, ((endTime - startTime) / selectedVideo.duration) * 100)}%`,

                      }}

                    />

                  </div>

                </div>

              )}

              {/* Quick Actions & Estimation row */}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">

                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">

                  <span className="text-slate-400 mr-1">Quick Presets:</span>

                  <button

                    onClick={() => {

                      if (selectedVideo) {

                        setStartTime(selectedVideo.trim_start || 0);

                        setEndTime(selectedVideo.trim_end || selectedVideo.duration || 0);

                        addNotification({

                          type: 'info',

                          title: 'Trim Synced',

                          message: 'Applied start/end trim configured in Video Lab',

                        });

                      }

                    }}

                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-brand-300 rounded-lg border border-brand-500/30 font-medium transition-all flex items-center gap-1"

                    title="Load trim from Video Lab"

                  >

                    <Scissors className="w-3 h-3" />

                    <span>Sync Video Lab Trim</span>

                  </button>

                  <button

                    onClick={() => {

                      if (selectedVideo) {

                        setStartTime(0);

                        setEndTime(Math.min(30, selectedVideo.duration || 30));

                      }

                    }}

                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"

                  >

                    First 30s

                  </button>

                  <button

                    onClick={() => {

                      if (selectedVideo) {

                        const mid = (selectedVideo.duration || 60) / 2;

                        setStartTime(Math.max(0, mid - 30));

                        setEndTime(Math.min(selectedVideo.duration || 60, mid + 30));

                      }

                    }}

                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"

                  >

                    Middle 60s

                  </button>

                  <button

                    onClick={() => {

                      if (selectedVideo) {

                        setStartTime(Math.max(0, (selectedVideo.duration || 30) - 30));

                        setEndTime(selectedVideo.duration || 30);

                      }

                    }}

                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"

                  >

                    Last 30s

                  </button>

                  <button

                    onClick={() => {

                      if (selectedVideo) {

                        setStartTime(0);

                        setEndTime(selectedVideo.duration || 0);

                      }

                    }}

                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all flex items-center gap-1"

                  >

                    <RotateCcw className="w-3 h-3" />

                    <span>Reset Full</span>

                  </button>

                </div>

                {/* Estimate Output Counter */}

                <div className="flex items-center gap-2 text-xs font-medium bg-slate-900/90 border border-slate-750 px-3 py-1.5 rounded-xl">

                  <Film className="w-3.5 h-3.5 text-brand-400" />

                  <span className="text-slate-400">Estimated Output:</span>

                  <span className="font-mono font-bold text-white">~{getEstimatedFrameCount()} frames</span>

                </div>

              </div>

            </div>

          )}

          {/* Mode 2: Full Video */}

          {timeSelectionMode === 'full' && (

            <div className="bg-slate-850/50 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">

              <div className="flex items-center gap-2 text-slate-300">

                <Timer className="w-4 h-4 text-emerald-400" />

                <span>

                  Extracting across entire duration: <strong className="text-white">0.00s — {selectedVideo?.duration || 0}s</strong> ({formatTime(selectedVideo?.duration || 0)})

                </span>

              </div>

              <div className="font-mono text-brand-400 font-semibold">

                Estimated Output: ~{getEstimatedFrameCount()} frames

              </div>

            </div>

          )}

          {/* Mode 3: Specific Timestamps */}

          {timeSelectionMode === 'custom_timestamps' && (

            <div className="bg-slate-850/70 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">

              <div>

                <label className="text-[11px] font-semibold text-slate-300 block mb-1">

                  Custom Timestamps (Seconds, Comma-Separated)

                </label>

                <input

                  type="text"

                  placeholder="e.g. 2.5, 10.0, 15.2, 33.0, 60.5, 120.0"

                  value={customTimestampsStr}

                  onChange={(e) => setCustomTimestampsStr(e.target.value)}

                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 outline-none"

                />

              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">

                <div className="flex items-center gap-2 text-[11px]">

                  <span className="text-slate-400">Helper:</span>

                  <button

                    onClick={() => {

                      if (!selectedVideo) return;

                      const d = selectedVideo.duration || 60;

                      const sample = [];

                      for (let t = 5; t < d; t += 10) {

                        sample.push(t.toFixed(1));

                      }

                      setCustomTimestampsStr(sample.join(', '));

                    }}

                    className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg border border-slate-700"

                  >

                    Every 10s Sample

                  </button>

                  <button

                    onClick={() => setCustomTimestampsStr('')}

                    className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-lg border border-slate-700"

                  >

                    Clear

                  </button>

                </div>

                <div className="font-mono text-brand-400 font-semibold">

                  Valid Timestamps: {getEstimatedFrameCount()}

                </div>

              </div>

            </div>

          )}

        </div>

      </div>

      
        {/* Live Extraction Progress Banner */}
        {extracting && (
          <div className="p-4 bg-gradient-to-r from-brand-950/70 via-slate-900 to-slate-900 border border-brand-500/50 rounded-2xl space-y-2.5 shadow-xl shadow-brand-950/60 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-brand-300 font-bold">
                <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                <span className="uppercase tracking-wider">Live Extraction In Progress</span>
              </div>
              <span className="font-mono text-brand-200 font-black text-sm">
                {Math.round(extractionProgress || 0)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-brand-500 via-indigo-500 to-teal-400 transition-all duration-300 rounded-full shadow-sm shadow-brand-500/50"
                style={{ width: `${Math.max(5, extractionProgress || 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-medium text-slate-300 truncate max-w-[70%]">{extractionMessage || 'Processing video stream...'}</span>
              <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                Live Gallery Sync
              </span>
            </div>
          </div>
        )}

      {/* Frame Gallery */}

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">

          <div className="flex items-center gap-3">

            <h3 className="text-sm font-bold text-white flex items-center gap-2">

              <Film className="w-4 h-4 text-brand-400" />

              Extracted Frames Gallery ({frames.length})

            </h3>

            <button onClick={loadData} className="text-slate-400 hover:text-white p-1" title="Refresh Frames">

              <RefreshCw className="w-3.5 h-3.5" />

            </button>

            <button

              onClick={handleDeduplicate}

              className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg transition-all"

              title="Remove duplicate timestamp frames"

            >

              <Sparkles className="w-3.5 h-3.5" />

              <span>Deduplicate</span>

            </button>

          </div>

          {/* Filters */}

          <div className="flex items-center gap-2 text-xs">

            <select

              value={splitFilter}

              onChange={(e) => setSplitFilter(e.target.value)}

              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 outline-none"

            >

              <option value="">All Splits</option>

              <option value="train">Train</option>

              <option value="val">Val</option>

              <option value="test">Test</option>

            </select>

            <select

              value={statusFilter}

              onChange={(e) => setStatusFilter(e.target.value)}

              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 outline-none"

            >

              <option value="">All Statuses</option>

              <option value="unreviewed">Unreviewed</option>

              <option value="approved">Approved</option>

              <option value="rejected">Rejected</option>

            </select>

          </div>

        </div>

        {/* Bulk Action Controls */}

        {frames.length > 0 && (

          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-slate-850/90 rounded-xl border border-slate-800 text-xs shadow-inner">

            <div className="flex items-center gap-2">

              <button

                onClick={selectedFrameIds.size === frames.length ? deselectAllFrames : selectAllFrames}

                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition-all flex items-center gap-1.5 font-medium"

              >

                <CheckSquare className="w-3.5 h-3.5 text-brand-400" />

                <span>{selectedFrameIds.size === frames.length ? 'Deselect All' : `Select All (${frames.length})`}</span>

              </button>

              <button

                onClick={selectDuplicateFrames}

                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30 transition-all flex items-center gap-1.5 font-medium"

                title="Select all duplicate frames marked DUP"

              >

                <Copy className="w-3.5 h-3.5" />

                <span>Select Duplicates</span>

              </button>

              {selectedFrameIds.size > 0 && (

                <span className="text-brand-300 font-semibold px-2 py-0.5 bg-brand-500/10 border border-brand-500/30 rounded-md">

                  {selectedFrameIds.size} frame(s) selected

                </span>

              )}

            </div>

            {selectedFrameIds.size > 0 && (

              <div className="flex items-center gap-2">

                {/* Bulk Split Selector */}

                <select

                  onChange={(e) => {

                    if (e.target.value) {

                      handleBulkSplit(e.target.value);

                      e.target.value = '';

                    }

                  }}

                  defaultValue=""

                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300 outline-none text-xs"

                >

                  <option value="" disabled>Assign Split...</option>

                  <option value="train">Train</option>

                  <option value="val">Val</option>

                  <option value="test">Test</option>

                  <option value="unassigned">Unassigned</option>

                </select>

                {/* Bulk Delete Button */}

                <button

                  onClick={handleBulkDelete}

                  disabled={bulkDeleting}

                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-all shadow-md shadow-rose-900/40 flex items-center gap-1.5 disabled:opacity-50"

                  title="Permanently delete selected frames and their files"

                >

                  <Trash2 className="w-3.5 h-3.5" />

                  <span>{bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedFrameIds.size})`}</span>

                </button>

              </div>

            )}

          </div>

        )}

        {frames.length === 0 ? (

          <div className="py-16 text-center text-xs text-slate-500">

            No frames extracted yet. Configure parameters above and click 'Extract Frames'.

          </div>

        ) : (

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">

            {frames.map((f) => (

              <div

                key={f.id}

                className={`group relative bg-slate-850 rounded-xl overflow-hidden border transition-all ${

                  f.status === 'approved'

                    ? 'border-emerald-500/50'

                    : f.status === 'rejected'

                    ? 'border-rose-500/50 opacity-60'

                    : 'border-slate-800 hover:border-slate-700'

                }`}

              >

                {/* Thumbnail Image */}

                <div

                  className="aspect-video bg-black cursor-pointer overflow-hidden relative"

                  onClick={() => setSelectedFrame(f)}

                >

                  <img

                    src={`/api/v1/files/raw?path=${encodeURIComponent(f.thumbnail_path || f.file_path)}`}

                    alt="Frame thumbnail"

                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"

                    loading="lazy"

                  />

                                    {/* Bulk Selection Checkbox */}
                  <div
                    className="absolute top-1 right-1 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFrameSelection(f.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFrameIds.has(f.id)}
                      onChange={() => toggleFrameSelection(f.id)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900/90 text-brand-500 focus:ring-brand-500 cursor-pointer shadow"
                    />
                  </div>

                  {/* Badges */}
                  <div className="absolute top-1 left-1 flex gap-1">

                    <span className="text-[9px] font-mono bg-black/70 text-white px-1 rounded backdrop-blur-sm">

                      {f.timestamp_sec.toFixed(2)}s

                    </span>

                    {f.is_duplicate && (

                      <span className="text-[9px] font-semibold bg-amber-500/90 text-black px-1 rounded">

                        DUP

                      </span>

                    )}

                  </div>

                  <div className="absolute bottom-1 right-1">

                    <span className="text-[9px] font-mono bg-black/70 text-slate-300 px-1 rounded">

                      {Math.round(f.sharpness_score)} Q

                    </span>

                  </div>

                </div>

                {/* Footer Controls */}

                <div className="p-2 flex items-center justify-between text-xs bg-slate-900/90 border-t border-slate-800/80">

                  <div className="text-[10px] text-slate-400 font-mono">

                    {f.annotation_count || 0} box

                  </div>

                  <div className="flex items-center gap-1">

                    <button

                      onClick={() => handleReviewStatus(f.id, 'approved')}

                      title="Approve"

                      className={`p-1 rounded hover:bg-slate-800 ${

                        f.status === 'approved' ? 'text-emerald-400' : 'text-slate-500'

                      }`}

                    >

                      <CheckCircle2 className="w-3.5 h-3.5" />

                    </button>

                    <button

                      onClick={() => handleReviewStatus(f.id, 'rejected')}

                      title="Reject"

                      className={`p-1 rounded hover:bg-slate-800 ${

                        f.status === 'rejected' ? 'text-rose-400' : 'text-slate-500'

                      }`}

                    >

                      <XCircle className="w-3.5 h-3.5" />

                    </button>

                    <button

                      onClick={() => handleDeleteFrame(f.id)}

                      title="Delete Frame"

                      className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400"

                    >

                      <Trash2 className="w-3 h-3" />

                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* Frame Preview Modal */}

      {selectedFrame && (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"

          onClick={() => setSelectedFrame(null)}

        >

          <div

            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-4 shadow-2xl space-y-3"

            onClick={(e) => e.stopPropagation()}

          >

            <div className="flex items-center justify-between text-xs text-white">

              <span className="font-bold">Frame Inspector</span>

              <span className="font-mono text-slate-400">

                Timestamp: {selectedFrame.timestamp_sec.toFixed(3)}s &bull; Sharpness: {selectedFrame.sharpness_score}

              </span>

            </div>

            <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">

              <img

                src={`/api/v1/files/raw?path=${encodeURIComponent(selectedFrame.file_path)}`}

                alt="Frame Full"

                className="w-full h-full object-contain"

              />

            </div>

            <div className="flex justify-end gap-2">

              <button

                onClick={() => setSelectedFrame(null)}

                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"

              >

                Close

              </button>

              <button

                onClick={() => {

                  setSelectedFrame(null);

                  setStage('annotation');

                }}

                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold"

              >

                Open in Annotation Canvas

              </button>

            </div>

          </div>

        </div>

      )}

      {/* Contact Sheet Modal */}

      {showContactSheet && (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"

          onClick={() => setShowContactSheet(false)}

        >

          <div

            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-4 shadow-2xl space-y-3"

            onClick={(e) => e.stopPropagation()}

          >

            <div className="flex items-center justify-between text-xs text-white">

              <span className="font-bold">Video Sequence Contact Sheet Mosaic</span>

              <button onClick={() => setShowContactSheet(false)} className="text-slate-400 hover:text-white">

                ✕

              </button>

            </div>

            <div className="max-h-[70vh] overflow-y-auto bg-black rounded-xl p-2 flex items-center justify-center">

              <img

                src={`/api/v1/frames/contact-sheet?project_id=${activeProjectId}`}

                alt="Contact sheet"

                className="w-full h-auto object-contain"

              />

            </div>

          </div>

        </div>

      )}

    </div>

  );

};

