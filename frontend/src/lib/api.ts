import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { email: string; password: string; name: string; companyName: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};

// ── Companies ─────────────────────────────────────────────────────────────────

export const companyApi = {
  create: (data: CompanyFormData) => api.post('/companies', data),
  getAll: () => api.get('/companies'),
  getOne: (id: string) => api.get(`/companies/${id}`),
  update: (id: string, data: Partial<CompanyFormData>) => api.patch(`/companies/${id}`, data),
  delete: (id: string) => api.delete(`/companies/${id}`),
  getQueries: (id: string) => api.get(`/companies/${id}/queries`),
  addQuery: (id: string, query: string, buyerStage: BuyerStage) =>
    api.post(`/companies/${id}/queries`, { query, buyerStage }),
  deleteQuery: (queryId: string) => api.delete(`/companies/queries/${queryId}`),
};

// ── Analyses ──────────────────────────────────────────────────────────────────

export const analysisApi = {
  start: (companyId: string) => api.post(`/analyses/companies/${companyId}/start`),
  getForCompany: (companyId: string) => api.get(`/analyses/companies/${companyId}`),
  getOne: (id: string) => api.get(`/analyses/${id}`),
  getShareOfVoice: (id: string) => api.get(`/analyses/${id}/share-of-voice`),
  reviseBlogPost: (id: string, postId: string, instructions: string) =>
    api.post(`/analyses/${id}/blog-posts/${postId}/revise`, { instructions }),
  approveBlogPost: (id: string, postId: string) =>
    api.post(`/analyses/${id}/blog-posts/${postId}/approve`),
  updateRecommendation: (id: string, recId: string, status: RecStatus) =>
    api.patch(`/analyses/${id}/recommendations/${recId}`, { status }),
};

// ── Billing ───────────────────────────────────────────────────────────────────

export const billingApi = {
  status: () => api.get('/billing/status'),
  checkout: () => api.post('/billing/checkout'),
  portal: () => api.post('/billing/portal'),
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminApi = {
  overview: () => api.get('/admin/overview'),
  olostepStats: (days = 30) => api.get(`/admin/olostep/stats?days=${days}`),
  olostepLogs: () => api.get('/admin/olostep/logs'),
};

// ── Shared types ──────────────────────────────────────────────────────────────

export type BuyerStage = 'AWARENESS' | 'CONSIDERATION' | 'DECISION';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type RecStatus = 'PENDING' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'SKIPPED';
export type AnalysisStatus =
  | 'PENDING'
  | 'SCRAPING'
  | 'QUERYING_AI'
  | 'SCORING'
  | 'GENERATING_CONTENT'
  | 'COMPLETED'
  | 'FAILED';

export interface CompanyFormData {
  name: string;
  websiteUrl: string;
  industry: string;
  targetAudience: string;
  productsServices: string;
  keyDifferentiators: string;
  brandVoiceNotes?: string;
  competitors: { name?: string; websiteUrl: string }[];
}

export interface Company extends CompanyFormData {
  id: string;
  userId: string;
  createdAt: string;
  competitors: { id: string; name?: string; websiteUrl: string }[];
}

export interface GeoScore {
  id: string;
  overallScore: number;
  extractabilityScore: number;
  entityClarityScore: number;
  specificityScore: number;
  corroborationScore: number;
  coverageScore: number;
  freshnessScore: number;
  indexabilityScore: number;
  machineReadabilityScore: number;
  priorityActions: string[];
  createdAt: string;
}

export interface AiQueryResult {
  id: string;
  engine: 'CHATGPT' | 'PERPLEXITY' | 'GEMINI';
  query: string;
  responseText: string;
  mentionsCompany: boolean;
  mentionPosition: number | null;
  shareOfVoice: number;
  competitorMentions: Record<string, number>;
}

export interface PageRecommendation {
  id: string;
  pageUrl: string;
  pageType: string;
  priority: Priority;
  issue: string;
  recommendation: string;
  effort: string | null;
  status: RecStatus;
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  targetQuery: string;
  buyerStage: BuyerStage;
  status: 'DRAFT' | 'REVISION_REQUESTED' | 'APPROVED' | 'PUBLISHED';
  wordCount: number;
  createdAt: string;
}

export interface Analysis {
  id: string;
  companyId: string;
  status: AnalysisStatus;
  errorMsg: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  geoScore: GeoScore | null;
  aiQueryResults: AiQueryResult[];
  pageRecommendations: PageRecommendation[];
  blogPosts: BlogPost[];
}
