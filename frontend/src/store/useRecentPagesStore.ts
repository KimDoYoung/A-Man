import { create } from 'zustand';
import { apiClient } from '@/lib/apiClient';

export interface RecentPageItem {
  id: number;
  name: string;
  nums?: string;
  timestamp: number;
}

interface RecentPagesState {
  recentPages: RecentPageItem[];
  fetchRecentPages: () => Promise<void>;
  addPage: (id: number) => Promise<void>;
  removePage: (id: number) => Promise<void>;
  clearPages: () => Promise<void>;
}

export const useRecentPagesStore = create<RecentPagesState>((set) => ({
  recentPages: [],
  
  fetchRecentPages: async () => {
    try {
      const data = await apiClient.get<RecentPageItem[]>('/admin/work-stack');
      if (Array.isArray(data)) {
        set({ recentPages: data });
      } else {
        console.error('최근 작업 문서 이력이 배열 형식이 아닙니다:', data);
        set({ recentPages: [] });
      }
    } catch (err) {
      console.error('최근 작업 문서 이력 조회 실패:', err);
    }
  },
  
  addPage: async (id: number) => {
    try {
      await apiClient.post(`/admin/work-stack/${id}`);
      // 저장 후 스택 목록 리프레시
      const data = await apiClient.get<RecentPageItem[]>('/admin/work-stack');
      if (Array.isArray(data)) {
        set({ recentPages: data });
      }
    } catch (err) {
      console.error('최근 작업 문서 이력 추가 실패:', err);
    }
  },
  
  removePage: async (id: number) => {
    try {
      await apiClient.delete(`/admin/work-stack/${id}`);
      // 삭제 후 스택 목록 리프레시
      const data = await apiClient.get<RecentPageItem[]>('/admin/work-stack');
      if (Array.isArray(data)) {
        set({ recentPages: data });
      }
    } catch (err) {
      console.error('최근 작업 문서 이력 삭제 실패:', err);
    }
  },
  
  clearPages: async () => {
    try {
      await apiClient.delete('/admin/work-stack');
      set({ recentPages: [] });
    } catch (err) {
      console.error('최근 작업 문서 이력 전체 비우기 실패:', err);
    }
  },
}));
