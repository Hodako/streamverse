import { create } from 'zustand';
import { listVideos } from '../lib/api';
import { Video } from '../types';

const VIDEOS_PER_PAGE = 20;

interface VideoState {
  videos: Video[];
  loading: boolean;
  hasMore: boolean;
  offset: number;
  q: string;
  categoryId: string | null;
  fetchInitialVideos: () => Promise<void>;
  fetchMoreVideos: () => Promise<void>;
  searchVideos: (term: string) => Promise<void>;
  filterByCategory: (id: string | null) => Promise<void>;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: [],
  loading: false,
  hasMore: true,
  offset: 0,
  q: '',
  categoryId: null,
  fetchInitialVideos: async () => {
    set({ loading: true, offset: 0, videos: [], hasMore: true });
    try {
      const res = await listVideos({ limit: VIDEOS_PER_PAGE, offset: 0 });
      const items = (res.videos || []) as Video[];
      set({
        videos: items,
        offset: VIDEOS_PER_PAGE,
        hasMore: items.length === VIDEOS_PER_PAGE,
      });
    } catch (error) {
      set({ hasMore: false });
    } finally {
      set({ loading: false });
    }
  },
  fetchMoreVideos: async () => {
    const { loading, hasMore, offset, categoryId, q } = get();
    if (loading || !hasMore) return;

    set({ loading: true });
    try {
      const res = await listVideos({
        limit: VIDEOS_PER_PAGE,
        offset,
        categoryId: categoryId || undefined,
        q: q || undefined,
      });
      const items = (res.videos || []) as Video[];
      set(state => ({
        videos: [...state.videos, ...items],
        offset: state.offset + VIDEOS_PER_PAGE,
        hasMore: items.length === VIDEOS_PER_PAGE,
      }));
    } catch (error) {
      set({ hasMore: false });
    } finally {
      set({ loading: false });
    }
  },
  searchVideos: async (term: string) => {
    set({ loading: true, offset: 0, videos: [], hasMore: true, q: term, categoryId: null });
    try {
      const res = await listVideos({ q: term, limit: VIDEOS_PER_PAGE, offset: 0 });
      const items = (res.videos || []) as Video[];
      set({
        videos: items,
        offset: VIDEOS_PER_PAGE,
        hasMore: items.length === VIDEOS_PER_PAGE,
      });
    } catch (error) {
      set({ videos: [], hasMore: false });
    } finally {
      set({ loading: false });
    }
  },
  filterByCategory: async (id: string | null) => {
    set({ loading: true, offset: 0, videos: [], hasMore: true, categoryId: id, q: '' });
    try {
      const res = await listVideos({
        categoryId: id || undefined,
        limit: VIDEOS_PER_PAGE,
        offset: 0,
      });
      const items = (res.videos || []) as Video[];
      set({
        videos: items,
        offset: VIDEOS_PER_PAGE,
        hasMore: items.length === VIDEOS_PER_PAGE,
      });
    } catch (error) {
      set({ videos: [], hasMore: false });
    } finally {
      set({ loading: false });
    }
  },
}));
