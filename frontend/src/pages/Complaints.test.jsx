import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Complaints from './Complaints.jsx';

vi.mock('../ConfirmDialogContext.jsx', () => ({
  useConfirmDialog: () => vi.fn().mockResolvedValue(true),
}));

vi.mock('../utils/useAutoRefresh', () => ({
  useAutoRefresh: () => {},
}));

vi.mock('../utils/tableColumnFit.js', () => ({
  useFitColumnsToStatus: () => ({ widthsByKey: {}, totalWidth: 1200 }),
}));

describe('Complaints table row click & MC link navigation', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/stats/summary')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            total: 2,
            pending: 0,
            new: 2,
            open: 0,
            closed: 0,
            overdue: 0,
            totalCategories: 1,
            categories: ['Other Issues'],
          }),
        });
      }
      if (String(url).includes('exclude_closed=true')) {
        return Promise.resolve({ ok: true, json: async () => ({ rows: [] }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          rows: [
            {
              id: 1,
              serial_no: 'SAG260101',
              letter_date: '2025-12-29',
              received_ccu: '2026-01-06',
              mc_no: 'MC/1066',
              apartment_name: 'The Beach Front II',
              complaint_name: 'Secretary',
              issue_heading: 'Requesting supportive letter',
              status: 'New',
            },
            {
              id: 4,
              serial_no: 'SAG260104',
              letter_date: '2025-12-09',
              received_ccu: '2026-01-06',
              mc_no: 'M.com/833',
              apartment_name: 'Maligawatte Railway H/S',
              complaint_name: 'President',
              issue_heading: 'Roof repair',
              status: 'New',
            },
          ],
          total: 2,
        }),
      });
    });
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
  });

  it('opens Complaint Details on row click and navigates with auto-open when clicking MC/1066 or M.com/833', async () => {
    const onNavigate = vi.fn();

    render(
      <Complaints
        currentUser={{ id: 1, username: 'admin', name: 'Admin', role: 'Admin' }}
        onNavigate={onNavigate}
      />
    );

    const rowCell = await screen.findByText('The Beach Front II');
    fireEvent.click(rowCell);

    expect((await screen.findAllByText('Complaint Details')).length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    // Clicking MC/1066 navigates to MC Management and sets auto-open key without reopening Complaint Details
    fireEvent.click(screen.getByText('MC/1066'));
    expect(localStorage.getItem('cma_mc_navigate_search')).toBe('MC/1066');
    expect(localStorage.getItem('cma_mc_navigate_open')).toBe('MC/1066');
    expect(onNavigate).toHaveBeenCalledWith('mc');
    expect(screen.queryAllByText('Complaint Details')).toHaveLength(0);

    // Clicking M.com/833 navigates to M.Com Management and sets auto-open key
    fireEvent.click(screen.getByText('M.com/833'));
    expect(localStorage.getItem('cma_mcom_navigate_search')).toBe('M.com/833');
    expect(localStorage.getItem('cma_mcom_navigate_open')).toBe('M.com/833');
    expect(onNavigate).toHaveBeenCalledWith('mcom');
  });

  it('shows permission toast and avoids navigation when non-admin user lacks MC view permission', async () => {
    const { default: Complaints } = await import('./Complaints.jsx');
    const onNavigate = vi.fn();

    render(
      <Complaints
        currentUser={{
          id: 2,
          username: 'legal1',
          name: 'Legal Officer',
          role: 'Legal',
          department: 'Legal',
          permissions: { complains: ['view'] },
        }}
        onNavigate={onNavigate}
      />
    );

    const mcLink = await screen.findByText('MC/1066');
    fireEvent.click(mcLink);

    expect(onNavigate).not.toHaveBeenCalled();
    expect(localStorage.getItem('cma_mc_navigate_search')).toBeNull();
    expect(screen.getByText('You do not have permission to view MC Management records')).toBeTruthy();
  });
});
