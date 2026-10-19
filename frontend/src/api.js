import Logger from './utils/logger.js';
import { fixMojibakeDeep } from './utils/sinhalaUtils.js';

// --- Global Fetch Interceptor for Audit Trails ---
// Automatically attaches user information to all POST, PUT, and PATCH JSON requests.
// This ensures that backend audit logs (created_by, modified_by, history)
// correctly record the user performing the action, rather than defaulting to 'System'.

// --- Concurrency Limit for cPanel CloudLinux (508 Loop Detected / EP Limits) ---
const MAX_CONCURRENT_REQUESTS = 2;
let activeRequests = 0;
const requestQueue = [];

function processQueue() {
  if (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const { resolve } = requestQueue.shift();
    resolve();
  }
}

const originalFetch = window.fetch;
window.fetch = async function (url, options) {
  // Wait in line if too many requests are active
  await new Promise(resolve => {
    requestQueue.push({ resolve });
    processQueue();
  });
  
  activeRequests++;
  
  try {
    let finalUrl = url;
    if (options) {
    const userStr = sessionStorage.getItem('cma_currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      let username = user?.name || user?.username || 'System';
      if (user?.department) {
        username = `${username} (${user.department})`;
      }

      if (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH') {
        try {
          if (typeof options.body === 'string') {
            const trimmed = options.body.trim();
            if (trimmed.startsWith('{')) {
              const bodyObj = JSON.parse(options.body);
              if (!bodyObj.user_name) bodyObj.user_name = username;
              if (!bodyObj.created_by) bodyObj.created_by = username;
              if (!bodyObj.modified_by) bodyObj.modified_by = username;
              const cleanedBody = fixMojibakeDeep(bodyObj);
              options.body = JSON.stringify(cleanedBody);
            } else if (trimmed.startsWith('[')) {
              const bodyArr = JSON.parse(options.body);
              if (Array.isArray(bodyArr)) {
                for (const item of bodyArr) {
                  if (item && typeof item === 'object') {
                    if (!item.user_name) item.user_name = username;
                    if (!item.created_by) item.created_by = username;
                    if (!item.modified_by) item.modified_by = username;
                  }
                }
                const cleanedBody = fixMojibakeDeep(bodyArr);
                options.body = JSON.stringify(cleanedBody);
              }
            }
          }
        } catch (e) {
          console.warn('Fetch interceptor could not parse body:', e);
        }
      } else if (options.method === 'DELETE') {
        // Append user_name to query string for DELETE requests so the backend can log it
        const urlObj = new URL(finalUrl, window.location.origin);
        urlObj.searchParams.set('user_name', username);
        finalUrl = urlObj.pathname + urlObj.search;
      }
    }
  }
  // Add retry logic for 502 Bad Gateway (Server restarting) or network errors
  const maxRetries = 3;
  const retryDelayMs = 1500;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await originalFetch.call(this, finalUrl, options);
      if (response.status === 502 && attempt < maxRetries) {
        // Backend is likely restarting (nodemon). Wait and retry.
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        continue;
      }
      return response;
    } catch (err) {
      // Network errors (e.g. proxy completely down)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        continue;
      }
      throw err;
    }
  }
  } finally {
    activeRequests--;
    processQueue();
  }
};
// -------------------------------------------------

export function getApiBase() {
  // Use the environment variable if defined (for production), otherwise fallback to '/api' for local dev
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    // Ensure the URL does not have a trailing slash
    const cleanUrl = envUrl.replace(/\/$/, '');
    // Append /api only if it doesn't already end with it
    return cleanUrl.endsWith('/api') ? cleanUrl : cleanUrl + '/api';
  }
  return '/api';
}


const API_BASE = getApiBase();

// buildUrl: works with both relative (/api) and absolute (http://...) base URLs.
// `new URL()` throws when base is a relative path, so we build query strings manually.
function buildUrl(path, params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  const qs = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return qs ? `${path}?${qs}` : path;
}

async function handleResponse(response) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'API request failed');
  }
  const data = await response.json();
  if (data && data.success === false && data.error) {
    throw new Error(data.error);
  }
  return fixMojibakeDeep(data);
}

