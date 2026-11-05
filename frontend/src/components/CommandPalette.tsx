import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, StageId } from '../stores/useAppStore';
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  Video,
  Film,
  PencilRuler,
  Database,
  Cpu,
  LineChart,
  Box,
  ScanEye,
  Server,
  Blocks,
  Settings,
  Sparkles,
  Play,
  FileCode,
  ArrowRight,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  action: () => void;
  shortcut?: string;
}

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen, setStage, toggleTheme } = useAppStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'nav-overview',
      title: 'Go to Overview',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => setStage('overview'),
    },
    {
      id: 'nav-projects',
      title: 'Go to Projects & Workspaces',
      category: 'Navigation',
      icon: FolderKanban,
      action: () => setStage('projects'),
    },
    {
      id: 'nav-videolab',
      title: 'Go to Video Lab (Upload & Crop)',
      category: 'Navigation',
      icon: Video,
      action: () => setStage('video_lab'),
    },
    {
      id: 'nav-framestudio',
      title: 'Go to Frame Studio (Extraction & Deduplication)',
      category: 'Navigation',
      icon: Film,
      action: () => setStage('frame_studio'),
    },
    {
      id: 'nav-annotation',
      title: 'Go to AI Annotation Studio',
      category: 'Navigation',
      icon: PencilRuler,
      action: () => setStage('annotation'),
    },
    {
      id: 'nav-datasets',
      title: 'Go to Datasets (Splits & YOLO Export)',
      category: 'Navigation',
      icon: Database,
      action: () => setStage('datasets'),
    },
    {
      id: 'nav-training',
      title: 'Go to Training Control Center (Ultralytics YOLO)',
      category: 'Navigation',
      icon: Cpu,
      action: () => setStage('training'),
    },
    {
      id: 'nav-experiments',
      title: 'Go to Experiments (Metrics & Comparison)',
      category: 'Navigation',
      icon: LineChart,
      action: () => setStage('experiments'),
    },
    {
      id: 'nav-registry',
      title: 'Go to Model Registry (Weights & Deployment)',
      category: 'Navigation',
      icon: Box,
      action: () => setStage('model_registry'),
    },
    {
      id: 'nav-validation',
      title: 'Go to Validation & Inference Benchmark',
      category: 'Navigation',
      icon: ScanEye,
      action: () => setStage('validation'),
    },
    {
      id: 'nav-runtimes',
      title: 'Go to Compute Runtimes & Failover',
      category: 'Navigation',
      icon: Server,
      action: () => setStage('runtimes'),
    },
    {
      id: 'nav-integrations',
      title: 'Go to Integrations Catalog',
      category: 'Navigation',
      icon: Blocks,
      action: () => setStage('integrations'),
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      category: 'Navigation',
      icon: Settings,
      action: () => setStage('settings'),
    },
    {
      id: 'act-theme',
      title: 'Toggle Dark / Light Theme',
      category: 'Action',
      icon: Sparkles,
      action: () => toggleTheme(),
    },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const handleSelect = (cmd: CommandItem) => {
    cmd.action();
    setCommandPaletteOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-850/60">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search workflow..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % filtered.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
              } else if (e.key === 'Enter' && filtered[selectedIndex]) {
                e.preventDefault();
                handleSelect(filtered[selectedIndex]);
              }
            }}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] bg-slate-800 rounded border border-slate-700 text-slate-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No matching commands found.</div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
                    isSelected ? 'bg-brand-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
