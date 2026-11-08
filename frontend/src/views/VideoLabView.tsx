import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  Video as VideoIcon,
  Upload,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Crop,
  Sliders,
  Sparkles,
  ArrowRight,
  Check,
  RefreshCw,
  FileVideo,
  Clock,
  Layers,
  Image as ImageIcon,
  MonitorPlay,
} from 'lucide-react';

export const VideoLabView: React.FC = () => {
  const { activeProjectId, activeProject, setStage, addNotification } = useAppStore();

  const [videos, setVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [previewMode, setPreviewMode] = useState<'video' | 'frame'>('video');

  // Crop rectangle state (Normalized 0.0 to 1.0)
  const [cropBox, setCropBox] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [aspectRatio, setAspectRatio] = useState<string>('custom');
  const [presets, setPresets] = useState<any[]>([]);
  const [presetName, setPresetName] = useState('');
  const [processingCrop, setProcessingCrop] = useState(false);

  const loadVideos = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const data = await api.getVideos(activeProjectId);
      setVideos(data);
      if (data.length > 0 && !selectedVideo) {
        setSelectedVideo(data[0]);
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Failed to load videos', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadPresets = async () => {
    try {
      const p = await api.getCropPresets();
      setPresets(p);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadVideos();
    loadPresets();
  }, [activeProjectId]);

  useEffect(() => {
    if (selectedVideo) {
      setVideoError(false);
      setCurrentTime(selectedVideo.trim_start || 0);
      setDuration(selectedVideo.duration || 0);
      setTrimStart(selectedVideo.trim_start || 0);
      setTrimEnd(selectedVideo.trim_end || selectedVideo.duration || 10);
      if (selectedVideo.crop_box && selectedVideo.crop_box.w > 0) {
        setCropBox(selectedVideo.crop_box);
      }
      if (videoRef.current) {
        videoRef.current.load();
      }
    }
  }, [selectedVideo]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;

    setUploading(true);
    try {
      const vid = await api.uploadVideo(activeProjectId, file);
      addNotification({ type: 'success', title: 'Video Uploaded', message: file.name });
      await loadVideos();
      setSelectedVideo(vid);
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Upload Failed', message: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateSynthetic = async () => {
    if (!activeProjectId) return;
    setUploading(true);
    try {
      const vid = await api.generateSyntheticVideo(activeProjectId, 'sample_traffic_cctv.mp4', 120, 24);
      addNotification({ type: 'success', title: 'Synthetic Video Generated', message: 'Ready for ROI crop & extraction' });
      await loadVideos();
      setSelectedVideo(vid);
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Generation Failed', message: err.message });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isPlaying && (previewMode === 'frame' || videoError)) {
      const fps = selectedVideo?.fps || 24;
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return Math.min(duration, prev + 1 / fps);
        });
      }, 1000 / fps);
    }
    return () => clearInterval(interval);
  }, [isPlaying, previewMode, videoError, duration, selectedVideo?.fps]);

  const togglePlay = () => {
    if (previewMode === 'frame' || videoError) {
      setIsPlaying(!isPlaying);
      return;
    }
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback error, falling back to frame engine:', err);
          setIsPlaying(false);
          setVideoError(true);
        });
    }
  };

  const stepFrame = (delta: number) => {
    const fps = selectedVideo?.fps || 24;
    const nextTime = Math.max(0, Math.min(duration, currentTime + delta / fps));
    setCurrentTime(nextTime);
    if (videoRef.current && !videoError && previewMode === 'video') {
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime = nextTime;
    }
  };

  const applyAspectRatio = (ratio: string) => {
    setAspectRatio(ratio);
    if (ratio === '1:1') {
      const size = Math.min(cropBox.w, cropBox.h);
      setCropBox({ ...cropBox, w: size, h: size });
    } else if (ratio === '16:9') {
      const w = cropBox.w;
      const h = Math.min(1.0, (w * 9) / 16);
      setCropBox({ ...cropBox, w, h });
    } else if (ratio === '4:3') {
      const w = cropBox.w;
      const h = Math.min(1.0, (w * 3) / 4);
      setCropBox({ ...cropBox, w, h });
    } else if (ratio === 'reset') {
      setCropBox({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
    }
  };

  const handleProcessCrop = async () => {
    if (!selectedVideo) return;
    setProcessingCrop(true);
    try {
      const res = await api.cropVideo(selectedVideo.id, {
        crop_box: { ...cropBox, normalized: true },
        trim_start: trimStart,
        trim_end: trimEnd,
      });
      addNotification({ type: 'success', title: 'Crop Configured', message: 'Video crop and trim queued.' });
      loadVideos();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Crop Failed', message: err.message });
    } finally {
      setProcessingCrop(false);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;
    try {
      await api.createCropPreset({
        name: presetName,
        x: cropBox.x,
        y: cropBox.y,
        width: cropBox.w,
        height: cropBox.h,
        is_normalized: true,
        aspect_ratio: aspectRatio,
      });
      addNotification({ type: 'success', title: 'Preset Saved', message: `Saved '${presetName}'` });
      setPresetName('');
      loadPresets();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Failed to save preset', message: err.message });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e5ea] dark:border-white/[0.08]">
        <div>
          <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white tracking-tight">Video Ingestion & Crop Lab</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Trim video sequences, define normalized ROI crop bounding boxes, and save reusable camera presets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateSynthetic}
            disabled={uploading}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Demo Video</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-semibold shadow-md shadow-[#0071e3]/25 cursor-pointer transition-all active:scale-95">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? 'Uploading...' : 'Upload Video'}</span>
            <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Video List */}
        <div className="bg-white dark:bg-[#121826]/90 border border-[#e5e5ea] dark:border-white/[0.08] rounded-3xl p-4 shadow-sm flex flex-col h-[640px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#e5e5ea] dark:border-white/[0.06] text-xs font-bold text-[#1d1d1f] dark:text-white">
            <span className="flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-[#0071e3]" />
              Source Videos ({videos.length})
            </span>
            <button onClick={loadVideos} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
            {videos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
                <VideoIcon className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                <span>No videos uploaded in this project yet.</span>
                <span className="text-[11px] text-slate-500 mt-1">Upload an MP4 or click 'Generate Demo Video'</span>
              </div>
            ) : (
              videos.map((vid) => {
                const isSel = selectedVideo?.id === vid.id;
                return (
                  <div
                    key={vid.id}
                    onClick={() => setSelectedVideo(vid)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSel
                        ? 'border-[#0071e3] bg-[#0071e3]/10 dark:bg-blue-950/20 text-[#1d1d1f] dark:text-white shadow-sm'
                        : 'border-[#e5e5ea] dark:border-white/[0.06] bg-[#f6f3f5] dark:bg-white/[0.02] hover:bg-[#eaeaea] dark:hover:bg-white/[0.05] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold truncate max-w-[190px]">{vid.original_filename}</div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {vid.codec}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                      <span>{vid.width}x{vid.height} @ {vid.fps} fps</span>
                      <span>{vid.duration}s</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (2 cols): Interactive Video Player & Visual Crop */}
        <div className="lg:col-span-2 bg-white dark:bg-[#121826]/90 border border-[#e5e5ea] dark:border-white/[0.08] rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          {selectedVideo ? (
            <div className="space-y-4">
              {/* Video Preview Container with Rectangular Crop Overlay */}
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                {previewMode === 'frame' || videoError ? (
                  <img
                    src={`/api/v1/videos/${selectedVideo.id}/frame-preview?timestamp_sec=${currentTime.toFixed(2)}`}
                    alt="Frame preview"
                    className="w-full h-full object-contain pointer-events-none select-none"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    key={selectedVideo.id}
                    src={`/api/v1/videos/${selectedVideo.id}/stream`}
                    poster={`/api/v1/videos/${selectedVideo.id}/frame-preview?timestamp_sec=0`}
                    preload="auto"
                    playsInline
                    muted
                    onError={() => {
                      console.warn('HTML5 video error, switching to precision frame mode');
                      setVideoError(true);
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={() => {
                      if (videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime);
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (videoRef.current && videoRef.current.duration) {
                        setDuration(videoRef.current.duration);
                      } else if (selectedVideo.duration) {
                        setDuration(selectedVideo.duration);
                      }
                    }}
                    className="w-full h-full object-contain"
                  />
                )}

                {/* Engine Mode Badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                  {videoError ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/90 text-black text-[10px] font-bold shadow">
                      Precision Frame Engine (Fallback)
                    </span>
                  ) : previewMode === 'frame' ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/90 text-black text-[10px] font-bold shadow">
                      Precision Frame Engine
                    </span>
                  ) : null}
                </div>

                {/* Interactive Visual Crop Rectangle Overlay */}
                <div
                  className="absolute border-2 border-brand-400 bg-brand-500/15 pointer-events-none transition-all shadow-2xl"
                  style={{
                    left: `${cropBox.x * 100}%`,
                    top: `${cropBox.y * 100}%`,
                    width: `${cropBox.w * 100}%`,
                    height: `${cropBox.h * 100}%`,
                  }}
                >
                  <div className="absolute top-1 left-1 bg-brand-600/90 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow">
                    ROI Crop ({Math.round(cropBox.w * selectedVideo.width)}x{Math.round(cropBox.h * selectedVideo.height)} px)
                  </div>
                </div>
              </div>

              {/* Player Timeline & Controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                  <span>{currentTime.toFixed(2)}s / {duration.toFixed(2)}s</span>
                  <span>Frame: {Math.round(currentTime * (selectedVideo.fps || 24))} / {selectedVideo.total_frames}</span>
                </div>

                {/* Scrubber */}
                <input
                  type="range"
                  min="0"
                  max={duration || 1}
                  step="0.04"
                  value={currentTime}
                  onChange={(e) => {
                    const t = parseFloat(e.target.value);
                    setCurrentTime(t);
                    if (videoRef.current && previewMode === 'video' && !videoError) {
                      videoRef.current.currentTime = t;
                    }
                  }}
                  className="w-full h-1.5 bg-[#e5e5ea] dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#0071e3]"
                />

                {/* Trimming Scrubbers */}
                <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                      Trim Start: <span className="text-[#1d1d1f] dark:text-white font-mono font-semibold">{trimStart.toFixed(2)}s</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={trimStart}
                      onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#e5e5ea] dark:bg-slate-800 rounded appearance-none cursor-pointer accent-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                      Trim End: <span className="text-[#1d1d1f] dark:text-white font-mono font-semibold">{trimEnd.toFixed(2)}s</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={trimEnd}
                      onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#e5e5ea] dark:bg-slate-800 rounded appearance-none cursor-pointer accent-[#0071e3]"
                    />
                  </div>
                </div>

                {/* Buttons row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => stepFrame(-1)}
                      className="p-2 bg-[#f5f5f7] hover:bg-[#eaeaea] dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white border border-[#e5e5ea] dark:border-transparent transition-colors cursor-pointer"
                      title="Step -1 frame"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="p-2.5 bg-[#0071e3] hover:bg-[#0077ed] rounded-xl text-white shadow-md shadow-[#0071e3]/25 active:scale-95 transition-all cursor-pointer"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => stepFrame(1)}
                      className="p-2 bg-[#f5f5f7] hover:bg-[#eaeaea] dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white border border-[#e5e5ea] dark:border-transparent transition-colors cursor-pointer"
                      title="Step +1 frame"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>

                    {/* Mode Toggle: Video Player vs Precision Frame Engine */}
                    <div className="flex items-center bg-[#f6f3f5] dark:bg-slate-850 p-1 rounded-xl border border-[#e5e5ea] dark:border-slate-800 ml-2">
                      <button
                        onClick={() => {
                          setPreviewMode('video');
                          setVideoError(false);
                          if (videoRef.current) videoRef.current.load();
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          previewMode === 'video' && !videoError
                            ? 'bg-[#0071e3] text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'
                        }`}
                        title="Stream video with HTML5 player"
                      >
                        <MonitorPlay className="w-3.5 h-3.5" />
                        <span>Stream</span>
                      </button>
                      <button
                        onClick={() => setPreviewMode('frame')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          previewMode === 'frame' || videoError
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'
                        }`}
                        title="Precision frame-by-frame rendering"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Frame Engine</span>
                      </button>
                    </div>
                  </div>

                  {/* Aspect Ratio Buttons */}
                  <div className="flex items-center gap-1 text-xs bg-[#f6f3f5] dark:bg-slate-850 p-1 rounded-xl border border-[#e5e5ea] dark:border-slate-800">
                    <button
                      onClick={() => applyAspectRatio('1:1')}
                      className={`px-2 py-1 rounded-lg font-mono text-[11px] transition-colors ${aspectRatio === '1:1' ? 'bg-[#0071e3] text-white font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'}`}
                    >
                      1:1
                    </button>
                    <button
                      onClick={() => applyAspectRatio('16:9')}
                      className={`px-2 py-1 rounded-lg font-mono text-[11px] transition-colors ${aspectRatio === '16:9' ? 'bg-[#0071e3] text-white font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'}`}
                    >
                      16:9
                    </button>
                    <button
                      onClick={() => applyAspectRatio('4:3')}
                      className={`px-2 py-1 rounded-lg font-mono text-[11px] transition-colors ${aspectRatio === '4:3' ? 'bg-[#0071e3] text-white font-semibold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white'}`}
                    >
                      4:3
                    </button>
                    <button
                      onClick={() => applyAspectRatio('reset')}
                      className="px-2 py-1 rounded-lg text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Crop Coordinate Sliders */}
              <div className="bg-[#f6f3f5] dark:bg-white/[0.03] p-4 rounded-2xl border border-[#e5e5ea] dark:border-white/[0.08] space-y-3">
                <div className="text-xs font-bold text-[#1d1d1f] dark:text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Crop className="w-4 h-4 text-[#0071e3]" />
                    ROI Coordinates (Normalized & Pixels)
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    X: {cropBox.x.toFixed(2)} Y: {cropBox.y.toFixed(2)} W: {cropBox.w.toFixed(2)} H: {cropBox.h.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">X Position</label>
                    <input
                      type="range"
                      min="0"
                      max={1 - cropBox.w}
                      step="0.02"
                      value={cropBox.x}
                      onChange={(e) => setCropBox({ ...cropBox, x: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-[#e5e5ea] dark:bg-slate-800 rounded appearance-none accent-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">Y Position</label>
                    <input
                      type="range"
                      min="0"
                      max={1 - cropBox.h}
                      step="0.02"
                      value={cropBox.y}
                      onChange={(e) => setCropBox({ ...cropBox, y: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-[#e5e5ea] dark:bg-slate-800 rounded appearance-none accent-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">Crop Width</label>
                    <input
                      type="range"
                      min="0.1"
                      max={1 - cropBox.x}
                      step="0.02"
                      value={cropBox.w}
                      onChange={(e) => setCropBox({ ...cropBox, w: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-[#e5e5ea] dark:bg-slate-800 rounded appearance-none accent-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">Crop Height</label>
                    <input
                      type="range"
                      min="0.1"
                      max={1 - cropBox.y}
                      step="0.02"
                      value={cropBox.h}
                      onChange={(e) => setCropBox({ ...cropBox, h: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-[#e5e5ea] dark:bg-slate-800 rounded appearance-none accent-[#0071e3]"
                    />
                  </div>
                </div>

                {/* Presets row */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#e5e5ea] dark:border-white/[0.06]">
                  <input
                    type="text"
                    placeholder="New preset name..."
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-[#e5e5ea] dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-[#1d1d1f] dark:text-white placeholder-slate-400 flex-1 outline-none focus:border-[#0071e3]"
                  />
                  <button
                    onClick={handleSavePreset}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-[#e5e5ea] dark:border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Save Preset
                  </button>
                  {presets.length > 0 && (
                    <select
                      onChange={(e) => {
                        const p = presets.find((pr) => pr.id === e.target.value);
                        if (p) setCropBox({ x: p.x, y: p.y, w: p.width, h: p.height });
                      }}
                      className="bg-white dark:bg-slate-800 border border-[#e5e5ea] dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                    >
                      <option value="">Load Preset...</option>
                      {presets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleProcessCrop}
                  disabled={processingCrop}
                  className="px-5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-semibold shadow-md shadow-[#0071e3]/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Crop className="w-4 h-4" />
                  <span>{processingCrop ? 'Processing Crop...' : 'Apply Crop & Trim'}</span>
                </button>

                <button
                  onClick={() => setStage('frame_studio')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-semibold shadow-md shadow-emerald-600/25 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <span>Proceed to Frame Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Select or upload a video on the left to begin ROI cropping and trimming.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
