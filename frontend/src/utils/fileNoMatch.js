function normalizeFileNoText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function extractFileNoTail(normalizedQuery) {
  if (!normalizedQuery) return '';
  const shorthand = normalizedQuery.match(/^(?:m\.?com|mc)[-/.](.+)$/);
  if (shorthand) return shorthand[1];
  const parts = normalizedQuery.split('/');
  return parts[parts.length - 1] || normalizedQuery;
}

/**
 * Pick the best matching MC or M.Com record for a navigated file number query
 * (for example "MC/1066" -> "CMA/CCU/2025/PVT/MC/1066", "M.com/833" -> "CMA/CCU/15/NHDA/M.Com/833").
 */
export function findBestFileNoMatch(records, query) {
  if (!Array.isArray(records) || records.length === 0) return null;
  const normalizedQuery = normalizeFileNoText(query);
  if (!normalizedQuery) return records[0];

  const tail = extractFileNoTail(normalizedQuery);
  let bestRecord = null;
  let bestScore = 0;

  for (const rec of records) {
    const candidates = [rec?.new_file_no, rec?.old_file_no, rec?.file_no]
      .map(normalizeFileNoText)
      .filter(Boolean);

    let recScore = 0;
    for (const candidate of candidates) {
      if (candidate === normalizedQuery) {
        recScore = Math.max(recScore, 4);
      } else if (
        candidate.endsWith(`/${normalizedQuery}`) ||
        candidate.endsWith(`-${normalizedQuery}`) ||
        (tail && (candidate === tail || candidate.endsWith(`/${tail}`) || candidate.endsWith(`-${tail}`)))
      ) {
        recScore = Math.max(recScore, 3);
      } else if (
        candidate.includes(normalizedQuery) ||
        (tail && (candidate.includes(`/${tail}/`) || candidate.includes(`-${tail}-`)))
      ) {
        recScore = Math.max(recScore, 2);
      } else if (tail && candidate.includes(tail)) {
        recScore = Math.max(recScore, 1);
      }
    }

    if (recScore > bestScore) {
      bestScore = recScore;
      bestRecord = rec;
    }
  }

  return bestRecord || records[0];
}

