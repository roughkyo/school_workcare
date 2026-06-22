'use client';

import React, { useRef } from 'react';
import { Edit2, Trash2, ExternalLink } from 'lucide-react';
import { MindMapNode } from '@/types/department-card';
import { gridToPixel, getDepartmentWidth, getLinkWidth } from '@/lib/grid';

interface DepartmentCardProps {
  card: MindMapNode;
  isLoggedIn: boolean;
  isDragging: boolean;
  dragOffset: { x: number; y: number } | null;
  onEdit: (card: MindMapNode) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, card: MindMapNode) => void;
  onDoubleClick?: (card: MindMapNode) => void;
  onDeptClick?: (id: string) => void;
  isHighlighted?: boolean;
  isMobile: boolean;
}

// XSS 방어: javascript: 등 위험한 프로토콜 차단, http/https만 허용
function sanitizeUrl(url: string | undefined): string {
  if (!url) return '#';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return '#';
}

export default function DepartmentCard({
  card,
  isLoggedIn,
  isDragging,
  dragOffset,
  onEdit,
  onDelete,
  onDragStart,
  onDoubleClick,
  onDeptClick,
  isHighlighted = false,
  isMobile,
}: DepartmentCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // '교무실대시보드' (공백 제거 기준) 업무 카드는 상시 하이라이트 효과 기본 적용
  const isDashboardNode = card.type === 'link' && card.label.replace(/\s+/g, '') === '교무실대시보드';
  const showHighlight = isHighlighted || isDashboardNode;

  // 노드 종류별 고정/가변 픽셀 규격
  const getDimension = (type: typeof card.type, label: string) => {
    switch (type) {
      case 'center':
        return { width: '160px', height: '80px', minHeight: undefined };
      case 'department':
        const deptWidth = getDepartmentWidth(label, isLoggedIn);
        return { width: `${deptWidth}px`, height: '60px', minHeight: undefined };
      case 'link':
      default: {
        const linkWidth = getLinkWidth(label, isLoggedIn);
        // 최대 너비를 190px로 넓혀 짧은 카드가 어설프게 줄바꿈되는 것을 방지하고 픽셀폭을 타이트하게 고정합니다
        return { width: `${linkWidth}px`, minWidth: '80px', maxWidth: '190px', height: 'auto', minHeight: '36px' };
      }
    }
  };

  const dim = getDimension(card.type, card.label);

  const style: React.CSSProperties = {};
  if (!isMobile) {
    if (card.type === 'link') {
      // 링크 카드: fit-content와 min/max를 사용해 텍스트 개행에 맞춰 가로폭을 타이트하게 조절
      style.width = dim.width;
      style.minWidth = dim.minWidth;
      style.maxWidth = dim.maxWidth;
      style.minHeight = dim.minHeight;
    } else {
      style.width = dim.width;
      style.height = dim.height;
    }

    if (isDragging && dragOffset) {
      style.left = `${dragOffset.x}px`;
      style.top = `${dragOffset.y}px`;
      style.zIndex = 40;
    } else {
      const pos = gridToPixel(card.position.x, card.position.y);
      style.left = `${pos.left}px`;
      style.top = `${pos.top}px`;
    }
  }

  // 15개 전체 부서별로 완전히 다른 15개 고유 파스텔/그라데이션 색상 매핑
  const getColorClasses = (type: typeof card.type, label: string) => {
    if (type === 'center') {
      return {
        bg: 'bg-gradient-to-br from-slate-800 via-indigo-950 to-purple-950 text-white shadow-lg border-indigo-500/30',
        text: 'text-white',
      };
    }

    if (type === 'department') {
      // 15개 부서 고유의 유리 질감 그라데이션 및 테두리/가독성 텍스트 매핑 (Glassmorphism)
      const colors: Record<string, string> = {
        교무부: 'from-blue-500/25 to-cyan-500/25 border-blue-400/40 text-blue-700 dark:text-blue-200 shadow-blue-100/10',
        교육력제고부: 'from-pink-500/25 via-purple-500/25 to-indigo-500/25 border-purple-400/40 text-purple-700 dark:text-purple-200 shadow-indigo-100/10',
        연구부: 'from-sky-500/25 to-indigo-500/25 border-sky-400/40 text-sky-700 dark:text-sky-200 shadow-sky-100/10',
        학생부: 'from-rose-500/25 to-orange-500/25 border-rose-400/40 text-rose-700 dark:text-rose-200 shadow-rose-100/10',
        '1학년실': 'from-lime-500/25 to-green-600/25 border-lime-400/40 text-green-700 dark:text-green-200 shadow-lime-100/10',
        '2학년실': 'from-emerald-500/25 to-teal-500/25 border-emerald-400/40 text-emerald-700 dark:text-emerald-200 shadow-emerald-100/10',
        '3학년실': 'from-teal-500/25 to-cyan-600/25 border-teal-400/40 text-teal-750 dark:text-teal-200 shadow-teal-100/10',
        정보부: 'from-violet-500/25 to-purple-600/25 border-purple-400/40 text-purple-700 dark:text-purple-200 shadow-purple-100/10',
        인문사회부: 'from-amber-500/25 to-orange-500/25 border-amber-400/40 text-amber-700 dark:text-amber-200 shadow-amber-100/10',
        수리과학부: 'from-red-500/25 to-rose-600/25 border-red-400/40 text-red-700 dark:text-red-200 shadow-red-100/10',
        '문화예술체육부': 'from-fuchsia-500/25 to-pink-600/25 border-fuchsia-400/40 text-fuchsia-700 dark:text-fuchsia-200 shadow-fuchsia-100/10',
        진로부: 'from-purple-500/25 to-fuchsia-500/25 border-purple-400/40 text-purple-700 dark:text-purple-200 shadow-purple-100/10',
        행정실: 'from-slate-600/25 to-slate-800/25 border-slate-400/40 text-slate-700 dark:text-slate-200 shadow-slate-200/10',
        도서부: 'from-orange-500/25 to-amber-600/25 border-orange-400/40 text-orange-700 dark:text-orange-200 shadow-orange-100/10',
        기타: 'from-slate-400/25 to-slate-500/25 border-slate-350/40 text-slate-650 dark:text-slate-300 shadow-slate-100/10',
      };
      
      const grad = colors[label] || 'from-indigo-400/25 to-purple-500/25 border-indigo-400/45 text-indigo-750 dark:text-indigo-200';
      return {
        bg: `bg-gradient-to-r ${grad} shadow-md backdrop-blur-md hover:shadow-lg hover:scale-[1.02]`,
        text: 'font-semibold',
      };
    }

    // 2단계 링크 카드
    return {
      bg: 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-350 dark:hover:border-slate-700',
      text: 'text-slate-800 dark:text-slate-100',
    };
  };

  const colors = getColorClasses(card.type, card.label);

  // 드래그 마우스 다운/터치 스타트 필터 헬퍼 (버튼이나 링크 클릭 시 드래그 차단)
  const handleDragStartFilter = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // 클릭 타겟 내부나 주위에 button, a, input, select, textarea 등 상호작용 개체가 있으면 드래그 패스
    if (target.closest('button, a, input, select, textarea')) {
      return;
    }
    
    // 브라우저 기본 텍스트 블록 드래그 동작을 억제하여 카드 드래그 이벤트를 정상 작동시킵니다.
    if (e.cancelable && 'button' in e) {
      e.preventDefault();
    }
    
    onDragStart(e, card);
  };

  // 1. 중앙 노드 렌더링
  if (card.type === 'center') {
    return (
      <div
        ref={cardRef}
        style={style}
        data-card-id={card.id}
        onMouseDown={!isMobile ? handleDragStartFilter : undefined}
        onTouchStart={!isMobile ? handleDragStartFilter : undefined}
        className={`
          ${isMobile ? 'w-full py-4 text-center rounded-2xl' : 'absolute flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing'}
          border ${colors.bg} transition-all duration-75 select-none
          ${isDragging ? 'scale-105 shadow-2xl cursor-grabbing rotate-1' : 'hover:scale-[1.03]'}
        `}
      >
        <div className="px-5 py-2.5 font-black text-lg sm:text-xl tracking-widest text-center">
          <span>{card.label}</span>
        </div>
      </div>
    );
  }

  // 2. 1단계 부서 노드 렌더링
  if (card.type === 'department') {
    return (
      <div
        ref={cardRef}
        style={style}
        data-card-id={card.id}
        onMouseDown={!isMobile ? handleDragStartFilter : undefined}
        onTouchStart={!isMobile ? handleDragStartFilter : undefined}
        onClick={(e) => {
          // 버튼 클릭은 무시, 카드 자체 클릭 시 선택 토글
          if ((e.target as HTMLElement).closest('button')) return;
          onDeptClick?.(card.id);
        }}
        onDoubleClick={(e) => {
          if (isLoggedIn && onDoubleClick) {
            e.stopPropagation();
            onDoubleClick(card);
          }
        }}
        title={isLoggedIn ? '💡 클릭: 업무카드 하이라이트 / 더블클릭: 업무링크 추가' : '클릭하여 연결된 업무카드 보기'}
        className={`
          ${isMobile ? 'w-full py-3 px-4 rounded-xl' : 'absolute flex items-center justify-between rounded-full px-4 cursor-grab active:cursor-grabbing'}
          border ${colors.bg} transition-all duration-75 select-none
          ${isDragging ? 'scale-105 shadow-xl cursor-grabbing' : 'hover:scale-[1.02]'}
        `}
      >
        <div className="flex-1 text-center font-bold text-xs sm:text-sm tracking-wide whitespace-nowrap">
          <span>{card.label}</span>
        </div>

        {isLoggedIn && (
          <div className="flex items-center gap-1.5 shrink-0 ml-1.5 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(card);
              }}
              title="수정"
              className="p-0.5 text-white/70 hover:text-white hover:bg-white/15 rounded transition-all"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(card.id);
              }}
              title="삭제"
              className="p-0.5 text-white/70 hover:text-white hover:bg-white/15 rounded transition-all"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // 3. 2단계 링크 카드 노드 렌더링 (콤팩트 pill + hover 툴팁)
  return (
    <div
      ref={cardRef}
      style={style}
      data-card-id={card.id}
      onMouseDown={!isMobile ? handleDragStartFilter : undefined}
      onTouchStart={!isMobile ? handleDragStartFilter : undefined}
      onDoubleClick={(e) => {
        e.stopPropagation();
        const safe = sanitizeUrl(card.url);
        if (safe !== '#') window.open(safe, '_blank', 'noopener,noreferrer');
      }}
      className={`
        ${isMobile ? 'w-full rounded-xl px-3 py-2' : 'absolute cursor-grab active:cursor-grabbing rounded-2xl px-3 py-2'}
        group border-2 flex items-center gap-1.5 select-none
        transition-all duration-200
        ${isDragging ? 'z-[200]' : 'z-10 hover:z-[150]'}
        ${showHighlight
          ? 'border-orange-400 bg-orange-50/95 dark:bg-orange-950/60 dark:border-orange-500 shadow-lg shadow-orange-100/60 dark:shadow-orange-900/30 scale-[1.04]'
          : 'border-indigo-300 dark:border-indigo-600 bg-white/98 dark:bg-slate-900/98 hover:border-indigo-500 hover:shadow-lg dark:hover:border-indigo-400'
        }
        ${isDragging ? 'shadow-xl scale-105 rotate-1 cursor-grabbing' : showHighlight ? '' : 'shadow-md hover:-translate-y-0.5'}
        ${isDashboardNode ? 'animate-pulse' : ''}
      `}
    >
      {/* 업무명 (항상 표시 - 12글자 초과 시 자동 2줄 허용) */}
      <span className={`text-[11px] font-bold break-keep break-words whitespace-normal leading-tight flex-1 transition-colors duration-200 ${
        showHighlight
          ? 'text-orange-700 dark:text-orange-300'
          : 'text-slate-700 dark:text-slate-200'
      }`}>
        {card.label}
      </span>

      {/* 수정/삭제 버튼 (로그인 시) */}
      {isLoggedIn && (
        <div className="flex items-center gap-0.5 shrink-0 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(card); }}
            title="수정"
            className="p-0.5 text-slate-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            <Edit2 className="h-2.5 w-2.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
            title="삭제"
            className="p-0.5 text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      )}

      {/* 호버 툴팁: 설명 + 바로가기 버튼 */}
      {/* pb-3 브리지: 카드↔툴팁 사이 투명 영역 유지 → 마우스 이동 중 hover 끊기지 않음 */}
      {!isMobile && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute bottom-full left-1/2 -translate-x-1/2 pb-3 w-64 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-150 origin-bottom z-[60]"
        >
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xl p-3.5">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1.5 leading-snug">
              {card.label}
            </p>
            {card.description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2.5">
                {card.description}
              </p>
            )}
            <a
              href={sanitizeUrl(card.url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 py-2 text-xs font-semibold text-indigo-600 transition-all dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
            >
              <span>바로가기</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <p className="mt-2 text-[10px] text-slate-400 text-center">더블클릭으로도 바로 열 수 있어요</p>
          </div>
          {/* 툴팁 꼬리 */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 translate-y-full w-2.5 h-2.5 bg-white dark:bg-slate-800 border-r border-b border-slate-200/80 dark:border-slate-700 rotate-45 -mt-px" />
        </div>
      )}
    </div>
  );
}
