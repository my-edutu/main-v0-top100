/**
 * Role hierarchy for the application.
 * Centralized role definitions to prevent inconsistencies.
 */
export enum Role {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  EDITOR = 'editor',
  USER = 'user',
  GUEST = 'guest',
}

/**
 * Helper to check if a role has admin privileges
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === Role.SUPERADMIN || role === Role.ADMIN
}

/**
 * Helper to check if a role has editor privileges or higher
 */
export function isEditorRole(role: string | null | undefined): boolean {
  return role === Role.SUPERADMIN || role === Role.ADMIN || role === Role.EDITOR
}

/**
 * Parse a string to a Role enum value, returns null if invalid
 */
export function parseRole(value: string | null | undefined): Role | null {
  if (!value) return null

  const normalized = value.toLowerCase()
  switch (normalized) {
    case 'superadmin':
      return Role.SUPERADMIN
    case 'admin':
      return Role.ADMIN
    case 'editor':
      return Role.EDITOR
    case 'user':
      return Role.USER
    case 'guest':
      return Role.GUEST
    default:
      return null
  }
}
