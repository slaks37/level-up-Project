export const assignableAdminRoles = ['admin', 'operator', 'auditor'] as const;
export type AssignableAdminRole = typeof assignableAdminRoles[number];
export type AdminRole = 'owner' | AssignableAdminRole;

export const adminRoleLabels: Record<AdminRole, string> = {
  owner: 'Super Admin',
  admin: 'Admin',
  operator: 'Operator',
  auditor: 'Auditor',
};

export const canManageRoles = (role: AdminRole | null) => role === 'owner' || role === 'admin';
export const canOperateUsers = (role: AdminRole | null) => canManageRoles(role) || role === 'operator';
export const canAuditUsage = (role: AdminRole | null) => canManageRoles(role) || role === 'auditor';
