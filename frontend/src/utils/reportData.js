export const normalizeRows = payload => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const candidates = ['rows', 'records', 'data', 'items', 'results', 'complaints', 'cfiles', 'mc', 'mcom'];
  for (const key of candidates) {
    if (Array.isArray(payload[key])) return payload[key];
  }

  return [];
};
