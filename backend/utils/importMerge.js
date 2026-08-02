function normalizeBlank(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

function mergeImportPayload(existing = {}, incoming = {}, { importUser = 'Bulk Import' } = {}) {
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

  const incomingHistory = Array.isArray(incoming.history) ? incoming.history : [];
  const existingHistory = (() => {
    try {
      return typeof existing.history === 'string' ? JSON.parse(existing.history) : (existing.history || []);
    } catch (err) {
      return [];
    }
  })();

  const mergedHistory = [...existingHistory, ...incomingHistory];
  if (mergedHistory.length > 0) {
    const lastAction = incomingHistory[incomingHistory.length - 1];
    if (lastAction) {
      const note = lastAction.action || 'Modified';
      const entry = {
        name: incoming.modified_by || incoming.user_name || importUser,
        action: note,
        time: lastAction.time || new Date().toISOString(),
      };
      mergedHistory.push(entry);
    } else if (existingHistory.length > 0) {
      mergedHistory.push({
        name: incoming.modified_by || incoming.user_name || importUser,
        action: 'Modified',
        time: new Date().toISOString(),
      });
    }
  }

  out.history = JSON.stringify(mergedHistory);
  return out;
}

module.exports = { mergeImportPayload };
