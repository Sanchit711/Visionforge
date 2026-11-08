import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { api } from '../services/api';
import {
  Sparkles,
  Layers,
  Palette,
  Code2,
  Copy,
  Check,
  Download,
  X,
  Sliders,
  Sun,
  Moon,
  ExternalLink,
  ShieldCheck,
  Eye,
  Box,
  Bot,
  Zap,
  Activity,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';

export const StitchDesignModal: React.FC = () => {
  const { stitchModalOpen, setStitchModalOpen, theme, toggleTheme, addNotification } = useAppStore();
  const [activeTab, setActiveTab] = useState<'tokens' | 'components' | 'spec' | 'ai'>('tokens');
  const [copied, setCopied] = useState(false);

  // Gemini AI Generator state
  const [prompt, setPrompt] = useState('Industrial Conveyor Tachometer & Jitter Telemetry Card');
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generationSource, setGenerationSource] = useState<string>('');
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);

  useEffect(() => {
    if (stitchModalOpen) {
      api.getAiStatus().then(setAiStatus).catch(console.error);
    }
  }, [stitchModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stitchModalOpen) {
        setStitchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stitchModalOpen, setStitchModalOpen]);

  if (!stitchModalOpen) return null;

  const rawDesignMd = `---
name: VisionForge Stitch Design System
version: "1.0.0"
spec: "Stitch DESIGN.md Specification v1"
aesthetic: "Apple-inspired Industrial Glassmorphism with Cupertino Precision"
---

# VisionForge Studio — DESIGN.md

- Surface 0: #080c14 (Root Canvas)
- Surface 1: #0f1524 (Bars & Headers)
- Surface 2: #131b2e (Cards & Panels)
- Surface Glass: rgba(19, 27, 46, 0.75) with backdrop-blur(20px) + 1px specular rim
- Accent Blue: #0071e3 (Stitch Blue)
- Pill Radius: 980px
- Easing: cubic-bezier(0.16, 1, 0.3, 1)
`;

  const handleCopySpec = () => {
    navigator.clipboard.writeText(rawDesignMd);
    setCopied(true);
    addNotification({
      type: 'success',
      title: 'DESIGN.md Copied',
      message: 'Google Stitch design tokens copied to clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSpec = () => {
    const blob = new Blob([rawDesignMd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DESIGN.md';
    a.click();
    URL.revokeObjectURL(url);
    addNotification({
      type: 'info',
      title: 'DESIGN.md Downloaded',
      message: 'Design system manifest saved to your machine.',
    });
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await api.testAiConnection();
      setConnectionResult(res);
      if (res.success) {
        addNotification({
          type: 'success',
          title: 'Gemini API Connected',
          message: `${res.models_count || 'Gemini'} models available.`,
        });
      } else if (res.needs_enablement) {
        addNotification({
          type: 'warning',
          title: 'Gemini API Activation Needed',
          message: `Project ${res.project_id}: please click Enable in Google Cloud Console.`,
        });
      }
    } catch (err: any) {
      setConnectionResult({ success: false, message: err.message });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await api.generateStitchUI(prompt.trim());
      setGeneratedCode(res.generated_code);
      setGenerationSource(res.source);
      addNotification({
        type: 'success',
        title: 'Component Generated',
        message: `Synthesized via ${res.source.toUpperCase()}`,
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Generation Failed',
        message: err.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-[#101625]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Google Stitch UI/UX Integration
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30">
                  DESIGN.md Spec v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Single source of truth for design tokens, Cupertino curves, and Apple glassmorphism
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-500 dark:text-slate-400 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>
            <button
              onClick={() => setStitchModalOpen(false)}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('tokens')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'tokens'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.05]'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Design Tokens & Palette</span>
          </button>

          <button
            onClick={() => setActiveTab('components')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'components'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.05]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Component Sandbox</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.05]'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Gemini AI Generator</span>
            {aiStatus?.configured && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('spec')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'spec'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.05]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>DESIGN.md Spec</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'tokens' && (
            <div className="space-y-6">
              {/* Surface Elevations */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-3 flex items-center gap-2">
                  <Box className="w-4 h-4 text-blue-500" />
                  <span>Stitch 4-Tier Surface Layering</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#080c14] border border-white/10 text-white">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Surface-0 (Canvas)</span>
                    <div className="text-xs font-bold mt-1">#080c14</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Deep root workspace backdrop</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#0f1524] border border-white/10 text-white">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Surface-1 (Bars)</span>
                    <div className="text-xs font-bold mt-1">#0f1524</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Header & Sidebar navigation</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#131b2e] border border-white/10 text-white">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Surface-2 (Cards)</span>
                    <div className="text-xs font-bold mt-1">#131b2e</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Feature & telemetry panels</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/15 text-white shadow-lg">
                    <span className="text-[10px] font-mono text-blue-400 uppercase">Surface-Glass</span>
                    <div className="text-xs font-bold mt-1">Specular 20px Blur</div>
                    <p className="text-[10px] text-slate-300 mt-0.5">Modals, palette & overlays</p>
                  </div>
                </div>
              </div>

              {/* Accent Color Palette */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-3 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-blue-500" />
                  <span>Stitch Semantic Accents</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 font-mono text-[11px]">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                    <div className="w-4 h-4 rounded-full bg-[#0071e3] mb-1.5 shadow-sm" />
                    <div className="font-bold">#0071e3</div>
                    <span className="text-[9px] text-slate-400">Stitch Blue</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <div className="w-4 h-4 rounded-full bg-[#10b981] mb-1.5 shadow-sm" />
                    <div className="font-bold">#10b981</div>
                    <span className="text-[9px] text-slate-400">Ready Emerald</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                    <div className="w-4 h-4 rounded-full bg-[#6366f1] mb-1.5 shadow-sm" />
                    <div className="font-bold">#6366f1</div>
                    <span className="text-[9px] text-slate-400">AI Indigo</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <div className="w-4 h-4 rounded-full bg-[#f59e0b] mb-1.5 shadow-sm" />
                    <div className="font-bold">#f59e0b</div>
                    <span className="text-[9px] text-slate-400">Warning Amber</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                    <div className="w-4 h-4 rounded-full bg-[#f43f5e] mb-1.5 shadow-sm" />
                    <div className="font-bold">#f43f5e</div>
                    <span className="text-[9px] text-slate-400">Alert Rose</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <div className="w-4 h-4 rounded-full bg-[#06b6d4] mb-1.5 shadow-sm" />
                    <div className="font-bold">#06b6d4</div>
                    <span className="text-[9px] text-slate-400">Telemetry Cyan</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'components' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-2.5">Cupertino Pill Buttons (`rounded-full`)</h4>
                <div className="flex flex-wrap items-center gap-3">
                  <button className="stitch-pill bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20">
                    Primary Action Pill
                  </button>
                  <button className="stitch-pill bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Secondary Glass Pill
                  </button>
                  <button className="stitch-pill bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    Success State Pill
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-2.5">Stitch Pulse Badges</h4>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Model Verified (99.50% mAP50)
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Kaggle Dual-T4 Ingest
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-2.5">Glassmorphic Specular Container (`.stitch-glass`)</h4>
                <div className="stitch-glass p-5 rounded-3xl text-slate-800 dark:text-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold">In-Motion Conveyor Telemetry</span>
                    <span className="text-[10px] font-mono text-blue-500">Sub-pixel σ &lt; 0.8px</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Rendered with 20px Gaussian backdrop blur, 1px top specular white highlight rim, and deep shadow elevation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* Google AI Studio API Status Banner */}
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Google Gemini API Key</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {aiStatus?.masked_key || 'Configured'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Google Cloud Project ID: <code className="text-blue-500">{aiStatus?.project_id || '7074070694'}</code>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                  >
                    <Activity className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                    <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>

                {/* Connection Result / Enablement Banner */}
                {connectionResult && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                      connectionResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                        : connectionResult.needs_enablement
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {connectionResult.success ? (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <span className="font-semibold block">{connectionResult.message}</span>
                        {connectionResult.needs_enablement && (
                          <div className="pt-1">
                            <a
                              href={connectionResult.activation_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-black font-bold text-[11px] shadow hover:bg-amber-400 transition-all"
                            >
                              <span>1-Click Enable Gemini API (Project 7074070694)</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <span className="block text-[10px] opacity-80 mt-1">
                              After clicking Enable, wait ~1 minute for Google systems to propagate and re-test.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Component Synthesis Form */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Prompt Gemini to generate or refactor a Stitch component:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Quad-Split Video Benchmark Header HUD..."
                    className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !prompt.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                    <span>{generating ? 'Synthesizing...' : 'Generate with Stitch AI'}</span>
                  </button>
                </div>
              </div>

              {/* Generated Code Display */}
              {generatedCode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">
                      Generated Code ({generationSource}):
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCode);
                        addNotification({
                          type: 'success',
                          title: 'Code Copied',
                          message: 'React component code copied to clipboard.',
                        });
                      }}
                      className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.15] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Component Code</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-2xl bg-black/90 border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto max-h-72 leading-relaxed">
                    {generatedCode}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'spec' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Root Specification (`DESIGN.md`):</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySpec}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Tokens'}</span>
                  </button>
                  <button
                    onClick={handleDownloadSpec}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download DESIGN.md</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-2xl bg-black/80 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
                {rawDesignMd}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Stitch & Google Gemini AI Studio Configured</span>
          </div>
          <button
            onClick={() => setStitchModalOpen(false)}
            className="stitch-pill bg-slate-200 dark:bg-white/[0.08] hover:bg-slate-300 dark:hover:bg-white/[0.15] text-slate-800 dark:text-white text-xs font-semibold"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
