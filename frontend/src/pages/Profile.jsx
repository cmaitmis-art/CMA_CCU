import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfirmDialog } from '../ConfirmDialogContext.jsx';

const theme = {
  navy: '#1a3a6b',
  navy2: '#2251a3',
  gold: '#c9a84c',
  bg: '#f4f6fb',
  card: '#ffffff',
  text: '#1a1a2e',
  text2: '#5a6478',
  text3: '#94a0b4',
  border: '#e2e8f0',
  green: '#16a34a',
  red: '#dc2626',
  amber: '#d97706',
  blue: '#2563eb',
};

const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();

function resolveApiUrl(path) {
  const base = API_BASE || '/api';
  const normalizedBase = base.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function Badge({ kind, children }) {
  const cls =
    kind === 'green'
      ? { bg: '#f0fdf4', color: '#16a34a' }
      : kind === 'navy'
        ? { bg: '#eff3ff', color: '#1a3a6b' }
        : kind === 'blue'
          ? { bg: '#eff6ff', color: '#2563eb' }
          : { bg: '#f0fdf4', color: '#16a34a' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 9px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: cls.bg,
        color: cls.color,
      }}
    >
      {children}
    </span>
  );
}

function Timeline({ items }) {
  if (!items?.length) return null;
  return (
    <div className="timeline">
      {items.map((it, idx) => (
        <div key={idx} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-date">{it.time}</div>
          <div className="timeline-text">{it.text}</div>
        </div>
      ))}
    </div>
  );
}

function toYMD(d) {
  return d.toISOString().slice(0, 10);
}

