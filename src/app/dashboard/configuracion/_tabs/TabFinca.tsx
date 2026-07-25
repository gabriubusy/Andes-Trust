"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, MapPin, Building2, Hash, Globe, Save, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import { useSupabase } from "@/hooks/use-supabase";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { type FarmDetail } from "./shared";
import { friendlyErrorMessage } from "@/lib/errors/friendly";

const inputBase =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-xl border py-2.5 text-sm focus:ring-2 focus:outline-none transition-colors placeholder:text-foreground/30";

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-foreground/30 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
      {children}
    </span>
  );
}

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
    if (detailQuery.error)
      toast.error(friendlyErrorMessage(detailQuery.error, { fallback: "Error al cargar." }));
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
      toast.success("Datos de la finca actualizados");
    },
    onError: (err) => toast.error(friendlyErrorMessage(err)),
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [key]: value || null }));

  if (detailQuery.isLoading) {
    return (
      <div className="bg-card border-border space-y-4 rounded-2xl border p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const locationParts = [form.region, form.country].filter(Boolean).join(", ");

  return (
    <div className="space-y-4">
      {/* ── Main form card ── */}
      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        {/* Card header */}
        <div className="border-border flex items-center gap-3 border-b px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-foreground text-sm font-bold">Información de la finca</h3>
            <p className="text-foreground/40 mt-0.5 text-xs">
              Aparece en certificados, fichas públicas y reportes regulatorios.
            </p>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Section: Identidad */}
          <div>
            <p className="text-foreground/40 mb-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase">
              <Building2 className="h-3 w-3" /> Identidad
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-foreground/60 mb-1.5 block text-xs font-medium">
                  Nombre de la finca <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <div className="relative">
                  <FieldIcon>
                    <Building2 className="h-4 w-4" />
                  </FieldIcon>
                  <input
                    className={`${inputBase} pl-9`}
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ej. Finca El Progreso"
                  />
                </div>
              </div>
              <div>
                <label className="text-foreground/60 mb-1.5 block text-xs font-medium">
                  RIF / NIT / Cédula jurídica
                  <span className="text-foreground/30 ml-1.5 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <FieldIcon>
                    <Hash className="h-4 w-4" />
                  </FieldIcon>
                  <input
                    className={`${inputBase} pl-9`}
                    value={form.legal_id ?? ""}
                    onChange={(e) => set("legal_id", e.target.value)}
                    placeholder="Identificación fiscal"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-border border-t" />

          {/* Section: Ubicación */}
          <div>
            <p className="text-foreground/40 mb-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase">
              <MapPin className="h-3 w-3" /> Ubicación
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-foreground/60 mb-1.5 block text-xs font-medium">
                    País
                  </label>
                  <div className="relative">
                    <FieldIcon>
                      <Globe className="h-4 w-4" />
                    </FieldIcon>
                    <input
                      className={`${inputBase} pl-9`}
                      value={form.country ?? ""}
                      onChange={(e) => set("country", e.target.value)}
                      placeholder="Ej. Venezuela"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-foreground/60 mb-1.5 block text-xs font-medium">
                    Estado / Departamento
                  </label>
                  <input
                    className={`${inputBase} px-3`}
                    value={form.region ?? ""}
                    onChange={(e) => set("region", e.target.value)}
                    placeholder="Ej. Barinas"
                  />
                </div>
              </div>
              <div>
                <label className="text-foreground/60 mb-1.5 block text-xs font-medium">
                  Dirección
                </label>
                <div className="relative">
                  <FieldIcon>
                    <MapPin className="h-4 w-4" />
                  </FieldIcon>
                  <input
                    className={`${inputBase} pl-9`}
                    value={form.address ?? ""}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="Vereda, municipio, km…"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-border bg-muted/20 flex items-center justify-between gap-3 border-t px-6 py-4">
          <p className="text-foreground/30 flex items-center gap-1 text-xs">
            <span className="text-red-600 dark:text-red-400">*</span> Campo requerido
          </p>
          <button
            type="button"
            disabled={!form.name.trim() || updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
              saved
                ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
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
            {saved ? "Guardado" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* ── Preview card ── */}
      {form.name && (
        <div className="bg-card border-border overflow-hidden rounded-2xl border">
          <div className="border-border flex items-center gap-2 border-b px-6 py-3">
            <Eye className="text-foreground/30 h-3.5 w-3.5" />
            <span className="text-foreground/40 text-xs font-medium">
              Vista previa — así aparece en certificados y reportes
            </span>
          </div>
          <div className="flex items-start gap-4 px-6 py-4">
            <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <Building2 className="text-primary h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-foreground text-sm leading-tight font-bold">{form.name}</p>
              {form.legal_id && (
                <p className="text-foreground/50 mt-0.5 text-xs">RIF / NIT: {form.legal_id}</p>
              )}
              {locationParts && (
                <p className="text-foreground/40 mt-0.5 flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3" /> {locationParts}
                </p>
              )}
              {form.address && <p className="text-foreground/30 mt-0.5 text-xs">{form.address}</p>}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <FileText className="text-foreground/20 h-3.5 w-3.5" />
              <span className="text-foreground/20 text-[11px]">Certificados · INSAI · Fichas</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
