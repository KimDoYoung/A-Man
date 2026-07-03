import React from 'react';
import { Save, Trash2, ExternalLink } from 'lucide-react';
import { PageData } from '@/types';

interface EditorActionBarProps {
  page: (PageData & { folder?: { id: number; name: string; nums?: string } }) | null;
  isDirty: boolean;
  saving: boolean;
  deleting: boolean;
  pageStatus: 'DRAFT' | 'PUBLISHED';
  saveStatus: { type: 'success' | 'error' | ''; text: string };
  copied: boolean;
  setCopied: (copied: boolean) => void;
  handleSave: (silent?: boolean) => Promise<boolean>;
  handleDelete: () => void;
  handleToggleStatus: () => void;
  copyTextToClipboard: (text: string) => Promise<boolean>;
}

const EditorActionBar: React.FC<EditorActionBarProps> = ({
  page,
  isDirty,
  saving,
  deleting,
  pageStatus,
  saveStatus,
  copied,
  setCopied,
  handleSave,
  handleDelete,
  handleToggleStatus,
  copyTextToClipboard,
}) => {
  if (!page) return null;

  return (
    <div className="mt-3 flex items-center justify-between shrink-0 select-none">
      {/* 상태 알림 또는 AKA URL 복사 영역 */}
      <div className="flex items-center space-x-3">
        {saveStatus.type === 'success' && (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-md flex items-center space-x-1">
            ✅ {saveStatus.text}
          </span>
        )}
        {saveStatus.type === 'error' && (
          <span className="text-xs font-medium text-red-650 bg-red-50 border border-red-100 px-3 py-1.5 rounded-md flex items-center space-x-1">
            ❌ {saveStatus.text}
          </span>
        )}
        
        {!saveStatus.type && page && page.aka && (
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-600">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] bg-slate-200 px-1 py-0.5 rounded mr-1">URL</span>
            <span className="font-mono text-slate-700 select-all">{`${window.location.origin}/aman/manual/${page.aka}`}</span>
            <button
              onClick={async () => {
                const fullUrl = `${window.location.origin}/aman/manual/${page.aka}`;
                const ok = await copyTextToClipboard(fullUrl);
                if (ok) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } else {
                  alert('클립보드 복사에 실패했습니다. URL을 직접 선택하여 복사해주세요.');
                }
              }}
              className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer hover:text-slate-800 transition-colors flex items-center justify-center"
              title="URL 복사"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (pageStatus === 'PUBLISHED') {
                  const fullUrl = `${window.location.origin}/aman/manual/${page.aka}`;
                  window.open(fullUrl, '_blank');
                }
              }}
              disabled={pageStatus !== 'PUBLISHED'}
              className={`p-1 rounded transition-colors flex items-center justify-center ${
                pageStatus === 'PUBLISHED'
                  ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer'
                  : 'text-slate-300 cursor-not-allowed opacity-50'
              }`}
              title={pageStatus === 'PUBLISHED' ? "새 창에서 열기" : "배포 상태일 때만 새 창에서 열 수 있습니다."}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
            {copied && (
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-sm transition-all duration-200 select-none">
                복사 완료!
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {/* 배포 상태 스위치 (작성 중 / 완료 및 배포) */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md select-none">
          <span className="text-xs font-bold text-slate-500">배포 상태:</span>
          <button
            type="button"
            onClick={handleToggleStatus}
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              pageStatus === 'PUBLISHED' ? 'bg-indigo-600' : 'bg-slate-400'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                pageStatus === 'PUBLISHED' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-[11px] font-bold ${pageStatus === 'PUBLISHED' ? 'text-indigo-600' : 'text-slate-500'}`}>
            {pageStatus === 'PUBLISHED' ? '완료 및 배포' : '작성 중'}
          </span>
        </div>

        <button
          onClick={() => handleSave()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saving || !isDirty}
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? '저장 중...' : '변경사항 저장하기'}</span>
        </button>

        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={deleting || !page || !page.id}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{deleting ? '삭제 중...' : '삭제하기'}</span>
        </button>
      </div>
    </div>
  );
};

export default EditorActionBar;
