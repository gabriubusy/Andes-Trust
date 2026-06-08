"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, UploadCloud, FileText, X, Link2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";
import { toast } from "sonner";

const CERT_TYPES = [
  { value: "origin", label: "Origen" },
  { value: "health", label: "Sanidad" },
  { value: "organic", label: "Orgánico" },
  { value: "welfare", label: "Bienestar animal" },
  { value: "export", label: "Exportación" },
  { value: "other", label: "Otro" },
] as const;

const schema = z.object({
  type: z.enum(["origin", "health", "organic", "welfare", "export", "other"]),
  animal_id: z.string().uuid().optional().or(z.literal("")),
  issuer: z.string().max(200).optional().or(z.literal("")),
  issued_at: z.string().optional().or(z.literal("")),
  valid_until: z.string().optional().or(z.literal("")),
  document_url: z.string().optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

const ACCEPTED = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp";
const MAX_MB = 10;

export default function NuevoCertificadoPage() {
  const router = useRouter();
  const { supabase, profileId } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "health" },
  });

  const docUrl = watch("document_url");

  const animalsQuery = useQuery<{ id: string; tag: string; name: string | null }[]>({
    queryKey: ["animals-select", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      if (!supabase || !farmId) return [];
      const { data, error } = await supabase
        .from("animals")
        .select("id, tag, name")
        .eq("farm_id", farmId)
        .eq("status", "active")
        .order("tag");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !supabase || !farmId) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`El archivo no puede superar ${MAX_MB} MB`);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${farmId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("certificate-docs")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("certificate-docs").getPublicUrl(path);

      setUploadedFile({ name: file.name, url: urlData.publicUrl });
      setValue("document_url", urlData.publicUrl);
      toast.success("Archivo subido correctamente");
    } catch (err) {
      toast.error("Error al subir: " + (err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeFile() {
    setUploadedFile(null);
    setValue("document_url", "");
  }

  const onSubmit = async (values: FormData) => {
    if (!supabase || !farmId) return;
    setServerError(null);

    const { error } = await supabase.from("certifications").insert({
      farm_id: farmId,
      type: values.type,
      animal_id: values.animal_id || null,
      issuer: values.issuer || null,
      issued_at: values.issued_at || null,
      valid_until: values.valid_until || null,
      document_url: values.document_url || null,
      metadata: values.notes ? { notes: values.notes } : {},
    });

    if (error) {
      setServerError(error.message);
      return;
    }
    router.push("/dashboard/certificados");
  };

  const inputCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40";
  const labelCls = "mb-1 block text-xs font-semibold text-foreground/70";
  const errorCls = "mt-1 text-xs text-destructive";

  return (
    <DashboardShell title="Nuevo certificado" subtitle="Certificados">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/certificados"
          className="text-foreground/70 hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al listado
        </Link>
      </div>

      <div className="bg-card border-border rounded-2xl border p-6">
        <h2 className="text-foreground mb-1 text-lg font-bold">Datos del certificado</h2>
        <p className="text-foreground/60 mb-6 text-sm">
          Registra un certificado de trazabilidad, sanidad u origen para la finca o un animal
          específico.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-5">
          {/* Tipo */}
          <div>
            <label className={labelCls}>Tipo de certificado *</label>
            <select {...register("type")} className={inputCls}>
              {CERT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors.type && <p className={errorCls}>{errors.type.message}</p>}
          </div>

          {/* Animal */}
          <div>
            <label className={labelCls}>Animal (opcional)</label>
            <select {...register("animal_id")} className={inputCls}>
              <option value="">— Finca en general —</option>
              {(animalsQuery.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.tag}
                  {a.name ? ` · ${a.name}` : ""}
                </option>
              ))}
            </select>
            <p className="text-foreground/50 mt-1 text-xs">
              Deja vacío si el certificado aplica a toda la finca.
            </p>
          </div>

          {/* Emisor */}
          <div>
            <label className={labelCls}>Emisor</label>
            <input
              {...register("issuer")}
              placeholder="Ej: Ministerio de Agricultura, laboratorio, etc."
              className={inputCls}
            />
            {errors.issuer && <p className={errorCls}>{errors.issuer.message}</p>}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha de emisión</label>
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                {...register("issued_at")}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Fecha de vencimiento</label>
              <input type="date" {...register("valid_until")} className={inputCls} />
            </div>
          </div>

          {/* Documento */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={labelCls}>Documento oficial</label>
              <button
                type="button"
                onClick={() => setUrlMode((v) => !v)}
                className="text-foreground/40 hover:text-primary flex items-center gap-1 text-xs transition-colors"
              >
                <Link2 className="h-3 w-3" />
                {urlMode ? "Subir archivo" : "Pegar URL"}
              </button>
            </div>

            {/* Archivo ya subido */}
            {uploadedFile && !urlMode ? (
              <div className="border-border bg-muted/30 flex items-center gap-3 rounded-xl border px-4 py-3">
                <FileText className="text-primary h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">
                    {uploadedFile.name}
                  </p>
                  <a
                    href={uploadedFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary truncate text-xs hover:underline"
                  >
                    Ver archivo
                  </a>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-foreground/40 hover:text-destructive shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : urlMode ? (
              <input {...register("document_url")} placeholder="https://..." className={inputCls} />
            ) : (
              /* Drop zone */
              <label
                className={`border-border hover:border-primary/60 hover:bg-primary/5 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPTED}
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                {uploading ? (
                  <Loader2 className="text-primary h-7 w-7 animate-spin" />
                ) : (
                  <UploadCloud className="text-foreground/30 h-7 w-7" />
                )}
                <span className="text-foreground/50 text-sm">
                  {uploading ? "Subiendo…" : "Haz clic o arrastra el archivo aquí"}
                </span>
                <span className="text-foreground/30 text-xs">
                  PDF, Word, JPG, PNG · máx. {MAX_MB} MB
                </span>
              </label>
            )}

            {/* Muestra URL si viene de modo URL */}
            {urlMode && docUrl && (
              <p className="text-foreground/40 mt-1 truncate text-xs">{docUrl}</p>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className={labelCls}>Notas adicionales</label>
            <textarea
              {...register("notes")}
              rows={3}
              placeholder="Observaciones, número de certificado, condiciones, etc."
              className={`${inputCls} resize-none`}
            />
          </div>

          {serverError && (
            <p className="bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-sm">
              {serverError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || uploading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar certificado
            </button>
            <Link
              href="/dashboard/certificados"
              className="border-border text-foreground/70 hover:bg-muted inline-flex items-center rounded-xl border px-4 py-2.5 text-sm font-medium"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
