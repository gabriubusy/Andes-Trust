// =====================================================================
// Traduce errores de Supabase/Postgres a mensajes que un ganadero entienda.
//
// Sin esto la UI mostraba el texto crudo del motor —p. ej.
// `duplicate key value violates unique constraint "animals_farm_id_tag_key"`—
// que no dice al usuario ni qué pasó ni cómo arreglarlo.
//
// Estrategia en tres niveles:
//   1. Nombre de la restricción concreta (mensaje más útil posible).
//   2. Código SQLSTATE genérico (cubre restricciones que no listamos).
//   3. Texto por defecto, nunca el mensaje interno del motor.
// =====================================================================

const NETWORK_HINTS = [
  "failed to fetch",
  "networkerror",
  "load failed",
  "network request failed",
  "err_internet_disconnected",
  "fetch failed",
];

/** Restricciones conocidas → explicación accionable. */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  animals_farm_id_tag_key: "Ya existe un animal con ese arete en la finca. Usa otro identificador.",
  milk_records_farm_id_animal_id_recorded_on_shift_key:
    "Ya registraste la producción de ese animal para esa fecha y turno.",
  farm_invitations_farm_id_email_key: "Ya hay una invitación para ese correo en esta finca.",
  feed_items_farm_id_name_key: "Ya existe un insumo con ese nombre en la finca.",
  blockchain_records_network_tx_hash_key: "Esa transacción ya está registrada.",
  push_subscriptions_profile_id_endpoint_key: "Este dispositivo ya está suscrito a las alertas.",
};

/** SQLSTATE → mensaje genérico. */
const CODE_MESSAGES: Record<string, string> = {
  "23505": "Ya existe un registro con esos datos.",
  "23503": "No se puede completar: el registro está vinculado a otros datos.",
  "23502": "Falta un campo obligatorio.",
  "23514": "Alguno de los valores no cumple las reglas permitidas.",
  "22P02": "Alguno de los valores tiene un formato inválido.",
  "22003": "Un valor numérico está fuera del rango permitido.",
  "42501": "No tienes permisos para realizar esta acción.",
  PGRST116: "No se encontró el registro solicitado.",
  PGRST301: "Tu sesión expiró. Vuelve a iniciar sesión.",
};

/**
 * Códigos que devuelven nuestras rutas de API. Llegan como `new Error(json.error)`,
 * así que sin esta tabla la UI mostraría el slug crudo (`invalid_params`).
 */
const API_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Tu sesión expiró. Vuelve a iniciar sesión.",
  invalid_token: "Tu sesión expiró. Vuelve a iniciar sesión.",
  forbidden: "No tienes permisos para realizar esta acción.",
  not_invited: "Esta plataforma es solo por invitación.",
  invalid_params: "Faltan datos obligatorios o son incorrectos.",
  invalid_role: "Ese rol no está disponible para esta finca.",
  invalid_email: "El correo no tiene un formato válido. Ejemplo: nombre@correo.com",
  no_profile_email: "Tu cuenta no tiene un correo asociado.",
  no_profile: "Tu cuenta no tiene un perfil asociado.",
  profile_upsert_failed: "No se pudo preparar tu perfil. Inténtalo de nuevo.",
  missing_token: "Tu sesión expiró. Vuelve a iniciar sesión.",
  missing_params: "Faltan datos obligatorios.",
  no_records_in_period:
    "No hay registros de producción de leche en el período seleccionado. Elige otro rango o registra producción primero.",
  insert_failed: "No se pudo guardar. Inténtalo de nuevo.",
  no_records: "No hay registros en el período seleccionado.",
};

export type FriendlyErrorOptions = {
  /** Mensaje si no se reconoce el error. */
  fallback?: string;
};

/**
 * Devuelve un mensaje presentable al usuario. El error original se deja en
 * consola para diagnóstico: traducir no debe significar perder la traza.
 */
export function friendlyErrorMessage(err: unknown, options: FriendlyErrorOptions = {}): string {
  const fallback = options.fallback ?? "No se pudo completar la operación. Inténtalo de nuevo.";

  if (!err) return fallback;

  if (typeof console !== "undefined") {
    console.error("[error]", err);
  }

  const raw = (err as { message?: string })?.message ?? "";
  const code = (err as { code?: string })?.code ?? "";
  const details = (err as { details?: string })?.details ?? "";
  const haystack = `${raw} ${details}`.toLowerCase();

  // Red antes que nada: sin conexión no hay error de negocio que valga.
  //
  // Se distingue "no hay señal" de "la señal no llegó": si el registro pudiera
  // encolarse nunca habríamos llegado hasta aquí, así que estar offline
  // significa que ESTE dato necesita internet. Decir "revisa tu conexión" a
  // quien ya sabe que no tiene es lo que dejaba al usuario reintentando en
  // bucle sin entender por qué el formulario no se cerraba.
  if (NETWORK_HINTS.some((h) => haystack.includes(h))) {
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    return offline
      ? "Sin conexión: este registro necesita internet y no puede guardarse en el dispositivo. Se conservará lo que escribiste; vuelve a intentarlo al recuperar señal."
      : "No se pudo contactar al servidor. Revisa tu conexión e inténtalo de nuevo.";
  }

  // 1) Código de nuestra API (slug exacto, no subcadena: son mensajes cortos
  //    y una coincidencia parcial daría falsos positivos).
  const slug = raw.trim();
  if (API_ERROR_MESSAGES[slug]) return API_ERROR_MESSAGES[slug];

  // 2) Restricción concreta.
  for (const [constraint, message] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (haystack.includes(constraint.toLowerCase())) return message;
  }

  // 3) Código SQLSTATE.
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  // 4) Mensajes propios de la app (los lanzamos nosotros, ya son legibles).
  //    Se distinguen de los del motor en que no traen código SQL ni la
  //    jerga típica de Postgres.
  const looksInternal =
    /violates|constraint|relation|column .* does not exist|syntax error|permission denied for/i.test(
      raw
    );
  if (raw && !looksInternal && !code) return raw;

  return fallback;
}

/** True si el error es un choque de unicidad (para marcar el campo culpable). */
export function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  const raw = (err as { message?: string })?.message ?? "";
  return code === "23505" || /duplicate key/i.test(raw);
}
