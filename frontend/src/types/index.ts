// 3단계 폴더 계층 구조 인터페이스
export interface FolderNode {
  id: number;
  nums: string;
  name: string;
  level: number;
  parentId: number | null;
  sortOrder: number;
  children: FolderNode[];
  pages: PageSummary[];
  isUse?: boolean;
}

// 폴더 노드 내부의 페이지 요약 정보 인터페이스
export interface PageSummary {
  id: number;
  title: string;
  sortOrder: number;
}

// 도움말 상세 문서 데이터 인터페이스
export interface PageData {
  id?: number;
  title: string;
  content: string;
  aka?: string;
  updatedAt?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  lockUser?: string | null;
  lockTime?: string | null;
  lockRole?: string | null;
}

// 목차(TOC) 아이템 인터페이스
export interface TocItem {
  id: string;
  text: string;
  level: number;
}

// React Router Outlet Context 인터페이스
export interface OutletContextType {
  setTocData: (data: TocItem[]) => void;
  tocOpen: boolean;
  setTocOpen: (open: boolean) => void;
}
