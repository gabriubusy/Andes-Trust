"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Search,
  SlidersHorizontal,
  Award,
  X,
} from "lucide-react";
import { toast } from "sonner";
import DashboardShell from "@/components/dashboard/DashboardShell";
import Pagination, { usePagination } from "@/components/Pagination";
import CertificateForm from "@/components/CertificateForm";
import SignAnchorButton from "@/components/SignAnchorButton";
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

const CERT_TYPE_STYLES: Record<string, string> = {
  origin: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  health: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  organic: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  welfare: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  export: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  other: "bg-muted text-foreground/50 border-border",
};

const CERT_ICON: Record<string, string> = {
  origin: "🌍",
  health: "🏥",
  organic: "🌿",
  welfare: "🐄",
  export: "📦",
  other: "📄",
};

type CertRow = {
  id: string;
  type: string;
  issuer: string | null;
  issued_at: string | null;
  valid_until: string | null;
  animals: { tag: string; name: string | null } | null;
};

const now = Date.now();
const isExpired = (v: string | null) => (v ? new Date(v).getTime() < now : false);
const isNearExpiry = (v: string | null) => {
  if (!v) return false;
  const diff = (new Date(v).getTime() - now) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
};
const getStatus = (v: string | null) => {
  if (isExpired(v)) return "expired";
  if (isNearExpiry(v)) return "near";
  return "active";
};

const STATUS_BADGE: Record<string, React.ReactNode> = {
  active: (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <ShieldCheck className="h-3 w-3" /> Vigente
    </span>
  ),
  near: (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
      <ShieldAlert className="h-3 w-3" /> Por vencer
    </span>
  ),
  expired: (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
      <ShieldOff className="h-3 w-3" /> Vencido
    </span>
  ),
};

const fmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export default function CertificadosPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);

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

  // Mapa de anclajes en blockchain por certificado (id -> tx_hash)
  const anchorsQuery = useQuery<Record<string, string>>({
    queryKey: ["cert-anchors", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return {};
      const { data, error } = await supabase
        .from("blockchain_records")
        .select("entity_id, tx_hash")
        .eq("entity_type", "certifications")
        .eq("farm_id", farmId);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of data ?? []) {
        if (r.entity_id && r.tx_hash) map[r.entity_id as string] = r.tx_hash as string;
      }
      return map;
    },
  });

  useEffect(() => {
    if (certsQuery.error) toast.error("Error al cargar: " + (certsQuery.error as Error).message);
  }, [certsQuery.error]);

  const certs = certsQuery.data ?? [];

  // Stats
  const stats = useMemo(() => {
    const active = certs.filter((c) => getStatus(c.valid_until) === "active").length;
    const near = certs.filter((c) => getStatus(c.valid_until) === "near").length;
    const expired = certs.filter((c) => getStatus(c.valid_until) === "expired").length;
    return { active, near, expired, total: certs.length };
  }, [certs]);

  // Unique types present
  const typeOptions = useMemo(() => {
    const s = new Set(certs.map((c) => c.type));
    return ["all", ...Array.from(s)];
  }, [certs]);

  // Filtered
  const filtered = useMemo(() => {
    let list = certs;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.issuer ?? "").toLowerCase().includes(q) ||
          (CERT_TYPE_LABELS[c.type] ?? c.type).toLowerCase().includes(q) ||
          (c.animals?.tag ?? "").toLowerCase().includes(q) ||
          (c.animals?.name ?? "").toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") list = list.filter((c) => c.type === typeFilter);
    if (statusFilter !== "all")
      list = list.filter((c) => getStatus(c.valid_until) === statusFilter);
    return list;
  }, [certs, search, typeFilter, statusFilter]);

  const hasFilter = search || typeFilter !== "all" || statusFilter !== "all";

  const { pageItems: pagedCerts, page, setPage, totalPages, total } = usePagination(filtered, 20);

  return (
    <DashboardShell
      title="Certificados"
      subtitle="Trazabilidad"
      action={
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuevo
        </button>
      }
    >
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total",
            value: stats.total,
            color: "text-primary bg-primary/10",
            icon: FileCheck,
          },
          {
            label: "Vigentes",
            value: stats.active,
            color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
            icon: ShieldCheck,
          },
          {
            label: "Por vencer",
            value: stats.near,
            color: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
            icon: ShieldAlert,
          },
          {
            label: "Vencidos",
            value: stats.expired,
            color: "text-red-600 dark:text-red-400 bg-red-500/10",
            icon: ShieldOff,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card border-border flex items-center gap-3 rounded-2xl border p-4"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.color}`}
            >
              <s.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-foreground text-xl font-bold">{s.value}</div>
              <div className="text-foreground/50 text-xs">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        {/* Toolbar */}
        <div className="border-border border-b px-5 py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-foreground text-base font-bold">Listado</h2>
              <p className="text-foreground/50 text-xs">
                {certsQuery.isLoading
                  ? "Cargando…"
                  : `${filtered.length} de ${certs.length} certificado${certs.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {/* Search */}
            <div className="relative w-full max-w-xs">
              <Search className="text-foreground/40 absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por tipo, emisor o animal…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-muted/50 border-border text-foreground placeholder:text-foreground/30 focus:border-primary w-full rounded-xl border py-2 pr-3 pl-8 text-sm outline-none transition-colors"
              />
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="text-foreground/40 h-3.5 w-3.5 shrink-0" />

            {/* Type */}
            <div className="flex flex-wrap gap-1.5">
              {typeOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    typeFilter === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground/60 hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {t === "all" ? "Todos" : `${CERT_ICON[t] ?? ""} ${CERT_TYPE_LABELS[t] ?? t}`}
                </button>
              ))}
            </div>

            <div className="bg-border h-4 w-px" />

            {/* Status */}
            <div className="flex gap-1.5">
              {[
                { key: "all", label: "Todos" },
                { key: "active", label: "Vigentes" },
                { key: "near", label: "Por vencer" },
                { key: "expired", label: "Vencidos" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setStatusFilter(opt.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    statusFilter === opt.key
                      ? "bg-secondary/20 text-secondary border-secondary/40"
                      : "border-border text-foreground/60 hover:border-secondary/40 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {!certsQuery.isLoading && certs.length === 0 && (
          <div className="px-5 py-16 text-center">
            <div className="bg-muted/40 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
              <FileCheck className="text-foreground/30 h-7 w-7" />
            </div>
            <p className="text-foreground/70 text-sm font-medium">
              Aún no tienes certificados registrados
            </p>
            <p className="text-foreground/40 mt-1 text-xs">
              Emite el primer certificado de trazabilidad
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" /> Emitir primer certificado
            </button>
          </div>
        )}

        {/* No results */}
        {!certsQuery.isLoading && certs.length > 0 && filtered.length === 0 && (
          <div className="px-5 py-12 text-center">
            <Search className="text-foreground/20 mx-auto h-8 w-8 mb-3" />
            <p className="text-foreground/60 text-sm">
              No se encontraron certificados con ese filtro.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
                setStatusFilter("all");
              }}
              className="text-primary mt-2 text-xs hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Skeleton */}
        {certsQuery.isLoading && (
          <div className="divide-border divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="bg-muted/40 h-8 w-20 animate-pulse rounded-full" />
                <div className="bg-muted/30 h-3 w-32 animate-pulse rounded" />
                <div className="bg-muted/20 ml-auto h-6 w-16 animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-foreground/50 border-border border-b text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Tipo</th>
                  <th className="px-5 py-3 text-left font-medium">Animal</th>
                  <th className="px-5 py-3 text-left font-medium">Emisor</th>
                  <th className="px-5 py-3 text-left font-medium">Emitido</th>
                  <th className="px-5 py-3 text-left font-medium">Vence</th>
                  <th className="px-5 py-3 text-left font-medium">Estado</th>
                  <th className="px-5 py-3 text-left font-medium">Cadena</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {pagedCerts.map((c) => {
                  const st = getStatus(c.valid_until);
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 group transition-colors">
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${CERT_TYPE_STYLES[c.type] ?? CERT_TYPE_STYLES.other}`}
                        >
                          <span>{CERT_ICON[c.type] ?? "📄"}</span>
                          {CERT_TYPE_LABELS[c.type] ?? c.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {c.animals ? (
                          <span className="text-foreground font-mono text-xs font-semibold">
                            {c.animals.tag}
                            {c.animals.name && (
                              <span className="text-foreground/50 font-normal">
                                {" "}
                                · {c.animals.name}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="bg-muted/60 text-foreground/50 rounded-lg px-2 py-0.5 text-xs">
                            Finca
                          </span>
                        )}
                      </td>
                      <td className="text-foreground/70 px-5 py-3.5 text-sm">
                        {c.issuer ?? <span className="text-foreground/30 italic">—</span>}
                      </td>
                      <td className="text-foreground/60 px-5 py-3.5 tabular-nums text-sm">
                        {fmt(c.issued_at)}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-sm">
                        <span
                          className={
                            st === "expired"
                              ? "text-red-600 dark:text-red-400"
                              : st === "near"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-foreground/60"
                          }
                        >
                          {fmt(c.valid_until)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">{STATUS_BADGE[st]}</td>
                      <td className="px-5 py-3.5">
                        <SignAnchorButton
                          entityType="certifications"
                          entityId={c.id}
                          txHash={anchorsQuery.data?.[c.id] ?? null}
                          disabled={st === "expired"}
                          disabledTitle="No se puede anclar un certificado vencido"
                          onDone={() => anchorsQuery.refetch()}
                        />
                      </td>
                      <td className="pr-5 py-3.5 text-right">
                        <Link
                          href={`/dashboard/certificados/${c.id}`}
                          className="text-primary border-primary/20 hover:bg-primary/10 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium opacity-0 transition-all group-hover:opacity-100"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-5 pb-1">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              onChange={setPage}
              noun="certificado"
            />
          </div>
        )}

        {filtered.length > 0 && (
          <div className="border-border text-foreground/40 flex items-center justify-between border-t px-5 py-3 text-xs">
            <span>
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </span>
            {hasFilter && (
              <button
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setStatusFilter("all");
                }}
                className="text-primary hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal nuevo certificado */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="bg-card border-border relative z-10 my-4 flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl sm:my-8 sm:max-h-[calc(100dvh-4rem)]">
            <div className="border-border flex shrink-0 items-start gap-3 border-b p-4 sm:gap-4 sm:p-6">
              <div className="from-primary/20 to-primary/5 border-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-linear-to-br sm:h-12 sm:w-12">
                <Award className="text-primary h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-foreground text-base font-bold tracking-tight sm:text-lg">
                  Nuevo certificado
                </h2>
                <p className="text-foreground/60 mt-0.5 text-xs sm:text-sm">
                  Registra un certificado de trazabilidad, sanidad u origen para la finca o un
                  animal específico.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-foreground/40 hover:text-foreground hover:bg-muted shrink-0 cursor-pointer rounded-lg p-1.5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6">
              <CertificateForm
                onSuccess={() => {
                  qc.invalidateQueries({ queryKey: ["certifications", farmId] });
                  setShowModal(false);
                }}
                onCancel={() => setShowModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
