export const internalPermissionIds = [
  "applications.read",
  "applications.write",
  "applications.delete",
  "ebusy.lookup",
  "ebusy.match",
  "ebusy.takeover",
  "testlab.read",
  "testlab.write",
  "users.manage",
  "content.manage",
  "audit.read",
  "docs.read",
  "system.read"
] as const;

export type InternalPermission = (typeof internalPermissionIds)[number];

export const internalRoleDefinitions = {
  admin: {
    label: "Admin",
    description: "Alle Rechte inklusive Benutzerverwaltung.",
    permissions: internalPermissionIds
  },
  verwaltung: {
    label: "Verwaltung",
    description: "Anträge bearbeiten und nach eBuSy übertragen.",
    permissions: [
      "applications.read",
      "applications.write",
      "applications.delete",
      "ebusy.lookup",
      "ebusy.match",
      "ebusy.takeover",
      "docs.read"
    ]
  }
} as const satisfies Record<
  string,
  {
    label: string;
    description: string;
    permissions: readonly InternalPermission[];
  }
>;

export type InternalRole = keyof typeof internalRoleDefinitions;

export const internalRoleIds = Object.keys(internalRoleDefinitions) as InternalRole[];

export function isInternalRole(value: string | null | undefined): value is InternalRole {
  return Boolean(value && value in internalRoleDefinitions);
}

export function getInternalRoleLabel(role: InternalRole) {
  return internalRoleDefinitions[role].label;
}

export function getInternalRoleDescription(role: InternalRole) {
  return internalRoleDefinitions[role].description;
}

export function getInternalRolePermissions(role: InternalRole) {
  return internalRoleDefinitions[role].permissions as readonly InternalPermission[];
}

export function hasInternalPermission(role: InternalRole, permission: InternalPermission) {
  return getInternalRolePermissions(role).includes(permission);
}
