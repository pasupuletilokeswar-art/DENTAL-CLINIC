import React, { useState, useRef } from 'react';
import { RotateCcw, GripHorizontal } from 'lucide-react';
import { getToothByFDI } from '../types/dentalChart.types';

interface MiniArchSelectorProps {
  selectedFDI: number;
  onSelectTooth: (fdi: number) => void;
  toothConditionColors?: Map<number, string>;
  onRotateDirection?: (direction: 'left' | 'right' | 'up' | 'down') => void;
}

// 1. Permanent Adult Dentition FDI Numbering in exact anatomical orientation:
// When viewing patient from front:
// Patient's Right is on Viewer's Left (Q1 and Q4)
// Patient's Left is on Viewer's Right (Q2 and Q3)

// Upper Arch (Maxilla): Q1 (18 -> 11) then Q2 (21 -> 28)
const UPPER_TEETH_FDI = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];

// Lower Arch (Mandible): Q4 (48 -> 41) then Q3 (31 -> 38)
const LOWER_TEETH_FDI = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const MiniArchSelector: React.FC<MiniArchSelectorProps> = ({
  selectedFDI,
  onSelectTooth,
  toothConditionColors,
  onRotateDirection,
}) => {
  const [hoveredFDI, setHoveredFDI] = useState<number | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    parentW: number;
    parentH: number;
    panelW: number;
    panelH: number;
  } | null>(null);

  const activeFDI = hoveredFDI || selectedFDI;
  const activeToothObj = getToothByFDI(activeFDI);

  // Drag and Move via Header Handle
  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    // Only respond to primary pointer down (left click / single touch)
    if (e.button !== 0) return;
    const panel = panelRef.current;
    if (!panel) return;

    const parent = panel.offsetParent as HTMLElement;
    if (!parent) return;

    e.preventDefault();
    e.stopPropagation();

    const panelRect = panel.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    const currentX = panelRect.left - parentRect.left;
    const currentY = panelRect.top - parentRect.top;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
      parentW: parentRect.width,
      parentH: parentRect.height,
      panelW: panelRect.width,
      panelH: panelRect.height,
    };

    setIsDragging(true);
    setPosition({ x: currentX, y: currentY });

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const start = dragStartRef.current;
      if (!start) return;

      const deltaX = moveEvt.clientX - start.startX;
      const deltaY = moveEvt.clientY - start.startY;

      let newX = start.initialX + deltaX;
      let newY = start.initialY + deltaY;

      // Keep panel strictly within visible boundaries of the parent viewer
      const maxX = Math.max(0, start.parentW - start.panelW);
      const maxY = Math.max(0, start.parentH - start.panelH);

      newX = Math.max(0, Math.min(maxX, newX));
      newY = Math.max(0, Math.min(maxY, newY));

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  return (
    <div
      ref={panelRef}
      className={`absolute z-30 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 shadow-2xl select-none w-[172px] flex flex-col items-center gap-1 ${
        position === null ? 'bottom-5 left-5' : ''
      } ${!isDragging ? 'transition-all duration-200 ease-out' : 'cursor-grabbing'}`}
      style={
        position !== null
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              bottom: 'auto',
              right: 'auto',
            }
          : undefined
      }
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Info Banner: Draggable Handle & Reset Control */}
      <div
        onPointerDown={handleHeaderPointerDown}
        className="w-full flex items-center justify-between px-1 text-[10px] cursor-grab active:cursor-grabbing hover:bg-slate-900/60 rounded-lg py-0.5 transition-colors select-none group"
        title="Click and drag to move panel anywhere inside viewer"
        aria-label="Drag FDI selector panel"
      >
        <div className="flex items-center gap-1.5 truncate">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0 transition-colors" />
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff] shrink-0" />
          <span className="font-black text-cyan-300 tracking-wide truncate">
            Tooth {activeFDI}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
            FDI
          </span>
          {position !== null && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPosition(null);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1 -mr-0.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-md transition-all cursor-pointer"
              title="Reset to default position"
              aria-label="Reset panel position"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* UP Navigation Arrow */}
      {onRotateDirection && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRotateDirection('up');
          }}
          className="flex items-center justify-center py-0.5 px-4 text-slate-400 hover:text-cyan-400 active:scale-90 text-sm font-black transition-all cursor-pointer select-none bg-transparent hover:bg-slate-800/50 rounded-md"
          title="Rotate Model Up (Upper Occlusal View)"
          aria-label="FDI Selector UP"
        >
          ↑
        </button>
      )}

      {/* Middle Section: Left Arrow, Dental Arches, Right Arrow */}
      <div className="w-full flex items-center justify-between gap-1">
        {/* LEFT Navigation Arrow */}
        {onRotateDirection && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRotateDirection('left');
            }}
            className="flex items-center justify-center py-4 px-1.5 text-slate-400 hover:text-cyan-400 active:scale-90 text-sm font-black transition-all cursor-pointer select-none bg-transparent hover:bg-slate-800/50 rounded-md shrink-0"
            title="Rotate Model Left"
            aria-label="FDI Selector LEFT"
          >
            ←
          </button>
        )}

        {/* Central Arches Box */}
        <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
          {/* 1. Upper (Maxillary) Arch */}
          <div className="w-full flex flex-col items-center bg-slate-900/50 rounded-xl p-1.5 border border-slate-800/60">
            <div className="w-full flex items-center justify-between px-1 text-[7.5px] font-medium text-slate-400 mb-0.5 whitespace-nowrap">
              <span className="text-slate-500">R (Q1)</span>
              <span className="text-slate-300 font-bold tracking-wider">UPPER</span>
              <span className="text-slate-500">(Q2) L</span>
            </div>

            <svg viewBox="0 0 100 52" className="w-full h-10 overflow-visible">
              {UPPER_TEETH_FDI.map((fdi, idx) => {
                // idx goes from 0 (FDI 18, viewer's left) to 15 (FDI 28, viewer's right)
                const angle = Math.PI - (idx / 15) * Math.PI;
                const rx = 40;
                const ry = 34;
                const cx = 50 + rx * Math.cos(angle);
                const cy = 44 - ry * Math.sin(angle);

                const isSelected = fdi === selectedFDI;
                const isHovered = fdi === hoveredFDI;
                const conditionColor = toothConditionColors?.get(fdi);

                return (
                  <g
                    key={fdi}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTooth(fdi);
                    }}
                    onMouseEnter={() => setHoveredFDI(fdi)}
                    onMouseLeave={() => setHoveredFDI(null)}
                  >
                    {/* Expanded invisible hit target for easy clicking */}
                    <circle cx={cx} cy={cy} r="7.5" fill="transparent" />

                    {/* Animated cyan pulse ring for selected tooth */}
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="5.8"
                        fill="none"
                        stroke="#00e5ff"
                        strokeWidth="1.8"
                        className="animate-pulse"
                      />
                    )}

                    {/* Hover ring */}
                    {isHovered && !isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="5.2"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Tooth Node */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 4.2 : isHovered ? 4.0 : 3.4}
                      fill={
                        isSelected
                          ? '#00e5ff'
                          : conditionColor || (isHovered ? '#e2e8f0' : '#f8fafc')
                      }
                      stroke={isSelected ? '#ffffff' : isHovered ? '#38bdf8' : '#475569'}
                      strokeWidth={isSelected ? '1.2' : '0.8'}
                      className="transition-all duration-100"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 2. Lower (Mandibular) Arch */}
          <div className="w-full flex flex-col items-center bg-slate-900/50 rounded-xl p-1 border border-slate-800/60">
            <svg viewBox="0 0 100 52" className="w-full h-10 overflow-visible">
              {LOWER_TEETH_FDI.map((fdi, idx) => {
                // idx goes from 0 (FDI 48, viewer's left) to 15 (FDI 38, viewer's right)
                const angle = Math.PI - (idx / 15) * Math.PI;
                const rx = 38;
                const ry = 32;
                const cx = 50 + rx * Math.cos(angle);
                const cy = 8 + ry * Math.sin(angle);

                const isSelected = fdi === selectedFDI;
                const isHovered = fdi === hoveredFDI;
                const conditionColor = toothConditionColors?.get(fdi);

                return (
                  <g
                    key={fdi}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTooth(fdi);
                    }}
                    onMouseEnter={() => setHoveredFDI(fdi)}
                    onMouseLeave={() => setHoveredFDI(null)}
                  >
                    {/* Expanded invisible hit target for easy clicking */}
                    <circle cx={cx} cy={cy} r="7.5" fill="transparent" />

                    {/* Animated cyan pulse ring for selected tooth */}
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="5.8"
                        fill="none"
                        stroke="#00e5ff"
                        strokeWidth="1.8"
                        className="animate-pulse"
                      />
                    )}

                    {/* Hover ring */}
                    {isHovered && !isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="5.2"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Tooth Node */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 4.2 : isHovered ? 4.0 : 3.4}
                      fill={
                        isSelected
                          ? '#00e5ff'
                          : conditionColor || (isHovered ? '#e2e8f0' : '#f8fafc')
                      }
                      stroke={isSelected ? '#ffffff' : isHovered ? '#38bdf8' : '#475569'}
                      strokeWidth={isSelected ? '1.2' : '0.8'}
                      className="transition-all duration-100"
                    />
                  </g>
                );
              })}
            </svg>

            <div className="w-full flex items-center justify-between px-1 text-[7.5px] font-medium text-slate-400 mt-0.5 whitespace-nowrap">
              <span className="text-slate-500">R (Q4)</span>
              <span className="text-slate-300 font-bold tracking-wider">LOWER</span>
              <span className="text-slate-500">(Q3) L</span>
            </div>
          </div>
        </div>

        {/* RIGHT Navigation Arrow */}
        {onRotateDirection && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRotateDirection('right');
            }}
            className="flex items-center justify-center py-3 px-1.5 text-slate-400 hover:text-cyan-400 active:scale-90 text-sm font-black transition-all cursor-pointer select-none bg-transparent hover:bg-slate-800/50 rounded-md shrink-0"
            title="Rotate Model Right"
            aria-label="FDI Selector RIGHT"
          >
            →
          </button>
        )}
      </div>

      {/* DOWN Navigation Arrow */}
      {onRotateDirection && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRotateDirection('down');
          }}
          className="flex items-center justify-center py-0.5 px-3 text-slate-400 hover:text-cyan-400 active:scale-90 text-sm font-black transition-all cursor-pointer select-none bg-transparent hover:bg-slate-800/50 rounded-md"
          title="Rotate Model Down (Lower Occlusal View)"
          aria-label="FDI Selector DOWN"
        >
          ↓
        </button>
      )}

      {/* Subtitle: Anatomical Tooth Name */}
      {activeToothObj && (
        <span className="text-[8.5px] font-medium text-slate-400 text-center truncate w-full px-1">
          {activeToothObj.name.replace(/ \(Wisdom Tooth\)/g, '')}
        </span>
      )}
    </div>
  );
};
