export function safeReturnPath(value?: string, fallback = '/dashboard') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return fallback;
  return value.slice(0, 500);
}
