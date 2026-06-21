export type Teacher = {
  id: string;
  name: string;
  role: 'admin' | 'teacher';
};

export async function verifyTeacherLogin(name: string, password: string): Promise<Teacher | null> {
  // ⚠️  테스트 전용 인증 — 운영 배포 전 반드시 DB 인증으로 교체할 것
  // 클라이언트 번들에 포함되므로 소스를 열람하면 계정 정보가 노출됩니다.
  // 운영 단계: 이 함수를 서버 Route Handler + DB 조회로 교체하세요.
  if (name === 'Master' && password === '2026') {
    return {
      id: 'master',
      name: 'Master',
      role: 'admin',
    };
  }
  return null;
}
