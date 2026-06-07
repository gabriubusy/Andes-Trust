"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";

const CERT_TYPE_LABELS: Record<string, string> = {
  origin: "Origen",
  health: "Sanidad",
  organic: "Orgánico",
  welfare: "Bienestar",
  export: "Exportación",
  other: "Otro",
};

const CERT_TYPE_COLORS: Record<string, string> = {
  origin: "bg-blue-500/10 text-blue-500",
  health: "bg-green-500/10 text-green-500",
  organic: "bg-emerald-500/10 text-emerald-500",
  welfare: "bg-yellow-500/10 text-yellow-600",
  export: "bg-purple-500/10 text-purple-500",
  other: "bg-muted text-foreground/60",
};

type CertRow = {
  id: string;
  type: string;
  issuer: string | null;
  issued_at: string | null;
  valid_until: string | null;
  animals: { tag: string; name: string | null } | null;
};

export default function CertificadosPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;

  const certsQuery = useQuery<CertRow[]>({
    queryKey: ["certifications", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      const { data, error } = await supabase
        .from("certifications")
        .select("id, type, issuer, issued_at, valid_until, animals(tag, name)")
        .eq("farm_id", farmId)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CertRow[];
    },
  });

  useEffect(() => {
    if (certsQuery.error) toast.error("Error al cargar: " + (certsQuery.error as Error).message);
  }, [certsQuery.error]);

  const certs = certsQuery.data ?? [];
  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })
      : "—";

  const now = Date.now();
  const isExpired = (v: string | null) => (v ? new Date(v).getTime() < now : false);
  const isNearExpiry = (v: string | null) => {
    if (!v) return false;
    const diff = (new Date(v).getTime() - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  return (
    <DashboardShell
      title="Certificados"
      subtitle="Trazabilidad"
      action={
        <Link
          href="/dashboard/certificados/nuevo"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Nuevo
        </Link>
      }
    >
      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-foreground text-base font-bold">Listado</h2>
            <p className="text-foreground/60 text-xs">
              {certsQuery.isLoading
                ? "Cargando…"
                : `${certs.length} certificado${certs.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        {!certsQuery.isLoading && certs.length === 0 && (
          <div className="px-5 py-12 text-center">
            <FileCheck className="text-foreground/30 mx-auto h-8 w-8" />
            <p className="text-foreground/70 mt-3 text-sm">
              Aún no tienes certificados registrados.
            </p>
            <Link
              href="/dashboard/certificados/nuevo"
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Emitir primer certificado
            </Link>
          </div>
        )}

        {certs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-foreground/60 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Tipo</th>
                  <th className="px-5 py-3 text-left font-medium">Animal</th>
                  <th className="px-5 py-3 text-left font-medium">Emisor</th>
                  <th className="px-5 py-3 text-left font-medium">Emitido</th>
                  <th className="px-5 py-3 text-left font-medium">Vence</th>
                  <th className="px-5 py-3 text-left font-medium">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {certs.map((c) => (
                  <tr
                    key={c.id}
                    className="border-border hover:bg-muted/40 border-t transition-colors"
                  >
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CERT_TYPE_COLORS[c.type] ?? CERT_TYPE_COLORS.other}`}
                      >
                        {CERT_TYPE_LABELS[c.type] ?? c.type}
                      </span>
                    </td>
                    <td className="text-foreground/70 px-5 py-3 font-mono text-xs">
                      {c.animals
                        ? `${c.animals.tag}${c.animals.name ? ` · ${c.animals.name}` : ""}`
                        : "Finca (sin animal)"}
                    </td>
                    <td className="text-foreground/70 px-5 py-3">{c.issuer ?? "—"}</td>
                    <td className="text-foreground/70 px-5 py-3 tabular-nums">
                      {fmt(c.issued_at)}
                    </td>
                    <td className="text-foreground/70 px-5 py-3 tabular-nums">
                      {fmt(c.valid_until)}
                    </td>
                    <td className="px-5 py-3">
                      {isExpired(c.valid_until) ? (
                        <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                          Vencido
                        </span>
                      ) : isNearExpiry(c.valid_until) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600">
                          Por vencer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                          <ShieldCheck className="h-3 w-3" /> Vigente
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/dashboard/certificados/${c.id}`}
                        className="text-primary text-xs font-medium hover:underline"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
