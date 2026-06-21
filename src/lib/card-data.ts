import { MindMapNode } from '@/types/department-card';

// 사용자가 명시한 최종 부서 목록
export const DEFAULT_DEPARTMENTS = [
  '교무부',
  '교육력제고부',
  '연구부',
  '학생부',
  '1학년실',
  '2학년실',
  '3학년실',
  '정보부',
  '인문사회부',
  '수리과학부',
  '문화예술체육부',
  '진로부',
  '행정실',
  '도서부',
  '기타'
];

export const INITIAL_CARDS: MindMapNode[] = [
  // 1. 중앙 노드
  {
    id: 'center-gwangyang',
    type: 'center',
    label: '광양고',
    position: { x: 152, y: 116 },
  },

  // 2. 부서 노드 — 중앙(152,116) 기준 rx=56, ry=48 타원형 방사 배치
  // 12시 방향부터 시계방향으로 24° 간격, 인접 부서 간격 약 230px 확보
  { id: 'dept-etc',         type: 'department', label: '기타',          parentId: 'center-gwangyang', position: { x: 152, y: 68  } },
  { id: 'dept-math-science',type: 'department', label: '수리과학부',    parentId: 'center-gwangyang', position: { x: 175, y: 72  } },
  { id: 'dept-research',    type: 'department', label: '연구부',        parentId: 'center-gwangyang', position: { x: 194, y: 84  } },
  { id: 'dept-info',        type: 'department', label: '정보부',        parentId: 'center-gwangyang', position: { x: 205, y: 101 } },
  { id: 'dept-grade3',      type: 'department', label: '3학년실',      parentId: 'center-gwangyang', position: { x: 208, y: 121 } },
  { id: 'dept-career',      type: 'department', label: '진로부',        parentId: 'center-gwangyang', position: { x: 200, y: 140 } },
  { id: 'dept-arts-sports', type: 'department', label: '문화예술체육부', parentId: 'center-gwangyang', position: { x: 185, y: 155 } },
  { id: 'dept-grade2',      type: 'department', label: '2학년실',      parentId: 'center-gwangyang', position: { x: 164, y: 163 } },
  { id: 'dept-grade1',      type: 'department', label: '1학년실',      parentId: 'center-gwangyang', position: { x: 140, y: 163 } },
  { id: 'dept-student',     type: 'department', label: '학생부',        parentId: 'center-gwangyang', position: { x: 119, y: 155 } },
  { id: 'dept-humanities',  type: 'department', label: '인문사회부',    parentId: 'center-gwangyang', position: { x: 104, y: 140 } },
  { id: 'dept-academic',    type: 'department', label: '교무부',        parentId: 'center-gwangyang', position: { x: 96,  y: 121 } },
  { id: 'dept-admin',       type: 'department', label: '행정실',        parentId: 'center-gwangyang', position: { x: 99,  y: 101 } },
  { id: 'dept-library',     type: 'department', label: '도서부',        parentId: 'center-gwangyang', position: { x: 110, y: 84  } },
  { id: 'dept-edu-power',   type: 'department', label: '교육력제고부',  parentId: 'center-gwangyang', position: { x: 129, y: 72  } },

  // 3. 2단계 업무 링크 카드들
  // 교무부 소속 링크
  {
    id: 'link-nice',
    type: 'link',
    label: '나이스(NEIS) 시스템',
    url: 'https://www.neis.go.kr',
    description: '수업, 성적 처리, 생활기록부 작성 및 학사 행정 시스템 바로가기',
    parentId: 'dept-academic',
    position: { x: 84, y: 120 },
  },
  // 정보부 소속 링크
  {
    id: 'link-school-web',
    type: 'link',
    label: '광양고 홈페이지',
    url: 'https://gwangyang.hs.jne.kr/kwangyang_hs/main.do',
    description: '공식 학교 웹사이트 관리 및 공지사항, 가정통신문 게시판 바로가기',
    parentId: 'dept-info',
    position: { x: 228, y: 112 },
  },
  // 행정실 소속 링크
  {
    id: 'link-edufine',
    type: 'link',
    label: 'k-에듀파인',
    url: 'https://klef.go.kr',
    description: '학교 예산 편성, 물품 품의 및 지출 결의 등 행정 재정 시스템',
    parentId: 'dept-admin',
    position: { x: 128, y: 60 },
  },
];

