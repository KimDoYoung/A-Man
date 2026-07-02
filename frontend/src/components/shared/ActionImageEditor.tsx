import React, { useState, useRef, useEffect } from 'react';

interface Action {
  id: number;
  type: 'number' | 'rect' | 'text';
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  num?: number;
}

const ActionImageEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentTool, setCurrentTool] = useState<'number' | 'rect' | 'text'>('number');
  const [currentNumber, setCurrentNumber] = useState<number>(1);
  const [hasImage, setHasImage] = useState<boolean>(false);
  const [actions, setActions] = useState<Action[]>([]);

  // 사각형 드로잉을 위한 임시 상태 Ref
  const isDrawingRect = useRef<boolean>(false);
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const currentX = useRef<number>(0);
  const currentY = useRef<number>(0);

  const baseImageRef = useRef<HTMLImageElement | null>(null);

  // 액션 배열이 바뀔 때마다 캔버스를 처음부터 다시 그림
  useEffect(() => {
    redrawCanvas();
  }, [actions]);

  // 캔버스 전체를 완전히 지우고 다시 그리는 핵심 함수
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImageRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. 캔버스 초기화 및 원본 이미지 드로잉
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImageRef.current, 0, 0);

    // 2. 각 액션 복원 드로잉
    actions.forEach((action) => {
      if (action.type === 'number' && action.num !== undefined) {
        // 빨간 바탕 숫자 원 그리기
        ctx.beginPath();
        ctx.arc(action.x, action.y, 16, 0, 2 * Math.PI);
        ctx.fillStyle = '#EF4444'; // Tailwind Red 500
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(action.num), action.x, action.y + 1);

      } else if (action.type === 'rect' && action.w !== undefined && action.h !== undefined) {
        // 사각형 영역 그리기
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(action.x, action.y, action.w, action.h);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
        ctx.fillRect(action.x, action.y, action.w, action.h);

      } else if (action.type === 'text' && action.text !== undefined) {
        // 일반 텍스트 드로잉
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 4;
        ctx.fillText(action.text, action.x, action.y);
        ctx.shadowBlur = 0;
      }
    });
  };

  // 이미지 파일 업로드 처리
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;
      const img = new Image();
      img.src = event.target.result as string;
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;

        baseImageRef.current = img;
        setHasImage(true);
        setCurrentNumber(1);
        setActions([]); // 액션 기록 초기화
      };
    };
    reader.readAsDataURL(file);
  };

  // 캔버스 내 상대 좌표 계산 함수
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hasImage) return;
    const coords = getCanvasCoords(e);

    if (currentTool === 'rect') {
      isDrawingRect.current = true;
      startX.current = coords.x;
      startY.current = coords.y;
      currentX.current = coords.x;
      currentY.current = coords.y;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hasImage || !isDrawingRect.current || currentTool !== 'rect') return;
    const coords = getCanvasCoords(e);

    currentX.current = coords.x;
    currentY.current = coords.y;

    // 누적 액션 재드래그
    redrawCanvas();

    // 실시간 러버밴드 가이드 드로잉
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = currentX.current - startX.current;
    const height = currentY.current - startY.current;

    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(startX.current, startY.current, width, height);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.fillRect(startX.current, startY.current, width, height);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hasImage) return;
    const coords = getCanvasCoords(e);

    if (currentTool === 'number') {
      const newAction: Action = {
        id: Date.now(),
        type: 'number',
        x: coords.x,
        y: coords.y,
        num: currentNumber
      };
      setActions((prev) => [...prev, newAction]);
      setCurrentNumber((prev) => prev + 1);

    } else if (currentTool === 'rect' && isDrawingRect.current) {
      isDrawingRect.current = false;
      const newAction: Action = {
        id: Date.now(),
        type: 'rect',
        x: startX.current,
        y: startY.current,
        w: coords.x - startX.current,
        h: coords.y - startY.current
      };
      setActions((prev) => [...prev, newAction]);

    } else if (currentTool === 'text') {
      const textValue = prompt('이미지에 삽입할 텍스트를 입력하세요:');
      if (textValue === null || textValue.trim() === '') return;

      const newAction: Action = {
        id: Date.now(),
        type: 'text',
        x: coords.x,
        y: coords.y,
        text: textValue
      };
      setActions((prev) => [...prev, newAction]);
    }
  };

  const handleMouseLeave = () => {
    if (isDrawingRect.current) {
      isDrawingRect.current = false;
      redrawCanvas();
    }
  };

  const handleUndo = () => {
    if (actions.length === 0) return;
    const lastAction = actions[actions.length - 1];

    if (lastAction.type === 'number') {
      setCurrentNumber((prev) => Math.max(1, prev - 1));
    }
    setActions((prev) => prev.slice(0, -1));
  };

  const handleReset = () => {
    if (window.confirm('정말 전체 그리기를 초기화하시겠습니까?')) {
      setActions([]);
      setCurrentNumber(1);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) return;
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col items-center p-6 bg-slate-50 rounded-xl shadow-xs max-w-5xl mx-auto my-4 font-sans select-none">
      {/* 컨트롤 영역 */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* 이미지 선택 */}
          <label className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-xs text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
            <span>📷 이미지 업로드</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>

          <span className="w-px h-6 bg-gray-200 hidden md:block"></span>

          {/* 그리기 도구 버튼들 */}
          <button
            onClick={() => setCurrentTool('number')}
            disabled={!hasImage}
            className={`px-3.5 py-2 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              currentTool === 'number' && hasImage
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            title="클릭한 곳에 빨간 동그라미 순서 번호를 남깁니다."
          >
            ❶ 숫자 번호
          </button>
          <button
            onClick={() => setCurrentTool('rect')}
            disabled={!hasImage}
            className={`px-3.5 py-2 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              currentTool === 'rect' && hasImage
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            title="드래그하여 빨간 테두리 사각형 영역을 그립니다."
          >
            ▢ 사각형
          </button>
          <button
            onClick={() => setCurrentTool('text')}
            disabled={!hasImage}
            className={`px-3.5 py-2 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              currentTool === 'text' && hasImage
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            title="클릭한 위치에 임의의 텍스트를 삽입합니다."
          >
            T 텍스트
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* 실행 취소 */}
          <button
            onClick={handleUndo}
            disabled={actions.length === 0}
            className="px-3.5 py-2 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↩️ 실행취소 (Undo)
          </button>
          {/* 초기화 */}
          <button
            onClick={handleReset}
            disabled={actions.length === 0 && !hasImage}
            className="px-3.5 py-2 rounded-md text-xs font-semibold bg-gray-600 hover:bg-gray-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            전체 초기화
          </button>
          {/* 다운로드 */}
          <button
            onClick={handleDownload}
            disabled={!hasImage}
            className="px-4 py-2 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            💾 완료 이미지 다운로드
          </button>
        </div>
      </div>

      {/* 캔버스 뷰포트 */}
      <div className="w-full flex items-center justify-center p-4 bg-white border border-gray-200 rounded-lg shadow-inner overflow-auto max-h-[70vh]">
        {hasImage ? (
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            className="border-2 border-dashed border-gray-300 bg-white cursor-crosshair block shadow-xs transition-shadow max-w-full"
          />
        ) : (
          <div className="py-20 text-center text-gray-400 font-medium text-sm flex flex-col items-center justify-center gap-2">
            <span>📷 편집 및 마킹할 가이드 이미지를 올려주세요.</span>
            <span className="text-xs text-gray-300">업로드 완료 후 그리기 마크 기능이 활성화됩니다.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionImageEditor;
