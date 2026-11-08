import React from 'react';
import { useAppStore } from '../stores/useAppStore';
import {
  Shield,
  ShieldCheck,
  Check,
  X,
  Users,
  Eye,
  PenTool,
  Cpu,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';

export const RolesModal: React.FC = () => {
  const { rolesModalOpen, setRolesModalOpen, currentUser } = useAppStore();

  if (!rolesModalOpen) return null;

  const rolesDetails = [
    {
      id: 'admin',
      name: 'Tenant Administrator',
      badge: 'Full Ownership',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      description:
        'Ultimate control over tenant settings, team workspaces, user permissions, model deployments, and dataset freezing.',
      responsibilities: [
        'Create & partition Shared and Private workspaces',
        'Invite & manage team members with role assignments',
        'Manage cloud compute, Colab runtimes, and GPU failover',
        'Download and install foundation model weights (SAM 2, Florence-2)',
        'Finalize and lock immutable dataset releases (v1.0, v2.0)',
      ],
    },
    {
      id: 'reviewer',
      name: 'QA & Review Lead',
      badge: 'Audit & Approval',
      badgeClass: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      icon: Eye,
      iconColor: 'text-indigo-400',
      description:
        'Validates automated annotations, audits tracking accuracy, filters blur/redundancies, and ensures production readiness.',
      responsibilities: [
        'Review auto-tracked bounding boxes and polygon masks',
        'Approve or reject extracted video frames in Frame Studio',
        'Inspect deduplication contact sheets and filter redundant frames',
        'Audit annotation confidence scores and edge-snapping quality',
        'Validate benchmark metrics (mAP50, mAP50-95) before deployment',
      ],
    },
    {
      id: 'annotator',
      name: 'Computer Vision Annotator',
      badge: 'Labeling & Tracking',
      badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: PenTool,
      iconColor: 'text-amber-400',
      description:
        'Draws high-fidelity ground truth, runs interactive SAM 2 prompt segmentation, and triggers auto-tracking engines.',
      responsibilities: [
        'Draw initial bounding boxes on target moving objects (e.g. package)',
        'Use SAM 2 Point & Box prompts for sub-pixel boundary snapping',
        'Run auto-tracking and propagation across subsequent video frames',
        'Correct tracking drift and adjust candidate bounding boxes',
        'Tag classes and manage per-frame object hierarchies',
      ],
    },
    {
      id: 'engineer',
      name: 'Machine Learning Engineer',
      badge: 'Training & Inference',
      badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      icon: Cpu,
      iconColor: 'text-purple-400',
      description:
        'Designs training pipelines, trains YOLOv8/v11 detectors, generates Google Colab runners, and validates inference latency.',
      responsibilities: [
        'Configure YOLO training jobs with custom epochs, batch size, and augmentations',
        'Generate standalone Google Colab GPU notebooks with 1-click execution',
        'Evaluate experiment curves (loss, precision, recall, mAP) in Experiment Studio',
        'Register fine-tuned weights in Model Registry with production tags',
        'Run live validation benchmarks measuring inference latency and FPS',
      ],
    },
    {
      id: 'viewer',
      name: 'Auditor & Observer',
      badge: 'Read-Only Audit',
      badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      icon: Eye,
      iconColor: 'text-cyan-400',
      description:
        'Audits model performance, observes active experiments, inspects dataset class distributions, and reviews forensic reports.',
      responsibilities: [
        'Inspect project dashboards and active pipeline statuses',
        'Review dataset class balance charts and frame volumes',
        'Analyze model benchmark metrics (mAP, F1, precision, recall)',
        'Audit forensic model checkpoint evaluations without write permissions',
        'Observe experiment curves and training run logs',
      ],
    },
  ];

  const permissionsMatrix = [
    { name: 'Create & Manage Workspaces', admin: true, reviewer: false, annotator: false, engineer: false },
    { name: 'Invite & Assign User Roles', admin: true, reviewer: false, annotator: false, engineer: false },
    { name: 'Upload Videos & Extract Frames', admin: true, reviewer: true, annotator: true, engineer: true },
    { name: 'Draw BBoxes & Polygons', admin: true, reviewer: true, annotator: true, engineer: true },
    { name: 'Run SAM 2 Interactive Prompts', admin: true, reviewer: true, annotator: true, engineer: true },
    { name: 'Run Auto-Track Across Video', admin: true, reviewer: true, annotator: true, engineer: true },
    { name: 'Approve / Reject Frames (QA)', admin: true, reviewer: true, annotator: false, engineer: false },
    { name: 'Freeze Dataset Versions', admin: true, reviewer: true, annotator: false, engineer: true },
    { name: 'Launch YOLO Model Training', admin: true, reviewer: false, annotator: false, engineer: true },
    { name: 'Generate Colab GPU Notebooks', admin: true, reviewer: false, annotator: false, engineer: true },
    { name: 'Delete Project Data & Frames', admin: true, reviewer: false, annotator: false, engineer: false },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0f172a] border border-[#e5e5ea] dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Glow Top Accent */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-[#0071e3] to-purple-500" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#e5e5ea] dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center text-[#0071e3]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white tracking-tight">
                Roles & Responsibilities (RBAC) Matrix
              </h2>
              <p className="text-xs text-[#86868b]">
                Workspace access control, operational responsibilities, and permission boundaries
              </p>
            </div>
          </div>
          <button
            onClick={() => setRolesModalOpen(false)}
            className="text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white p-1 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Roles Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rolesDetails.map((role) => {
              const Icon = role.icon;
              const isUserRole = currentUser?.role?.toLowerCase() === role.id;
              return (
                <div
                  key={role.id}
                  className={`rounded-2xl border p-4.5 transition-all ${
                    isUserRole
                      ? 'bg-[#0071e3]/5 border-[#0071e3]/40 shadow-sm ring-1 ring-[#0071e3]/20'
                      : 'bg-[#f6f3f5] dark:bg-slate-900/60 border-[#e5e5ea] dark:border-slate-800/80 hover:border-[#0071e3]/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-[#e5e5ea] dark:border-slate-700 flex items-center justify-center ${role.iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white">{role.name}</h3>
                          {isUserRole && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0071e3] text-white">
                              You
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border uppercase tracking-wider inline-block mt-0.5 ${role.badgeClass}`}>
                          {role.badge}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#6e6e73] dark:text-slate-400 leading-relaxed mb-3">
                    {role.description}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-[#e5e5ea] dark:border-slate-800/60">
                    <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider block mb-1">
                      Key Responsibilities:
                    </span>
                    {role.responsibilities.map((resp, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-[#414753] dark:text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{resp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Granular Permission Matrix Table */}
          <div className="rounded-2xl border border-[#e5e5ea] dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#e5e5ea] dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0071e3]" />
                <span className="text-xs font-bold text-[#1d1d1f] dark:text-white uppercase tracking-wider">
                  Operational Permissions Comparison Matrix
                </span>
              </div>
              <span className="text-[11px] text-[#86868b]">Enforced by Backend Middleware</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider bg-slate-850/60">
                    <th className="py-2.5 px-4 font-semibold">Capability / Permission</th>
                    <th className="py-2.5 px-3 font-semibold text-center text-emerald-400">Admin</th>
                    <th className="py-2.5 px-3 font-semibold text-center text-indigo-400">Reviewer</th>
                    <th className="py-2.5 px-3 font-semibold text-center text-amber-400">Annotator</th>
                    <th className="py-2.5 px-3 font-semibold text-center text-purple-400">ML Engineer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {permissionsMatrix.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-200">{item.name}</td>
                      <td className="py-2.5 px-3 text-center">
                        {item.admin ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.reviewer ? (
                          <Check className="w-4 h-4 text-indigo-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.annotator ? (
                          <Check className="w-4 h-4 text-amber-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.engineer ? (
                          <Check className="w-4 h-4 text-purple-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-brand-400" />
            <span>Need expanded permissions? Contact your workspace Admin.</span>
          </div>
          <button
            onClick={() => setRolesModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};