export const GRID_SIZE = 10;

export function snapToGrid(pixelX: number, pixelY: number) {
  return {
    x: Math.round(pixelX / GRID_SIZE),
    y: Math.round(pixelY / GRID_SIZE),
  };
}

export function gridToPixel(x: number, y: number) {
  return {
    left: x * GRID_SIZE,
    top: y * GRID_SIZE,
  };
}

/**
 * 부서명 문자열 길이에 따라 가변 너비(px)를 동적으로 계산합니다.
 * 최소 너비는 144px이며, 로그인 상태(수정/삭제 버튼 노출)를 고려해 여백을 보정합니다.
 */
export function getDepartmentWidth(label: string, isLoggedIn: boolean): number {
  const charCount = label.length;
  // 한글은 한 글자당 대략 14.5px 내외, 공백은 8px 등으로 가중 평균하여 estimated 너비 산출
  const baseSpacing = isLoggedIn ? 64 : 44;
  const estimatedWidth = charCount * 14.5 + baseSpacing;
  return Math.round(Math.max(144, estimatedWidth));
}

/**
 * 업무 링크 카드(link)의 가변 너비를 업무명 길이 기반으로 계산합니다.
 * CJK word-break: keep-all 규약에 맞추어 단어 단위 줄바꿈 시 가장 긴 행의 길이를 실측합니다.
 * 최소 80px, 최대 160px 범위 내에서 콤팩트하게 산출합니다.
 */
export function getLinkWidth(label: string, isLoggedIn: boolean): number {
  const baseSpacing = isLoggedIn ? 36 : 22; // 아이콘 여백 및 패딩 pr-1.5 공간 반영
  const maxInnerWidth = 160 - baseSpacing; // 내부 텍스트 가용 최대 폭 (12글자 한계 = 약 125px)

  // 한글/영문/숫자별 글자 너비 가중 실측 함수 (실제 브라우저 렌더링에 매칭)
  const getStrWidth = (str: string) => {
    let w = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code > 127) {
        w += 10.5; // CJK 한글 한 글자당 10.5px
      } else if (str[i] === ' ') {
        w += 4.5; // 공백은 4.5px
      } else {
        w += 6.5; // 숫자 및 로마자 알파벳
      }
    }
    return w;
  };

  const totalTextWidth = getStrWidth(label);
  const totalLength = label.length; // 공백 포함 글자수

  // 공백 포함 12자 이하이고, 가용 너비를 넘지 않는 경우 -> 줄바꿈 없이 한 줄로 콤팩트하게 처리
  if (totalLength <= 12 && totalTextWidth <= maxInnerWidth) {
    const finalW = totalTextWidth + baseSpacing;
    return Math.round(Math.max(80, Math.min(160, finalW)));
  }

  // 12자를 초과하거나 한 줄 가용 너비를 넘는 경우 -> 균형 있는 2줄 개행 유도
  const words = label.split(/\s+/).filter(Boolean);
  
  if (words.length <= 1) {
    // 단어가 1개밖에 없어서 공백 분할이 불가능한 경우 (예: '광양고리로스쿨') -> 그대로 반환
    const finalW = totalTextWidth + baseSpacing;
    return Math.round(Math.max(80, Math.min(160, finalW)));
  }

  // 단어가 2개 이상일 때: 앞줄과 뒷줄의 너비 편차가 최소가 되는 최적의 분할 지점(split index) 탐색
  let minMaxLw = Infinity;
  let bestSplitIdx = 1;

  for (let i = 1; i < words.length; i++) {
    const frontLine = words.slice(0, i).join(' ');
    const backLine = words.slice(i).join(' ');
    
    const frontW = getStrWidth(frontLine);
    const backW = getStrWidth(backLine);
    
    const maxLw = Math.max(frontW, backW);
    
    if (maxLw < minMaxLw) {
      minMaxLw = maxLw;
      bestSplitIdx = i;
    }
  }

  // 가장 균형 있는 분할 지점으로 나눈 두 줄의 너비 중 더 큰 쪽을 사용
  const frontLine = words.slice(0, bestSplitIdx).join(' ');
  const backLine = words.slice(bestSplitIdx).join(' ');
  const finalTextWidth = Math.max(getStrWidth(frontLine), getStrWidth(backLine));

  const finalW = finalTextWidth + baseSpacing;
  return Math.round(Math.max(80, Math.min(160, finalW)));
}
