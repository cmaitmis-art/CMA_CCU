import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MCRenewalApproval, {
  ACTION_COL_WIDTH,
  STATUS_COL_WIDTH,
  RENEWAL_COLUMN_SPECS,
} from './MCRenewalApproval.jsx';
import { computeFittedTableColumns } from '../utils/tableColumnFit.js';

vi.mock('../api.js', () => ({
  fetchRenewals: vi.fn().mockResolvedValue([
    {
      ref_no: 'MR00009',
      mc_name: 'Nideshraj Tower Management Corporation',
      plan_no: '5169',
      applicant_name: 'Karthigesu Balachandrarajan',
      applicant_phone: '0777726986',
      years: [2026],
      amount: 4535.63,
      created_at: '2026-10-30T11:16:44.000Z',
      action_by: null,
      status: 'pending_approval',
    },
  ]),
  approveRenewal: vi.fn(),
  rejectRenewal: vi.fn(),
  deleteRenewal: vi.fn(),
}));

describe('MCRenewalApproval table sticky Status & Action columns', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps Status and Action widths synchronized across headers and body cells with all 5 action buttons visible', async () => {
    const adminUser = {
      role: 'Admin',
      name: 'System Admin',
      permissions: {
        renewal_approval: ['view', 'create', 'edit', 'delete', 'approve', 'receipt', 'acknowledgement'],
      },
    };

    const { container } = render(<MCRenewalApproval currentUser={adminUser} />);
    await screen.findByText('MR00009');

    const statusTh = container.querySelector('th[data-status-col="true"]');
    const actionTh = Array.from(container.querySelectorAll('th')).find((el) => el.textContent === 'Action');
    const actionTd = container.querySelector('td.mc-td-actions');
    const statusTd = actionTd?.previousElementSibling;

    expect(ACTION_COL_WIDTH).toBeGreaterThanOrEqual(190);
    expect(statusTh).toBeTruthy();
    expect(actionTh).toBeTruthy();
    expect(statusTd).toBeTruthy();
    expect(actionTd).toBeTruthy();

    expect(statusTh.style.right).toBe(`${ACTION_COL_WIDTH}px`);
    expect(statusTh.style.width).toBe(`${STATUS_COL_WIDTH}px`);
    expect(statusTd.style.right).toBe(`${ACTION_COL_WIDTH}px`);
    expect(statusTd.style.width).toBe(`${STATUS_COL_WIDTH}px`);

    expect(actionTh.style.right).toBe('0px');
    expect(actionTh.style.width).toBe(`${ACTION_COL_WIDTH}px`);
    expect(actionTd.style.right).toBe('0px');
    expect(actionTd.style.width).toBe(`${ACTION_COL_WIDTH}px`);

    expect(screen.getByTitle('View Details')).toBeTruthy();
    expect(screen.getByTitle('Acknowledgement Letter')).toBeTruthy();
    expect(screen.getByTitle('Approve')).toBeTruthy();
    expect(screen.getByTitle('Reject')).toBeTruthy();
    expect(screen.getByTitle('Delete')).toBeTruthy();
  });

  it('fits leading columns cleanly to Status boundary without clipping Action or Status', () => {
    const stickyRightWidth = STATUS_COL_WIDTH + ACTION_COL_WIDTH;
    const result = computeFittedTableColumns(RENEWAL_COLUMN_SPECS, 994, stickyRightWidth);
    const leftCols = RENEWAL_COLUMN_SPECS.slice(0, -2);
    const visibleLeftSum = leftCols
      .slice(0, result.fittedPrefixCount)
      .reduce((sum, col) => sum + result.widthsByKey[col.key], 0);

    expect(visibleLeftSum).toBe(994 - stickyRightWidth);
    expect(result.widthsByKey.Status).toBe(STATUS_COL_WIDTH);
    expect(result.widthsByKey.Action).toBe(ACTION_COL_WIDTH);
  });
});

