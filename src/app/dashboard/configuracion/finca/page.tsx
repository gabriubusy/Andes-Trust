"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { Skeleton } from "@/components/ui/Skeleton";
import { friendlyErrorMessage } from "@/lib/errors/friendly";

type FarmDetail = {
  id: string;
  name: string;
  legal_id: string | null;
  country: string | null;
  region: string | null;
  address: string | null;
};

const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
const labelClass = "text-foreground mb-1 block text-xs font-medium";

export default function FincaSettingsPage() {
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
    if (detailQuery.data) {
      setForm({
        name: detailQuery.data.name,
        legal_id: detailQuery.data.legal_id,
        country: detailQuery.data.country,
        region: detailQuery.data.region,
        address: detailQuery.data.address,
      });
    }
  }, [detailQuery.data]);

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
    },
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [key]: value || null }));

  return (
    <DashboardShell title="Ajustes de finca" subtitle="Configuración">
      <div className="bg-card border-border max-w-xl rounded-2xl border p-6">
        <h2 className="text-foreground mb-1 text-base font-bold">Datos de la finca</h2>
        <p className="text-foreground/60 mb-6 text-sm">
          Esta información aparece en los certificados y fichas públicas de tus animales.
        </p>

        {detailQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nombre de la finca *</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Finca El Progreso"
              />
            </div>
            <div>
              <label className={labelClass}>NIT / Cédula jurídica</label>
              <input
                className={inputClass}
                value={form.legal_id ?? ""}
                onChange={(e) => set("legal_id", e.target.value)}
                placeholder="Identificación fiscal (opcional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>País</label>
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
            <div>
              <label className={labelClass}>Dirección</label>
              <input
                className={inputClass}
                value={form.address ?? ""}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Vereda, municipio, km…"
              />
            </div>

            {updateMutation.error && (
              <p className="text-accent text-sm">{friendlyErrorMessage(updateMutation.error)}</p>
            )}

            <div className="pt-2">
              <button
                type="button"
                disabled={!form.name.trim() || updateMutation.isPending}
                onClick={() => updateMutation.mutate()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-60"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4" />
                ) : null}
                {saved ? "Guardado" : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
