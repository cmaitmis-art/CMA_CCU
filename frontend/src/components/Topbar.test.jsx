import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Topbar, {
  getCalendarVisibilityColor,
  getCalendarVisibilityLabel,
  isCalendarEventVisible,
} from './Topbar.jsx';

const mockCreateCalendarEvent = vi.fn();
const mockFetchCalendarEvents = vi.fn();
const mockDeleteCalendarEvent = vi.fn();
const mockFetchUserPreferences = vi.fn();
const mockSetUserPreference = vi.fn();
const mockFetchDiscussions = vi.fn();

vi.mock('../api.js', () => ({
  fetchCalendarEvents: (...args) => mockFetchCalendarEvents(...args),
  createCalendarEvent: (...args) => mockCreateCalendarEvent(...args),
  deleteCalendarEvent: (...args) => mockDeleteCalendarEvent(...args),
  fetchUserPreferences: (...args) => mockFetchUserPreferences(...args),
  setUserPreference: (...args) => mockSetUserPreference(...args),
  fetchDiscussions: (...args) => mockFetchDiscussions(...args),
}));

describe('Topbar calendar visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCalendarEvents.mockResolvedValue([]);
    mockFetchUserPreferences.mockResolvedValue({});
    mockFetchDiscussions.mockResolvedValue({ discussions: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows Finance events to Finance users, admins, and event authors only', () => {
    const financeEvent = { id: 1, title: 'Audit Review', visibility: 'Finance', authorId: 'fin1' };

    expect(isCalendarEventVisible(financeEvent, { username: 'fin2', department: 'Finance', role: 'Finance Department' })).toBe(true);
    expect(isCalendarEventVisible(financeEvent, { username: 'fin3', department: 'Other', role: 'Finance' })).toBe(true);
    expect(isCalendarEventVisible(financeEvent, { username: 'admin', department: 'IT / System', role: 'Admin' })).toBe(true);
    expect(isCalendarEventVisible(financeEvent, { username: 'fin1', department: 'CCU', role: 'MA' })).toBe(true);
    expect(isCalendarEventVisible(financeEvent, { username: 'legal1', department: 'Legal', role: 'Legal Department' })).toBe(false);
    expect(isCalendarEventVisible(financeEvent, { username: 'tech1', department: 'Technical', role: 'Technical Department' })).toBe(false);
  });

  it('returns distinct colors and badge labels for all visibility levels including Finance', () => {
    expect(getCalendarVisibilityColor('Finance')).toBe('#ec4899');
    expect(getCalendarVisibilityColor('Legal')).toBe('#8b5cf6');
    expect(getCalendarVisibilityColor('Technical')).toBe('#f59e0b');
    expect(getCalendarVisibilityColor('CCU')).toBe('#3b82f6');
    expect(getCalendarVisibilityColor('Everyone')).toBe('#10b981');
    expect(getCalendarVisibilityColor('Only Me')).toBe('#94a3b8');

    expect(getCalendarVisibilityLabel('Finance')).toBe('Finance');
    expect(getCalendarVisibilityLabel('Legal')).toBe('Legal');
    expect(getCalendarVisibilityLabel('Technical')).toBe('Technical');
    expect(getCalendarVisibilityLabel('CCU')).toBe('CCU');
    expect(getCalendarVisibilityLabel('Only Me')).toBe('Me');
    expect(getCalendarVisibilityLabel('Everyone')).toBe('All');
  });

  it('renders Finance option in the calendar visibility dropdown and creates Finance events', async () => {
    const now = new Date();
    const dayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-11`;
    mockCreateCalendarEvent.mockResolvedValue({
      id: 42,
      title: 'Budget Meeting',
      date: dayStr,
      visibility: 'Finance',
      authorId: 'admin',
    });

    render(
      <Topbar
        currentUser={{ id: 1, username: 'admin', name: 'Admin', role: 'Admin', department: 'IT / System' }}
        currentPage="dashboard"
        onToggleSidebar={() => {}}
        onLogout={() => {}}
        onNavigate={() => {}}
      />
    );

    fireEvent.click(screen.getByTitle('Calendar Events'));
    fireEvent.click(screen.getByText('11'));

    const select = screen.getByLabelText('Event visibility');
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual(['Only Me', 'CCU', 'Legal', 'Technical', 'Finance', 'Everyone']);

    fireEvent.change(screen.getByPlaceholderText('Add an event...'), { target: { value: 'Budget Meeting' } });
    fireEvent.change(select, { target: { value: 'Finance' } });
    fireEvent.click(screen.getByText('+'));

    await waitFor(() => {
      expect(mockCreateCalendarEvent).toHaveBeenCalledWith({
        title: 'Budget Meeting',
        date: dayStr,
        visibility: 'Finance',
        authorId: 'admin',
      });
    });

    expect(await screen.findByText('Budget Meeting')).toBeTruthy();
    expect(screen.getAllByText('Finance').length).toBeGreaterThanOrEqual(2);
  });
});