async function fetchWithRetry(url, options, { retries = 1 } = {}) {
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      const method = options?.method || 'GET';
      const endpoint = url.replace(API_BASE, '').split('?')[0];

      // Log API call
      if (res.ok) {
        Logger.logAPICall(method, endpoint, res.status);
      } else {
        Logger.logAPICCallError(method, endpoint, new Error(`HTTP ${res.status}`));
      }

      return res;
    } catch (err) {
      lastErr = err;
      // retry only on network-level failures (fetch throws), not on HTTP errors
      if (attempt === retries) {
        Logger.logAPICCallError('FETCH', url, err);
        throw new Error(
          `Network error while calling: ${url}. Original error: ${err?.message || String(err)}`
        );
      }
    }
  }

  throw lastErr;
}

export async function fetchComposers() {
  const response = await fetch(`${API_BASE}/composers`);
  return handleResponse(response);
}

export async function fetchComposerById(id) {
  const response = await fetch(`${API_BASE}/composers/${id}`);
  return handleResponse(response);
}

export async function createComposer(composer) {
  const response = await fetch(`${API_BASE}/composers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(composer),
  });
  return handleResponse(response);
}

export async function updateComposer(id, composer) {
  const response = await fetch(`${API_BASE}/composers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(composer),
  });
  return handleResponse(response);
}

export async function deleteComposer(id) {
  const response = await fetch(`${API_BASE}/composers/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

// ========== C Files API ==========
export async function fetchCfiles() {
  const response = await fetch(`${API_BASE}/cfiles`);
  return handleResponse(response);
}

export async function fetchCfilesAll() {
  const response = await fetch(`${API_BASE}/cfiles?limit=999999`);
  return handleResponse(response);
}

export async function createCfile(cfile) {
  const response = await fetch(`${API_BASE}/cfiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfile),
  });
  return handleResponse(response);
}

export async function deleteCfile(id) {
  const response = await fetch(`${API_BASE}/cfiles/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

// ========== COMPLAINTS API ==========
export async function fetchComplaints(status = '', page = 1, limit = 1000) {
  const url = buildUrl(`${API_BASE}/complaints`, { status: status || undefined, page, limit });
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchComplaintById(id) {
  const response = await fetch(`${API_BASE}/complaints/${id}`);
  return handleResponse(response);
}

export async function createComplaint(complaint) {
  const response = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(complaint),
  });
  return handleResponse(response);
}

export async function updateComplaintStatus(id, status) {
  const response = await fetch(`${API_BASE}/complaints/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleResponse(response);
}

export async function assignComplaintToDGM(id, assigned_to_dgm) {
  const response = await fetch(`${API_BASE}/complaints/${id}/assign-dgm`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assigned_to_dgm }),
  });
  return handleResponse(response);
}

export async function approveDGM(id, dgm_approval_status, dgm_notes) {
  const response = await fetch(`${API_BASE}/complaints/${id}/dgm-approval`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dgm_approval_status, dgm_notes }),
  });
  return handleResponse(response);
}

export async function resolveComplaint(id, resolution_notes) {
  const response = await fetch(`${API_BASE}/complaints/${id}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolution_notes }),
  });
  return handleResponse(response);
}

export async function fetchComplaintSummaryStats() {
  const response = await fetch(`${API_BASE}/complaints/stats/summary`);
  return handleResponse(response);
}

export async function fetchPendingComplaints(limit = 5) {
  const response = await fetch(`${API_BASE}/complaints/dashboard/pending?limit=${limit}`);
  return handleResponse(response);
}

export async function fetchPendingCfiles(limit = 5) {
  const response = await fetch(`${API_BASE}/cfiles/dashboard/pending?limit=${limit}`);
  return handleResponse(response);
}

// ========== MC API ==========
export async function fetchMCs({ status, year, month, category, municipality, page, limit, q, searchField, renewal_vise, agm_vise, town } = {}) {
  const url = buildUrl(`${API_BASE}/mc`, { status, year, month, category, municipality, page, limit, q, searchField, renewal_vise, agm_vise, town });
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchMCsFiltered(filters = {}) {
  return fetchMCs(filters);
}

export async function fetchMCById(id) {
  const response = await fetch(`${API_BASE}/mc/${id}`);
  return handleResponse(response);
}

export async function fetchMCsAll() {
  const url = buildUrl(`${API_BASE}/mc`, { limit: 999999 });
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchMComById(id) {
  const response = await fetch(`${API_BASE}/mcom/${id}`);
  return handleResponse(response);
}



export async function createMC(mc) {
  const response = await fetch(`${API_BASE}/mc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mc),
  });
  return handleResponse(response);
}

