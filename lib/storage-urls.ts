export function normalizeUrl(value?: string | null): string | null {
  if (!value) return null;
  if (value.startsWith('http://')) {
    return value.replace('http://', 'https://');
  }
  return value;
}

export function selectStorageUrl(params: {
  primaryUrl?: string | null;
  cosUrl?: string | null;
}): string | null {
  const primaryUrl = normalizeUrl(params.primaryUrl);
  const cosUrl = normalizeUrl(params.cosUrl);
  return cosUrl || primaryUrl;
}
