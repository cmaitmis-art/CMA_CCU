export const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: 'New Renewal Approval Request',
    message: 'A new renewal payment has been submitted by The Management Corporation C.P.No. 5590 for approval.',
    category: 'Renewal Approvals',
    date: '2026-08-17T08:30:00',
    icon: 'fa-check-circle',
    color: '#16a34a',
    pageId: 'renewal_approval'
  }
];

export function getReadNotifications(username) {
  try {
    const data = localStorage.getItem(`cma_read_notifications_${username}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function markNotificationAsRead(username, id) {
  const read = getReadNotifications(username);
  if (!read.includes(id)) {
    read.push(id);
    localStorage.setItem(`cma_read_notifications_${username}`, JSON.stringify(read));
    window.dispatchEvent(new Event('cma:notifications_updated'));
  }
}

export function markAllNotificationsAsRead(username) {
  const allIds = MOCK_NOTIFICATIONS.map(n => n.id);
  localStorage.setItem(`cma_read_notifications_${username}`, JSON.stringify(allIds));
  window.dispatchEvent(new Event('cma:notifications_updated'));
}

export function getUnreadCount(username) {
  const read = getReadNotifications(username);
  return MOCK_NOTIFICATIONS.filter(n => !read.includes(n.id)).length;
}
