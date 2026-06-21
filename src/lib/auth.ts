export type Teacher = {
  id: string;
  name: string;
  role: 'admin' | 'teacher';
};

export async function verifyTeacherLogin(name: string, password: string): Promise<Teacher | null> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { teacher?: Teacher };
  return data.teacher ?? null;
}

export async function getTeacherSession(): Promise<Teacher | null> {
  const response = await fetch('/api/auth/session', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { teacher?: Teacher | null };
  return data.teacher ?? null;
}

export async function logoutTeacher(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}
