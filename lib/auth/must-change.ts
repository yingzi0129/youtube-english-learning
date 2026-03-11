const STORAGE_KEY = 'must_change_password_state';

type MustChangePasswordState = {
  userId: string;
  value: boolean;
  updatedAt: string;
};

// 缓存强制改密状态，避免每次刷新都请求数据库
export function writeMustChangePassword(userId: string, value: boolean) {
  if (typeof window === 'undefined') return;
  const payload: MustChangePasswordState = {
    userId,
    value,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readMustChangePassword(userId?: string | null): boolean | null {
  if (typeof window === 'undefined' || !userId) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<MustChangePasswordState>;
    if (parsed.userId !== userId) return null;
    return typeof parsed.value === 'boolean' ? parsed.value : null;
  } catch {
    return null;
  }
}

export function clearMustChangePasswordCache() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
