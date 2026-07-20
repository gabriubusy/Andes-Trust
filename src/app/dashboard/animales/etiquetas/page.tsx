"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, FileDown } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { generateLabelsPdf } from "@/lib/labels/generate-pdf";

type AnimalRow = {
  id: string;
  tag: string;
  name: string | null;
  traceability_tokens: { slug: string; is_active: boolean }[];
};

export default function EtiquetasPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const animalsQuery = useQuery<AnimalRow[]>({
    queryKey: ["animals-with-tokens", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      const { data: animalsData, error: animalsErr } = await supabase
        .from("animals")
        .select("id, tag, name")
        .eq("farm_id", farmId)
        .order("tag");
      if (animalsErr) throw animalsErr;
      if (!animalsData?.length) return [];

      const ids = animalsData.map((a) => a.id);
      const { data: tokens } = await supabase
        .from("traceability_tokens")
        .select("entity_id, slug, is_active")
        .eq("entity_type", "animal")
        .in("entity_id", ids);

      const tokensByAnimal: Record<string, { slug: string; is_active: boolean }[]> = {};
      for (const t of tokens ?? []) {
        if (!tokensByAnimal[t.entity_id]) tokensByAnimal[t.entity_id] = [];
        tokensByAnimal[t.entity_id].push({ slug: t.slug, is_active: t.is_active });
      }

      return animalsData.map((a) => ({
        ...a,
        traceability_tokens: tokensByAnimal[a.id] ?? [],
      })) as AnimalRow[];
    },
  });

  const animals = useMemo(() => animalsQuery.data ?? [], [animalsQuery.data]);
  const allSelected = animals.length > 0 && selected.size === animals.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(animals.map((a) => a.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const labels = useMemo(() => {
    return animals
      .filter((a) => selected.has(a.id))
      .map((a) => {
        const slug = a.traceability_tokens.find((t) => t.is_active)?.slug;
        return slug ? { slug, tag: a.tag, name: a.name } : null;
      })
      .filter(Boolean) as { slug: string; tag: string; name: string | null }[];
  }, [animals, selected]);

  const downloadPdf = async () => {
    if (labels.length === 0) return;
    setError(null);
    setGenerating(true);
    try {
      const bytes = await generateLabelsPdf(labels, window.location.origin);
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `etiquetas-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardShell title="Etiquetas QR" subtitle="Animales">
      <Link
        href="/dashboard/animales"
        className="text-foreground/70 hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </Link>

      <div className="bg-card border-border rounded-2xl border">
        <div className="border-border flex items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="text-foreground text-base font-bold">Selecciona los animales</h2>
            <p className="text-foreground/60 text-xs">
              Se generará un PDF A4 con 12 etiquetas por hoja.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={labels.length === 0 || generating}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Generar PDF ({labels.length})
          </button>
        </div>

        {error && <div className="text-accent px-5 py-3 text-sm">{error}</div>}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-foreground/60 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                <th className="px-5 py-3 text-left font-medium">Arete</th>
                <th className="px-5 py-3 text-left font-medium">Nombre</th>
                <th className="px-5 py-3 text-left font-medium">QR</th>
              </tr>
            </thead>
            <tbody>
              {animalsQuery.isLoading && (
                <tr>
                  <td colSpan={4} className="text-foreground/60 px-5 py-6 text-sm">
                    Cargando…
                  </td>
                </tr>
              )}
              {animals.map((a) => {
                const slug = a.traceability_tokens.find((t) => t.is_active)?.slug;
                return (
                  <tr key={a.id} className="border-border hover:bg-muted/40 border-t">
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggleOne(a.id)}
                        disabled={!slug}
                      />
                    </td>
                    <td className="text-foreground px-5 py-3 font-mono text-xs font-semibold">
                      {a.tag}
                    </td>
                    <td className="text-foreground px-5 py-3">{a.name ?? "—"}</td>
                    <td className="text-foreground/60 px-5 py-3 font-mono text-xs">
                      {slug ?? <span className="text-accent">sin token</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tarjetas (móvil) */}
        <div className="md:hidden">
          {animalsQuery.isLoading && (
            <p className="text-foreground/60 px-4 py-6 text-sm">Cargando…</p>
          )}
          {!animalsQuery.isLoading && animals.length > 0 && (
            <>
              <label className="border-border bg-muted/40 text-foreground/70 flex cursor-pointer items-center gap-2 border-b px-4 py-2.5 text-xs font-medium">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                Seleccionar todos
              </label>
              <ul className="divide-border divide-y">
                {animals.map((a) => {
                  const slug = a.traceability_tokens.find((t) => t.is_active)?.slug;
                  return (
                    <li key={a.id}>
                      <label
                        className={`flex items-start gap-3 px-4 py-3.5 ${slug ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 shrink-0"
                          checked={selected.has(a.id)}
                          onChange={() => toggleOne(a.id)}
                          disabled={!slug}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-foreground font-mono text-xs font-semibold">
                            {a.tag}
                          </div>
                          <div className="text-foreground mt-0.5 truncate text-sm">
                            {a.name ?? "—"}
                          </div>
                          <div className="text-foreground/60 mt-1 truncate font-mono text-[11px]">
                            {slug ?? <span className="text-accent">sin token</span>}
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
