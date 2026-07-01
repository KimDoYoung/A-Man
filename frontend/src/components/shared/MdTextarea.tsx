import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import getCaretCoordinates from 'textarea-caret';

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

interface Asset {
    id?: number
    atype: 'EMOJI' | 'PHRASE' | 'TEMPLATE' | 'SYMBOL'
    name: string
    value: string
}

const FALLBACK_EMOJIS: Asset[] = [
    { atype: 'EMOJI', name: 'Double Exclamation', value: '‼️' },
    { atype: 'EMOJI', name: 'Exclamation', value: '❗' },
    { atype: 'EMOJI', name: 'Checkmark Thin', value: '✔️' },
    { atype: 'EMOJI', name: 'Flag', value: '🚩' },
    { atype: 'EMOJI', name: 'Right Arrow', value: '➡️' },
    { atype: 'EMOJI', name: 'Memo', value: '📝' },
    { atype: 'EMOJI', name: 'Play Button', value: '▶️' },
    { atype: 'EMOJI', name: 'Red Circle', value: '🔴' },
    { atype: 'EMOJI', name: 'Blue Diamond', value: '🔷' },
    { atype: 'EMOJI', name: 'Blue Circle', value: '🔵' },
    { atype: 'EMOJI', name: 'Point Right', value: '👉' },
    { atype: 'EMOJI', name: 'Prohibited', value: '🚫' },
    { atype: 'EMOJI', name: 'Question Mark', value: '❓' },
    { atype: 'EMOJI', name: 'Light Bulb', value: '💡' },
    { atype: 'EMOJI', name: 'Fire', value: '🔥' },
    { atype: 'EMOJI', name: 'Sparkles', value: '✨' },
    { atype: 'EMOJI', name: 'Tada', value: '🎉' },
    { atype: 'EMOJI', name: 'Pin', value: '📌' },
    { atype: 'EMOJI', name: 'Warning Triangle', value: '⚠️' },
    { atype: 'EMOJI', name: 'Checkmark Thick', value: '✅' },
    { atype: 'EMOJI', name: 'Cross Mark', value: '❌' },
    { atype: 'EMOJI', name: 'Speech Balloon', value: '💬' },
    { atype: 'EMOJI', name: 'Thumbs Up', value: '👍' }
];

const FALLBACK_SYMBOLS: Asset[] = [
    { atype: 'SYMBOL', name: 'Reference Sign (※)', value: '※' },
    { atype: 'SYMBOL', name: 'Black Square (■)', value: '■' },
    { atype: 'SYMBOL', name: 'Black Right-Pointing Triangle (▶)', value: '▶' },
    { atype: 'SYMBOL', name: 'White Circle (○)', value: '○' },
    { atype: 'SYMBOL', name: 'Black Circle (●)', value: '●' },
    { atype: 'SYMBOL', name: 'Black Star (★)', value: '★' },
    { atype: 'SYMBOL', name: 'White Star (☆)', value: '☆' },
    { atype: 'SYMBOL', name: 'Right Arrow (➔)', value: '➔' },
    { atype: 'SYMBOL', name: 'Checkmark (✓)', value: '✓' }
];

