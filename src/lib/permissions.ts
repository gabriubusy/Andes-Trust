// =====================================================================
// Permisos por rol dentro de una finca.
//
// IMPORTANTE: WRITE_ROLES debe coincidir con el array de las políticas RLS
// (`0022_fix_all_for_all_policies.sql`). La base de datos es quien manda:
// esto solo evita mostrar botones que terminarían en un error de permisos.
// Si cambias uno, cambia el otro.
// =====================================================================

export type FarmRole = "owner" | "admin" | "operator" | "vet" | "viewer" | "regulator";

/** Roles que pueden crear/editar/borrar datos de la finca. */
export const WRITE_ROLES: readonly FarmRole[] = ["owner", "admin", "operator", "vet"];

/** Roles que administran la finca (equipo, configuración, ventas). */
export const ADMIN_ROLES: readonly FarmRole[] = ["owner", "admin"];

/** ¿Puede este rol modificar datos? Ante la duda, no. */
export function canWrite(role: string | null | undefined): boolean {
  return !!role && (WRITE_ROLES as readonly string[]).includes(role);
}

/** ¿Puede este rol administrar la finca? */
export function canAdmin(role: string | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}
