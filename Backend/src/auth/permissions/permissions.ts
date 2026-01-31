// FILE: bud_office-backend/src/auth/permissions/permissions.ts
// v2.1 — Source of Truth permissions + role mapping
// Fixes:
// - add missing legacy aggregate permissions: supply:* , sales:* , system:manage
// - export PermissionCode alias
// - export resolvePermissionsFromRoles helper (used by auth.controller / permissions.guard)

export const PERMISSIONS = [
  // ===== System =====
  'system:manage',

  // ===== Auth / Admin =====
  'users:read',
  'users:write',
  'roles:read',
  'roles:write',

  // ===== Warehouses =====
  'warehouse:read',
  'warehouse:write',
  'warehouse:transfer',
  'warehouse:approve',

  // ===== Supply (LEGACY aggregate, kept for decorators compatibility) =====
  'supply:read',
  'supply:write',
  'supply:approve',

  // ===== Sales (LEGACY aggregate, kept for decorators compatibility) =====
  'sales:read',
  'sales:write',
  'sales:approve',

  // ===== Supply (materials / units / suppliers / catalog) =====
  'materials:read',
  'materials:write',
  'materials:approve',

  'units:read',
  'units:write',
  'units:approve',

  'suppliers:read',
  'suppliers:write',
  'suppliers:approve',

  // ===== Projects / Objects =====
  'projects:read',
  'projects:write',
  'projects:approve',

  'objects:read',
  'objects:write',
  'objects:approve',

  // ===== Delivery =====
  'delivery:read',
  'delivery:write',
  'delivery:approve',

  // ===== Documents (foundation) =====
  'documents:read',
  'documents:write',
  'documents:approve',

  // ===== Estimates (КП) =====
  'estimates:delete',

  // ===== Sheet (table / document sheet) =====
  'sheet:read',
  'sheet:write',
  'sheet:approve',
  'sheet:export',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Backward-compatible alias.
 * Деякі файли в проєкті імпортують саме PermissionCode.
 */
export type PermissionCode = Permission;

/**
 * Узгоджені коди ролей, які вже зустрічались у проєкті (мінімально необхідний набір).
 */
export type RoleCode =
  | 'admin'
  | 'supply_head'
  | 'supply_manager'
  | 'estimator'
  | 'sales_head'
  | 'sales_manager_head'
  | 'delivery_head'
  | 'delivery_manager'
  | 'accountant'
  | 'viewer';

export const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  admin: [...PERMISSIONS],

  // ===== Supply =====
  supply_head: [
    'warehouse:read',
    'warehouse:write',
    'warehouse:transfer',
    'warehouse:approve',

    // legacy aggregate
    'supply:read',
    'supply:write',
    'supply:approve',

    'materials:read',
    'materials:write',
    'materials:approve',

    'units:read',
    'units:write',
    'units:approve',

    'suppliers:read',
    'suppliers:write',
    'suppliers:approve',

    'projects:read',
    'projects:write',
    'projects:approve',

    'objects:read',
    'objects:write',
    'objects:approve',

    'documents:read',
    'documents:write',
    'sheet:read',
    'sheet:write',
    'sheet:approve',
    'sheet:export',
  ],

  supply_manager: [
    'warehouse:read',
    'warehouse:write',
    'warehouse:transfer',

    // legacy aggregate
    'supply:read',
    'supply:write',

    'materials:read',
    'materials:write',

    'units:read',

    'suppliers:read',
    'suppliers:write',

    'projects:read',
    'objects:read',

    'documents:read',
    'documents:write',
    'sheet:read',
    'sheet:write',
    'sheet:export',
  ],

  estimator: [
    'warehouse:read',

    // legacy aggregate
    'supply:read',
    'sales:read',

    'materials:read',
    'units:read',
    'suppliers:read',
    'projects:read',
    'objects:read',

    'documents:read',
    'sheet:read',
  ],

  // ===== Sales =====
  sales_head: [
    // legacy aggregate
    'sales:read',
    'sales:write',
    'sales:approve',

    'warehouse:read',
    'materials:read',
    'units:read',
    'suppliers:read',
    'projects:read',
    'objects:read',

    // approve for reference / directories
    'warehouse:approve',
    'materials:approve',
    'suppliers:approve',

    'documents:read',
    'sheet:read',
    'sheet:approve',
    'sheet:export',
  ],

  sales_manager_head: [
    // legacy aggregate
    'sales:read',
    'sales:write',

    'warehouse:read',
    'materials:read',
    'units:read',
    'suppliers:read',
    'projects:read',
    'objects:read',

    'documents:read',
    'sheet:read',
  ],

  // ===== Delivery =====
  delivery_head: [
    'delivery:read',
    'delivery:write',
    'delivery:approve',

    'warehouse:read',
    'materials:read',
    'units:read',
    'projects:read',
    'objects:read',

    'documents:read',
    'sheet:approve',
    'sheet:read',
  ],

  delivery_manager: [
    'delivery:read',
    'delivery:write',

    'warehouse:read',
    'materials:read',
    'units:read',
    'projects:read',
    'objects:read',

    'documents:read',
  ],

  // ===== Finance / Viewer =====
  accountant: [
    'warehouse:read',

    // legacy aggregate
    'supply:read',
    'sales:read',

    'materials:read',
    'suppliers:read',
    'projects:read',
    'objects:read',
    'delivery:read',

    'documents:read',
    'documents:write',
    'documents:approve',
    'sheet:read',
    'sheet:write',
    'sheet:approve',
    'sheet:export',
  ],

  viewer: [
    'warehouse:read',

    // legacy aggregate
    'supply:read',
    'sales:read',

    'materials:read',
    'units:read',
    'suppliers:read',
    'projects:read',
    'objects:read',
    'delivery:read',

    'documents:read',
    'sheet:read',
  ],
};

// -------------------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------------------

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function isRoleCode(x: string): x is RoleCode {
  return (Object.keys(ROLE_PERMISSIONS) as RoleCode[]).includes(x as RoleCode);
}

/**
 * Узгоджує permissions зі списку ролей.
 * Підтримує:
 * - string[] (наприклад ['admin','supply_head'])
 * - { code: string }[] (TypeORM roles entity)
 */
export function resolvePermissionsFromRoles(
  roles: Array<string | { code?: string | null } | null | undefined>,
): Permission[] {
  const roleCodes = uniq(
    (roles ?? [])
      .map((r) => (typeof r === 'string' ? r : (r?.code ?? '')))
      .map((s) => String(s ?? '').trim())
      .filter(Boolean),
  );

  const perms: Permission[] = [];

  for (const code of roleCodes) {
    if (code === 'admin') {
      return [...PERMISSIONS];
    }
    if (isRoleCode(code)) {
      perms.push(...ROLE_PERMISSIONS[code]);
    }
  }

  return uniq(perms);
}