export default function Profile({ currentUser, onUserUpdated }) {
  const [toast, setToast] = useState(null);
  const confirm = useConfirmDialog();
  const [timelineItems, setTimelineItems] = useState([]);
  const [fullTimelineModalOpen, setFullTimelineModalOpen] = useState(false);
  const [fullTimelineItems, setFullTimelineItems] = useState([]);
  const [fullTimelineLoading, setFullTimelineLoading] = useState(false);
  const [fullTimelineDateFilter, setFullTimelineDateFilter] = useState('');

  const userId = currentUser?.id;

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ name: '', email: '', username: '', password: '' });
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const avatarInputRef = useRef(null);


  // Daily Activity form (single record per date)
  const [activityDate, setActivityDate] = useState(() => toYMD(new Date()));
  const [activityText, setActivityText] = useState('');
  const [activityCategory, setActivityCategory] = useState('');
  const [activityStatus, setActivityStatus] = useState('');
  const [editingActivity, setEditingActivity] = useState(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [allActivitiesModalOpen, setAllActivitiesModalOpen] = useState(false);

  const [savingActivity, setSavingActivity] = useState(false);
  const autoSaveTimer = useRef(null);
  const lastLoadedActivityRef = useRef({ date: null, activityText: '', activityCategory: '', activityStatus: '' });

  // Activities list
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesDateFilter, setActivitiesDateFilter] = useState(() => toYMD(new Date()));
  const [showAllDays, setShowAllDays] = useState(false);
  const [allActivities, setAllActivities] = useState([]);
  const [allActivitiesLoading, setAllActivitiesLoading] = useState(false);

  const profile = useMemo(() => {
    const roleKey = String(currentUser?.role || '').trim().toUpperCase();
    const roleLabel = roleKey === 'ADMIN'
      ? 'System Administrator'
      : roleKey === 'AGM'
        ? 'Assistant General Manager'
        : roleKey === 'MA'
          ? 'Management Assistant'
          : currentUser?.role || 'User';
    const username = currentUser?.username || 'admin.user';

    return {
      avatarText: currentUser?.avatar || 'AD',
      fullName: currentUser?.name || 'Admin User',
      subtitle: `${roleLabel} · CMA System 2026`,
      roleTags: [
        { kind: 'green', label: 'Active' },
        { kind: roleKey === 'ADMIN' ? 'navy' : 'blue', label: currentUser?.role || 'Admin' },
      ],
      email: currentUser?.email || `${username}@cma.gov.lk`,
      phone: roleKey === 'ADMIN' ? '+94 11 234 5678' : '+94 11 876 5432',
      role: roleLabel,
      department: roleKey === 'ADMIN' ? 'CMA — IT / System Division' : 'CMA — CCU Division',
      year: '2026',
      timeline: timelineItems.length > 0 ? timelineItems : [
        { time: 'Active', text: 'No recent activity logs recorded for your account yet.' }
      ],
    };
  }, [currentUser, timelineItems]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openEditProfile() {
    setEditProfileForm({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      username: currentUser?.username || '',
      password: '',
    });
    setEditAvatarFile(null);
    setEditAvatarPreview(currentUser?.avatar_url || null);
    setIsEditingProfile(true);
  }

  function closeEditProfile() {
    setIsEditingProfile(false);
    if (editAvatarPreview && editAvatarPreview !== currentUser?.avatar_url) {
      URL.revokeObjectURL(editAvatarPreview);
    }
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setEditAvatarFile(file);
      setEditAvatarPreview(URL.createObjectURL(file));
    }
  }

  async function handleSaveProfile() {
    if (!userId) return;
    setSavingProfile(true);
    try {
      const { name, email, username, password } = editProfileForm;
      const body = { name, email, username };
      if (password) body.password = password;

      let updatedUser = { ...currentUser };

      // Update text fields
      const resp = await fetch(resolveApiUrl(`/users/${userId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update profile');
      }
      updatedUser = await resp.json();

      // Update avatar if provided
      if (editAvatarFile) {
        const formData = new FormData();
        formData.append('avatar', editAvatarFile);
        const avatarResp = await fetch(resolveApiUrl(`/users/${userId}/avatar`), {
          method: 'PATCH',
          body: formData
        });
        if (!avatarResp.ok) {
          const data = await avatarResp.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to upload avatar');
        }
        const avatarData = await avatarResp.json();
        updatedUser.avatar_url = avatarData.avatar_url;
      }

      showToast('Profile updated successfully', 'success');
      if (onUserUpdated) onUserUpdated(updatedUser);
      closeEditProfile();
    } catch (e) {
      showToast(e?.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function fetchActivities({ date, allDays } = {}) {
    if (!userId) return;

    setActivitiesLoading(true);
    try {
      const url = new URL(resolveApiUrl('/daily-activities'), window.location.origin);
      url.searchParams.append('user_id', String(userId));
      if (!allDays && date) url.searchParams.append('date', date);

      const resp = await fetch(url.toString());
      const data = await resp.json();

      setActivities(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      showToast(e?.message || 'Failed to load activities', 'error');
    } finally {
      setActivitiesLoading(false);
    }
  }

  async function fetchAllActivities() {
    if (!userId) return;
    setAllActivitiesLoading(true);
    try {
      const url = new URL(resolveApiUrl('/daily-activities'), window.location.origin);
      url.searchParams.append('user_id', String(userId));

      const resp = await fetch(url.toString());
      const data = await resp.json();
      setAllActivities(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      showToast(e?.message || 'Failed to load all activities', 'error');
    } finally {
      setAllActivitiesLoading(false);
    }
  }

  async function fetchActivityForDate(date) {
    if (!userId || !date) return;
    try {
      const url = new URL(resolveApiUrl('/daily-activities'), window.location.origin);
      url.searchParams.append('user_id', String(userId));
      url.searchParams.append('date', date);

      const resp = await fetch(url.toString());
      const data = await resp.json();
      const items = Array.isArray(data.items) ? data.items : [];
      const existing = items[0] || null;

      if (existing) {
        setActivityText(existing.activity_text || '');
        setActivityCategory(existing.activity_category || '');
        setActivityStatus(existing.status || '');
        setEditingActivity(existing);
        lastLoadedActivityRef.current = {
          date,
          activityText: existing.activity_text || '',
          activityCategory: existing.activity_category || '',
          activityStatus: existing.status || '',
        };
      } else {
        setActivityText('');
        setActivityCategory('');
        setActivityStatus('');
        setEditingActivity(null);
        lastLoadedActivityRef.current = {
          date,
          activityText: '',
          activityCategory: '',
          activityStatus: '',
        };
      }
    } catch (e) {
      showToast(e?.message || 'Failed to load daily activity', 'error');
    }
  }

  async function fetchTimeline() {
    if (!currentUser?.name && !currentUser?.username) return;
    try {
      const params = new URLSearchParams({
        name: currentUser.name || '',
        username: currentUser.username || '',
      });
      const resp = await fetch(`${resolveApiUrl('/daily-activities/user-timeline')}?${params.toString()}`);
      const data = await resp.json();
      const items = Array.isArray(data.items) ? data.items : [];

      const formattedItems = items.map((it) => {
        const diffMs = Date.now() - new Date(it.time).getTime();
        const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        let relativeTime = 'Just now';
        if (diffDays > 0) {
          relativeTime = diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
        } else if (diffHours > 0) {
          relativeTime = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffMins > 0) {
          relativeTime = diffMins === 1 ? '1 min ago' : `${diffMins} mins ago`;
        }

        return {
          time: relativeTime,
          text: it.text,
        };
      });

      setTimelineItems(formattedItems);
    } catch (e) {
      console.error('Failed to fetch user timeline:', e);
    }
  }

  async function fetchFullTimeline() {
    if (!currentUser?.name && !currentUser?.username) return;
    setFullTimelineLoading(true);
    try {
      const params = new URLSearchParams({
        name: currentUser.name || '',
        username: currentUser.username || '',
        limit: '1000',
        all: 'true',
      });
      const resp = await fetch(`${resolveApiUrl('/daily-activities/user-timeline')}?${params.toString()}`);
      const data = await resp.json();
      const items = Array.isArray(data.items) ? data.items : [];

      const formattedItems = items.map((it) => {
        const dt = new Date(it.time);
        const diffMs = Date.now() - dt.getTime();
        const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        let relativeTime = 'Just now';
        if (diffDays > 0) {
          relativeTime = diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
        } else if (diffHours > 0) {
          relativeTime = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffMins > 0) {
          relativeTime = diffMins === 1 ? '1 min ago' : `${diffMins} mins ago`;
        }

        return {
          time: relativeTime,
          absoluteTime: isNaN(dt.getTime()) ? '' : dt.toLocaleString(),
          rawDate: isNaN(dt.getTime()) ? '' : toYMD(dt),
          text: it.text,
        };
      });

      setFullTimelineItems(formattedItems);
    } catch (e) {
      console.error('Failed to fetch full activity history:', e);
      showToast('Failed to load full activity history', 'error');
    } finally {
      setFullTimelineLoading(false);
    }
  }

  async function openFullTimelineModal() {
    setFullTimelineDateFilter('');
    setFullTimelineModalOpen(true);
    await fetchFullTimeline();
  }

  function closeFullTimelineModal() {
    setFullTimelineModalOpen(false);
  }

  useEffect(() => {
    fetchTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);



  useEffect(() => {
    if (!userId) return;
    fetchActivities({ date: activitiesDateFilter, allDays: showAllDays });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activitiesDateFilter, showAllDays]);

  useEffect(() => {
    if (!userId || !activityDate) return;

    const previous = lastLoadedActivityRef.current;
    const hasUnsavedChanges =
      previous.date &&
      previous.date !== activityDate &&
      (activityText !== previous.activityText ||
        activityCategory !== previous.activityCategory ||
        activityStatus !== previous.activityStatus);

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }

    const loadForDate = async () => {
      if (hasUnsavedChanges) {
        await handleUpsertDailyActivity(false);
      }
      await fetchActivityForDate(activityDate);
    };

    loadForDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activityDate]);

  function scheduleAutoSave() {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    autoSaveTimer.current = setTimeout(() => {
      handleUpsertDailyActivity(true);
    }, 1200);
  }

  function handleActivityFieldChange(field, value) {
    if (field === 'text') setActivityText(value);
    else if (field === 'category') setActivityCategory(value);
    else if (field === 'status') setActivityStatus(value);

    scheduleAutoSave();
  }

  function openActivityDetails(activity) {
    setSelectedActivity(activity);
    setActivityModalOpen(true);
  }

  function closeActivityModal() {
    setActivityModalOpen(false);
    setSelectedActivity(null);
  }
  async function openAllActivitiesModal() {
    setAllActivitiesModalOpen(true);
    await fetchAllActivities();
  }

  function closeAllActivitiesModal() {
    setAllActivitiesModalOpen(false);
  }

  function handleLoadActivityIntoForm(activity) {
    if (!activity || !activity.activity_date) return;
    setActivityDate(activity.activity_date);
    setActivityText(activity.activity_text || "");
    setActivityCategory(activity.activity_category || "");
    setActivityStatus(activity.status || "");
    setEditingActivity(activity);
    lastLoadedActivityRef.current = {
      date: activity.activity_date,
      activityText: activity.activity_text || '',
      activityCategory: activity.activity_category || '',
      activityStatus: activity.status || '',
    };
    setAllActivitiesModalOpen(false);
  }




  async function handleUpsertDailyActivity(isAutoSave = false) {
    if (!userId) return;

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }

    const text = activityText.trim();
    if (!text) {
      if (!isAutoSave) {
        showToast('Please enter daily activity text', 'error');
      }
      return;
    }

    setSavingActivity(true);
    try {
      const resp = await fetch(resolveApiUrl('/daily-activities/upsert'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          activity_date: activityDate,
          activity_text: text,
          activity_category: activityCategory.trim() || null,
          status: activityStatus.trim() || null,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save daily activity');
      }

      const savedActivity = await resp.json();
      setEditingActivity(savedActivity);
      lastLoadedActivityRef.current = {
        date: activityDate,
        activityText: text,
        activityCategory: activityCategory.trim() || '',
        activityStatus: activityStatus.trim() || '',
      };

      if (!isAutoSave) {
        showToast('Daily activity updated', 'success');
      }

      await fetchActivities({ date: activitiesDateFilter, allDays: showAllDays });
    } catch (e) {
      if (!isAutoSave) {
        showToast(e?.message || 'Failed to save daily activity', 'error');
      }
    } finally {
      setSavingActivity(false);
    }
  }

  async function handleDeleteActivity(id) {
    const confirmed = await confirm({
      title: 'Delete Activity',
      message: 'Are you sure you want to delete this activity? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;

    try {
      const resp = await fetch(resolveApiUrl(`/daily-activities/${id}`), {
        method: 'DELETE',
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete activity');
      }

      showToast('Activity deleted successfully', 'success');
      fetchActivities({ date: activitiesDateFilter, allDays: showAllDays });
    } catch (e) {
      showToast(e?.message || 'Failed to delete activity', 'error');
    }
  }

  const groupedByDate = useMemo(() => {
    const map = new Map();
    for (const item of activities) {
      const key = item.activity_date ? String(item.activity_date).slice(0, 10) : '—';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return keys.map((k) => ({ date: k, items: map.get(k) || [] }));
  }, [activities]);

  const allGroupedByDate = useMemo(() => {
    const map = new Map();
    for (const item of allActivities) {
      const key = item.activity_date ? String(item.activity_date).slice(0, 10) : '—';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return keys.map((k) => ({ date: k, items: map.get(k) || [] }));
  }, [allActivities]);

  const filteredFullTimelineItems = useMemo(() => {
    if (!fullTimelineDateFilter) return fullTimelineItems;
    return fullTimelineItems.filter((it) => it.rawDate === fullTimelineDateFilter);
  }, [fullTimelineItems, fullTimelineDateFilter]);

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function handleDownloadTimelinePdf() {
    const printWindow = window.open('', '_blank', 'width=850,height=1000');
    if (!printWindow) {
      showToast('Please allow pop-ups to download the PDF', 'error');
      return;
    }
    const dateLabel = fullTimelineDateFilter || 'All Dates';
    const rowsHtml = filteredFullTimelineItems.length
      ? filteredFullTimelineItems
          .map(
            (it) => `
            <div class="entry">
              <div class="entry-date">${escapeHtml(it.absoluteTime || it.time)}</div>
              <div class="entry-text">${escapeHtml(it.text)}</div>
            </div>`
          )
          .join('')
      : '<div class="empty">No activity records found for this date.</div>';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Activity History - ${escapeHtml(dateLabel)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; color: #111827; padding: 36px; }
            .header { border-bottom: 2px solid #1a3a6b; padding-bottom: 14px; margin-bottom: 22px; }
            .title { font-size: 20px; font-weight: 800; color: #1a3a6b; margin: 0 0 4px; }
            .meta { font-size: 12px; color: #6b7280; }
            .entry { padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
            .entry-date { font-size: 11px; font-weight: 700; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .03em; }
            .entry-text { font-size: 13px; color: #111827; line-height: 1.6; }
            .empty { padding: 24px 0; color: #6b7280; font-size: 13px; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <p class="title">Activity History Report</p>
            <p class="meta">
              ${escapeHtml(currentUser?.name || 'User')} &middot; Date: ${escapeHtml(dateLabel)} &middot; Generated ${escapeHtml(new Date().toLocaleString())}
            </p>
          </div>
          ${rowsHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => printWindow.print();
    // Fallback in case onload doesn't fire (already-loaded blank doc in some browsers)
    setTimeout(() => printWindow.print(), 300);
  }

  return (
    <div className="cma-page" style={{ background: theme.bg }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        {/* Header Card */}
        <div className="card" style={{ marginBottom: 18 }}>
          <div
            className="card-body"
            style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: theme.navy,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                fontWeight: 700,
                flexShrink: 0,
                overflow: 'hidden',
                position: 'relative',
                cursor: isEditingProfile ? 'pointer' : 'default',
              }}
              onClick={() => isEditingProfile && avatarInputRef.current?.click()}
              title={isEditingProfile ? "Click to change avatar" : ""}
            >
              {editAvatarPreview || currentUser?.avatar_url ? (
                <img
                  key={(editAvatarPreview ? 'preview' : currentUser.avatar_url || '')}
                  src={editAvatarPreview || currentUser.avatar_url}
                  onLoad={() => {
                    // Force a re-render and bypass stale cache entries after admin updates.
                    // (keeps native image quality).
                    if (!editAvatarPreview && currentUser?.avatar_url) {
                      // no-op: key already changes when avatar_url changes.
                    }
                  }}
                  alt={profile.fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                profile.avatarText
              )}
              {isEditingProfile && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, textAlign: 'center', padding: '4px 0' }}>
                  <i className="fas fa-camera" /> Edit
                </div>
              )}
            </div>

            <input
              id="profile-avatar-input"
              name="profile-avatar-input"
              type="file"
              accept="image/*"
              ref={avatarInputRef}
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />

            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Playfair Display', serif" }}>
                {profile.fullName}
              </div>
              <div style={{ fontSize: 13, color: theme.text3, margin: '4px 0 6px 0' }}>
                {profile.subtitle}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {profile.roleTags.map((t) => (
                  <Badge key={t.label} kind={t.kind}>
                    {t.label}
                  </Badge>
                ))}
              </div>
            </div>

          </div>
        </div>

        <div className="two-col">
          {/* Personal Details */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">Personal Details</span>
              {!isEditingProfile && (
                <button className="btn btn-outline btn-sm" onClick={openEditProfile}>
                  <i className="fas fa-edit" /> Edit
                </button>
              )}
            </div>
            <div className="card-body">
              <table style={{ width: '100%', fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ color: theme.text3, padding: '7px 0', width: '40%' }}>
                      {isEditingProfile ? (
                        <label htmlFor="profile-edit-name">Full Name</label>
                      ) : (
                        'Full Name'
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {isEditingProfile ? (
                        <input id="profile-edit-name" name="profile-edit-name" className="form-control" value={editProfileForm.name} onChange={e => setEditProfileForm({ ...editProfileForm, name: e.target.value })} />
                      ) : profile.fullName}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: theme.text3, padding: '7px 0' }}>
                      {isEditingProfile ? (
                        <label htmlFor="profile-edit-email">Email</label>
                      ) : (
                        'Email'
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {isEditingProfile ? (
                        <input id="profile-edit-email" name="profile-edit-email" className="form-control" type="email" value={editProfileForm.email} onChange={e => setEditProfileForm({ ...editProfileForm, email: e.target.value })} />
                      ) : profile.email}
                    </td>
                  </tr>
                  {isEditingProfile && (
                    <tr>
                      <td style={{ color: theme.text3, padding: '7px 0' }}>
                        <label htmlFor="profile-edit-username">Username</label>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <input id="profile-edit-username" name="profile-edit-username" className="form-control" type="text" value={editProfileForm.username} onChange={e => setEditProfileForm({ ...editProfileForm, username: e.target.value })} />
                      </td>
                    </tr>
                  )}
                  {isEditingProfile && (
                    <tr>
                      <td style={{ color: theme.text3, padding: '7px 0' }}>
                        <label htmlFor="profile-edit-password">New Password</label>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <input id="profile-edit-password" name="profile-edit-password" className="form-control" type="password" placeholder="Leave blank to keep current" value={editProfileForm.password} onChange={e => setEditProfileForm({ ...editProfileForm, password: e.target.value })} autoComplete="new-password" />
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ color: theme.text3, padding: '7px 0' }}>Phone</td>
                    <td style={{ fontWeight: 600 }}>{profile.phone}</td>
                  </tr>
                  <tr>
                    <td style={{ color: theme.text3, padding: '7px 0' }}>Role</td>
                    <td style={{ fontWeight: 600 }}>{profile.role}</td>
                  </tr>
                  <tr>
                    <td style={{ color: theme.text3, padding: '7px 0' }}>Department</td>
                    <td style={{ fontWeight: 600 }}>{profile.department}</td>
                  </tr>
                  <tr>
                    <td style={{ color: theme.text3, padding: '7px 0' }}>Year</td>
                    <td style={{ fontWeight: 600 }}>{profile.year}</td>
                  </tr>
                </tbody>
              </table>
              {isEditingProfile && (
                <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={closeEditProfile} disabled={savingProfile}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? 'Saving...' : 'Save Details'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Activity Summary */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Activity Summary</span>
              <button
                onClick={openFullTimelineModal}
                className="btn btn-outline"
                style={{ fontSize: 12, padding: '5px 12px', whiteSpace: 'nowrap' }}
              >
                View Full History
              </button>
            </div>
            <div className="card-body">
              <Timeline items={profile.timeline} />
            </div>
          </div>
        </div>


        {/* Daily Activity Update */}
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-header">
            <span className="card-title">Daily Activity Update</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label htmlFor="daily-activity-date" style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>Date</label>
                <input
                  id="daily-activity-date"
                  name="daily-activity-date"
                  type="date"
                  className="form-control"
                  style={{ width: 180 }}
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={handleUpsertDailyActivity} disabled={savingActivity} style={{ fontWeight: 400 }}>
                <i className="fas fa-save" /> {savingActivity ? 'Saving...' : 'Update Daily Activity'}
              </button>
            </div>
          </div>

          <div className="card-body">
            <div className="daily-activity-grid">
              <div className="daily-activity-row">
                <div style={{ flex: '1 1 280px' }}>
                  <label htmlFor="daily-activity-text" className="daily-activity-label">Activity</label>
                  <textarea
                    id="daily-activity-text"
                    name="daily-activity-text"
                    className="form-control daily-activity-textarea"
                    placeholder="Write what you did today (e.g., reviewed MC applications, updated complaints, followed up discussions...)"
                    value={activityText}
                    onChange={(e) => handleActivityFieldChange('text', e.target.value)}
                  />
                </div>
              </div>

              <div className="daily-activity-meta">
                <div style={{ minWidth: 240, flex: '1 1 240px' }}>
                  <label htmlFor="daily-activity-category" className="daily-activity-label">Category (optional)</label>
                  <input
                    id="daily-activity-category"
                    name="daily-activity-category"
                    className="form-control"
                    placeholder="e.g., MC / Complaints / C Files"
                    value={activityCategory}
                    onChange={(e) => handleActivityFieldChange('category', e.target.value)}
                  />
                </div>
                <div style={{ minWidth: 200, flex: '1 1 200px' }}>
                  <label htmlFor="daily-activity-status" className="daily-activity-label">Status (optional)</label>
                  <input
                    id="daily-activity-status"
                    name="daily-activity-status"
                    className="form-control"
                    placeholder="e.g., Completed / In Progress"
                    value={activityStatus}
                    onChange={(e) => handleActivityFieldChange('status', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* All Activities (Daily view) */}
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-header">
            <span className="card-title">All Activities (Daily View)</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label htmlFor="activities-date-filter" style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>Filter</label>
                <input
                  id="activities-date-filter"
                  name="activities-date-filter"
                  type="date"
                  className="form-control"
                  style={{ width: 180 }}
                  value={activitiesDateFilter}
                  onChange={(e) => setActivitiesDateFilter(e.target.value)}
                  disabled={showAllDays}
                />
              </div>
              <button
                className={`btn ${showAllDays ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowAllDays((v) => !v)}
              >
                <i className="fas fa-list" /> {showAllDays ? 'Showing: All Days' : 'Show All Days'}
              </button>
              <button
                className="btn btn-outline"
                onClick={openAllActivitiesModal}
              >
                <i className="fas fa-eye" /> View All Activities
              </button>
            </div>
          </div>

          <div className="card-body">
            {activitiesLoading ? (
              <div style={{ color: 'var(--text3)', padding: '10px 0' }}>Loading activities...</div>
            ) : groupedByDate.length === 0 ? (
              <div style={{ color: 'var(--text3)', padding: '10px 0' }}>No activities found.</div>
            ) : (
              <div className="daily-activity-list">
                {groupedByDate.map((g) => (
                  <div key={g.date}>
                    <div className="daily-activity-day">{g.date}</div>
                    {g.items.map((it) => (
                      <div className="daily-activity-item" key={it.id}>
                        <div className="daily-activity-item-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                            onClick={() => openActivityDetails(it)}
                          >
                            <div style={{ fontWeight: 400, color: 'var(--navy)' }}>Daily Activity</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {/* ID hidden as per UI preference */}
                              {it.activity_category ? (
                                <span className="daily-activity-pill amber">{it.activity_category}</span>
                              ) : (
                                <span className="daily-activity-pill gray">No Category</span>
                              )}
                              {it.status ? (
                                <span className="daily-activity-pill green">{it.status}</span>
                              ) : (
                                <span className="daily-activity-pill gray">No Status</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteActivity(it.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--red)',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: '600'
                            }}
                            title="Delete this activity"
                          >
                            <i className="fas fa-trash-alt" /> Erase
                          </button>
                        </div>
                        <div className="daily-activity-text">{it.activity_text}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Toast */}
      {allActivitiesModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9997,
            background: 'rgba(0,0,0,0.34)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
          }}
          onClick={closeAllActivitiesModal}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 760,
              background: '#fff',
              borderRadius: 18,
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              overflow: 'hidden',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '18px 20px',
                borderBottom: '1px solid #e5e7eb',
                background: '#f9fafb',
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>
                  All Activities
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  Browse and load any activity into the daily entry form.
                </div>
              </div>
              <button
                onClick={closeAllActivitiesModal}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 20,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: 18, flex: 1 }}>
              {allActivitiesLoading ? (
                <div style={{ color: '#6b7280', padding: '12px 0' }}>Loading all activities...</div>
              ) : allGroupedByDate.length === 0 ? (
                <div style={{ color: '#6b7280', padding: '12px 0' }}>No activities found yet.</div>
              ) : (
                allGroupedByDate.map((group) => (
                  <div key={group.date} style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1f2937', marginBottom: 10 }}>
                      {group.date}
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {group.items.map((item) => (
                        <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, background: '#f8fafc' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{item.activity_text?.slice(0, 80) || 'No description'}</div>
                              <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                                Category: {item.activity_category || '—'} · Status: {item.status || '—'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => handleLoadActivityIntoForm(item)}
                                className="btn btn-primary"
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                Load Date
                              </button>
                              <button
                                onClick={() => openActivityDetails(item)}
                                className="btn btn-outline"
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {fullTimelineModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0,0,0,0.38)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
          }}
          onClick={closeFullTimelineModal}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 640,
              background: '#fff',
              borderRadius: 18,
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              overflow: 'hidden',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '18px 20px',
                borderBottom: '1px solid #e5e7eb',
                background: '#f9fafb',
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>
                  Full Activity History
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  Complete log of all actions recorded on this account.
                </div>
              </div>
              <button
                onClick={closeFullTimelineModal}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 20,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '14px 20px',
                borderBottom: '1px solid #e5e7eb',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Filter by date</span>
                <input
                  type="date"
                  value={fullTimelineDateFilter}
                  onChange={(e) => setFullTimelineDateFilter(e.target.value)}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 12,
                    color: '#1a1a2e',
                  }}
                />
                {fullTimelineDateFilter && (
                  <button
                    onClick={() => setFullTimelineDateFilter('')}
                    className="btn btn-outline"
                    style={{ fontSize: 12, padding: '5px 10px' }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <button
                onClick={handleDownloadTimelinePdf}
                className="btn btn-primary"
                style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}
              >
                Download / Print PDF
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: 18, flex: 1 }}>
              {fullTimelineLoading ? (
                <div style={{ color: '#6b7280', padding: '12px 0' }}>Loading full activity history...</div>
              ) : filteredFullTimelineItems.length === 0 ? (
                <div style={{ color: '#6b7280', padding: '12px 0' }}>
                  {fullTimelineDateFilter
                    ? 'No activity records found for the selected date.'
                    : 'No activity history found yet.'}
                </div>
              ) : (
                <div className="timeline">
                  {filteredFullTimelineItems.map((it, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-date">
                        {it.time}
                        {it.absoluteTime ? (
                          <span style={{ color: '#94a0b4', fontWeight: 500 }}> · {it.absoluteTime}</span>
                        ) : null}
                      </div>
                      <div className="timeline-text">{it.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {activityModalOpen && selectedActivity && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0,0,0,0.38)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
          }}
          onClick={closeActivityModal}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 640,
              background: '#fff',
              borderRadius: 18,
              boxShadow: '0 20px 60px rgba(0,0,0,0.16)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '18px 20px',
                borderBottom: '1px solid #e5e7eb',
                background: '#f9fafb',
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>
                  Daily Activity Detail
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  {selectedActivity.activity_date}
                </div>
              </div>
              <button
                onClick={closeActivityModal}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 20,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 20, display: 'grid', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>Activity</div>
                <div style={{ whiteSpace: 'pre-wrap', color: '#111827', lineHeight: 1.7 }}>{selectedActivity.activity_text || '—'}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>Category</div>
                  <div style={{ color: '#111827' }}>{selectedActivity.activity_category || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>Status</div>
                  <div style={{ color: '#111827' }}>{selectedActivity.status || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 22,
            right: 22,
            zIndex: 9999,
            background: '#fff',
            border: `1px solid ${theme.border}`,
            borderLeft: `4px solid ${toast.type === 'success' ? theme.green : toast.type === 'info' ? theme.blue : theme.red
              }`,
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 8px 30px rgba(0,0,0,.12)',
            minWidth: 240,
          }}
        >
          <i
            className={`fas fa-${toast.type === 'success' ? 'check-circle' : toast.type === 'info' ? 'info-circle' : 'times-circle'}`}
            style={{
              color:
                toast.type === 'success'
                  ? theme.green
                  : toast.type === 'info'
                    ? theme.blue
                    : theme.red,
              fontSize: 15,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}