import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useRecentPagesStore } from '@/store/useRecentPagesStore';

interface RecentPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatRelativeTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return '방금 전';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
};

const cleanNums = (nums?: string) => {
  if (!nums) return '-';
  return nums.replace(/^'|'$/g, '') || '-';
};

const RecentPagesModal: React.FC<RecentPagesModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { recentPages, fetchRecentPages, removePage, clearPages } = useRecentPagesStore();

  useEffect(() => {
    if (isOpen) {
      fetchRecentPages();
    }
  }, [isOpen, fetchRecentPages]);

  // 숫자 키패드 핫키 네비게이션 연동 (캡처 페이즈로 바인딩하여 백그라운드 에디터 입력을 원천 차단)
  useEffect(() => {
    if (!isOpen) return;

    const handleModalKeyDown = (e: KeyboardEvent) => {
      // 보조키 조합 감지 시 예외 처리
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // 0 ~ 9 입력 매핑
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        const num = parseInt(e.key, 10);
        // '1' -> index 0, '2' -> index 1, ..., '9' -> index 8, '0' -> index 9
        const targetIndex = num === 0 ? 9 : num - 1;

        if (targetIndex >= 0 && targetIndex < recentPages.length) {
          const targetPage = recentPages[targetIndex];
          navigate(`/admin/folder/${targetPage.id}`);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleModalKeyDown, true);
    return () => window.removeEventListener('keydown', handleModalKeyDown, true);
  }, [isOpen, recentPages, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center pt-[12vh] z-[999] transition-all duration-300">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-2xl border border-slate-100 text-slate-800 transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-gray-150 mb-4">
          <h3 className="text-base font-bold text-slate-950 flex items-center">
            <span className="mr-2">⏱️</span> 최근 작업 문서 이력 (최근 10개)
          </h3>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-bold ml-2">
            숫자키 [1~0] 이동 가능
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer ml-auto"
          >
            &times;
          </button>
        </div>

        {recentPages.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm font-medium">
            최근 작업(저장)한 문서 이력이 없습니다.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scroll mb-4 border border-gray-250 rounded-md">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="px-4 py-2 text-center w-16">순번</th>
                    <th className="px-4 py-2 text-center w-24">폴더 번호</th>
                    <th className="px-4 py-2">메뉴/폴더명 (클릭 시 이동)</th>
                    <th className="px-4 py-2 w-28 text-center">작업 시간</th>
                    <th className="px-4 py-2 text-center w-20">동작</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPages.map((page, index) => (
                    <tr key={page.id} className="border-b border-gray-150 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 font-bold font-mono">
                        {index === 9 ? '0' : index + 1}
                      </td>
                      <td className="px-4 py-3 font-mono text-center text-slate-500 font-bold whitespace-nowrap">
                        {cleanNums(page.nums)}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        <span
                          onClick={() => {
                            navigate(`/admin/folder/${page.id}`);
                            onClose();
                          }}
                          className="hover:underline text-indigo-600 hover:text-indigo-850 cursor-pointer font-bold transition-colors"
                          title="이 문서로 이동"
                        >
                          {page.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-center font-medium whitespace-nowrap">
                        {formatRelativeTime(page.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => removePage(page.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center"
                          title="이력 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-150 pt-3">
              <button
                onClick={() => {
                  if (confirm('모든 작업 이력을 삭제하시겠습니까?')) {
                    clearPages();
                  }
                }}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 font-bold rounded-md transition-colors cursor-pointer"
              >
                이력 전체 비우기
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RecentPagesModal;
