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
 * 최소 80px, 최대 160px 범위 내에서 콤팩트하게 산출합니다.
 */
export function getLinkWidth(label: string, isLoggedIn: boolean): number {
  const charCount = label.length;
  const baseSpacing = isLoggedIn ? 44 : 24;
  const estimatedWidth = charCount * 11 + baseSpacing;
  return Math.round(Math.max(80, Math.min(160, estimatedWidth)));
}