export async function fetchRegistrationInvoices({ mc_id, invoice_number, q, page = 1, limit = 20 } = {}) {
  const url = buildUrl(`${API_BASE}/registration-invoices`, { mc_id, invoice_number, q, page, limit });
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchRegistrationInvoiceById(id) {
  const response = await fetch(`${API_BASE}/registration-invoices/${id}`);
  return handleResponse(response);
}

export async function createRegistrationInvoice(invoice) {
  const response = await fetch(`${API_BASE}/registration-invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });
  return handleResponse(response);
}

export async function importMCsBulk(records) {
  const response = await fetch(`${API_BASE}/mc/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(records),
  });
  return handleResponse(response);
}

export async function importMComsBulk(records) {
  const response = await fetch(`${API_BASE}/mcom/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(records),
  });
  return handleResponse(response);
}

export async function deleteMComsBulk(fileNos = []) {
  const response = await fetch(`${API_BASE}/mcom/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_nos: fileNos }),
  });
  return handleResponse(response);
}

// ========== M.COM API ==========
export async function fetchMComs({ year, month, municipality, mc_mcom, category, status, renewalPeriod, agmYear, q, searchField, page, limit, town } = {}) {
  const url = buildUrl(`${API_BASE}/mcom`, { year, month, municipality, mc_mcom, category, status, renewalPeriod, agmYear, q, searchField, page, limit, town });
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchMComsAll() {
  const url = buildUrl(`${API_BASE}/mcom`, { limit: 999999 });
  const response = await fetch(url);
  return handleResponse(response);
}


export async function fetchMComsFiltered(filters = {}) {
  return fetchMComs(filters);
}


// ========== RENEWALS API ===========
export async function fetchRenewals() {
  const response = await fetch(`${API_BASE}/renewals`);
  return handleResponse(response);
}

export async function fetchRenewal(refNo) {
  const response = await fetch(`${API_BASE}/renewals/${refNo}`);
  return handleResponse(response);
}

export async function submitRenewal(payload) {
  const response = await fetch(`${API_BASE}/renewals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function approveRenewal(refNo, actionBy) {
  const response = await fetch(`${API_BASE}/renewals/${refNo}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionBy }),
  });
  return handleResponse(response);
}

