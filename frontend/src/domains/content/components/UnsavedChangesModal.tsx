import React from 'react';

interface UnsavedChangesModalProps {
  blocker: any;
  handleSave: (silent?: boolean) => Promise<boolean>;
  isLeavingRef: React.MutableRefObject<boolean>;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  blocker,
  handleSave,
  isLeavingRef,
}) => {
  if (blocker.state !== 'blocked') return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[9999] transition-all duration-300">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-2xl border border-slate-100 transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-base font-bold text-slate-950 mb-2">변경사항 저장</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          작성 중인 도움말 변경 사항이 있습니다. 이동하기 전에 저장하시겠습니까?
        </p>
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => {
              blocker.reset();
            }}
            className="px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            취소 (편집 계속)
          </button>
          <button
            onClick={() => {
              blocker.proceed();
            }}
            className="px-3 py-2 text-xs font-semibold text-red-650 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
          >
            저장 안 함
          </button>
          <button
            onClick={async () => {
              isLeavingRef.current = true;
              const success = await handleSave(true);
              if (success) {
                blocker.proceed();
              } else {
                isLeavingRef.current = false;
                blocker.reset();
              }
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            저장 후 이동
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;
