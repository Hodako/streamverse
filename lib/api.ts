import { getStoredToken } from './authStorage';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getOrCreateSessionId() {
  const key = 'streamtube_session_id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

async function requestJson<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/json');

  if (!headers.has('x-session-id')) {
    headers.set('x-session-id', getOrCreateSessionId());
  }

  const authToken = token ?? getStoredToken();
  if (authToken) headers.set('authorization', `Bearer ${authToken}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: any = null;
  
  // Handle HTML error responses (404 pages, etc.)
  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    if (!res.ok) {
      throw new ApiError(res.status, `Server error: ${res.statusText}`, 'html_response');
    }
    throw new ApiError(500, 'Unexpected HTML response from server', 'html_response');
  }
  
  try {
    data = text ? JSON.parse(text) : null;
  } catch (parseError) {
    throw new ApiError(res.status, `Invalid JSON response: ${text.substring(0, 100)}`, 'parse_error');
  }

  if (!res.ok) {
    throw new ApiError(res.status, data?.message || data?.error || 'request_failed', data?.error);
  }

  return data as T;
}

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
};

export async function signup(body: { email: string; password: string; name: string }) {
  return requestJson<{ token: string; user: ApiUser }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function login(body: { email: string; password: string }) {
  return requestJson<{ token: string; user: ApiUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function adminLogin(body: { email: string; password: string }) {
  return requestJson<{ token: string; user: ApiUser }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getMe() {
  return requestJson<{ user: ApiUser }>('/api/me', { method: 'GET' });
}

export async function getCategories() {
  return requestJson<{ categories: { id: string; name: string }[] }>('/api/categories', { method: 'GET' });
}

export type ListVideosParams = {
  q?: string;
  categoryId?: string;
  trending?: boolean;
  limit?: number;
  offset?: number;
};

export async function listVideos(params: ListVideosParams) {
  const usp = new URLSearchParams();
  if (params.q) usp.set('q', params.q);
  if (params.categoryId) usp.set('categoryId', params.categoryId);
  if (params.trending !== undefined) usp.set('trending', String(params.trending));
  if (params.limit !== undefined) usp.set('limit', String(params.limit));
  if (params.offset !== undefined) usp.set('offset', String(params.offset));

  const qs = usp.toString();
  return requestJson<{ videos: any[] }>(`/api/videos${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export async function getVideo(id: string) {
  return requestJson<{ video: any }>(`/api/videos/${id}`, { method: 'GET' });
}

export async function incrementVideoView(id: string) {
  return requestJson<{ views: number }>(`/api/videos/${id}/view`, { method: 'POST' });
}

export async function analyticsPing(body: { path?: string; videoId?: string; eventType?: 'ping' | 'pageview'; watchSeconds?: number }) {
  return requestJson<{ ok: boolean; serverTime: string }>('/api/analytics/ping', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getRelatedVideos(id: string) {
  return requestJson<{ videos: any[] }>(`/api/videos/${id}/related`, { method: 'GET' });
}

export async function getTrendingCategories() {
  return requestJson<{ categories: { id: string; name: string }[] }>('/api/videos/trending-categories', { method: 'GET' });
}

export async function getTrendingCategoryVideos(id: string) {
  return requestJson<{ videos: any[] }>(`/api/videos/trending-categories/${id}/videos`, { method: 'GET' });
}

export async function listShorts(params?: { limit?: number; offset?: number }) {
  const usp = new URLSearchParams();
  if (params?.limit !== undefined) usp.set('limit', String(params.limit));
  if (params?.offset !== undefined) usp.set('offset', String(params.offset));
  const qs = usp.toString();
  return requestJson<{ videos: any[] }>(`/api/videos/shorts${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export async function getComments(videoId: string) {
  return requestJson<{ comments: any[] }>(`/api/videos/${videoId}/comments`, { method: 'GET' });
}

export async function createComment(videoId: string, text: string) {
  return requestJson<{ id: string; createdAt: string }>(`/api/videos/${videoId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function adminStats() {
  return requestJson<{ videos: number; users: number; categories: number; comments: number; trending: number }>(
    '/api/admin/stats',
    { method: 'GET' }
  );
}

export async function adminGetAnalytics() {
  return requestJson<{
    totalViews: number;
    todayViews: number;
    weeklyViews: number;
    monthlyViews: number;
    activeUsers: number;
    videos: number;
    users: number;
    comments: number;
    trending: number;
  }>('/api/analytics/admin/overview', { method: 'GET' });
}

export async function adminGetUserGrowth() {
  return requestJson<Array<{ month: string; users: number }>>('/api/analytics/admin/user-growth', { method: 'GET' });
}

export async function adminGetTrendingSettings() {
  return requestJson<{
    minViews: number;
    maxAgeHours: number;
    maxItems: number;
    autoRefresh: boolean;
    pinnedVideoIds: string[];
  }>('/api/admin/trending-settings', { method: 'GET' });
}

export async function adminUpdateTrendingSettings(settings: {
  minViews?: number;
  maxAgeHours?: number;
  maxItems?: number;
  autoRefresh?: boolean;
  pinnedVideoIds?: string[];
}) {
  return requestJson<{ success: boolean }>('/api/admin/trending-settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
}

export async function adminRecomputeTrending() {
  return requestJson<{ success: boolean }>('/api/admin/trending-settings/recompute', { method: 'POST' });
}

export async function adminGetTrendingInsights() {
  return requestJson<{
    insights: Array<{
      id: string;
      title: string;
      views: number;
      isTrending: boolean;
      ageHours: string;
      comments: number;
      likes: number;
      saves: number;
      trendingScore: string;
    }>;
  }>('/api/admin/trending-insights', { method: 'GET' });
}

export async function adminListTrendingCategories() {
  return requestJson<{ categories: { id: string; name: string }[] }>('/api/admin/trending-categories', { method: 'GET' });
}

export async function adminCreateTrendingCategory(name: string) {
  return requestJson<{ id: string }>('/api/admin/trending-categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function adminDeleteTrendingCategory(id: string) {
  return requestJson<void>(`/api/admin/trending-categories/${id}`, { method: 'DELETE' });
}

export async function adminGetTrendingCategoryVideoIds(id: string) {
  return requestJson<{ videoIds: string[] }>(`/api/admin/trending-categories/${id}/videos`, { method: 'GET' });
}

export async function adminAssignVideoToTrendingCategory(categoryId: string, videoId: string) {
  return requestJson<void>(`/api/admin/trending-categories/${categoryId}/videos`, {
    method: 'POST',
    body: JSON.stringify({ videoId }),
  });
}

export async function adminUnassignVideoFromTrendingCategory(categoryId: string, videoId: string) {
  return requestJson<void>(`/api/admin/trending-categories/${categoryId}/videos/${videoId}`, { method: 'DELETE' });
}

export async function meCreateSubmission(input: { title: string; description?: string; thumbnailUrl: string; videoSrc: string }) {
  return requestJson<{ id: string }>('/api/me/submissions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function meListSubmissions() {
  return requestJson<{ submissions: any[] }>('/api/me/submissions', { method: 'GET' });
}

export async function adminListModerationSubmissions(status?: 'pending' | 'approved' | 'rejected') {
  const usp = new URLSearchParams();
  if (status) usp.set('status', status);
  const qs = usp.toString();
  return requestJson<{ submissions: any[] }>(`/api/admin/moderation/submissions${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export async function adminApproveSubmission(
  submissionId: string,
  body: { title: string; description?: string; categoryId?: string | null; channelName: string; isShort?: boolean; durationSeconds?: number }
) {
  return requestJson<{ success: boolean; videoId: string }>(`/api/admin/moderation/submissions/${submissionId}/approve`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function adminRejectSubmission(submissionId: string, body?: { adminNote?: string }) {
  return requestJson<{ success: boolean }>(`/api/admin/moderation/submissions/${submissionId}/reject`, {
    method: 'POST',
    body: JSON.stringify(body || {}),
  });
}

export async function adminListVideos(params?: { q?: string; limit?: number; offset?: number }) {
  const usp = new URLSearchParams();
  if (params?.q) usp.set('q', params.q);
  if (params?.limit !== undefined) usp.set('limit', String(params.limit));
  if (params?.offset !== undefined) usp.set('offset', String(params.offset));
  const qs = usp.toString();
  return requestJson<{ videos: any[] }>(`/api/admin/videos${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export type AdminVideoInput = {
  title: string;
  description: string;
  thumbnailUrl: string;
  videoSrc: string;
  categoryId?: string | null;
  isTrending?: boolean;
  isShort?: boolean;
  channelName?: string;
  channelAvatarUrl?: string;
  durationSeconds?: number;
};

export async function adminCreateVideo(input: AdminVideoInput) {
  return requestJson<{ id: string }>('/api/admin/videos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function adminUpdateVideo(id: string, input: Partial<AdminVideoInput>) {
  return requestJson<{ id: string }>(`/api/admin/videos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function adminDeleteVideo(id: string) {
  return requestJson<void>(`/api/admin/videos/${id}`, { method: 'DELETE' });
}

export async function adminCreateCategory(name: string) {
  return requestJson<{ id: string }>('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function adminDeleteCategory(id: string) {
  return requestJson<void>(`/api/admin/categories/${id}`, { method: 'DELETE' });
}

export async function adminGetSettings() {
  return requestJson<{
    siteName: string;
    logoUrl: string;
    siteDescription: string;
    contactEmail: string;
    allowRegistration: boolean;
    requireEmailVerification: boolean;
    faviconUrl: string;
    pageTitle: string;
    metaTitle: string;
    metaDescription: string;
  }>('/api/admin/settings', { method: 'GET' });
}

export async function adminUpdateSettings(settings: {
  siteName?: string;
  logoUrl?: string;
  siteDescription?: string;
  contactEmail?: string;
  allowRegistration?: boolean;
  requireEmailVerification?: boolean;
  faviconUrl?: string;
  pageTitle?: string;
  metaTitle?: string;
  metaDescription?: string;
}) {
  return requestJson<{ success: boolean }>('/api/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
}

export async function meLike(videoId: string) {
  return requestJson<void>('/api/me/likes', { method: 'POST', body: JSON.stringify({ videoId }) });
}

export async function meGetLikes() {
  return requestJson<{ videoIds: string[] }>('/api/me/likes', { method: 'GET' });
}

export async function meUnlike(videoId: string) {
  return requestJson<void>(`/api/me/likes/${videoId}`, { method: 'DELETE' });
}

export async function meSave(videoId: string) {
  return requestJson<void>('/api/me/saved', { method: 'POST', body: JSON.stringify({ videoId }) });
}

export async function meGetSaved() {
  return requestJson<{ videoIds: string[] }>('/api/me/saved', { method: 'GET' });
}

export type MeHistoryEntry = { video_id: string; last_watched_at: string; progress_seconds: number };

export async function meGetHistory() {
  return requestJson<{ history: MeHistoryEntry[] }>('/api/me/history', { method: 'GET' });
}

export async function meUnsave(videoId: string) {
  return requestJson<void>(`/api/me/saved/${videoId}`, { method: 'DELETE' });
}

export async function meGetVideos() {
  return requestJson<{ videos: any[] }>('/api/me/videos', { method: 'GET' });
}

export async function meUpdateProfile(data: { name: string; email: string }) {
  return requestJson<{ success: boolean }>('/api/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function meChangePassword(data: { currentPassword: string; newPassword: string }) {
  return requestJson<{ success: boolean }>('/api/me/password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function meUpsertHistory(videoId: string, progressSeconds: number) {
  return requestJson<void>('/api/me/history', {
    method: 'PUT',
    body: JSON.stringify({ videoId, progressSeconds }),
  });
}

export type Blog = {
  id: string;
  title: string;
  slug: string;
  content: string;
  author_name?: string;
  createdAt: string;
  updatedAt: string;
};

export async function adminListBlogs() {
  return requestJson<{ blogs: Blog[] }>('/api/admin/blogs', { method: 'GET' });
}

export async function adminCreateBlog(input: { title: string; content: string }) {
  return requestJson<{ id: string }>('/api/admin/blogs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function adminUpdateBlog(id: string, input: { title?: string; content?: string }) {
  return requestJson<{ id: string }>(`/api/admin/blogs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function adminDeleteBlog(id: string) {
  return requestJson<void>(`/api/admin/blogs/${id}`, { method: 'DELETE' });
}

export async function listBlogs() {
  return requestJson<{ blogs: Blog[] }>('/api/blogs', { method: 'GET' });
}

export async function getBlog(id: string) {
  return requestJson<{ blog: Blog }>(`/api/blogs/${id}`, { method: 'GET' });
}

export async function getBlogBySlug(slug: string) {
  return requestJson<{ blog: Blog }>(`/api/blogs/by-slug/${slug}`, { method: 'GET' });
}
