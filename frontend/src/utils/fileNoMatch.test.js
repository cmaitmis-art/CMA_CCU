import { describe, it, expect } from 'vitest';
import { findBestFileNoMatch } from './fileNoMatch.js';

describe('findBestFileNoMatch', () => {
  it('matches MC/ and M.com/ shorthand codes to full file numbers without false prefix collisions', () => {
    const records = [
      { id: 1, file_no: 'CMA/CCU/24/MC/1580', new_file_no: 'CMA/CCU/24/MC/1580' },
      { id: 2, file_no: 'CMA/CCU/12/MC/158', new_file_no: 'CMA/CCU/12/MC/158' },
      { id: 3, file_no: 'CMA/CCU/2025/PVT/MC/1066', new_file_no: 'CMA/CCU/2025/PVT/MC/1066' },
      { id: 4, file_no: 'CMA/CCU/15/NHDA/M.Com/833', new_file_no: 'CMA/CCU/15/NHDA/M.Com/833' },
    ];

    expect(findBestFileNoMatch(records, 'MC/158')?.id).toBe(2);
    expect(findBestFileNoMatch(records, 'MC/1066')?.id).toBe(3);
    expect(findBestFileNoMatch(records, 'M.com/833')?.id).toBe(4);
    expect(findBestFileNoMatch(records, 'CMA/CCU/24/MC/1580')?.id).toBe(1);
    expect(findBestFileNoMatch([], 'MC/1066')).toBeNull();
  });
});
