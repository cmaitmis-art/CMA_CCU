/**
 * Checks if a user has a specific action permission for a given module.
 * If user is Admin, they have all permissions.
 * @param {Object} currentUser - The user object from session storage
 * @param {string} module - The module ID (e.g. 'mc', 'complains')
 * @param {string} action - The action to check ('view', 'create', 'edit', 'delete', 'approve')
 */
export function hasPermission(currentUser, module, action = 'view') {
  if (!currentUser) return false;
  // NOTE: Admin does NOT get automatic full access — they must be granted permissions
  // explicitly via the Edit Role screen, just like any other role.

  const permissions = currentUser.permissions || {};
  // If it's still an array (old data), check for 'view', 'view_record', or 'history' access
  if (Array.isArray(permissions)) {
    return (action === 'view' || action === 'view_record' || action === 'history') ? permissions.includes(module) : false;
  }

  // It's an object mapped by module
  const modulePerms = permissions[module] || [];
  
  // Implicitly grant view_record (but NOT history) if they have 'view' and are a high-level view-only role
  if (action === 'view_record' && modulePerms.includes('view')) {
    const role = String(currentUser.role || '').trim().toLowerCase();
    if (['chairman', 'dgm', 'gm'].includes(role)) {
      return true;
    }
  }

  return modulePerms.includes(action);
}

/**
 * Returns true if the user ONLY has the 'view' permission for this module,
 * meaning they cannot create, edit, delete, or approve.
 */
export function isViewOnly(currentUser, module) {
  if (String(currentUser?.role || '').trim().toLowerCase() === 'admin') return false;

  const permissions = currentUser?.permissions || {};
  if (Array.isArray(permissions)) return true; // old data defaults to view only

  const modulePerms = permissions[module] || [];
  return modulePerms.includes('view') && modulePerms.length === 1;
}

/**
 * Backward compatibility: returns true if they have strictly NO edit permissions across all modules
 */
export function isViewOnlyRole(role) {
  const r = String(role || '').trim().toLowerCase();
  return ['chairman', 'dgm', 'gm'].includes(r);
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
    case 'Legal':
      return 'Legal Department';
    case 'Technical':
      return 'Technical Department';
    default:
      return r || 'Unknown';
  }
}

export function getRoleTagKind(role) {
  const r = String(role || '').trim();
  if (r === 'Admin') return 'navy';
  if (r === 'Chairman' || r === 'DGM') return 'purple';
  if (r === 'Legal') return 'green';
  if (r === 'Technical') return 'orange';
  return 'blue';
}