export async function rejectRenewal(refNo, reason, actionBy) {
  const response = await fetch(`${API_BASE}/renewals/${refNo}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, actionBy }),
  });
  return handleResponse(response);
}

export async function deleteRenewal(refNo) {
  const response = await fetch(`${API_BASE}/renewals/${refNo}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

// ========== USER API ===========
export async function downloadReceiptPdf(record, type) {
  const url = buildUrl(`${API_BASE}/customer-history/receipt-pdf`, { type, id: record.id });
  const response = await fetch(url);
  return handleResponse(response);
}

// ========== CHAT API ===========
function getChatAuthHeaders() {
  const userStr = sessionStorage.getItem('cma_currentUser');
  const user = userStr ? JSON.parse(userStr) : null;
  return { 'x-user-name': user?.name || user?.username || '' };
}

export async function fetchUnreadCounts() {
  const response = await fetch(`${API_BASE}/chat/unread`, {
    headers: getChatAuthHeaders()
  });
  return handleResponse(response);
}

export async function fetchChatUsers() {
  const response = await fetch(`${API_BASE}/chat/users`, {
    headers: getChatAuthHeaders()
  });
  return handleResponse(response);
}

export async function fetchChatMessages(targetId) {
  const response = await fetch(`${API_BASE}/chat/messages/${targetId}`, {
    headers: getChatAuthHeaders()
  });
  return handleResponse(response);
}

export async function markChatRead(targetId) {
  const response = await fetch(`${API_BASE}/chat/read/${targetId}`, {
    method: 'PUT',
    headers: getChatAuthHeaders()
  });
  return handleResponse(response);
}

export async function sendChatMessage(receiver_id, content, metadata) {
  const response = await fetch(`${API_BASE}/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getChatAuthHeaders() },
    body: JSON.stringify({ receiver_id, content, metadata: metadata ? JSON.stringify(metadata) : null }),
  });
  return handleResponse(response);
}

export async function deleteChatMessage(id) {
  const response = await fetch(`${API_BASE}/chat/messages/${id}`, {
    method: 'DELETE',
    headers: getChatAuthHeaders()
  });
  return handleResponse(response);
}


export async function fetchCustomerHistory(mcType, customerNo) {
  const url = buildUrl(`${API_BASE}/customer-history`, { mcType, customerNo });
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchUsers({ q, role } = {}) {
  const url = buildUrl(`${API_BASE}/users`, { q, role });
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchActiveUsers() {
  const response = await fetch(`${API_BASE}/users`);
  return handleResponse(response);
}

export async function createUser(user) {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  return handleResponse(response);
}

export async function updateUser(id, user) {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  return handleResponse(response);
}

export async function uploadUserAvatar(id, file) {
  const formData = new FormData();
  formData.append('avatar', file);
  const response = await fetch(`${API_BASE}/users/${id}/avatar`, {
    method: 'PATCH',
    body: formData,
  });
  return handleResponse(response);
}

export async function deleteUser(id) {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}


// ========== DASHBOARD API ===========
export async function fetchDashboardStats() {
  const response = await fetch(`${API_BASE}/dashboard/stats`);
  return handleResponse(response);
}

// ========== REPORTS API ==========
export async function generateComplaintReport(start_date, end_date, status) {
  const response = await fetch(`${API_BASE}/reports/generate/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_date, end_date, status }),
  });
  return handleResponse(response);
}

export async function exportData(type) {
  const response = await fetch(`${API_BASE}/reports/export/${type}`);
  const data = await handleResponse(response);
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2)));
  element.setAttribute('download', `${type}-${new Date().toISOString().split('T')[0]}.json`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// ========== DISCUSSIONS API ==========
export async function fetchPendingDiscussions() {
  const response = await fetch(`${API_BASE}/discussion/dashboard/pending`);
  return handleResponse(response);
}

export async function fetchDiscussions(page = 1, limit = 20, search = '', status = '', year = '', month = '') {
  const url = buildUrl(`${API_BASE}/discussion`, { page, pageSize: limit, search: search || undefined, status: status || undefined, year: year || undefined, month: month || undefined });
  const response = await fetch(url);
  return handleResponse(response);
}

export async function createDiscussion(discussion) {
  const response = await fetch(`${API_BASE}/discussion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discussion),
  });
  return handleResponse(response);
}

export async function updateDiscussion(id, discussion) {
  const response = await fetch(`${API_BASE}/discussion/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discussion),
  });
  return handleResponse(response);
}

export async function deleteDiscussion(id) {
  const response = await fetch(`${API_BASE}/discussion/${id}`, {
    method: 'DELETE',
  });
  if (response.status === 204) return { success: true };
  return handleResponse(response);
}

export async function deleteAllDiscussions() {
  const response = await fetch(`${API_BASE}/discussion`, {
    method: 'DELETE',
  });
  if (response.status === 204) return { success: true };
  return handleResponse(response);
}

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(response);
}

export async function logout(username) {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return handleResponse(response);
}

export async function pingUser(id) {
  const response = await fetch(`${API_BASE}/users/${id}/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(response);
}

// ========== NOTIFICATIONS API ==========
export async function fetchNotifications({ user_id, role } = {}) {
  const url = buildUrl(`${API_BASE}/notifications`, { user_id, role });
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchAllNotifications({ user_id, role } = {}) {
  const url = buildUrl(`${API_BASE}/notifications`, { user_id, role, include_all: 'true' });
  const response = await fetch(url);
  return handleResponse(response);
}

export async function createNotification(notification) {
  const response = await fetch(`${API_BASE}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notification),
  });
  return handleResponse(response);
}

