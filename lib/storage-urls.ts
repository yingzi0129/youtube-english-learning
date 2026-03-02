export type StoragePreference = 'cos' | 'r2';

export function normalizeUrl(value?: string | null): string | null {
  if (!value) return null;
  if (value.startsWith('http://')) {
    return value.replace('http://', 'https://');
  }
  return value;
}

export function selectStorageUrl(params: {
  prefer: StoragePreference;
  primaryUrl?: string | null;
  cosUrl?: string | null;
  r2Url?: string | null;
}): string | null {
  const primaryUrl = normalizeUrl(params.primaryUrl);
  const cosUrl = normalizeUrl(params.cosUrl);
  const r2Url = normalizeUrl(params.r2Url);

  if (params.prefer === 'cos') {
    return cosUrl || primaryUrl || r2Url;
  }
  return r2Url || primaryUrl || cosUrl;
}
