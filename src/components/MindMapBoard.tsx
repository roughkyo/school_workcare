'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Network, List, Eye, EyeOff, LayoutGrid, ZoomIn, ZoomOut, Maximize2, Layers, Filter, Save, Check, BookOpen, ExternalLink, X } from 'lucide-react';
import { saveCards } from '@/lib/card-data';
import { MindMapNode } from '@/types/department-card';
import DepartmentCard from './DepartmentCard';
import { snapToGrid, gridToPixel, GRID_SIZE, getDepartmentWidth, getLinkWidth } from '@/lib/grid';

interface MindMapBoardProps {
  cards: MindMapNode[];
  isLoggedIn: boolean;
  onEditCard: (card: MindMapNode) => void;
  onDeleteCard: (id: string) => void;
  onUpdateCardPosition: (id: string, position: { x: number; y: number }) => void;
  onBatchUpdatePositions: (updates: { id: string; position: { x: number; y: number } }[]) => void;
  onDoubleClickCard?: (card: MindMapNode) => void;
  onSavePositions?: (cards: MindMapNode[]) => void;
  triggerCenter?: number; // 값이 바뀔 때마다 광양고 중앙 정렬 실행
}

export default function MindMapBoard({
  cards,
  isLoggedIn,
  onEditCard,
  onDeleteCard,
  onUpdateCardPosition,
  onBatchUpdatePositions,
  onDoubleClickCard,
  onSavePositions,
  triggerCenter,
}: MindMapBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  
  const [isMobile, setIsMobile] = useState(false);
  const [showConnectionsMobile, setShowConnectionsMobile] = useState(true);
  // 필터: 'all' = 전체 부서 보기, 'with-links' = 업무카드 있는 부서만 보기
  const [deptFilter, setDeptFilter] = useState<'all' | 'with-links'>('all');
  // 클릭된 부서 ID (자식 업무카드 하이라이트용)
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  // 위치 저장 완료 피드백 토스트
  const [savedToast, setSavedToast] = useState(false);
  // 업무링크 모아보기 모달 — 열린 부서 ID
  const [linkModalDeptId, setLinkModalDeptId] = useState<string | null>(null);
  // 사이드바 너비 (기본 176px, 최소 44px, 최대 212px)
  const SIDEBAR_DEFAULT = 176;
  const SIDEBAR_MIN = 44;
  const SIDEBAR_MAX = 212;
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const sidebarResizing = useRef(false);
  const sidebarResizeStartX = useRef(0);
  const sidebarResizeStartW = useRef(0);

  // 1. Zoom & Pan 캔버스 상태 관리
  const [zoom, setZoom] = useState(0.85); // 기본적으로 15개 노드를 다 품기 좋게 0.85배로 시작
  const [pan, setPan] = useState({ x: -400, y: -300 }); // 마운트 시 자동 계산되어 덮어써집니다.
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // 2. 카드 드래그 상태 관리
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartMouse, setDragStartMouse] = useState({ x: 0, y: 0 });
  const [dragStartCardPixel, setDragStartCardPixel] = useState({ x: 0, y: 0 });
  const [currentDragPixel, setCurrentDragPixel] = useState({ x: 0, y: 0 });
  // 부서 드래그 시 자식 링크 카드들의 드래그 시작 픽셀 좌표 저장 (id → {x, y})
  const [childStartPixels, setChildStartPixels] = useState<Record<string, { x: number; y: number }>>({});

  // 화면 중앙에 광양고 노드 정렬 함수
  const centerGwangyangOnScreen = (currentZoom: number) => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    // 실제 중앙 노드('center-gwangyang')를 찾아 해당 좌표를 기준으로 중심점을 동적 계산
    const centerNode = cards.find((c) => c.type === 'center');
    let gwangyangCX = 1600; // x: 152 일 때의 픽셀 중심점 (152 * 10 + 80)
    let gwangyangCY = 1200; // y: 116 일 때의 픽셀 중심점 (116 * 10 + 40)

    if (centerNode) {
      const pos = gridToPixel(centerNode.position.x, centerNode.position.y);
      gwangyangCX = pos.left + 80; // 중앙 노드 가로 크기 160px의 절반
      gwangyangCY = pos.top + 40;  // 중앙 노드 세로 크기 80px의 절반
    }

    setPan({
      x: Math.round(width / 2 - gwangyangCX * currentZoom),
      y: Math.round(height / 2 - gwangyangCY * currentZoom),
    });
  };

  // 모바일 화면 감지 및 첫 진입 시에만 광양고 중앙 정렬 (드래그 후 재정렬 없음)
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        centerGwangyangOnScreen(zoom);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const timer = setTimeout(() => {
      if (window.innerWidth >= 768) {
        centerGwangyangOnScreen(zoom);
      }
    }, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sheets 로드 완료 등 외부에서 중앙 정렬 요청 시
  useEffect(() => {
    if (!triggerCenter) return;
    setTimeout(() => centerGwangyangOnScreen(zoom), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerCenter]);

  // 3. 마우스 휠 줌(Zoom) 브라우저 기본 스크롤 차단 리스너 (Passive = false 강제)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isMobile) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // 줌 조절 인자
      const scaleFactor = 1.08;
      const direction = e.deltaY < 0 ? 1 : -1;

      let nextZoom = zoom;
      if (direction > 0) {
        nextZoom = Math.min(2.0, zoom * scaleFactor);
      } else {
        nextZoom = Math.max(0.4, zoom / scaleFactor);
      }

      if (nextZoom === zoom) return;

      // 마우스 커서 위치를 기점으로 줌이 확대/축소되도록 pan 좌표 보정
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setPan((prevPan) => {
        const dx = mouseX - prevPan.x;
        const dy = mouseY - prevPan.y;
        return {
          x: mouseX - dx * (nextZoom / zoom),
          y: mouseY - dy * (nextZoom / zoom),
        };
      });
      setZoom(nextZoom);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, isMobile]);

  // 4. 드래그 앤 드롭 시작 (카드 노드 자체 드래그)
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, card: MindMapNode) => {
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const currentPixelPos = gridToPixel(card.position.x, card.position.y);

    setDraggingId(card.id);
    setDragStartMouse({ x: clientX, y: clientY });
    setDragStartCardPixel({ x: currentPixelPos.left, y: currentPixelPos.top });
    setCurrentDragPixel({ x: currentPixelPos.left, y: currentPixelPos.top });

    // 부서 노드 드래그 시 자식 링크 카드들의 시작 픽셀 좌표 저장
    if (card.type === 'department') {
      const childMap: Record<string, { x: number; y: number }> = {};
      cards.forEach((c) => {
        if (c.type === 'link' && c.parentId === card.id) {
          const pos = gridToPixel(c.position.x, c.position.y);
          childMap[c.id] = { x: pos.left, y: pos.top };
        }
      });
      setChildStartPixels(childMap);
    } else {
      setChildStartPixels({});
    }
  };

  // 5. 마우스 다운 (보드 배경 빈곳 클릭 시 드래그 팬 시작 + 부서 선택 해제)
  const handleBoardMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;

    const target = e.target as HTMLElement;
    const isNode = target.closest('[data-card-id]');
    if (isNode) return;

    // 빈 곳 클릭 시 부서 선택 해제
    setSelectedDeptId(null);
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setPanOffset({ ...pan });
  };

  const handleBoardTouchStart = (e: React.TouchEvent) => {
    if (isMobile) return;
    
    const target = e.target as HTMLElement;
    const isNode = target.closest('[data-card-id]');
    if (isNode) return;

    setIsPanning(true);
    setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setPanOffset({ ...pan });
  };

  // 6. 마우스/터치 무브 (카드 드래그 또는 캔버스 드래그 팬)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId) {
      // 카드 드래그 시 마우스 델타 변화에 줌 배율(zoom)을 적용하여 정밀도 매칭
      const deltaX = (e.clientX - dragStartMouse.x) / zoom;
      const deltaY = (e.clientY - dragStartMouse.y) / zoom;

      setCurrentDragPixel({
        x: dragStartCardPixel.x + deltaX,
        y: dragStartCardPixel.y + deltaY,
      });
    } else if (isPanning) {
      // 캔버스 드래그 화면 이동 (Pan)
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPan({
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggingId) {
      const deltaX = (e.touches[0].clientX - dragStartMouse.x) / zoom;
      const deltaY = (e.touches[0].clientY - dragStartMouse.y) / zoom;

      setCurrentDragPixel({
        x: dragStartCardPixel.x + deltaX,
        y: dragStartCardPixel.y + deltaY,
      });
    } else if (isPanning) {
      const deltaX = e.touches[0].clientX - panStart.x;
      const deltaY = e.touches[0].clientY - panStart.y;
      setPan({
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY,
      });
    }
  };

  // 7. 마우스/터치 드롭 (드래그 종료)
  const handleDragEnd = () => {
    if (draggingId) {
      const snapped = snapToGrid(currentDragPixel.x, currentDragPixel.y);
      const finalX = Math.max(0, snapped.x);
      const finalY = Math.max(0, snapped.y);

      if (Object.keys(childStartPixels).length > 0) {
        // 부서 드래그 종료: 부서 + 자식 링크 카드 위치를 배치로 한 번에 업데이트
        // (개별 호출 시 React 클로저 덮어쓰기로 부서 위치가 사라지는 버그 방지)
        const deltaX = currentDragPixel.x - dragStartCardPixel.x;
        const deltaY = currentDragPixel.y - dragStartCardPixel.y;

        const updates: { id: string; position: { x: number; y: number } }[] = [
          { id: draggingId, position: { x: finalX, y: finalY } },
        ];
        Object.entries(childStartPixels).forEach(([childId, startPx]) => {
          const snappedChild = snapToGrid(startPx.x + deltaX, startPx.y + deltaY);
          updates.push({
            id: childId,
            position: { x: Math.max(0, snappedChild.x), y: Math.max(0, snappedChild.y) },
          });
        });

        onBatchUpdatePositions(updates);
        setChildStartPixels({});
      } else {
        onUpdateCardPosition(draggingId, { x: finalX, y: finalY });
      }

      setDraggingId(null);
    }
    setIsPanning(false);
  };

  // 줌 컨트롤 버튼 핸들러
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(2.0, prev * 1.15));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.4, prev / 1.15));
  };

  const handleResetZoom = () => {
    setZoom(0.85);
    centerGwangyangOnScreen(0.85);
  };

  // 노드 중심점 계산
  const getCardCenter = (card: MindMapNode) => {
    const isDraggingThis = draggingId === card.id;
    let pixelLeft = 0;
    let pixelTop = 0;

    if (isDraggingThis) {
      pixelLeft = currentDragPixel.x;
      pixelTop = currentDragPixel.y;
    } else {
      const pos = gridToPixel(card.position.x, card.position.y);
      pixelLeft = pos.left;
      pixelTop = pos.top;
    }

    if (card.type === 'center') {
      return { x: pixelLeft + 80, y: pixelTop + 40 };
    } else if (card.type === 'department') {
      const deptWidth = getDepartmentWidth(card.label, isLoggedIn);
      return { x: pixelLeft + deptWidth / 2, y: pixelTop + 30 };
    } else {
      // link 카드: 새 콤팩트 크기(가변 너비, 높이 36px) 기준 중심점
      const linkWidth = getLinkWidth(card.label, isLoggedIn);
      return { x: pixelLeft + linkWidth / 2, y: pixelTop + 18 };
    }
  };

  const centerNode = cards.find((c) => c.type === 'center');

  // 필터에 따라 보여줄 카드 목록 계산
  const deptIdsWithLinks = new Set(
    cards.filter((c) => c.type === 'link' && c.parentId).map((c) => c.parentId as string)
  );
  const visibleCards =
    deptFilter === 'with-links'
      ? cards.filter(
          (c) =>
            c.type === 'center' ||
            (c.type === 'department' && deptIdsWithLinks.has(c.id)) ||
            (c.type === 'link' && c.parentId && deptIdsWithLinks.has(c.parentId))
        )
      : cards;

  const departmentNodes = visibleCards.filter((c) => c.type === 'department');

  return (
    <div className="flex flex-col flex-1 w-full bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* 뷰 제어 상단 바 */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          {isMobile ? (
            <>
              <List className="h-4 w-4 text-indigo-500" />
              <span className="text-slate-800 dark:text-slate-200">모바일 아코디언 트리 구조</span>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <Network className="h-4 w-4 text-indigo-500" />
              <span className="text-slate-800 dark:text-slate-200">방사형 마인드맵 캔버스</span>
              <span className="hidden sm:inline text-slate-400">|</span>
              <span className="hidden sm:inline text-slate-400 font-normal">
                [마우스 드래그] 화면 이동 &nbsp;&nbsp; [휠 스크롤] 확대/축소
              </span>
            </div>
          )}
        </div>

        {isMobile && (
          <button
            onClick={() => setShowConnectionsMobile(!showConnectionsMobile)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            {showConnectionsMobile ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>관계 리포트 숨기기</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>관계 리포트 보기</span>
              </>
            )}
          </button>
        )}

        {!isMobile && isLoggedIn && (
          <span className="text-emerald-600 dark:text-emerald-400">
            💡 카드를 원하는 그리드로 드래그해서 배치해보세요.
          </span>
        )}
      </div>

      {/* 보드 영역 */}
      <div
        ref={containerRef}
        onMouseDown={handleBoardMouseDown}
        onTouchStart={handleBoardTouchStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleDragEnd}
        className={`
          flex-1 w-full overflow-hidden relative
          ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}
        `}
      >
        {!isMobile ? (
          /* ================= 데스크톱 마인드맵 뷰 (Pan & Zoom) ================= */
          <div
            ref={transformRef}
            className="absolute origin-top-left transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: '3200px', // 넓은 캔버스 영역
              height: '2400px',
              backgroundImage: 'radial-gradient(circle, #dde3eb 1px, transparent 1px)',
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
              backgroundPosition: '10px 10px',
            }}
          >
            {/* SVG 연결선 그리기 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.75" />
                </linearGradient>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#818cf8" />
                </marker>
              </defs>

              {/* 1단계 부서 -> 중앙 노드 연결선 */}
              {centerNode &&
                visibleCards.map((node) => {
                  if (node.type !== 'department') return null;
                  const centerA = getCardCenter(centerNode);
                  const centerB = getCardCenter(node);

                  const midX = (centerA.x + centerB.x) / 2;
                  const pathData = `M ${centerA.x} ${centerA.y} C ${midX} ${centerA.y}, ${midX} ${centerB.y}, ${centerB.x} ${centerB.y}`;

                  return (
                    <path
                      key={`${centerNode.id}-${node.id}`}
                      d={pathData}
                      fill="none"
                      stroke="url(#line-grad)"
                      strokeWidth="3.5"
                      className="opacity-70"
                    />
                  );
                })}

              {/* 2단계 링크 카드 -> 1단계 부서 연결선 */}
              {visibleCards.map((node) => {
                if (node.type !== 'link' || !node.parentId) return null;
                const normalizeStr = (str: string) => str.replace(/\s+/g, '');
                const targetParentIdNormalized = normalizeStr(node.parentId);

                const parentNode = visibleCards.find(
                  (c) =>
                    c.id === node.parentId ||
                    normalizeStr(c.label) === targetParentIdNormalized
                );
                if (!parentNode) return null;

                const centerA = getCardCenter(parentNode);
                const centerB = getCardCenter(node);

                const midX = (centerA.x + centerB.x) / 2;
                const pathData = `M ${centerA.x} ${centerA.y} C ${midX} ${centerA.y}, ${midX} ${centerB.y}, ${centerB.x} ${centerB.y}`;

                return (
                  <path
                    key={`${parentNode.id}-${node.id}`}
                    d={pathData}
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="2.2"
                    strokeDasharray="4 4"
                    className="stroke-slate-350 dark:stroke-slate-700"
                    markerEnd="url(#arrow)"
                  />
                );
              })}
            </svg>

            {/* 노드 카드 렌더러 */}
            {visibleCards.map((card) => {
              const isDraggingThis = draggingId === card.id;
              const isHighlighted =
                card.type === 'link' &&
                selectedDeptId !== null &&
                card.parentId === selectedDeptId;
              return (
                <DepartmentCard
                  key={card.id}
                  card={card}
                  isLoggedIn={isLoggedIn}
                  isDragging={isDraggingThis}
                  dragOffset={isDraggingThis ? currentDragPixel : null}
                  onEdit={onEditCard}
                  onDelete={onDeleteCard}
                  onDragStart={handleDragStart}
                  onDoubleClick={onDoubleClickCard}
                  onDeptClick={(id) => setSelectedDeptId((prev) => (prev === id ? null : id))}
                  isHighlighted={isHighlighted}
                  isMobile={false}
                />
              );
            })}
          </div>
        ) : (
          /* ================= 모바일 아코디언 트리 뷰 ================= */
          <div className="max-w-md mx-auto space-y-6 pt-2 px-4 h-full overflow-y-auto">
            {centerNode && (
              <div className="flex justify-center">
                <DepartmentCard
                  card={centerNode}
                  isLoggedIn={isLoggedIn}
                  isDragging={false}
                  dragOffset={null}
                  onEdit={onEditCard}
                  onDelete={onDeleteCard}
                  onDragStart={() => {}}
                  isMobile={true}
                />
              </div>
            )}

            <div className="space-y-6">
              {departmentNodes.map((dept) => {
                const childLinks = cards.filter(
                  (c) => c.type === 'link' && c.parentId === dept.id
                );

                return (
                  <div
                    key={dept.id}
                    className="relative pl-4 border-l-2 border-indigo-150 dark:border-indigo-950/80 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <DepartmentCard
                          card={dept}
                          isLoggedIn={isLoggedIn}
                          isDragging={false}
                          dragOffset={null}
                          onEdit={onEditCard}
                          onDelete={onDeleteCard}
                          onDragStart={() => {}}
                          onDoubleClick={onDoubleClickCard}
                          isMobile={true}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pl-4 relative">
                      {childLinks.length === 0 ? (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 py-1 italic">
                          등록된 업무링크 카드가 없습니다.
                        </p>
                      ) : (
                        childLinks.map((link) => (
                          <div key={link.id} className="relative">
                            <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-slate-200 dark:bg-slate-800" />
                            <DepartmentCard
                              card={link}
                              isLoggedIn={isLoggedIn}
                              isDragging={false}
                              dragOffset={null}
                              onEdit={onEditCard}
                              onDelete={onDeleteCard}
                              onDragStart={() => {}}
                              isMobile={true}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {showConnectionsMobile && (
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/60 text-[11px] text-slate-500 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-400">
                <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  <LayoutGrid className="h-3.5 w-3.5 text-indigo-500" />
                  <span>가지치기 관계 리포트</span>
                </div>
                <ul className="space-y-1 list-disc pl-4">
                  {departmentNodes.map((dept) => {
                    const targets = cards
                      .filter((c) => c.type === 'link' && c.parentId === dept.id)
                      .map((c) => c.label);
                    if (targets.length === 0) return null;
                    return (
                      <li key={dept.id}>
                        <strong className="text-slate-650 dark:text-slate-350">{dept.label}</strong> ──▶ {targets.join(', ')}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ================= 왼쪽 중간 필터/저장 메뉴바 ================= */}
        <div
          className="absolute left-4 top-4 bottom-4 z-40 flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 overflow-y-auto"
          style={{ width: sidebarWidth }}
        >
          {/* 오른쪽 드래그 핸들 */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              sidebarResizing.current = true;
              sidebarResizeStartX.current = e.clientX;
              sidebarResizeStartW.current = sidebarWidth;

              const onMove = (ev: MouseEvent) => {
                if (!sidebarResizing.current) return;
                const delta = ev.clientX - sidebarResizeStartX.current;
                const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, sidebarResizeStartW.current + delta));
                setSidebarWidth(next);
              };
              const onUp = () => {
                sidebarResizing.current = false;
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
            title="드래그하여 너비 조절"
            className="absolute right-0 top-4 bottom-4 w-2 cursor-col-resize rounded-r-2xl hover:bg-indigo-300/40 active:bg-indigo-400/50 transition-colors"
          />
          {/* collapsed: 너비 80px 이하면 아이콘 전용 모드 */}
          {(() => {
            const collapsed = sidebarWidth <= 80;
            return (<>
          {/* 필터 섹션 */}
          {!collapsed && (
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-700">
              <Filter className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">필터</span>
            </div>
          )}
          <button
            onClick={() => setDeptFilter('all')}
            title="전체 부서 보기"
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'} rounded-xl px-2 py-2.5 text-sm font-semibold transition-all
              ${deptFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            {!collapsed && <span>전체 부서</span>}
          </button>
          <button
            onClick={() => setDeptFilter('with-links')}
            title="업무카드 있는 부서만 보기"
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'} rounded-xl px-2 py-2.5 text-sm font-semibold transition-all
              ${deptFilter === 'with-links'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
          >
            <Eye className="h-4 w-4 shrink-0" />
            {!collapsed && <span>업무카드만</span>}
          </button>
          {!collapsed && deptFilter === 'with-links' && (
            <div className="px-1 text-xs text-indigo-500 dark:text-indigo-400 font-medium text-center">
              {deptIdsWithLinks.size}개 부서
            </div>
          )}

          {/* 위치 저장 섹션 */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={() => {
                saveCards(cards);
                onSavePositions?.(cards); // Sheets에도 위치 동기화
                setSavedToast(true);
                setTimeout(() => setSavedToast(false), 2000);
              }}
              title="현재 모든 카드 위치를 브라우저에 저장"
              className={`flex w-full items-center ${collapsed ? 'justify-center' : 'gap-2'} rounded-xl px-2 py-2.5 text-sm font-semibold transition-all
                ${savedToast
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
            >
              {savedToast ? (
                <>
                  <Check className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>저장됨!</span>}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>위치 저장</span>}
                </>
              )}
            </button>
            {!collapsed && (
              <p className="mt-1.5 px-1 text-[11px] text-slate-400 dark:text-slate-500 text-center leading-tight">
                브라우저 재시작 후에도<br />위치가 유지됩니다
              </p>
            )}
          </div>

          {/* 사용법 안내 섹션 */}
          {!collapsed && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 shrink-0">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">사용법</p>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 leading-snug">
                <li><span className="text-indigo-500 font-bold">드래그</span> 카드·화면 이동</li>
                <li><span className="text-indigo-500 font-bold">휠</span> 확대·축소</li>
                <li><span className="text-orange-500 font-bold">부서 클릭</span> 업무카드 강조</li>
                <li><span className="text-orange-500 font-bold">부서 더블클릭</span> 업무링크 추가</li>
                <li><span className="text-amber-500 font-bold">업무카드 hover</span> 상세·링크</li>
                <li><span className="text-amber-500 font-bold">업무카드 더블클릭</span> 바로가기</li>
              </ul>
            </div>
          )}

          {/* 업무링크 모아보기 섹션 */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col min-h-0 flex-1">
            {!collapsed && (
              <div className="flex items-center gap-1.5 pb-2">
                <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">링크 모아보기</span>
              </div>
            )}
            <div className="flex flex-col gap-1 overflow-y-auto flex-1 pr-0.5">
              {cards
                .filter((c) => c.type === 'department' && deptIdsWithLinks.has(c.id))
                .map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => setLinkModalDeptId((prev) => (prev === dept.id ? null : dept.id))}
                    title={collapsed ? dept.label : undefined}
                    className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-2'} rounded-lg px-2 py-2 text-sm font-semibold text-left transition-all
                      ${linkModalDeptId === dept.id
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'text-slate-600 hover:bg-amber-50 hover:text-amber-700 dark:text-slate-300 dark:hover:bg-amber-950/40 dark:hover:text-amber-300'
                      }`}
                  >
                    {collapsed ? (
                      <BookOpen className="h-4 w-4 shrink-0" />
                    ) : (
                      <>
                        <span className="truncate">{dept.label}</span>
                        <span className={`shrink-0 text-[11px] font-bold rounded-full px-1.5 py-0.5 ${
                          linkModalDeptId === dept.id
                            ? 'bg-white/30 text-white'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {cards.filter((c) => c.type === 'link' && c.parentId === dept.id).length}
                        </span>
                      </>
                    )}
                  </button>
                ))}
              {!collapsed && deptIdsWithLinks.size === 0 && (
                <p className="text-xs text-slate-400 italic px-1 py-1">업무카드 없음</p>
              )}
            </div>
          </div>
          </>);
          })()}
        </div>

        {/* ================= 업무링크 모아보기 모달 ================= */}
        {linkModalDeptId && (() => {
          const deptNode = cards.find((c) => c.id === linkModalDeptId);
          const linkCards = cards.filter((c) => c.type === 'link' && c.parentId === linkModalDeptId);
          if (!deptNode) return null;
          return (
            <>
              {/* 백드롭 블러 — 클릭 시 모달 닫기 */}
              <div
                className="absolute inset-0 z-50 bg-slate-900/30 backdrop-blur-sm"
                onClick={() => setLinkModalDeptId(null)}
              />
              {/* 모달 본체 */}
              <div
                className="absolute left-1/2 top-1/2 z-[60] -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-7 py-5">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-amber-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                      {deptNode.label}
                    </span>
                    <span className="text-sm text-slate-400 dark:text-slate-500">업무링크 모아보기</span>
                  </div>
                  <button
                    onClick={() => setLinkModalDeptId(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 테이블 본문 */}
                <div className="overflow-auto max-h-[65vh]">
                  {linkCards.length === 0 ? (
                    <p className="text-center text-base text-slate-400 py-14">등록된 업무링크가 없습니다.</p>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                          <th className="px-7 py-4 text-left text-sm font-bold text-slate-500 dark:text-slate-400 w-10">#</th>
                          <th className="px-3 py-4 text-left text-sm font-bold text-slate-500 dark:text-slate-400">업무명</th>
                          <th className="px-3 py-4 text-left text-sm font-bold text-slate-500 dark:text-slate-400">설명</th>
                          <th className="px-7 py-4 text-center text-sm font-bold text-slate-500 dark:text-slate-400">바로가기</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linkCards.map((link, idx) => (
                          <tr
                            key={link.id}
                            className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-amber-50/60 dark:hover:bg-amber-950/20 transition-colors"
                          >
                            <td className="px-7 py-4 text-sm text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <span className="font-semibold text-slate-800 dark:text-slate-100 text-base">
                                {link.label}
                              </span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                {link.description || <span className="italic text-slate-300 dark:text-slate-600">설명 없음</span>}
                              </span>
                            </td>
                            <td className="px-7 py-4 text-center">
                              <a
                                href={(() => { const u = link.url?.trim() ?? ''; return (u.startsWith('http://') || u.startsWith('https://')) ? u : '#'; })()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-600 transition-all dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                              >
                                열기
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* 모달 푸터 */}
                <div className="border-t border-slate-100 dark:border-slate-800 px-7 py-4 flex justify-between items-center">
                  <span className="text-sm text-slate-400">
                    총 <strong className="text-slate-600 dark:text-slate-300">{linkCards.length}</strong>개 업무링크
                  </span>
                  <button
                    onClick={() => setLinkModalDeptId(null)}
                    className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </>
          );
        })()}

        {/* ================= 줌/팬 플로팅 컨트롤러 Widget (데스크톱 전용) ================= */}
        {!isMobile && (
          <div className="absolute bottom-6 left-6 z-40 flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/85 p-1.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
            <button
              onClick={handleZoomOut}
              title="축소"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-90 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            
            <button
              onClick={handleResetZoom}
              title="줌 리셋 (Fit)"
              className="px-2.5 py-1 text-xs font-bold text-slate-600 rounded-lg transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              onClick={handleZoomIn}
              title="확대"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-90 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <span className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

            <button
              onClick={handleResetZoom}
              title="중앙 정렬"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-90 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
