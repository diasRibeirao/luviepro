const KEY = 'luviepro.auth.v2';

export async function readAuth() {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function writeAuth(value: string) {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(KEY, value);
  } catch {
    // armazenamento indisponível
  }
}

export async function clearAuth() {
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(KEY);
  } catch {
    // armazenamento indisponível
  }
}
