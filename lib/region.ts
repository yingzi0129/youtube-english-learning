const MAINLAND_CODES = new Set(['CN', 'CHN', 'CHINA']);
const NON_MAINLAND_CODES = new Set(['HK', 'HKG', 'MO', 'MAC', 'TW', 'TWN']);

const HEADER_KEYS = [
  'cf-ipcountry',
  'x-vercel-ip-country',
  'x-geo-country',
  'x-country-code',
  'x-request-country',
  'x-appengine-country',
  'x-forwarded-country',
];

export function isMainlandChina(headers: Headers): boolean {
  for (const key of HEADER_KEYS) {
    const raw = headers.get(key);
    if (!raw) continue;
    const value = raw.trim().toUpperCase();
    if (!value) continue;

    if (MAINLAND_CODES.has(value)) return true;
    if (NON_MAINLAND_CODES.has(value)) return false;

    if (value.startsWith('CN')) return true;
    if (value.includes('CHINA')) return true;
  }

  return false;
}