const CARDS_STORAGE_KEY = 'school-department-cards';
const DEPARTMENTS_STORAGE_KEY = 'school-custom-departments';
// 부서 초기 위치가 변경될 때마다 올려주면 기존 브라우저 캐시를 초기화
const LAYOUT_VERSION = '3';
const LAYOUT_VERSION_KEY = 'school-layout-version';

const isClient = () => typeof window !== 'undefined';

export function loadCards(): MindMapNode[] {
  if (!isClient()) return INITIAL_CARDS;
  try {
    // 레이아웃 버전이 다르면 저장된 위치를 버리고 새 INITIAL_CARDS 사용
    const storedVersion = localStorage.getItem(LAYOUT_VERSION_KEY);
    if (storedVersion !== LAYOUT_VERSION) {
      localStorage.removeItem(CARDS_STORAGE_KEY);
      localStorage.setItem(LAYOUT_VERSION_KEY, LAYOUT_VERSION);
      return INITIAL_CARDS;
    }

    const saved = localStorage.getItem(CARDS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as MindMapNode[];
      
      const centerNode = parsed.find(c => c.type === 'center');
      if (centerNode) {
        // 40px 그리드 스케일의 구버전 데이터(광양고 x 좌표가 50 미만인 경우) 10px 그리드 스케일로 4배 보정 및 중앙 시프트
        if (centerNode.position.x < 50) {
          const migrated = parsed.map(c => ({
            ...c,
            position: {
              x: c.position.x * 4 + 56,
              y: c.position.y * 4 + 44
            }
          }));
          saveCards(migrated);
          return migrated;
        }
        // 10px 그리드 보정은 완료되었으나 중앙 시프트는 되지 않은 2세대 데이터(광양고 x=96, y=72) 중앙 시프트
        else if (centerNode.position.x === 96 && centerNode.position.y === 72) {
          const migrated = parsed.map(c => ({
            ...c,
            position: {
              x: c.position.x + 56,
              y: c.position.y + 44
            }
          }));
          saveCards(migrated);
          return migrated;
        }
      }
      
      return parsed;
    }
  } catch (error) {
    console.error('Error loading cards from localStorage:', error);
  }
  return INITIAL_CARDS;
}

export function saveCards(cards: MindMapNode[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(cards));
    localStorage.setItem(LAYOUT_VERSION_KEY, LAYOUT_VERSION);
  } catch (error) {
    console.error('Error saving cards to localStorage:', error);
  }
}

export function loadCustomDepartments(): string[] {
  if (!isClient()) return [];
  try {
    const saved = localStorage.getItem(DEPARTMENTS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading custom departments from localStorage:', error);
  }
  return [];
}

export function saveCustomDepartments(customDeps: string[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(customDeps));
  } catch (error) {
    console.error('Error saving custom departments to localStorage:', error);
  }
}

// ================= Google Sheets API 연동 함수 =================


/** Sheets에서 전체 카드 로드 (GET). 실패 시 null 반환 → LocalStorage 폴백 */
export async function loadCardsFromSheets(): Promise<MindMapNode[] | null> {
  try {
    const res = await fetch('/api/cards', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.cards) && data.cards.length > 0) {
      return data.cards as MindMapNode[];
    }
  } catch (err) {
    console.error('Sheets load error:', err);
  }
  return null;
}

/** Sheets에 전체 카드 덮어쓰기 동기화 (서버 API 경유) */
export async function syncAllCardsToSheets(cards: MindMapNode[]): Promise<boolean> {
  try {
    const res = await fetch('/api/cards', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'syncAll', cards }),
    });
    return res.ok;
  } catch (err) {
    console.error('Sheets sync error:', err);
    return false;
  }
}
