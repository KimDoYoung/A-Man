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
        // 1. 포커스 및 치환 범위 지정
        textarea.focus();
        textarea.setSelectionRange(start, end);

        // 2. execCommand 실행 (성공 시 브라우저가 input 이벤트를 내보내 자동으로 handleChange가 작동함)
        let successful = false;
        try {
            successful = document.execCommand('insertText', false, newText);
        } catch (e) {
            console.warn('execCommand failed, falling back to manual update:', e);
        }

        // 3. 만약 실패했다면 이전 방식대로 React 상태 강제 갱신
        if (!successful) {
            const updated = form.content.substring(0, start) + newText + form.content.substring(end);
            setForm({ content: updated });
            onChange(updated);
        }

        // 4. 커서 위치 재조정
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
            case 'italic':
                updateContent(textarea, start, end, `*${selectedText}*`, 1, 1);
                break;
            case 'strike':
                updateContent(textarea, start, end, `~~${selectedText}~~`, 2, 2);
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
            case 'h1':
                updateContent(textarea, start, end, `# ${selectedText}`, 2, 0);
                break;
            case 'h2':
                updateContent(textarea, start, end, `## ${selectedText}`, 3, 0);
                break;
            case 'h3':
                updateContent(textarea, start, end, `### ${selectedText}`, 4, 0);
                break;
            case 'color-red':
            case 'color-blue':
            case 'color-orange':
            case 'color-green': {
                const color = action.split('-')[1];
                const prefix = `<font color="${color}">`;
                const suffix = `</font>`;
                updateContent(textarea, start, end, `${prefix}${selectedText}${suffix}`, prefix.length, suffix.length);
                break;
            }
        }
        setMenuPos((prev) => ({ ...prev, visible: false }));
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        
        const clientX = e.clientX;
        const clientY = e.clientY;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const menuWidth = 192; // w-48 (192px)
        const menuHeight = 310; // 10 menu items and dividers, approx 310px

        let x = clientX;
        if (clientX + menuWidth > viewportWidth) {
            x = viewportWidth - menuWidth - 10;
        }

        let y = clientY;
        if (clientY + menuHeight > viewportHeight) {
            y = clientY - menuHeight;
            if (y < 0) y = 10;
        }

        setMenuPos({ x, y, visible: true });
    };

    const handleKeydown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Alt + Z: 현재 라인을 화면 중앙으로 올리는 스크롤 기능
        if (e.altKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            const textarea = e.currentTarget;
            const text = form.content;
            const start = textarea.selectionStart;

            const lineCount = text.split('\n').length;
            const currentLineNumber = text.substring(0, start).split('\n').length;

            if (lineCount > 0) {
                const targetScrollTop = (currentLineNumber / lineCount) * textarea.scrollHeight - (textarea.clientHeight / 2);
                textarea.scrollTop = Math.max(0, Math.min(targetScrollTop, textarea.scrollHeight - textarea.clientHeight));
            }
            return;
        }

        if (e.key === 'Enter') {
            const textarea = e.currentTarget;
            const value = form.content;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            if (e.shiftKey) {
                e.preventDefault();
                const nextNewline = value.indexOf('\n', start);
                const lineEnd = nextNewline === -1 ? value.length : nextNewline;
                const lastNewline = value.substring(0, start).lastIndexOf('\n');
                const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
                const currentLineText = value.substring(lineStart, lineEnd);

                let insertText = '\n';

                const bulletMatch = currentLineText.match(/^(\s*)-\s+(.+)$/);
                const numberMatch = currentLineText.match(/^(\s*)(\d+)\.\s+(.+)$/);

                if (bulletMatch) {
                    insertText = `\n${bulletMatch[1]}- `;
                } else if (numberMatch) {
                    const indent = numberMatch[1];
                    const currentNum = parseInt(numberMatch[2], 10);
                    const nextNum = currentNum + 1;
                    insertText = `\n${indent}${nextNum}. `;
                }

                let successful = false;
                try {
                    textarea.setSelectionRange(lineEnd, lineEnd);
                    successful = document.execCommand('insertText', false, insertText);
                } catch (err) {
                    console.warn('execCommand failed for Shift+Enter:', err);
                }

                if (!successful) {
                    const updated = value.substring(0, lineEnd) + insertText + value.substring(lineEnd);
                    setForm({ content: updated });
                    onChange(updated);
                    setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(lineEnd + insertText.length, lineEnd + insertText.length);
                    }, 0);
                }
                return;
            }

            // 선택 영역이 있을 때는 엔터 시 자동 목록을 적용하지 않고 기본 동작 처리
            if (start === end) {
                const lastNewline = value.substring(0, start).lastIndexOf('\n');
                const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
                const currentLineText = value.substring(lineStart, start);

                // 1. 빈 글머리 기호인 경우 (목록 종료)
                const emptyBulletMatch = currentLineText.match(/^(\s*)-\s*$/);
                if (emptyBulletMatch) {
                    e.preventDefault();
                    // 현재 라인의 '- '을 제거하고 줄을 비운다.
                    const updated = value.substring(0, lineStart) + emptyBulletMatch[1] + value.substring(start);
                    setForm({ content: updated });
                    onChange(updated);
                    setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(lineStart + emptyBulletMatch[1].length, lineStart + emptyBulletMatch[1].length);
                    }, 0);
                    return;
                }

                // 2. 빈 번호 매기기인 경우 (목록 종료)
                const emptyNumberMatch = currentLineText.match(/^(\s*)(\d+)\.\s*$/);
                if (emptyNumberMatch) {
                    e.preventDefault();
                    // 현재 라인의 '숫자. '을 제거하고 줄을 비운다.
                    const updated = value.substring(0, lineStart) + emptyNumberMatch[1] + value.substring(start);
                    setForm({ content: updated });
                    onChange(updated);
                    setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(lineStart + emptyNumberMatch[1].length, lineStart + emptyNumberMatch[1].length);
                    }, 0);
                    return;
                }

                // 3. 내용이 있는 글머리 기호인 경우 (다음 라인 자동 추가)
                const bulletMatch = currentLineText.match(/^(\s*)-\s+(.+)$/);
                if (bulletMatch) {
                    e.preventDefault();
                    const indent = bulletMatch[1];
                    const insertText = `\n${indent}- `;
                    
                    let successful = false;
                    try {
                        successful = document.execCommand('insertText', false, insertText);
                    } catch (err) {
                        console.warn('execCommand failed:', err);
                    }

                    if (!successful) {
                        const updated = value.substring(0, start) + insertText + value.substring(start);
                        setForm({ content: updated });
                        onChange(updated);
                        setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + insertText.length, start + insertText.length);
                        }, 0);
                    }
                    return;
                }

                // 4. 내용이 있는 번호 매기기인 경우 (다음 라인 번호 자동 증가 추가)
                const numberMatch = currentLineText.match(/^(\s*)(\d+)\.\s+(.+)$/);
                if (numberMatch) {
                    e.preventDefault();
                    const indent = numberMatch[1];
                    const currentNum = parseInt(numberMatch[2], 10);
                    const nextNum = currentNum + 1;
                    const insertText = `\n${indent}${nextNum}. `;
                    
                    let successful = false;
                    try {
                        successful = document.execCommand('insertText', false, insertText);
                    } catch (err) {
                        console.warn('execCommand failed:', err);
                    }

                    if (!successful) {
                        const updated = value.substring(0, start) + insertText + value.substring(start);
                        setForm({ content: updated });
                        onChange(updated);
                        setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + insertText.length, start + insertText.length);
                        }, 0);
                    }
                    return;
                }
            }
        }

        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = form.content;

            if (start === end) {
                // 선택 영역이 없는 경우: 현재 커서 위치에 공백 2칸('  ') 삽입
                const updated = text.substring(0, start) + '  ' + text.substring(start);
                setForm({ content: updated });
                onChange(updated);
                
                // 커서 위치를 공백 2칸 뒤로 이동
                setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + 2, start + 2);
                }, 0);
            } else {
                // 선택 영역이 있는 경우: 선택 범위가 속한 모든 라인의 처음에 공백 2칸 추가
                const beforeSelection = text.substring(0, start);
                const afterSelection = text.substring(end);

                // 선택 영역이 시작된 라인의 첫 글자 위치 찾기
                const lastNewline = beforeSelection.lastIndexOf('\n');
                const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
                
                const textToIndent = text.substring(lineStart, end);
                const lines = textToIndent.split('\n');

                let updatedTextToIndent: string;
                let newSelectionStart = start;
                let newSelectionEnd = end;

                if (e.shiftKey) {
                    // Shift + Tab: 들여쓰기 제거 (탭문자, 4칸공백, 2칸공백 대응)
                    let totalRemoved = 0;

                    const updatedLines = lines.map((line, idx) => {
                        let removed = 0;
                        let newline = line;
                        if (line.startsWith('\t')) {
                            newline = line.substring(1);
                            removed = 1;
                        } else if (line.startsWith('    ')) {
                            newline = line.substring(4);
                            removed = 4;
                        } else if (line.startsWith('  ')) {
                            newline = line.substring(2);
                            removed = 2;
                        }

                        if (idx === 0) {
                            const selectionOffsetInFirstLine = start - lineStart;
                            if (selectionOffsetInFirstLine > 0) {
                                newSelectionStart = Math.max(lineStart, start - Math.min(removed, selectionOffsetInFirstLine));
                            }
                        }
                        totalRemoved += removed;
                        return newline;
                    });
                    updatedTextToIndent = updatedLines.join('\n');
                    newSelectionEnd = end - totalRemoved;
                } else {
                    // Tab: 들여쓰기 추가 (공백 2칸)
                    const updatedLines = lines.map((line) => '  ' + line);
                    updatedTextToIndent = updatedLines.join('\n');
                    
                    newSelectionStart = start + 2;
                    newSelectionEnd = end + (lines.length * 2);
                }

                const updated = text.substring(0, lineStart) + updatedTextToIndent + afterSelection;
                setForm({ content: updated });
                onChange(updated);

                setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
                }, 0);
            }
            return;
        }

        if (e.ctrlKey) {
            const key = e.key.toLowerCase();
            if (e.shiftKey && ['r', 'b', 'o', 'g'].includes(key)) {
                e.preventDefault();
                const textarea = e.currentTarget;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;

                if (start !== end) {
                    const colorMap: Record<string, string> = {
                        r: 'red',
                        b: 'blue',
                        o: 'orange',
                        g: 'green'
                    };
                    handleAction(`color-${colorMap[key]}`);
                }
                return;
            }
            if (key === 's') {
                e.preventDefault();
                if (e.shiftKey) {
                    // Ctrl + Shift + S: 취소선 (Strike)
                    handleAction('strike');
                } else {
                    // Ctrl + S: 저장
                    onSave?.();
                }
                return;
            }
            if (['b', 'l', '0', '9', ',', '1', '2', '3', 'i'].includes(key)) {
                e.preventDefault();
                const actionMap: Record<string, string> = {
                    b: 'bold',
                    l: 'link',
                    '0': 'bullet',
                    '9': 'number',
                    ',': 'table',
                    '1': 'h1',
                    '2': 'h2',
                    '3': 'h3',
                    'i': 'italic'
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
                className="flex-1 w-full p-4 pb-[50vh] font-mono text-xs resize-none focus:outline-hidden leading-relaxed bg-white border border-gray-200 rounded-lg custom-scroll"
            />

            {/* 커스텀 컨텍스트 메뉴 */}
            {menuPos.visible && (
                <ul
                    className="fixed z-50 bg-white border border-gray-200 shadow-xl rounded-md py-1 text-[11px] w-48 font-sans font-medium"
                    style={{ top: menuPos.y, left: menuPos.x }}
                >
                    <ContextMenuItem label="제목 1 (H1)" shortcut="Ctrl+1" onClick={() => handleAction('h1')} />
                    <ContextMenuItem label="제목 2 (H2)" shortcut="Ctrl+2" onClick={() => handleAction('h2')} />
                    <ContextMenuItem label="제목 3 (H3)" shortcut="Ctrl+3" onClick={() => handleAction('h3')} />
                    <hr className="my-1 border-gray-100" />
                    <ContextMenuItem label="굵게 (Bold)" shortcut="Ctrl+B" onClick={() => handleAction('bold')} />
                    <ContextMenuItem label="기울임 (Italic)" shortcut="Ctrl+I" onClick={() => handleAction('italic')} />
                    <ContextMenuItem label="취소선 (Strike)" shortcut="Ctrl+Shift+S" onClick={() => handleAction('strike')} />
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
