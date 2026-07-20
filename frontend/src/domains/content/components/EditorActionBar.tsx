import React from 'react';
import { Save, Trash2, Copy, ExternalLink } from 'lucide-react';
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
  readOnly?: boolean;
  isAdmin?: boolean;
  isLockedByMe?: boolean;
  isLockedByOthers?: boolean;
  handleLock?: () => void;
  handleUnlock?: () => void;
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
  readOnly = false,
  isAdmin = false,
  isLockedByMe = false,
  isLockedByOthers = false,
  handleLock,
  handleUnlock,
}) => {
  if (!page) return null;

  const handleLockToggle = () => {
    if (isLockedByOthers) {
      if (isAdmin && handleUnlock) handleUnlock();
    } else if (isLockedByMe) {
      if (handleUnlock) handleUnlock();
    } else {
      if (handleLock) handleLock();
    }
  };

  const isSwitchDisabled = isLockedByOthers && !isAdmin;

  return (
    <div className="mt-3 flex items-center justify-between shrink-0 select-none">
      {/* 상태 알림 또는 AKA URL 복사 영역 */}
      <div className="flex items-center space-x-3">
        {saveStatus.type === 'success' && (
          <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1 animate-fade-in bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-md">
            <span>{saveStatus.text}</span>
          </span>
        )}
        {saveStatus.type === 'error' && (
          <span className="text-xs font-bold text-rose-600 flex items-center space-x-1 animate-fade-in bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-md">
            <span>{saveStatus.text}</span>
          </span>
        )}
        {!saveStatus.type && page.aka && (
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-600">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] bg-slate-200 px-1.5 py-0.5 rounded mr-1">URL</span>
            <span className="font-mono text-slate-750 select-all">
              {`${window.location.origin}/aman/manual/${page.aka}`}
            </span>
            <button
              onClick={() => {
                const fullUrl = `${window.location.origin}/aman/manual/${page.aka}`;
                copyTextToClipboard(fullUrl)
                  .then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  })
              }}
              className="p-1 text-slate-400 hover:text-indigo-650 hover:bg-slate-200 rounded-sm transition-colors cursor-pointer"
              title="URL 복사"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                if (page.aka) {
                  window.open(`/aman/manual/${page.aka}`, '_blank');
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
        {/* 페이지 잠금 스위치 (잠금 안 함 / 잠금) */}
        {page.id && (
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md select-none">
            <span className="text-xs font-bold text-slate-500">페이지 잠금:</span>
            <button
              type="button"
              onClick={isSwitchDisabled ? undefined : handleLockToggle}
              className={`relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                (isLockedByMe || isLockedByOthers) ? 'bg-amber-600' : 'bg-slate-400'
              } ${isSwitchDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  (isLockedByMe || isLockedByOthers) ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-[11px] font-bold ${(isLockedByMe || isLockedByOthers) ? 'text-amber-650' : 'text-slate-500'}`}>
              {isLockedByOthers ? `잠김 (${page.lockUser})` : (isLockedByMe ? '내가 잠금' : '잠금 안 함')}
            </span>
          </div>
        )}

        {/* 배포 상태 스위치 (작성 중 / 완료 및 배포) */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md select-none">
          <span className="text-xs font-bold text-slate-500">배포 상태:</span>
          <button
            type="button"
            onClick={readOnly ? undefined : handleToggleStatus}
            className={`relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              pageStatus === 'PUBLISHED' ? 'bg-indigo-600' : 'bg-slate-400'
            } ${readOnly ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                pageStatus === 'PUBLISHED' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-[11px] font-bold ${pageStatus === 'PUBLISHED' ? 'text-indigo-650' : 'text-slate-500'}`}>
            {pageStatus === 'PUBLISHED' ? '완료 및 배포' : '작성 중'}
          </span>
        </div>

        <button
          onClick={() => handleSave()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-md text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saving || !isDirty || readOnly}
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? '저장 중...' : '변경사항 저장하기'}</span>
        </button>

        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-750 text-white rounded-md text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={deleting || !page || !page.id || readOnly}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{deleting ? '삭제 중...' : '삭제하기'}</span>
        </button>
      </div>
    </div>
  );
};

export default EditorActionBar;
