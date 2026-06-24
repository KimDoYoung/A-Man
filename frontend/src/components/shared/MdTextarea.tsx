import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Props {
    value: string;
    onChange: (value: string) => void;
    onSave?: () => void;
    textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

interface MenuPosition {
    x: number;
    y: number;
    visible: boolean;
}

const MdTextarea: React.FC<Props> = ({ value, onChange, onSave, textareaRef: externalRef }) => {
    const [form, setForm] = useState({ content: value });
    const [menuPos, setMenuPos] = useState<MenuPosition>({ x: 0, y: 0, visible: false });
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = externalRef || internalRef;

    // 메뉴 외부 클릭 시 닫기
    useEffect(() => {
        const handleClick = () => setMenuPos((prev) => ({ ...prev, visible: false }));
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // 외부 value가 변경될 때 내부 state 동기화
    useEffect(() => {
        setForm({ content: value });
    }, [value]);

    const updateContent = (
        textarea: HTMLTextAreaElement,
        start: number,
        end: number,
        newText: string,
        cursorOffsetStart = 2,
        cursorOffsetEnd = 2
    ) => {
        const updated = form.content.substring(0, start) + newText + form.content.substring(end);
        setForm({ content: updated });
        onChange(updated);

        // 포커스 유지 및 커서 위치 조정
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + cursorOffsetStart, start + newText.length - cursorOffsetEnd);
        }, 0);
    };

    const handleAction = (action: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = form.content.substring(start, end);

        switch (action) {
            case 'bold':
                updateContent(textarea, start, end, `**${selectedText}**`, 2, 2);
                break;
            case 'link': {
                const url = prompt('URL을 입력하세요:');
                if (url) updateContent(textarea, start, end, `[${selectedText}](${url})`, 1, 3 + url.length);
                break;
            }
            case 'bullet': {
                const bulletList = selectedText.split('\n').map((l) => `- ${l}`).join('\n');
                updateContent(textarea, start, end, bulletList, 2, 0);
                break;
            }
            case 'number': {
                const numList = selectedText.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n');
                updateContent(textarea, start, end, numList, 3, 0);
                break;
            }
            case 'table': {
                const table = `\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Row 1    | Row 2    | Row 3    |\n`;
                updateContent(textarea, start, end, table, table.length, 0);
                break;
            }
        }
        setMenuPos((prev) => ({ ...prev, visible: false }));
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setMenuPos({ x: e.pageX, y: e.pageY, visible: true });
    };

    const handleKeydown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.ctrlKey) {
            const key = e.key.toLowerCase();
            if (key === 's') {
                e.preventDefault();
                onSave?.();
                return;
            }
            if (['b', 'l', '0', '9', ','].includes(key)) {
                e.preventDefault();
                const actionMap: Record<string, string> = {
                    b: 'bold', l: 'link', '0': 'bullet', '9': 'number', ',': 'table'
                };
                handleAction(actionMap[key]);
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        setForm({ content: e.target.value });
    };

    const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (!file) continue;

                const textarea = e.currentTarget;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;

                const placeholderId = Date.now();
                const loadingText = `![Uploading image ${placeholderId}...]()\n`;
                const newContent = form.content.substring(0, start) + loadingText + form.content.substring(end);
                setForm({ content: newContent });
                onChange(newContent);

                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await axios.post<{ url: string }>('/aman/content/image', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    const actualUrl = res.data?.url ?? 'undefined_url_returned';
                    const markdownImage = `![image](${actualUrl})\n`;
                    const finalContent = newContent.replace(loadingText, markdownImage);
                    setForm({ content: finalContent });
                    onChange(finalContent);
                } catch (error) {
                    console.error('이미지 붙여넣기 업로드 실패:', error);
                    alert('이미지 업로드 중 오류가 발생했습니다.');
                    const revertedContent = newContent.replace(loadingText, '');
                    setForm({ content: revertedContent });
                    onChange(revertedContent);
                }
                return;
            }
        }
    };

    return (
        <div className="relative w-full flex-1 flex flex-col">
            <textarea
                ref={textareaRef}
                placeholder="이곳에 도움말 문서를 마크다운 형식으로 편집하세요..."
                value={form.content}
                onChange={handleChange}
                onKeyDown={handleKeydown}
                onPaste={handlePaste}
                onContextMenu={handleContextMenu}
                className="flex-1 w-full p-4 font-mono text-xs resize-none focus:outline-hidden leading-relaxed bg-white border border-gray-200 rounded-lg custom-scroll"
            />

            {/* 커스텀 컨텍스트 메뉴 */}
            {menuPos.visible && (
                <ul
                    className="fixed z-50 bg-white border border-gray-200 shadow-xl rounded-md py-1 text-[11px] w-40 font-sans font-medium"
                    style={{ top: menuPos.y, left: menuPos.x }}
                >
                    <ContextMenuItem label="굵게 (Bold)" shortcut="Ctrl+B" onClick={() => handleAction('bold')} />
                    <ContextMenuItem label="링크 (Link)" shortcut="Ctrl+L" onClick={() => handleAction('link')} />
                    <hr className="my-1 border-gray-100" />
                    <ContextMenuItem label="글머리 기호" shortcut="Ctrl+0" onClick={() => handleAction('bullet')} />
                    <ContextMenuItem label="번호 매기기" shortcut="Ctrl+9" onClick={() => handleAction('number')} />
                    <ContextMenuItem label="표 (Table)" shortcut="Ctrl+," onClick={() => handleAction('table')} />
                </ul>
            )}
        </div>
    );
};

const ContextMenuItem = ({ label, shortcut, onClick }: { label: string; shortcut: string; onClick: () => void }) => (
    <li
        className="px-3 py-1.5 hover:bg-indigo-50 hover:text-indigo-650 cursor-pointer flex justify-between items-center text-gray-700 transition-colors"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
        <span>{label}</span>
        <span className="text-[10px] text-gray-400 font-mono">{shortcut}</span>
    </li>
);

export default MdTextarea;
