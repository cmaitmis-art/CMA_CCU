/**
 * sinhalaUtils.js — Global Sinhala Typography & Mojibake Correction Utilities
 *
 * Provides font stacks and automatic mojibake (character encoding corruption) restoration
 * for Sinhala script across all tables, forms, and print views in the application.
 */

// Beautiful Sinhala font stack featuring Google Fonts + Windows standard font
export const SINHALA_FONT_SANS = `'Inter', 'Noto Sans Sinhala', 'Gemunu Libre', 'Iskoola Pota', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
export const SINHALA_FONT_SERIF = `'Times New Roman', 'Abhaya Libre', 'Noto Serif Sinhala', 'Iskoola Pota', Times, serif`;

const SINHALA_RANGE = /[\u0D80-\u0DFF]/;
const CP1252_HIGH_BYTES = [
  0x20AC, 0x0081, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021,
  0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0x008D, 0x017D, 0x008F,
  0x0090, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
  0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x009D, 0x017E, 0x0178,
];
const CP1252_REVERSE = new Map(CP1252_HIGH_BYTES.map((cp, i) => [cp, 0x80 + i]));

function charToByte(ch) {
  const code = ch.codePointAt(0);
  if (code <= 0xFF) return code;
  return CP1252_REVERSE.has(code) ? CP1252_REVERSE.get(code) : null;
}

/**
 * Reverses Windows-1252 / Latin-1 mojibake corruption on UTF-8 Sinhala strings.
 * If the string is already clean English or proper Unicode Sinhala, it is returned untouched.
 */
export function fixMojibake(str) {
  if (!str || typeof str !== 'string') return str;
  if (!/[\u0080-\uFFFF]/.test(str)) return str;
  if (SINHALA_RANGE.test(str)) return str;
  try {
    let bytes = [];
    let allMapped = true;
    for (const ch of str) {
      const b = charToByte(ch);
      if (b == null) { allMapped = false; break; }
      bytes.push(b);
    }
    const td = new TextDecoder('utf-8');
    if (allMapped && bytes.length) {
      const decoded = td.decode(new Uint8Array(bytes));
      if (SINHALA_RANGE.test(decoded)) return decoded;
    }

    bytes = Array.from(str).map(ch => ch.codePointAt(0) & 0xFF);
    const decodedLow = td.decode(new Uint8Array(bytes));
    if (SINHALA_RANGE.test(decodedLow)) return decodedLow;

    try {
      const alt = decodeURIComponent(escape(str));
      if (SINHALA_RANGE.test(alt)) return alt;
    } catch (e) {}

    return str;
  } catch {
    return str;
  }
}

/**
 * Recursively applies fixMojibake to all string properties of an object or array.
 * Highly useful for cleaning entire API response objects or request bodies.
 */
export function fixMojibakeDeep(obj) {
  if (typeof obj === 'string') return fixMojibake(obj);
  if (Array.isArray(obj)) return obj.map(fixMojibakeDeep);
  if (obj && typeof obj === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      res[k] = fixMojibakeDeep(v);
    }
    return res;
  }
  return obj;
}
