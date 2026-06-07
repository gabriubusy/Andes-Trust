"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, MapPin, Building2, Hash, Globe, Save } from "lucide-react";
import { toast } from "sonner";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { inputClass, labelClass, type FarmDetail } from "./shared";

export function TabFinca() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Omit<FarmDetail, "id">>({
    name: "",
    legal_id: null,
    country: null,
    region: null,
    address: null,
  });
  const [saved, setSaved] = useState(false);

  const detailQuery = useQuery<FarmDetail | null>({
    queryKey: ["farm-detail", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return null;
      const { data, error } = await supabase
        .from("farms")
        .select("id, name, legal_id, country, region, address")
        .eq("id", farmId)
        .maybeSingle();
      if (error) throw error;
      return data as FarmDetail | null;
    },
  });

  useEffect(() => {
    if (detailQuery.data)
      setForm({
        name: detailQuery.data.name,
        legal_id: detailQuery.data.legal_id,
        country: detailQuery.data.country,
        region: detailQuery.data.region,
        address: detailQuery.data.address,
      });
  }, [detailQuery.data]);

  useEffect(() => {
    if (detailQuery.error) toast.error("Error al cargar: " + (detailQuery.error as Error).message);
  }, [detailQuery.error]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!supabase || !farmId) throw new Error("Sin sesión");
      const { error } = await supabase
        .from("farms")
        .update({
          name: form.name.trim(),
          legal_id: form.legal_id || null,
          country: form.country || null,
          region: form.region || null,
          address: form.address || null,
        })
        .eq("id", farmId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-detail", farmId] });
      queryClient.invalidateQueries({ queryKey: ["current-farm"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success("Guardado correctamente");
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [key]: value || null }));

  if (detailQuery.isLoading) {
    return (
      <div className="bg-card border-border max-w-2xl rounded-2xl border p-6">
        <div className="flex items-center gap-3 py-8 justify-center">
          <Loader2 className="text-primary h-5 w-5 animate-spin" />
          <span className="text-foreground/50 text-sm">Cargando datos de la finca…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header card */}
      <div className="bg-card border-border rounded-2xl border p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-foreground text-base font-bold">Información de la finca</h3>
            <p className="text-foreground/50 text-xs mt-0.5">
              Aparece en certificados, fichas públicas y reportes regulatorios.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3" /> Nombre de la finca *
              </span>
            </label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ej. Finca El Progreso"
            />
          </div>

          {/* Legal ID */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <Hash className="h-3 w-3" /> NIT / Cédula jurídica
              </span>
            </label>
            <input
              className={inputClass}
              value={form.legal_id ?? ""}
              onChange={(e) => set("legal_id", e.target.value)}
              placeholder="Identificación fiscal (opcional)"
            />
          </div>

          {/* Country + Region */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <Globe className="h-3 w-3" /> País
                </span>
              </label>
              <input
                className={inputClass}
                value={form.country ?? ""}
                onChange={(e) => set("country", e.target.value)}
                placeholder="Ej. Colombia"
              />
            </div>
            <div>
              <label className={labelClass}>Región / Departamento</label>
              <input
                className={inputClass}
                value={form.region ?? ""}
                onChange={(e) => set("region", e.target.value)}
                placeholder="Ej. Antioquia"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Dirección
              </span>
            </label>
            <input
              className={inputClass}
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Vereda, municipio, km…"
            />
          </div>
        </div>

        {/* Save */}
        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
          <p className="text-foreground/40 text-xs">* Campo requerido</p>
          <button
            type="button"
            disabled={!form.name.trim() || updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all disabled:opacity-60 ${
              saved
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Cambios guardados" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
