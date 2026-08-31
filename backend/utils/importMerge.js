function normalizeBlank(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

function mergeImportPayload(existing = {}, incoming = {}, { importUser = 'Bulk Import', importAction = 'Modified' } = {}) {
  const merged = { ...existing, ...incoming };
  const out = {};

  for (const [key, value] of Object.entries(merged)) {
    const normalizedIncoming = normalizeBlank(value);
    const normalizedExisting = normalizeBlank(existing[key]);

    if (key === 'history') {
      out.history = existing.history || '[]';
      continue;
    }

    if (key === 'created_by') {
      out.created_by = normalizedExisting || normalizedIncoming || existing.created_by || importUser;
      continue;
    }

    if (key === 'modified_by') {
      out.modified_by = normalizedIncoming || existing.modified_by || importUser;
      continue;
    }

    if (normalizedIncoming === null) {
      out[key] = normalizedExisting ?? null;
    } else if (normalizedExisting === null || normalizedExisting === undefined || normalizedExisting === '') {
      out[key] = normalizedIncoming;
    } else {
      out[key] = normalizedExisting;
    }
  }

  const existingHistory = (() => {
    try {
      return typeof existing.history === 'string' ? JSON.parse(existing.history) : (existing.history || []);
    } catch (err) {
      return [];
    }
  })();

  const mergedHistory = [...existingHistory];
  
  mergedHistory.push({
    name: incoming.modified_by || incoming.user_name || importUser,
    action: importAction,
    time: new Date().toISOString(),
  });

  out.history = JSON.stringify(mergedHistory);
  return out;
}

module.exports = { mergeImportPayload };
