export type UserRole = 'admin' | 'engineer' | 'reviewer' | 'annotator' | 'viewer';

export interface RoleDefinition {
  id: UserRole;
  title: string;
  badge: string;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  description: string;
  responsibilities: string[];
  allowedStages: string[];
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    id: 'admin',
    title: 'Organization Administrator',
    badge: 'Admin',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    borderClass: 'border-emerald-500/40',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    description: 'Full root access to all stages, project lifecycle, model promotion, cloud runtimes, and user RBAC governance.',
    responsibilities: [
      'Multi-Tenant & Organization Governance',
      'Manage & Delete Workspaces (Shared/Private)',
      'Invite Members & Assign RBAC Role Tiers',
      'Promote Models to Production Model Registry',
      'Configure Compute Runtimes & Cloud GPU Nodes',
      'Unrestricted Access to All 13 Mission Stages'
    ],
    allowedStages: [
      'overview',
      'projects',
      'video_lab',
      'frame_studio',
      'annotation',
      'datasets',
      'training',
      'experiments',
      'model_registry',
      'validation',
      'runtimes',
      'integrations',
      'settings'
    ]
  },
  engineer: {
    id: 'engineer',
    title: 'ML Systems Engineer',
    badge: 'ML Engineer',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    borderClass: 'border-purple-500/40',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-400',
    description: 'YOLOv8 fine-tuning, automated Colab GPU execution, experiment loss curve analysis, and checkpoint evaluation.',
    responsibilities: [
      'Configure YOLOv8 Hyperparameters & Data Augmentation',
      'Execute Automated Cloud Colab GPU Training Runs',
      'Evaluate Tri-Model Checkpoints & mAP Curves',
      'Stage Candidate Models in Model Registry',
      'Manage Worker Compute & Hardware Runtimes'
    ],
    allowedStages: [
      'overview',
      'projects',
      'video_lab',
      'frame_studio',
      'annotation',
      'datasets',
      'training',
      'experiments',
      'model_registry',
      'validation',
      'runtimes',
      'integrations'
    ]
  },
  reviewer: {
    id: 'reviewer',
    title: 'Dataset QA Lead & Reviewer',
    badge: 'QA Reviewer',
    badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    borderClass: 'border-indigo-500/40',
    bgClass: 'bg-indigo-500/10',
    textClass: 'text-indigo-400',
    description: 'Ensures ground truth quality, audits extracted conveyor frames, reviews AI annotations, and signs off on dataset versions.',
    responsibilities: [
      'Audit Video Extracted Frames & Deduplication',
      'Review, Approve, or Reject AI-Assisted Annotations',
      'Freeze Dataset Releases (Train/Val/Test Splits)',
      'Run Inference Benchmarks & Metric Validations',
      'Audit Confusion Matrices & IoU Thresholds'
    ],
    allowedStages: [
      'overview',
      'projects',
      'video_lab',
      'frame_studio',
      'annotation',
      'datasets',
      'experiments',
      'model_registry',
      'validation'
    ]
  },
  annotator: {
    id: 'annotator',
    title: 'Annotation Specialist',
    badge: 'Annotator',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    borderClass: 'border-amber-500/40',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    description: 'High-speed object labeling, conveyor video ingestion, polygon masks, and SAM 2 interactive segmentation.',
    responsibilities: [
      'Ingest Conveyor Video Footage & Crop ROI',
      'Draw Bounding Boxes (B) and Polygon (P) Labels',
      'One-Click SAM 2 Prompt Point & Box Segmentation',
      'Multi-Frame Object Auto-Tracking on Conveyor Belts'
    ],
    allowedStages: [
      'overview',
      'projects',
      'video_lab',
      'frame_studio',
      'annotation',
      'datasets'
    ]
  },
  viewer: {
    id: 'viewer',
    title: 'Auditor & Observer',
    badge: 'Auditor / Viewer',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    borderClass: 'border-cyan-500/40',
    bgClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-400',
    description: 'Read-only observer access to inspect project health, dataset distribution stats, and model forensic audit scores.',
    responsibilities: [
      'Inspect Active Projects & Ingestion Telemetry',
      'View Class Distribution & Train/Val Ratios',
      'Review Validation Accuracy & Production Scores',
      'Audit Forensic Weights Without Pipeline Write Access'
    ],
    allowedStages: [
      'overview',
      'projects',
      'video_lab',
      'frame_studio',
      'annotation',
      'datasets',
      'experiments',
      'model_registry',
      'validation'
    ]
  }
};

export function normalizeRole(role?: string): UserRole {
  const r = (role || 'viewer').toLowerCase().trim();
  if (r in ROLE_DEFINITIONS) return r as UserRole;
  if (r.includes('admin')) return 'admin';
  if (r.includes('eng')) return 'engineer';
  if (r.includes('rev')) return 'reviewer';
  if (r.includes('ann')) return 'annotator';
  return 'viewer';
}

export function getRoleDefinition(role?: string): RoleDefinition {
  return ROLE_DEFINITIONS[normalizeRole(role)];
}

export function isStageAllowed(role: string | undefined, stage: string): boolean {
  const def = getRoleDefinition(role);
  return def.allowedStages.includes(stage);
}

// Granular permission helpers
export function canTrain(role?: string): boolean {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'engineer';
}

export function canDeployModel(role?: string): boolean {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'engineer';
}

export function canDeleteModel(role?: string): boolean {
  return normalizeRole(role) === 'admin';
}

export function canAnnotate(role?: string): boolean {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'engineer' || r === 'reviewer' || r === 'annotator';
}

export function canReviewApprove(role?: string): boolean {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'reviewer';
}

export function canManageUsers(role?: string): boolean {
  return normalizeRole(role) === 'admin';
}

export function canManageWorkspaces(role?: string): boolean {
  return normalizeRole(role) === 'admin';
}

export function canModifyRuntimes(role?: string): boolean {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'engineer';
}

export function canExportDataset(role?: string): boolean {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'engineer' || r === 'reviewer';
}

export function isReadOnlyRole(role?: string): boolean {
  return normalizeRole(role) === 'viewer';
}