/**
 * Marks a notification as dismissed for the given user in the database.
 * @param {number|string} notificationId
 * @param {number|string} userId
 */
export async function dismissNotification(notificationId, userId) {
  const response = await fetch(`${API_BASE}/notifications/${notificationId}/dismiss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  return handleResponse(response);
}

/**
 * Un-dismisses (restores) a notification for the given user.
 * @param {number|string} notificationId
 * @param {number|string} userId
 */
export async function undismissNotification(notificationId, userId) {
  const response = await fetch(`${API_BASE}/notifications/${notificationId}/dismiss?user_id=${userId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(response);
}

// --- AGM Management ---
export async function fetchAgmRecords({ q, status, year, month, meetingType, recordType = 'mc', page = 1, limit = 20 } = {}) {
  const url = buildUrl(`${API_BASE}/agm`, { q, status, year, month, meetingType, recordType, page, limit });
  const response = await fetch(url);
  return handleResponse(response);
}

export async function uploadAgmDocument(mc_id, file, notes, uploaded_by, record_type = 'mc') {
  const formData = new FormData();
  formData.append('document', file);
  if (notes) formData.append('notes', notes);
  if (uploaded_by) formData.append('uploaded_by', uploaded_by);
  if (record_type) formData.append('record_type', record_type);
  const response = await fetch(`${API_BASE}/agm/${mc_id}/upload`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(response);
}

export async function updateAgmMeeting(id, data) {
  const response = await fetch(`${API_BASE}/agm/${id}/meeting`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteAgmRecord(mc_id) {
  const response = await fetch(`${API_BASE}/agm/${mc_id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

// --- Roles & Permissions Management ---
export async function fetchRoles() {
  const response = await fetch(`${API_BASE}/roles`);
  return handleResponse(response);
}

export async function createRole(roleData) {
  const response = await fetch(`${API_BASE}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roleData),
  });
  return handleResponse(response);
}

export async function updateRole(roleId, roleData) {
  const response = await fetch(`${API_BASE}/roles/${roleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roleData),
  });
  return handleResponse(response);
}

export async function deleteRole(roleId) {
  const response = await fetch(`${API_BASE}/roles/${roleId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

// ========== CALENDAR EVENTS API ===========
export async function fetchCalendarEvents() {
  const response = await fetch(`${API_BASE}/calendar-events?_t=${Date.now()}`);
  return handleResponse(response);
}

export async function createCalendarEvent(event) {
  const response = await fetch(`${API_BASE}/calendar-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  return handleResponse(response);
}

export async function deleteCalendarEvent(id) {
  const response = await fetch(`${API_BASE}/calendar-events/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

// ========== USER PREFERENCES API ===========
export async function fetchUserPreferences(userId) {
  if (!userId) return {};
  const response = await fetch(`${API_BASE}/user-prefs/${userId}`);
  return handleResponse(response);
}

export async function setUserPreference(userId, prefKey, prefValue) {
  if (!userId || !prefKey) return;
  const response = await fetch(`${API_BASE}/user-prefs/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefKey, prefValue }),
  });
  return handleResponse(response);
}

export async function deleteUserPreference(userId, prefKey) {
  if (!userId || !prefKey) return;
  const response = await fetch(`${API_BASE}/user-prefs/${userId}/${prefKey}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

// ========== USER DRAFTS API ===========
export async function fetchUserDraft(userId, draftKey) {
  if (!userId || !draftKey) return null;
  try {
    const response = await fetch(`${API_BASE}/user-drafts/${userId}/${draftKey}`);
    if (response.status === 404) return null;
    const data = await handleResponse(response);
    return data.draftData;
  } catch (e) {
    return null;
  }
}

export async function setUserDraft(userId, draftKey, draftData) {
  if (!userId || !draftKey) return;
  const response = await fetch(`${API_BASE}/user-drafts/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draftKey, draftData }),
  });
  return handleResponse(response);
}

export async function deleteUserDraft(userId, draftKey) {
  if (!userId || !draftKey) return;
  const response = await fetch(`${API_BASE}/user-drafts/${userId}/${draftKey}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}


