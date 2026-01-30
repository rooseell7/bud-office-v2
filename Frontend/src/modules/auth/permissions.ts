export type PermissionCode = string;

function norm(p: unknown): string {
  return String(p ?? '').trim();
}

/**
 * Єдиний стандарт:
 *   const { can, canAny } = buildPermissionHelpers(user.permissions)
 *   can('delivery:write')
 *   canAny(['delivery:write', 'delivery:approve'])
 */
export function buildPermissionHelpers(perms: unknown): {
  can: (code: PermissionCode) => boolean;
  canAny: (codes: PermissionCode[]) => boolean;
  list: PermissionCode[];
} {
  const list = Array.isArray(perms) ? perms.map(norm).filter(Boolean) : [];
  const set = new Set(list);

  function can(code: PermissionCode): boolean {
    const c = norm(code);
    if (!c) return false;
    return set.has(c);
  }

  function canAny(codes: PermissionCode[]): boolean {
    if (!Array.isArray(codes) || codes.length === 0) return false;
    for (const x of codes) {
      if (can(x)) return true;
    }
    return false;
  }

  return { can, canAny, list };
}