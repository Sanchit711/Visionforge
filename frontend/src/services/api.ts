const BASE_URL = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('vf_auth_token') : null;
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = `${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Authentication & RBAC
  authLogin: (credentials: { email: string; password?: string }) =>
    request<any>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }),
  authRegister: (data: { tenant_id: string; name: string; email: string; password?: string; role?: string }) =>
    request<any>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  authMe: () => request<any>('/auth/me'),
  authLogout: () => request<any>('/auth/logout', { method: 'POST' }),
  getRoles: () => request<any>('/auth/roles'),
  getDemoUsers: () => request<any[]>('/auth/demo-users'),

  // Workspaces (Shared & Private)
  getWorkspaces: (tenantId?: string) =>
    request<any[]>(`/workspaces${tenantId ? `?tenant_id=${tenantId}` : ''}`),
  createWorkspace: (data: any) =>
    request<any>('/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  updateWorkspace: (id: string, data: any) =>
    request<any>(`/workspaces/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteWorkspace: (id: string) =>
    request<any>(`/workspaces/${id}`, { method: 'DELETE' }),

  // System & Telemetry

  getTelemetry: () => request<any>('/system/telemetry'),

  getOverview: () => request<any>('/system/overview'),

  getJobs: () => request<any[]>('/system/jobs'),

  getJob: (jobId: string) => request<any>(`/system/jobs/${jobId}`),

  cancelJob: (jobId: string) => request<any>(`/system/jobs/${jobId}/cancel`, { method: 'POST' }),

  getIntegrations: () => request<any[]>('/system/integrations'),

  // Workspaces & Tenants
  getTenants: () => request<any[]>('/tenants'),
  getTenant: (id: string) => request<any>(`/tenants/${id}`),
  createTenant: (data: any) =>
    request<any>('/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  updateTenant: (id: string, data: any) =>
    request<any>(`/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  getTenantUsers: (tenantId: string) => request<any[]>(`/tenants/${tenantId}/users`),
  addUserToTenant: (tenantId: string, data: any) =>
    request<any>(`/tenants/${tenantId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // Users & Access
  getUsers: (tenantId?: string) =>
    request<any[]>(`/users${tenantId ? `?tenant_id=${tenantId}` : ''}`),
  getCurrentUser: () => request<any>('/users/me'),
  getUser: (id: string) => request<any>(`/users/${id}`),
  createUser: (data: any) =>
    request<any>('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  updateUser: (id: string, data: any) =>
    request<any>(`/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // Projects
  getProjects: (tenantId?: string) =>
    request<any[]>(`/projects${tenantId ? `?tenant_id=${tenantId}` : ''}`),

  createProject: (data: any) =>

    request<any>('/projects', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),

  getProject: (id: string) => request<any>(`/projects/${id}`),

  updateProject: (id: string, data: any) =>

    request<any>(`/projects/${id}`, {

      method: 'PUT',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),

  deleteProject: (id: string) => request<any>(`/projects/${id}`, { method: 'DELETE' }),

  getProjectTimeline: (id: string) => request<any>(`/projects/${id}/workflow-timeline`),

  getCropPresets: () => request<any[]>('/projects/crop-presets'),

  createCropPreset: (data: any) =>

    request<any>('/projects/crop-presets', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),



  // Video Lab

  getVideos: (projectId: string) => request<any[]>(`/videos?project_id=${projectId}`),

  uploadVideo: (projectId: string, file: File) => {

    const formData = new FormData();

    formData.append('project_id', projectId);

    formData.append('file', file);

    return request<any>('/videos/upload', {

      method: 'POST',

      body: formData,

    });

  },

  generateSyntheticVideo: (projectId: string, name = 'sample_traffic_cctv.mp4', numFrames = 90, fps = 24) => {

    const formData = new FormData();

    formData.append('project_id', projectId);

    formData.append('name', name);

    formData.append('num_frames', numFrames.toString());

    formData.append('fps', fps.toString());

    return request<any>('/videos/generate-synthetic', {

      method: 'POST',

      body: formData,

    });

  },

  getVideo: (id: string) => request<any>(`/videos/${id}`),

  cropVideo: (id: string, data: any) =>

    request<any>(`/videos/${id}/crop`, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),



  // Frame Studio

  getFrames: (projectId: string, skip = 0, limit = 2000, split?: string, status?: string) => {

    let q = `/frames?project_id=${projectId}&skip=${skip}&limit=${limit}`;

    if (split) q += `&split=${split}`;

    if (status) q += `&status=${status}`;

    return request<any[]>(q);

  },

  deduplicateFrames: (projectId: string) =>

    request<any>(`/frames/deduplicate?project_id=${projectId}`, { method: 'POST' }),

  clearTrackedAnnotations: (projectId: string) =>
    request<any>(`/annotations/project/${projectId}/tracked`, { method: 'DELETE' }),

  clearAllProjectAnnotations: (projectId: string) =>
    request<any>(`/annotations/project/${projectId}/all`, { method: 'DELETE' }),

  clearFrameAnnotations: (frameId: string) =>
    request<any>(`/annotations/frame/${frameId}/all`, { method: 'DELETE' }),

  extractFrames: (data: any) =>

    request<any>('/frames/extract', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),

  getFrame: (id: string) => request<any>(`/frames/${id}`),

  reviewFrame: (id: string, status: 'approved' | 'rejected' | 'unreviewed') =>

    request<any>(`/frames/${id}/review?status=${status}`, { method: 'POST' }),

  deleteFrame: (id: string) => request<any>(`/frames/${id}`, { method: 'DELETE' }),
  bulkDeleteFrames: (frameIds: string[]) =>
    request<any>('/frames/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame_ids: frameIds }),
    }),
  bulkUpdateFrames: (data: { frame_ids: string[]; split?: string; status?: string }) =>
    request<any>('/frames/bulk-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),



  // Annotation Studio

  getAnnotations: (frameId: string) => request<any[]>(`/annotations?frame_id=${frameId}`),

  createAnnotation: (data: any) =>

    request<any>('/annotations', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),

  updateAnnotation: (id: string, data: any) =>

    request<any>(`/annotations/${id}`, {

      method: 'PUT',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),

  deleteAnnotation: (id: string) => request<any>(`/annotations/${id}`, { method: 'DELETE' }),

  getSamModels: () => request<any[]>('/annotations/sam/models'),

  downloadSamModel: (modelName: string) =>

    request<any>('/annotations/sam/download', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ model_name: modelName }),

    }),

  samSegment: (data: any) =>

    request<any>('/annotations/sam/segment', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),

  aiAssist: (data: any) =>

    request<any>('/annotations/ai-assist', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),

  batchPropagate: (projectId: string, data: any) =>

    request<any>(`/annotations/batch-propagate?project_id=${projectId}`, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),

    // Dynamic Models & Florence-2 Vision LLM

  getModelCatalog: () => request<any[]>('/annotations/models/catalog'),

  downloadModelDynamic: (modelId: string) =>

    request<any>('/annotations/models/download', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ model_id: modelId }),

    }),

  florencePredict: (data: any) =>

    request<any>('/annotations/florence-predict', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),

  florencePropagate: (data: any) =>

    request<any>('/annotations/florence-propagate', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),

  propagateTrack: (data: any) =>
    request<any>('/annotations/propagate-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  refineBBox: (data: { frame_id: string; bbox: number[]; model_name?: string }) =>
    request<{ bbox: number[]; polygon?: number[][]; confidence: number; snapped: boolean }>(
      '/annotations/refine-bbox',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    ),

  interpolateKeyframes: (data: {
    project_id: string;
    start_frame_id: string;
    end_frame_id: string;
    annotation_id?: string;
    mode?: 'linear' | 'spline';
    lock_dimensions?: boolean;
    clear_existing?: boolean;
  }) =>
    request<{
      status: string;
      message: string;
      start_frame_index: number;
      end_frame_index: number;
      interpolated_frames_count: number;
      total_annotations_created: number;
      execution_time_ms: number;
      telemetry?: any[];
    }>('/annotations/interpolate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),



  // Datasets

  getDatasets: (projectId?: string) => {
    const q = projectId ? `/datasets?project_id=${projectId}` : '/datasets';
    return request<any[]>(q);
  },

  getDatasetQuality: (projectId: string) => request<any>(`/datasets/quality-summary?project_id=${projectId}`),

  createDatasetVersion: (projectId: string, data: any) =>
    request<any>(`/datasets/versions?project_id=${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  createDataset: (projectId: string, data: any) =>
    request<any>(`/datasets/versions?project_id=${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),



  // Training Control Center

  getExperiments: (projectId: string) => request<any[]>(`/training/experiments?project_id=${projectId}`),

  checkCompatibility: (modelNameOrPath: string, datasetVersionId: string) =>

    request<any>(

      `/training/check-compatibility?model_name_or_path=${encodeURIComponent(

        modelNameOrPath

      )}&dataset_version_id=${datasetVersionId}`,

      { method: 'POST' }

    ),

  startTraining: (projectId: string, data: any) =>

    request<any>(`/training/start?project_id=${projectId}`, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),

  getExperiment: (id: string) => request<any>(`/training/experiments/${id}`),

  stopTraining: (id: string) => request<any>(`/training/experiments/${id}/stop`, { method: 'POST' }),

  getExperimentLogs: (id: string) => request<any>(`/training/experiments/${id}/logs`),

  // Google Colab Integration
  getColabNotebookUrl: (projectId: string, datasetVersionId?: string, params?: any) => {
    const q = new URLSearchParams({
      project_id: projectId,
      ...(datasetVersionId ? { dataset_version_id: datasetVersionId } : {}),
      ...(params || {}),
    });
    return `/api/v1/training/colab/notebook?${q.toString()}`;
  },

  syncColabMetrics: (data: any) =>
    request<any>('/training/colab/sync-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  uploadColabModel: async (formData: FormData) => {
    const res = await fetch('/api/v1/training/colab/upload-model', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to upload model weights');
    }
    return res.json();
  },

  getDatasetDownloadUrl: (versionId: string) => `/api/v1/datasets/versions/${versionId}/download-zip`,

  // Kaggle Cloud Accelerator
  getKaggleStatus: () => request<{ authenticated: boolean; username?: string; message: string }>('/kaggle/status'),
  getKaggleTelemetry: () =>
    request<{
      state: string;
      stage_index: number;
      stage_name: string;
      progress_pct: number;
      kernel_slug?: string;
      kernel_url?: string;
      dataset_slug?: string;
      model_variant?: string;
      active_file?: string;
      transferred_bytes?: number;
      total_bytes?: number;
      speed_mb_s?: number;
      eta_seconds?: number;
      hardware?: string;
      logs: string[];
      error_message?: string;
      status?: string;
      is_running?: boolean;
      is_complete?: boolean;
      is_error?: boolean;
    }>('/kaggle/telemetry'),
  saveKaggleCredentials: (data: { username: string; key: string }) =>
    request<any>('/kaggle/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  launchKaggleTrain: (data: {
    project_id: string;
    dataset_version_id: string;
    experiment_name: string;
    model_variant: string;
    epochs: number;
    batch_size: number;
    img_size: number;
    optimizer: string;
    learning_rate: number;
    patience: number;
  }) =>
    request<{
      status: string;
      experiment_id: string;
      kernel_slug: string;
      kernel_url: string;
      dataset_full_slug: string;
      message: string;
    }>('/kaggle/train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  getKaggleJobStatus: (kernelSlug: string) =>
    request<{
      kernel_slug: string;
      status: string;
      is_running: boolean;
      is_complete: boolean;
      is_error: boolean;
      error_message?: string;
    }>(`/kaggle/jobs/${encodeURIComponent(kernelSlug)}/status`),
  downloadKaggleModel: (kernelSlug: string, projectId: string, experimentId?: string, modelName?: string) => {
    const params = new URLSearchParams({ project_id: projectId });
    if (experimentId) params.append('experiment_id', experimentId);
    if (modelName) params.append('model_name', modelName);
    return request<any>(`/kaggle/jobs/${encodeURIComponent(kernelSlug)}/download?${params.toString()}`, {
      method: 'POST',
    });
  },



  // Model Registry

  getModels: (projectId?: string) => {

    const q = projectId ? `/models?project_id=${projectId}` : '/models';

    return request<any[]>(q);

  },

  registerModel: (data: any, projectId?: string) => {

    const q = projectId ? `/models?project_id=${projectId}` : '/models';

    return request<any>(q, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    });

  },

  updateModel: (id: string, data: any) =>

    request<any>(`/models/${id}`, {

      method: 'PUT',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),

  deleteModel: (id: string) => request<any>(`/models/${id}`, { method: 'DELETE' }),

  exportModel: (id: string, format: string = 'onnx') =>
    request<any>(`/models/${id}/export?format=${format}`, { method: 'POST' }),



  // Compute Runtimes

  getRuntimes: () => request<any[]>('/runtimes'),

  createRuntime: (data: any) =>

    request<any>('/runtimes', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),

  testRuntime: (id: string) => request<any>(`/runtimes/${id}/test`, { method: 'POST' }),

  updateRuntime: (id: string, data: any) =>

    request<any>(`/runtimes/${id}`, {

      method: 'PUT',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(data),

    }),

  triggerFailover: (failedRuntimeId: string, experimentId: string) =>

    request<any>(`/runtimes/failover?failed_runtime_id=${failedRuntimeId}&experiment_id=${experimentId}`, {

      method: 'POST',

    }),

  generateColabNotebook: (projectId: string, datasetVersionName = 'v1.0', experimentName = 'exp_colab_01') =>

    request<any>(

      `/runtimes/colab/generate-notebook?project_id=${projectId}&dataset_version_name=${datasetVersionName}&experiment_name=${experimentName}`,

      { method: 'POST' }

    ),



  // Validation & Multi-Model Forensic Lab

  inferValidation: (formData: FormData) =>

    request<any>('/validation/infer', {

      method: 'POST',

      body: formData,

    }),

  compareModels: (formData: FormData) =>

    request<any>('/validation/compare', {

      method: 'POST',

      body: formData,

    }),

  introspectModels: (models: string[]) =>
    request<{ models: any[] }>('/validation/multi-model/introspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ models }),
    }),

  benchmarkModelsOnFrames: (data: {
    models: string[];
    frame_paths?: string[];
    project_id?: string;
    sample_count?: number;
    conf_threshold?: number;
    iou_threshold?: number;
  }) =>
    request<any>('/validation/multi-model/benchmark-frames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  runVideoBenchmark: (data: {
    video_path?: string;
    video_id?: string;
    models: string[];
    max_frames?: number;
    conf_threshold?: number;
    iou_threshold?: number;
    generate_video?: boolean;
  }) =>
    request<any>('/validation/video-benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // VisionForge AI Studio Synthesis & Gemini Engine Integration
  getAiStatus: () => request<any>('/ai/status'),
  testAiConnection: () =>
    request<any>('/ai/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
  generateUiComponent: (prompt: string) =>
    request<any>('/ai/generate-ui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    }),
  generateStitchUI: (prompt: string) =>
    request<any>('/ai/generate-ui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    }),
};

