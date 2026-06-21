'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import MindMapBoard from '@/components/MindMapBoard';
import LoginDialog from '@/components/LoginDialog';
import CardEditorDialog from '@/components/CardEditorDialog';
import { MindMapNode } from '@/types/department-card';
import {
  loadCards,
  saveCards,
  loadCustomDepartments,
  saveCustomDepartments,
  INITIAL_CARDS,
  appendCardToApi,
  loadCardsFromSheets,
  syncAllCardsToSheets,
} from '@/lib/card-data';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  // 노드 리스트 및 커스텀 부서 상태
  const [cards, setCards] = useState<MindMapNode[]>([]);
  const [customDepartments, setCustomDepartments] = useState<string[]>([]);

  // API 동기화 상태 및 실수 방지 실행 취소(Undo) 히스토리 스택
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasApi, setHasApi] = useState(false);
  const [historyStack, setHistoryStack] = useState<MindMapNode[][]>([]);
  // Sheets 동기화 디바운스 타이머 (드래그 중 과도한 요청 방지)
  const sheetsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 다이얼로그 상태
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<MindMapNode | null>(null);

  // 마운트 시 데이터 로드: Sheets 우선 → 실패 시 LocalStorage 폴백
  useEffect(() => {
    setIsMounted(true);

    const apiExists = !!process.env.NEXT_PUBLIC_SHEET_API_URL;
    setHasApi(apiExists);
    setCustomDepartments(loadCustomDepartments());

    const savedUser = localStorage.getItem('school-teacher-user');
    if (savedUser) {
      setIsLoggedIn(true);
      setUserName(savedUser);
    }

    // LocalStorage로 먼저 빠르게 렌더링
    const localCards = loadCards();
    setCards(localCards);

    // Sheets에서 최신 데이터 로드 (읽기 전용 — 로드 시 Sheets에 쓰지 않음)
    if (apiExists) {
      loadCardsFromSheets().then((sheetsCards) => {
        if (!sheetsCards || sheetsCards.length === 0) return;

        const sheetsHasDepts =
          sheetsCards.some((c) => c.type === 'center') &&
          sheetsCards.some((c) => c.type === 'department');

        const deptStructure = sheetsHasDepts
          ? sheetsCards.filter((c) => c.type === 'center' || c.type === 'department')
          : localCards.filter((c) => c.type === 'center' || c.type === 'department');

        const sheetsLinks = sheetsCards.filter((c) => c.type === 'link');

        // parentId가 부서명(label)으로 저장된 경우 실제 ID로 자동 변환
        const labelToId = new Map(
          deptStructure
            .filter((c) => c.type === 'department')
            .map((c) => [c.label, c.id])
        );
        const idSet = new Set(deptStructure.map((c) => c.id));

        // parentId 부서명 → ID 변환
        const resolvedLinks = sheetsLinks.map((card) => {
          if (card.parentId && !idSet.has(card.parentId)) {
            const resolvedId = labelToId.get(card.parentId);
            if (resolvedId) return { ...card, parentId: resolvedId };
          }
          return card;
        });

        // 부서별 링크카드 인덱스를 추적하여 위치 재계산
        const centerNode = deptStructure.find((c) => c.type === 'center');
        const centerX = centerNode?.position.x ?? 152;
        const centerY = centerNode?.position.y ?? 116;
        const siblingCountMap = new Map<string, number>();

        const repositionedLinks = resolvedLinks.map((card) => {
          const parentDept = deptStructure.find((c) => c.id === card.parentId);
          if (!parentDept) return card;

          const parentId = card.parentId ?? '';
          const sibIdx = siblingCountMap.get(parentId) ?? 0;
          siblingCountMap.set(parentId, sibIdx + 1);

          // 중앙→부서 방향 단위벡터
          const dx = parentDept.position.x - centerX;
          const dy = parentDept.position.y - centerY;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const px = -uy;
          const py = ux;

          // 형제 순서에 따른 수직 분산 (0, +1, -1, +2, -2...)
          const perpIdx =
            sibIdx === 0 ? 0
            : sibIdx % 2 === 1 ? Math.ceil(sibIdx / 2)
            : -(sibIdx / 2);

          return {
            ...card,
            position: {
              x: Math.max(0, Math.round(parentDept.position.x + ux * 20 + px * perpIdx * 15)),
              y: Math.max(0, Math.round(parentDept.position.y + uy * 20 + py * perpIdx * 15)),
            },
          };
        });

        const merged = [...deptStructure, ...repositionedLinks];
        setCards(merged);
        saveCards(merged);
        // ⚠️ 로드 시 Sheets 쓰기 금지 — 다중 사용자 환경에서 데이터 충돌 방지
      });
    }
  }, []);

  if (!isMounted) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
        <div className="h-16 w-full border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
        <div className="flex-1 animate-pulse bg-slate-100 dark:bg-slate-900/50" />
      </div>
    );
  }

  // 실행 취소(Undo)를 위해 이전 카드 목록 백업 푸시
  const pushToHistory = (currentCards: MindMapNode[]) => {
    setHistoryStack((prev) => {
      const nextStack = [...prev, currentCards];
      if (nextStack.length > 20) {
        nextStack.shift(); // 최대 20개 작업 내역 기억
      }
      return nextStack;
    });
  };

  // 카드 데이터를 로컬 상태와 LocalStorage에만 저장 (Sheets 동기화 없음)
  // Sheets 동기화는 카드 생성/수정/삭제 시 syncCardsToSheets()로 명시적으로 호출
  const handleSyncCards = (newCards: MindMapNode[]) => {
    pushToHistory(cards);
    setCards(newCards);
    saveCards(newCards);
  };

  // Sheets 전체 동기화 (생성/수정/삭제 후, 또는 위치저장 버튼 클릭 시만 호출)
  const syncCardsToSheets = (newCards: MindMapNode[]) => {
    if (sheetsDebounceRef.current) clearTimeout(sheetsDebounceRef.current);
    sheetsDebounceRef.current = setTimeout(() => {
      syncAllCardsToSheets(newCards);
    }, 500);
  };

  // 되돌리기(Undo) 액션 핸들러
  const handleUndo = () => {
    if (historyStack.length === 0) return;
    
    const prevCards = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1)); // 스택 최상단 제거
    setCards(prevCards);
    saveCards(prevCards);
  };

  // 로그인 성공
  const handleLoginSuccess = (name: string) => {
    setIsLoggedIn(true);
    setUserName(name);
    localStorage.setItem('school-teacher-user', name);
  };

  // 로그아웃
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName(null);
    localStorage.removeItem('school-teacher-user');
  };

  // (초기화 버튼은 사고 예방을 위해 삭제되었습니다.)

  // 노드 추가 (FAB 또는 헤더 버튼 클릭)
  const handleOpenAddCard = () => {
    setEditingCard(null);
    setIsEditorOpen(true);
  };

  // 노드 수정
  const handleOpenEditCard = (card: MindMapNode) => {
    setEditingCard(card);
    setIsEditorOpen(true);
  };

  // 노드 삭제 (폭포수 삭제 규칙 적용)
  const handleDeleteCard = (id: string) => {
    const targetNode = cards.find((c) => c.id === id);
    if (!targetNode) return;

    if (targetNode.type === 'center') {
      alert('중앙 학교 노드는 삭제할 수 없습니다.');
      return;
    }

    let confirmMsg = '이 노드를 정말 삭제하시겠습니까?';
    if (targetNode.type === 'department') {
      confirmMsg = `[${targetNode.label}] 부서를 삭제하시면 소속된 모든 2단계 업무링크 카드들도 함께 영구 삭제됩니다. 계속하시겠습니까?`;
    }

    if (confirm(confirmMsg)) {
      let filtered: MindMapNode[];

      if (targetNode.type === 'department') {
        // 부서 삭제: 해당 부서와 소속 링크들을 모두 삭제
        filtered = cards.filter((c) => c.id !== id && c.parentId !== id);
      } else {
        // 링크 카드 삭제: 해당 카드만 삭제
        filtered = cards.filter((c) => c.id !== id);
      }

      handleSyncCards(filtered);
      syncCardsToSheets(filtered); // 삭제 후 Sheets 동기화
    }
  };

  // 노드 위치 업데이트 (단일) — 드래그이므로 Sheets 동기화 없음
  const handleUpdateCardPosition = (id: string, position: { x: number; y: number }) => {
    const updated = cards.map((c) => (c.id === id ? { ...c, position } : c));
    handleSyncCards(updated);
  };

  // 노드 위치 배치 업데이트 (부서+자식 카드 동시 이동 — React 상태 덮어쓰기 방지)
  const handleBatchUpdatePositions = (updates: { id: string; position: { x: number; y: number } }[]) => {
    const updateMap = new Map(updates.map((u) => [u.id, u.position]));
    const updated = cards.map((c) => {
      const newPos = updateMap.get(c.id);
      return newPos ? { ...c, position: newPos } : c;
    });
    handleSyncCards(updated);
  };

  // 노드 생성 및 수정 데이터 저장
  const handleSaveCard = (card: MindMapNode) => {
    let updated: MindMapNode[];
    const exists = cards.some((c) => c.id === card.id);
    let finalCard = card;

    if (exists) {
      // 기존 노드 수정
      updated = cards.map((c) => (c.id === card.id ? card : c));
    } else {
      // 신규 노드 추가 시 지능적 인접 좌표 스폰 로직 적용
      const newCard = { ...card };
      
      if (newCard.type === 'department') {
        // 1단계 부서는 중앙 노드 기준 적절한 빈 자리에 스폰
        const centerNode = cards.find((c) => c.type === 'center');
        const centerX = centerNode ? centerNode.position.x : 152;
        const centerY = centerNode ? centerNode.position.y : 116;
        
        // 부서 개수에 따라 동적으로 사방 분산 배치
        const deptCount = cards.filter((c) => c.type === 'department').length;
        const offsets = [
          { x: -8, y: -8 }, // 좌상
          { x: 8, y: -8 },  // 우상
          { x: -8, y: 8 },  // 좌하
          { x: 8, y: 8 },   // 우하
          { x: 0, y: 12 },  // 하단
          { x: 0, y: -12 }, // 상단
        ];
        const offset = offsets[deptCount % offsets.length] || { x: 0, y: 8 };
        
        newCard.position = {
          x: centerX + offset.x,
          y: centerY + offset.y,
        };
      } else if (newCard.type === 'link') {
        const parentDept = cards.find((c) => c.id === newCard.parentId);

        if (parentDept) {
          const parentX = parentDept.position.x;
          const parentY = parentDept.position.y;

          const centerNode = cards.find((c) => c.type === 'center');
          const centerX = centerNode?.position.x ?? 152;
          const centerY = centerNode?.position.y ?? 116;

          // 중앙 → 부서 방향 단위벡터 계산
          let dx = parentX - centerX;
          let dy = parentY - centerY;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / len; // 바깥 방향 단위벡터 x
          const uy = dy / len; // 바깥 방향 단위벡터 y

          // 수직 벡터 (형제 카드를 좌우로 펼치는 방향)
          const px = -uy;
          const py = ux;

          const siblingCount = cards.filter(
            (c) => c.type === 'link' && c.parentId === newCard.parentId
          ).length;

          // 형제 순서 → 수직 인덱스: 0, +1, -1, +2, -2 ...
          const perpIdx =
            siblingCount === 0 ? 0
            : siblingCount % 2 === 1 ? Math.ceil(siblingCount / 2)
            : -(siblingCount / 2);

          // BASE_DIST: 부서 카드 바깥 방향으로 떨어질 거리 (그리드 단위, 1단위=10px)
          // PERP_SPREAD: 형제 카드 간 수직 간격 (그리드 단위)
          const BASE_DIST = 20;
          const PERP_SPREAD = 15;

          newCard.position = {
            x: Math.max(0, Math.round(parentX + ux * BASE_DIST + px * perpIdx * PERP_SPREAD)),
            y: Math.max(0, Math.round(parentY + uy * BASE_DIST + py * perpIdx * PERP_SPREAD)),
          };
        } else {
          const centerNode = cards.find((c) => c.type === 'center');
          newCard.position = {
            x: (centerNode?.position.x ?? 152) + 20,
            y: centerNode?.position.y ?? 116,
          };
        }
      }

      finalCard = newCard;
      updated = [...cards, newCard];
    }

    handleSyncCards(updated);
    syncCardsToSheets(updated); // 생성/수정 후 Sheets 전체 동기화 (중복 방지)
  };

  // 커스텀 부서 추가
  const handleAddCustomDepartment = (name: string) => {
    if (!name.trim()) return;
    const trimmed = name.trim();
    if (!customDepartments.includes(trimmed)) {
      const updated = [...customDepartments, trimmed];
      setCustomDepartments(updated);
      saveCustomDepartments(updated);
    }
  };

  // 1단계 부서 더블클릭 시 2단계 업무카드 추가 모달 자동 맵핑 호출
  const handleDeptDoubleClick = (card: MindMapNode) => {
    if (!isLoggedIn) return;
    setEditingCard({
      id: '',
      type: 'link',
      label: '',
      parentId: card.id,
      position: { x: 0, y: 0 },
    });
    setIsEditorOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* 상단 헤더 (단방향 추가 방식 및 실수 방지 실행 취소 탑재) */}
      <AppHeader
        isLoggedIn={isLoggedIn}
        userName={userName}
        onLoginClick={() => setIsLoginOpen(true)}
        onLogoutClick={handleLogout}
        onAddCardClick={handleOpenAddCard}
        isSyncing={isSyncing}
        hasApi={hasApi}
        onUndo={handleUndo}
        canUndo={historyStack.length > 0}
      />

      {/* 마인드맵 보드 */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <MindMapBoard
          cards={cards}
          isLoggedIn={isLoggedIn}
          onEditCard={handleOpenEditCard}
          onDeleteCard={handleDeleteCard}
          onUpdateCardPosition={handleUpdateCardPosition}
          onBatchUpdatePositions={handleBatchUpdatePositions}
          onSavePositions={syncCardsToSheets}
          onDoubleClickCard={handleDeptDoubleClick}
        />
      </main>

      {/* 우하단 플로팅 액션 추가 버튼 (FAB) - 호버 툴팁 탑재 및 로그인 연동 */}
      <div className="fixed bottom-6 right-6 z-40 group">
        {!isLoggedIn && (
          <div className="absolute bottom-full right-0 mb-3 w-64 scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 origin-bottom-right">
            <div className="bg-slate-900 text-white text-xs py-2 px-3 rounded-lg shadow-lg dark:bg-slate-800 text-center relative border border-slate-700/50 font-medium">
              부서별 업무링크를 추가하려면 교사 로그인이 필요합니다
              {/* 말풍선 꼬리 */}
              <div className="absolute top-full right-5 -mt-1.5 h-2.5 w-2.5 rotate-45 bg-slate-900 dark:bg-slate-800 border-r border-b border-slate-700/50" />
            </div>
          </div>
        )}

        <button
          onClick={isLoggedIn ? handleOpenAddCard : () => setIsLoginOpen(true)}
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-xl active:scale-95 transition-all
            ${isLoggedIn
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 hover:scale-105 cursor-pointer animate-bounce'
              : 'bg-slate-500 hover:bg-indigo-600 text-white hover:scale-105 cursor-pointer'
            }
          `}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* 로그인 팝업 */}
      <LoginDialog
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* 노드 작성/수정 팝업 */}
      <CardEditorDialog
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        card={editingCard}
        existingCards={cards}
        customDepartments={customDepartments}
        onAddCustomDepartment={handleAddCustomDepartment}
        onSave={handleSaveCard}
      />
    </div>
  );
}
