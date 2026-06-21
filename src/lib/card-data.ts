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
  '문화예술 체육부',
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
    position: { x: 152, y: 116 }, // GRID_SIZE=10 변경 및 캔버스 중앙 시프트 (+56, +44)
  },

  // 2. 1단계 부서 노드들 (중앙 x:152, y:116 기준 조밀한 대칭형 타원 방사형 배치)
  {
    id: 'dept-academic',
    type: 'department',
    label: '교무부',
    parentId: 'center-gwangyang',
    position: { x: 112, y: 120 },
  },
  {
    id: 'dept-edu-power',
    type: 'department',
    label: '교육력제고부',
    parentId: 'center-gwangyang',
    position: { x: 152, y: 84 },
  },
  {
    id: 'dept-research',
    type: 'department',
    label: '연구부',
    parentId: 'center-gwangyang',
    position: { x: 200, y: 100 },
  },
  {
    id: 'dept-student',
    type: 'department',
    label: '학생부',
    parentId: 'center-gwangyang',
    position: { x: 116, y: 136 },
  },
  {
    id: 'dept-grade1',
    type: 'department',
    label: '1학년실',
    parentId: 'center-gwangyang',
    position: { x: 128, y: 148 },
  },
  {
    id: 'dept-grade2',
    type: 'department',
    label: '2학년실',
    parentId: 'center-gwangyang',
    position: { x: 176, y: 148 },
  },
  {
    id: 'dept-grade3',
    type: 'department',
    label: '3학년실',
    parentId: 'center-gwangyang',
    position: { x: 196, y: 124 },
  },
  {
    id: 'dept-info',
    type: 'department',
    label: '정보부',
    parentId: 'center-gwangyang',
    position: { x: 200, y: 112 },
  },
  {
    id: 'dept-humanities',
    type: 'department',
    label: '인문사회부',
    parentId: 'center-gwangyang',
    position: { x: 112, y: 104 },
  },
  {
    id: 'dept-math-science',
    type: 'department',
    label: '수리과학부',
    parentId: 'center-gwangyang',
    position: { x: 200, y: 84 },
  },
  {
    id: 'dept-arts-sports',
    type: 'department',
    label: '문화예술 체육부',
    parentId: 'center-gwangyang',
    position: { x: 152, y: 156 },
  },
  {
    id: 'dept-career',
    type: 'department',
    label: '진로부',
    parentId: 'center-gwangyang',
    position: { x: 188, y: 136 },
  },
  {
    id: 'dept-admin',
    type: 'department',
    label: '행정실',
    parentId: 'center-gwangyang',
    position: { x: 128, y: 84 },
  },
  {
    id: 'dept-library',
    type: 'department',
    label: '도서부',
    parentId: 'center-gwangyang',
    position: { x: 116, y: 88 },
  },
  {
    id: 'dept-etc',
    type: 'department',
    label: '기타',
    parentId: 'center-gwangyang',
    position: { x: 176, y: 84 },
  },

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

const isClient = () => typeof window !== 'undefined';

export function loadCards(): MindMapNode[] {
  if (!isClient()) return INITIAL_CARDS;
  try {
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

// ================= Google Sheets API 연동 함수 추가 =================

/**
 * Google Apps Script Web App API로 신규 생성된 카드 1개만 단방향으로 누적(Append) 기입합니다.
 * 브라우저 CORS 차단을 우회하기 위해 mode: 'no-cors'를 적용합니다.
 */
export async function appendCardToApi(card: MindMapNode): Promise<boolean> {
  let apiUrl = process.env.NEXT_PUBLIC_SHEET_API_URL;
  if (!apiUrl) return false;

  apiUrl = apiUrl.trim().replace(/^['"]|['"]$/g, '');
  
  // hhttps:// 또는 hhttp:// 형태의 프로토콜 오타 자동 보정
  if (apiUrl.startsWith('hhttps://')) {
    apiUrl = apiUrl.replace('hhttps://', 'https://');
  } else if (apiUrl.startsWith('hhttp://')) {
    apiUrl = apiUrl.replace('hhttp://', 'http://');
  }

  if (!apiUrl) return false;

  try {
    // mode: 'no-cors'를 부여하여 브라우저 CORS 체크를 거치지 않고 강제 단방향 전송합니다.
    await fetch(apiUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'append',
        card: card,
      }),
    });
    // no-cors 응답은 opaque 타입이므로 success 필드를 읽을 수 없습니다. 전송 완료 시 무조건 성공으로 간주합니다.
    return true;
  } catch (error) {
    console.error('Error appending card to API (no-cors mode):', error);
    return false;
  }
}

