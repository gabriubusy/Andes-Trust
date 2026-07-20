// =====================================================================
// Persistencia de la sesión Supabase para uso offline.
//
// El JWT lo firma /api/supabase-token y dura 1h. Sin persistirlo, cada
// recarga necesita alcanzar auth.privy.io + nuestra API, así que en el
// campo (sin cobertura) la app quedaba en "Verificando sesión..." para
// siempre y la cola offline nunca drenaba.
//
// Nota de seguridad: el token ya es accesible desde JS (viaja en el
// header Authorization y vive en estado de React), así que guardarlo en
// localStorage no amplía la superficie frente a XSS. Lo que sí añade es
// persistencia en disco: por eso se borra en logout y al cambiar de
// usuario, y sólo se guarda el JWT de 1h, nunca credenciales de Privy.
// =====================================================================

export type PersistedSession = {
  token: string;
  expiresAt: number;
  profileId: string;
};

const STORAGE_KEY = "andes_trust_session";

/** Margen para no usar un token que expira mientras vuela la petición. */
const EXPIRY_SKEW_MS = 30_000;

export function readSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (
      typeof parsed?.token !== "string" ||
      typeof parsed?.expiresAt !== "number" ||
      typeof parsed?.profileId !== "string"
    ) {
      return null;
    }
    return parsed as PersistedSession;
  } catch {
    return null;
  }
}

export function writeSession(s: PersistedSession) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Cuota llena o modo privado: la app sigue funcionando online,
    // sólo pierde la capacidad de arrancar offline.
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorar
  }
}

/** ¿El token sirve para hablar con Supabase ahora mismo? */
export function isTokenUsable(s: PersistedSession | null): s is PersistedSession {
  return !!s && s.expiresAt - EXPIRY_SKEW_MS > Date.now();
}