const MdTextarea: React.FC<Props> = ({ value, onChange, onSave, textareaRef: externalRef }) => {
    const [form, setForm] = useState({ content: value });
    const [menuPos, setMenuPos] = useState<MenuPosition>({ x: 0, y: 0, visible: false });
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = externalRef || internalRef;

    const [emojis, setEmojis] = useState<Asset[]>([]);
    const [symbols, setSymbols] = useState<Asset[]>([]);
    const [phrases, setPhrases] = useState<Asset[]>([]);
    const [panelState, setPanelState] = useState<{
        type: 'emoji' | 'symbol' | 'phrase' | null;
        x: number;
        y: number;
    }>({ type: null, x: 0, y: 0 });
    const [focusedIndex, setFocusedIndex] = useState(0);

    // 메뉴 및 패널 외부 클릭 시 닫기
    useEffect(() => {
        const handleClick = () => {
            setMenuPos((prev) => ({ ...prev, visible: false }));
            setPanelState((prev) => ({ ...prev, type: null }));
        };
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // 에셋 목록 로드
    useEffect(() => {
        axios.get<Asset[]>('/aman/assets')
            .then(res => {
                const data = res.data;
                const emRaw = data.filter(x => x.atype === 'EMOJI');
                const emParsed: Asset[] = [];
                if (emRaw.length > 0) {
                    emRaw.forEach(asset => {
                        const parts = asset.value.split(',').map(s => s.trim()).filter(Boolean);
                        parts.forEach((val, idx) => {
                            emParsed.push({ atype: 'EMOJI', name: `${asset.name}-${idx}`, value: val });
                        });
                    });
                }
                const syRaw = data.filter(x => x.atype === 'SYMBOL');
                const syParsed: Asset[] = [];
                if (syRaw.length > 0) {
                    syRaw.forEach(asset => {
                        const parts = asset.value.split(',').map(s => s.trim()).filter(Boolean);
                        parts.forEach((val, idx) => {
                            syParsed.push({ atype: 'SYMBOL', name: `${asset.name}-${idx}`, value: val });
                        });
                    });
                }
                const ph = data.filter(x => x.atype === 'PHRASE');
                
                setEmojis(emParsed.length > 0 ? emParsed : FALLBACK_EMOJIS);
                setSymbols(syParsed.length > 0 ? syParsed : FALLBACK_SYMBOLS);
                setPhrases(ph);
            })
            .catch(err => {
                console.error('Failed to load assets in MdTextarea:', err);
                setEmojis(FALLBACK_EMOJIS);
                setSymbols(FALLBACK_SYMBOLS);
            });
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

        if (action.startsWith('insert-')) {
            const value = action.substring(7);
            updateContent(textarea, start, end, value, value.length, 0);
            return;
        }

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
            case 'quote': {
                const quoteText = selectedText.split('\n').map((l) => `> ${l}`).join('\n');
                updateContent(textarea, start, end, quoteText, 2, 0);
                break;
            }
            case 'table': {
                if (!selectedText || !selectedText.trim()) {
                    // 아무것도 선택되어 있지 않은 경우: 기본 템플릿 삽입
                    const table = `\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Row 1    | Row 2    | Row 3    |\n`;
                    updateContent(textarea, start, end, table, table.length, 0);
                } else {
                    // 선택된 텍스트가 있는 경우: 마크다운 테이블 또는 CSV/TSV 판단
                    const lines = selectedText.split('\n').map(l => l.trim()).filter(Boolean);
                    if (lines.length === 0) {
                        alert('선택된 영역에 텍스트가 없습니다.');
                        break;
                    }
                    
                    let hasSeparator = false;
                    let pipeLineCount = 0;
                    
                    const isSeparatorRow = (line: string): boolean => {
                        return /^[|:\s-]+$/.test(line) && line.includes('-');
                    };
                    
                    for (const line of lines) {
                        if (isSeparatorRow(line)) {
                            hasSeparator = true;
                        }
                        if (line.includes('|')) {
                            pipeLineCount++;
                        }
                    }
                    
                    const isMarkdownTable = hasSeparator && pipeLineCount >= 2;
                    
                    if (isMarkdownTable) {
                        // 1. 마크다운 테이블 -> CSV 변환
                        const csvLines: string[] = [];
                        const escapeCSVField = (val: string): string => {
                            const cleaned = val.trim();
                            if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n')) {
                                return `"${cleaned.replace(/"/g, '""')}"`;
                            }
                            return cleaned;
                        };
                        
                        for (const line of lines) {
                            if (isSeparatorRow(line)) continue;
                            if (!line.includes('|')) continue;
                            let content = line;
                            if (content.startsWith('|')) content = content.substring(1);
                            if (content.endsWith('|')) content = content.substring(0, content.length - 1);
                            
                            const cells = content.split('|').map(c => c.trim());
                            const escaped = cells.map(escapeCSVField);
                            csvLines.push(escaped.join(','));
                        }
                        
                        const csvResult = csvLines.join('\n');
                        updateContent(textarea, start, end, csvResult, csvResult.length, 0);
                    } else {
                        // 2. CSV/TSV -> 마크다운 테이블 변환
                        let delimiter = ',';
                        const firstLine = lines[0];
                        const commaCount = (firstLine.match(/,/g) || []).length;
                        const tabCount = (firstLine.match(/\t/g) || []).length;
                        
                        if (commaCount === 0 && tabCount === 0) {
                            alert('선택한 텍스트가 마크다운 표 또는 CSV 형식이 아닙니다.\n(쉼표나 탭으로 구분된 최소 2열 이상의 데이터여야 표 변환이 가능합니다.)');
                            break;
                        }
                        
                        if (tabCount > commaCount) {
                            delimiter = '\t';
                        }
                        
                        const rows: string[][] = [];
                        for (const line of lines) {
                            const row: string[] = [];
                            let current = '';
                            let inQuotes = false;
                            
                            for (let i = 0; i < line.length; i++) {
                                const char = line[i];
                                if (char === '"') {
                                    inQuotes = !inQuotes;
                                } else if (char === delimiter && !inQuotes) {
                                    row.push(current.trim());
                                    current = '';
                                } else {
                                    current += char;
                                }
                            }
                            row.push(current.trim());
                            rows.push(row);
                        }
                        
                        const colCounts = rows.map(r => r.length);
                        const minCols = Math.min(...colCounts);
                        
                        if (minCols <= 1) {
                            alert('선택한 텍스트가 마크다운 표 또는 CSV 형식이 아닙니다.\n(최소 2열 이상의 데이터여야 표 변환이 가능합니다.)');
                            break;
                        }
                        
                        const maxCols = Math.max(...colCounts);
                        
                        // 헤더 행
                        const headerRow = rows[0];
                        while (headerRow.length < maxCols) headerRow.push('');
                        const headerLine = `| ` + headerRow.map(cell => cell || ' ').join(' | ') + ` |`;
                        
                        // 구분선 행
                        const separatorLine = `| ` + Array(maxCols).fill('---').join(' | ') + ` |`;
                        
                        // 데이터 행
                        const dataLines = rows.slice(1).map(row => {
                            while (row.length < maxCols) row.push('');
                            return `| ` + row.map(cell => cell || ' ').join(' | ') + ` |`;
                        });
                        
                        const tableMarkdown = `\n${headerLine}\n${separatorLine}\n${dataLines.join('\n')}\n`;
                        updateContent(textarea, start, end, tableMarkdown, tableMarkdown.length, 0);
                    }
                }
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
        // 패널이 열려 있는 상태에서의 키 입력 가로채기
        if (panelState.type !== null) {
            const items = panelState.type === 'emoji' ? emojis
                        : panelState.type === 'symbol' ? symbols
                        : phrases;
            
            const cols = panelState.type === 'emoji' ? 8
                       : panelState.type === 'symbol' ? 6
                       : 2;

            if (e.key === 'Escape') {
                e.preventDefault();
                setPanelState({ type: null, x: 0, y: 0 });
                return;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                setFocusedIndex((prev) => (prev + 1) % items.length);
                return;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setFocusedIndex((prev) => (prev - 1 + items.length) % items.length);
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex((prev) => {
                    const next = prev + cols;
                    return next < items.length ? next : prev;
                });
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex((prev) => {
                    const next = prev - cols;
                    return next >= 0 ? next : prev;
                });
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (items[focusedIndex]) {
                    handleAction(`insert-${items[focusedIndex].value}`);
                }
                setPanelState({ type: null, x: 0, y: 0 });
                return;
            }
        }

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
                const quoteMatch = currentLineText.match(/^(\s*)>\s+(.+)$/);

                if (bulletMatch) {
                    insertText = `\n${bulletMatch[1]}- `;
                } else if (numberMatch) {
                    const indent = numberMatch[1];
                    const currentNum = parseInt(numberMatch[2], 10);
                    const nextNum = currentNum + 1;
                    insertText = `\n${indent}${nextNum}. `;
                } else if (quoteMatch) {
                    insertText = `\n${quoteMatch[1]}> `;
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

                // 2.2 빈 인용구인 경우 (목록 종료)
                const emptyQuoteMatch = currentLineText.match(/^(\s*)>\s*$/);
                if (emptyQuoteMatch) {
                    e.preventDefault();
                    // 현재 라인의 '> '을 제거하고 줄을 비운다.
                    const updated = value.substring(0, lineStart) + emptyQuoteMatch[1] + value.substring(start);
                    setForm({ content: updated });
                    onChange(updated);
                    setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(lineStart + emptyQuoteMatch[1].length, lineStart + emptyQuoteMatch[1].length);
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

                // 5. 내용이 있는 인용구인 경우 (다음 라인 자동 추가)
                const quoteMatch = currentLineText.match(/^(\s*)>\s+(.+)$/);
                if (quoteMatch) {
                    e.preventDefault();
                    const indent = quoteMatch[1];
                    const insertText = `\n${indent}> `;
                    
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
            if (['1', '2', '3'].includes(key)) {
                e.preventDefault();
                const textarea = e.currentTarget;
                const start = textarea.selectionStart;

                // 1. caret의 textarea 내 오프셋 획득
                const caret = getCaretCoordinates(textarea, start);
                
                // 2. textarea의 뷰포트 절대 좌표 획득
                const rect = textarea.getBoundingClientRect();
                
                // 3. 뷰포트 기준 X, Y 좌표 계산
                let x = rect.left + caret.left - textarea.scrollLeft;
                let y = rect.top + caret.top - textarea.scrollTop + 16;

                // 패널 타입 매핑
                const typeMap: Record<string, 'emoji' | 'symbol' | 'phrase'> = {
                    '1': 'emoji',
                    '2': 'symbol',
                    '3': 'phrase'
                };
                const type = typeMap[key];

                const panelWidths = { emoji: 192, symbol: 160, phrase: 320 };
                const panelHeights = { emoji: 120, symbol: 120, phrase: 240 };
                const w = panelWidths[type];
                const h = panelHeights[type];

                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                if (x + w > viewportWidth) {
                    x = viewportWidth - w - 10;
                }
                if (y + h > viewportHeight) {
                    y = rect.top + caret.top - textarea.scrollTop - h - 4;
                }
                if (x < 0) x = 10;
                if (y < 0) y = 10;

                setFocusedIndex(0);
                setPanelState({ type, x, y });
                return;
            }

            if (['b', 'l', '0', '9', '8', ',', 'i'].includes(key)) {
                e.preventDefault();
                const actionMap: Record<string, string> = {
                    b: 'bold',
                    l: 'link',
                    '0': 'bullet',
                    '9': 'number',
                    '8': 'quote',
                    ',': 'table',
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

            {/* 커서 근처 이모지 패널 */}
            {panelState.type === 'emoji' && (
                <div
                    className="fixed z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-2 grid grid-cols-8 gap-1 w-48 animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: panelState.y, left: panelState.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {emojis.map((item, idx) => (
                        <button
                            key={`${item.id || idx}`}
                            onClick={() => {
                                handleAction(`insert-${item.value}`);
                                setPanelState({ type: null, x: 0, y: 0 });
                            }}
                            className={`w-5.5 h-5.5 flex items-center justify-center text-base rounded transition-all cursor-pointer ${
                                focusedIndex === idx 
                                ? 'bg-indigo-100 ring-2 ring-indigo-500 font-bold scale-110 z-10' 
                                : 'hover:bg-gray-100'
                            }`}
                            title={item.name}
                        >
                            {item.value}
                        </button>
                    ))}
                </div>
            )}

            {/* 커서 근처 특수문자 패널 */}
            {panelState.type === 'symbol' && (
                <div
                    className="fixed z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-2 grid grid-cols-6 gap-1 w-40 animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: panelState.y, left: panelState.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {symbols.map((item, idx) => (
                        <button
                            key={`${item.id || idx}`}
                            onClick={() => {
                                handleAction(`insert-${item.value}`);
                                setPanelState({ type: null, x: 0, y: 0 });
                            }}
                            className={`w-5.5 h-5.5 flex items-center justify-center text-sm rounded transition-all cursor-pointer font-mono text-gray-700 ${
                                focusedIndex === idx 
                                ? 'bg-indigo-100 ring-2 ring-indigo-500 font-bold scale-110 z-10' 
                                : 'hover:bg-gray-100'
                            }`}
                            title={item.name}
                        >
                            {item.value}
                        </button>
                    ))}
                </div>
            )}

            {/* 커서 근처 상용구 패널 */}
            {panelState.type === 'phrase' && (
                <div
                    className="fixed z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-2.5 max-h-60 overflow-y-auto w-80 flex flex-wrap gap-1.5 animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: panelState.y, left: panelState.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {phrases.length === 0 ? (
                        <div className="w-full text-center text-xs text-gray-400 py-2">등록된 상용구가 없습니다.</div>
                    ) : (
                        phrases.map((item, idx) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    handleAction(`insert-${item.value}`);
                                    setPanelState({ type: null, x: 0, y: 0 });
                                }}
                                className={`px-2 py-0.5 border rounded text-xs font-semibold cursor-pointer transition-all max-w-[130px] truncate ${
                                    focusedIndex === idx 
                                    ? 'bg-purple-100 border-purple-400 text-purple-900 ring-2 ring-purple-400 font-bold scale-105 z-10' 
                                    : 'bg-purple-50 hover:bg-purple-100 border-purple-100 text-purple-700'
                                }`}
                                title={`${item.name}\n---\n${item.value}`}
                            >
                                {item.name}
                            </button>
                        ))
                    )}
                </div>
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
