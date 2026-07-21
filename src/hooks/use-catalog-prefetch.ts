"use client";

// =====================================================================
// Precarga de catálogos para que existan sin conexión.
//
// Los catálogos (vacunas, tratamientos, razas) sólo se pedían al montar su
// formulario, es decir al abrir el modal. Quien nunca abrió el modal con
// señal se encontraba los `<select>` vacíos en el campo y no podía registrar
// nada: el síntoma de "si no se abrió antes, no se cargó la data".
//
// Pidiéndolos desde el shell del panel, el service worker los guarda en su
// caché (NetworkFirst, ventana de 7 días) y el formulario los encuentra ahí
// aunque sea la primera vez que lo abre. Por eso las claves y los `select`
// deben coincidir EXACTAMENTE con los de los formularios: si la URL difiere,
// el service worker guarda una entrada distinta y la precarga no sirve.
//   - vaccines-catalog   → VaccinationForm
//   - treatments-catalog → TreatmentForm
//   - breeds             → AnimalForm
// =====================================================================

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Los catálogos cambian muy poco: no hace falta revalidar en cada montaje. */
const CATALOG_STALE_TIME = 30 * 60 * 1000;

type Catalog = {
  key: string;
  table: "vaccines_catalog" | "treatments_catalog" | "breeds";
  columns: string;
};

const CATALOGS: Catalog[] = [
  {
    key: "vaccines-catalog",
    table: "vaccines_catalog",
    columns: "id, name, booster_days, min_age_days",
  },
  {
    key: "treatments-catalog",
    table: "treatments_catalog",
    columns: "id, name, kind, dose_per_kg, withdrawal_meat_days, withdrawal_milk_days",
  },
  { key: "breeds", table: "breeds", columns: "id, name" },
];

/**
 * Deja los catálogos en caché mientras hay señal. No devuelve nada ni bloquea:
 * si falla, el formulario los pedirá por su cuenta como hasta ahora.
 */
export function useCatalogPrefetch(supabase: SupabaseClient | null, online: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Sin red la petición no llegaría a la caché del service worker, sólo
    // gastaría reintentos: la precarga únicamente tiene sentido online.
    if (!supabase || !online) return;

    for (const { key, table, columns } of CATALOGS) {
      void queryClient.prefetchQuery({
        queryKey: [key],
        staleTime: CATALOG_STALE_TIME,
        queryFn: async () => {
          const { data, error } = await supabase.from(table).select(columns).order("name");
          if (error) throw error;
          return data ?? [];
        },
      });
    }
  }, [supabase, online, queryClient]);
}
