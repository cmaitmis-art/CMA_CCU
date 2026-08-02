/**
 * Roles that have read-only (view-only) access to the entire system.
 * Users with these roles can see everything but cannot create, edit or delete any records.
 */
export const VIEW_ONLY_ROLES = ['Chairman', 'DGM'];

/**
 * Returns true when the given role is a view-only role.
 */
export function isViewOnlyRole(role) {
  const r = String(role || '').trim();
  return VIEW_ONLY_ROLES.includes(r);
}

export function getRoleLabel(role) {
  const r = String(role || '').trim();

  switch (r) {
    case 'Admin':
      return 'System Administrator';
    case 'MA':
      return 'Management Assistant';
    case 'AGM':
      return 'AGM';
    case 'Chairman':
      return 'Chairman';
    case 'DGM':
      return 'Deputy General Manager';
    default:
      return r || 'Unknown';
  }
}

export function getRoleTagKind(role) {
  const r = String(role || '').trim();
  if (r === 'Admin') return 'navy';
  if (r === 'Chairman' || r === 'DGM') return 'purple';
  return 'blue';
}
