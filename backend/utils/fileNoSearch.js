/**
 * Build a Sequelize `$or` condition for searching MC / M.Com records.
 * Handles shorthand file-number references like "MC/1066", "MC-1066",
 * "M.com/833", and "MCOM-833" without falsely matching phone numbers.
 */
function buildFileNoSearchCondition(rawQuery, extraLikeFields = []) {
  const trimmed = String(rawQuery || '').trim();
  if (!trimmed) return null;

  const fileNoFields = ['file_no', 'new_file_no', 'old_file_no'];
  const shorthandMatch = trimmed.match(/^(?:M\.?\s*COM|MC)\s*[-/. ]\s*(.+)$/i);

  if (shorthandMatch) {
    const tail = shorthandMatch[1].trim();
    if (tail && /^[0-9]+[A-Za-z0-9/-]*$/.test(tail)) {
      const orClauses = [];
      const patterns = [
        `%${trimmed}%`,
        `%/${tail}%`,
        `%-${tail}%`,
        `% ${tail}%`,
        `%.${tail}%`,
      ];

      for (const field of fileNoFields) {
        orClauses.push({ [field]: tail });
        for (const pattern of patterns) {
          orClauses.push({ [field]: { $like: pattern } });
        }
      }

      return { $or: orClauses };
    }
  }

  const cleanQ = trimmed
    .replace(/^M\.?\s*COM\s*[-/. ]\s*/i, '')
    .replace(/^MC\s*[-/. ]\s*/i, '')
    .trim() || trimmed;

  const defaultFields = [
    ...fileNoFields,
    'plan_no',
    'name',
    'management_corporation_name',
    'address',
    'secretary',
    'treasurer',
    'town',
    ...extraLikeFields,
  ];

  const uniqueFields = Array.from(new Set(defaultFields));
  return {
    $or: uniqueFields.map((field) => ({
      [field]: { $like: `%${cleanQ}%` },
    })),
  };
}

module.exports = {
  buildFileNoSearchCondition,
};

