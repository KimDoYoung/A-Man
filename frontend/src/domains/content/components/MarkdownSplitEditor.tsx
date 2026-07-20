import React from 'react';
import EditorToolbar from '@/components/shared/EditorToolbar';
import MdTextarea from '@/components/shared/MdTextarea';
import { renderMarkdownToHtml } from '@/utils/markdownRenderer';
import { PageData } from '@/types';

interface MarkdownSplitEditorProps {
  page: (PageData & { folder?: { id: number; name: string; nums?: string } }) | null;
  pageContent: string;
  setPageContent: (val: string) => void;
  pageAka: string;
  setPageAka: (val: string) => void;
  previewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
  previewWidthPercent: number;
  resizingPreview: boolean;
  setResizingPreview: (resizing: boolean) => void;
  pageTitle: string;
  folderId: string | undefined;
  settings: Record<string, string>;
  insertMarkdown: (before: string, after: string) => void;
  insertLink: () => void;
  insertBullet: () => void;
  insertNumber: () => void;
  selectAndUploadImage: () => void;
  handleSave: (silent?: boolean) => Promise<boolean>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  previewContainerRef: React.RefObject<HTMLDivElement>;
  readOnly?: boolean;
  onImportSuccess: (importedPage: any) => void;
}

const MarkdownSplitEditor: React.FC<MarkdownSplitEditorProps> = ({
  page,
  pageContent,
  setPageContent,
  pageAka,
  setPageAka,
  previewOpen,
  setPreviewOpen,
  previewWidthPercent,
  resizingPreview,
  setResizingPreview,
  pageTitle,
  folderId,
  settings,
  insertMarkdown,
  insertLink,
  insertBullet,
  insertNumber,
  selectAndUploadImage,
  handleSave,
  textareaRef,
  containerRef,
  previewContainerRef,
  readOnly = false,
  onImportSuccess,
}) => {
  if (!page) return null;

  return (
    <div
      ref={containerRef}
      className="flex-1 flex border border-gray-200 rounded-lg overflow-hidden bg-gray-100 items-stretch relative"
    >
      {/* 왼쪽: 에디터 */}
      <div
        className="bg-white flex flex-col border-r border-gray-200 shrink-0"
        style={{ width: previewOpen ? `${previewWidthPercent}%` : '100%' }}
      >
        {/* 에디터 툴바 */}
        <div className={readOnly ? 'pointer-events-none opacity-50 select-none' : ''}>
          <EditorToolbar
            insertMarkdown={insertMarkdown}
            insertLink={insertLink}
            insertBullet={insertBullet}
            insertNumber={insertNumber}
            selectAndUploadImage={selectAndUploadImage}
            aka={pageAka}
            onAkaChange={setPageAka}
            previewOpen={previewOpen}
            setPreviewOpen={setPreviewOpen}
            pageTitle={pageTitle}
            pageContent={pageContent}
            folderId={folderId}
            onImportSuccess={onImportSuccess}
          />
        </div>

        {/* 텍스트 편집창 */}
        <MdTextarea
          value={pageContent}
          onChange={setPageContent}
          onSave={handleSave}
          textareaRef={textareaRef}
          readOnly={readOnly}
        />
      </div>

      {/* 2번 스플리터 (에디터 - 프리뷰용) */}
      {previewOpen && (
        <div
          className={`w-1.5 cursor-col-resize hover:bg-indigo-500 border-r border-gray-200 transition-colors shrink-0 flex items-center justify-center z-20 ${
            resizingPreview ? 'bg-indigo-500' : 'bg-transparent'
          }`}
          onMouseDown={() => setResizingPreview(true)}
        >
          <div className="w-0.5 h-4 bg-gray-300 rounded-sm"></div>
        </div>
      )}

      {/* 오른쪽: 라이브 프리뷰 */}
      {previewOpen && (
        <div className="bg-slate-50 flex flex-col flex-1">
          <div className="bg-slate-100 border-b border-gray-200 px-4 py-2 flex items-center justify-between text-gray-500 shrink-0 select-none">
            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-bold tracking-wider">
              LIVE PREVIEW
            </span>
          </div>
          <div ref={previewContainerRef} className="flex-1 p-1 overflow-y-auto custom-scroll bg-slate-50/50">
            <div className="prose max-w-none bg-white p-2 pb-[50vh] border border-gray-100 rounded-md shadow-xs leading-relaxed min-h-full markdown-content">
              {renderMarkdownToHtml(pageContent, settings)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownSplitEditor;
