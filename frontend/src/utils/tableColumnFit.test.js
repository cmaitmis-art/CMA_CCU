import { describe, it, expect } from 'vitest';
import { computeFittedTableColumns } from './tableColumnFit.js';
import { COL_WIDTHS as COMPLAINTS_COL_WIDTHS, COMPLAINTS_COLUMN_SPECS } from '../components/complaints/ComplaintsShared.jsx';
import { COL_WIDTHS as CFILES_COL_WIDTHS, CFILES_COLUMN_SPECS } from '../components/c-files/CFilesShared.jsx';

describe('Table column widths & fit up to STATUS', () => {
  it('matches Complaints ACTIONS and STATUS widths to standard table widths', () => {
    expect(COMPLAINTS_COL_WIDTHS.STATUS).toBe(195);
    expect(COMPLAINTS_COL_WIDTHS.ACTIONS).toBe(210);
    expect(CFILES_COL_WIDTHS.STATUS).toBe(195);
    expect(CFILES_COL_WIDTHS.ACTIONS).toBe(210);
  });

  it('keeps C-Files REMARKS compact instead of stretching to 865px', () => {
    expect(CFILES_COL_WIDTHS.REMARKS).toBe(210);
    const { widthsByKey, totalWidth } = computeFittedTableColumns(CFILES_COLUMN_SPECS, 1021, 404);
    expect(widthsByKey.REMARKS).toBe(210);
    expect(totalWidth).toBe(1852);
  });

  it.each([935, 1021, 1095, 1191, 1380, 1580])(
    'fits complete Complaints columns exactly up to STATUS border at containerWidth=%i',
    (containerWidth) => {
      const stickyRightWidth = 404;
      const { widthsByKey, fittedPrefixCount } = computeFittedTableColumns(
        COMPLAINTS_COLUMN_SPECS,
        containerWidth,
        stickyRightWidth
      );

      expect(fittedPrefixCount).toBeGreaterThanOrEqual(1);
      const leftCols = COMPLAINTS_COLUMN_SPECS.slice(0, -2);
      const visibleLeftSum = leftCols
        .slice(0, fittedPrefixCount)
        .reduce((sum, col) => sum + widthsByKey[col.key], 0);

      expect(visibleLeftSum).toBe(Math.floor(containerWidth - stickyRightWidth));
      expect(widthsByKey.STATUS).toBe(195);
      expect(widthsByKey.ACTIONS).toBe(210);
    }
  );

  it.each([935, 1021, 1095, 1191, 1380, 1580])(
    'fits complete C-Files columns exactly up to STATUS border at containerWidth=%i',
    (containerWidth) => {
      const stickyRightWidth = 404;
      const { widthsByKey, fittedPrefixCount } = computeFittedTableColumns(
        CFILES_COLUMN_SPECS,
        containerWidth,
        stickyRightWidth
      );

      expect(fittedPrefixCount).toBeGreaterThanOrEqual(1);
      const leftCols = CFILES_COLUMN_SPECS.slice(0, -2);
      const visibleLeftSum = leftCols
        .slice(0, fittedPrefixCount)
        .reduce((sum, col) => sum + widthsByKey[col.key], 0);

      expect(visibleLeftSum).toBe(Math.floor(containerWidth - stickyRightWidth));
      expect(widthsByKey.REMARKS).toBe(210);
    }
  );

  it('expands flexible column smoothly on ultrawide screens with no horizontal scroll', () => {
    const cfilesResult = computeFittedTableColumns(CFILES_COLUMN_SPECS, 2200, 404);
    expect(cfilesResult.totalWidth).toBe(2200);
    expect(cfilesResult.widthsByKey.REMARKS).toBeGreaterThan(210);

    const complaintsResult = computeFittedTableColumns(COMPLAINTS_COLUMN_SPECS, 2200, 404);
    expect(complaintsResult.totalWidth).toBe(2200);
    expect(complaintsResult.widthsByKey['ISSUE / HEADING']).toBeGreaterThan(220);
  });
});

