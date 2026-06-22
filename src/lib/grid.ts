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
  const baseSpacing = isLoggedIn ? 44 : 24; // 아이콘 여백
  const maxInnerWidth = 160 - baseSpacing; // 내부 텍스트 가용 최대 폭

  // 한글/영문/숫자별 글자 너비 가중 실측 함수
  const getStrWidth = (str: string) => {
    let w = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code > 127) {
        w += 11.2; // CJK 한글 한 글자당 11.2px
      } else if (str[i] === ' ') {
        w += 5; // 공백은 5px
      } else {
        w += 7.2; // 숫자 및 로마자 알파벳
      }
    }
    return w;
  };

  const totalTextWidth = getStrWidth(label);

  // 한 줄로 다 들어가는 경우
  if (totalTextWidth <= maxInnerWidth) {
    const finalW = totalTextWidth + baseSpacing;
    return Math.round(Math.max(80, Math.min(160, finalW)));
  }

  // 160px를 초과해 줄바꿈이 발생하는 경우: 공백 기준으로 단어를 조합해 개행을 모방함
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (getStrWidth(testLine) <= maxInnerWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  // 줄바꿈된 행들 중 가장 너비가 긴 행의 픽셀값 산출
  let maxLineWidth = 0;
  for (const line of lines) {
    const lw = getStrWidth(line);
    if (lw > maxLineWidth) {
      maxLineWidth = lw;
    }
  }

  const finalW = maxLineWidth + baseSpacing;
  return Math.round(Math.max(80, Math.min(160, finalW)));
}
