"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  UploadCloud,
  FileText,
  X,
  Link2,
  Tag,
  Building2,
  CalendarDays,
  StickyNote,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";

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

const inputCls =
  "w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 hover:border-foreground/20 transition";
const labelCls =
  "mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/55";
const errorCls = "mt-1 text-xs text-destructive";

type Props = {
  /** Se invoca al guardar correctamente. */
  onSuccess: () => void;
  /** Se invoca al pulsar "Cancelar". */
  onCancel: () => void;
};

export default function CertificateForm({ onSuccess, onCancel }: Props) {
  const { supabase } = useSupabase();
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
  const certType = watch("type");

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
    toast.success("Certificado guardado");
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Tipo — selector de chips */}
      <div>
        <label className={labelCls}>
          <Tag className="h-3.5 w-3.5" />
          Tipo de certificado <span className="text-primary">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CERT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setValue("type", t.value, { shouldValidate: true })}
              className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                certType === t.value
                  ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                  : "border-border bg-background/40 text-foreground/60 hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {errors.type && <p className={errorCls}>{errors.type.message}</p>}
      </div>

      {/* Bloque: alcance y emisor */}
      <div className="border-border bg-muted/20 grid gap-5 rounded-2xl border p-5 sm:grid-cols-2">
        {/* Animal */}
        <div className="sm:col-span-2">
          <label className={labelCls}>Alcance</label>
          <select {...register("animal_id")} className={`${inputCls} cursor-pointer`}>
            <option value="">— Finca en general —</option>
            {(animalsQuery.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.tag}
                {a.name ? ` · ${a.name}` : ""}
              </option>
            ))}
          </select>
          <p className="text-foreground/50 mt-1.5 text-xs">
            Deja vacío si el certificado aplica a toda la finca.
          </p>
        </div>

        {/* Emisor */}
        <div className="sm:col-span-2">
          <label className={labelCls}>
            <Building2 className="h-3.5 w-3.5" />
            Emisor
          </label>
          <input
            {...register("issuer")}
            placeholder="Ej: Ministerio de Agricultura, laboratorio, etc."
            className={inputCls}
          />
          {errors.issuer && <p className={errorCls}>{errors.issuer.message}</p>}
        </div>

        {/* Fechas */}
        <div>
          <label className={labelCls}>
            <CalendarDays className="h-3.5 w-3.5" />
            Fecha de emisión
          </label>
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            {...register("issued_at")}
            className={`${inputCls} cursor-pointer`}
          />
        </div>
        <div>
          <label className={labelCls}>
            <CalendarDays className="h-3.5 w-3.5" />
            Fecha de vencimiento
          </label>
          <input
            type="date"
            {...register("valid_until")}
            className={`${inputCls} cursor-pointer`}
          />
        </div>
      </div>

      {/* Documento */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={`${labelCls} mb-0`}>
            <FileText className="h-3.5 w-3.5" />
            Documento oficial
          </label>
          <button
            type="button"
            onClick={() => setUrlMode((v) => !v)}
            className="text-foreground/40 hover:text-primary flex cursor-pointer items-center gap-1 text-xs transition-colors"
          >
            <Link2 className="h-3 w-3" />
            {urlMode ? "Subir archivo" : "Pegar URL"}
          </button>
        </div>

        {uploadedFile && !urlMode ? (
          <div className="border-border bg-muted/30 flex items-center gap-3 rounded-xl border px-4 py-3">
            <FileText className="text-primary h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-medium">{uploadedFile.name}</p>
              <a
                href={uploadedFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary cursor-pointer truncate text-xs hover:underline"
              >
                Ver archivo
              </a>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="text-foreground/40 hover:text-destructive shrink-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : urlMode ? (
          <input {...register("document_url")} placeholder="https://..." className={inputCls} />
        ) : (
          <label
            className={`border-border hover:border-primary/60 hover:bg-primary/5 bg-muted/20 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 transition-colors ${uploading ? "pointer-events-none opacity-60" : ""}`}
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
              <div className="bg-primary/10 rounded-full p-3">
                <UploadCloud className="text-primary/70 h-6 w-6" />
              </div>
            )}
            <span className="text-foreground/60 text-sm font-medium">
              {uploading ? "Subiendo…" : "Haz clic o arrastra el archivo aquí"}
            </span>
            <span className="text-foreground/30 text-xs">
              PDF, Word, JPG, PNG · máx. {MAX_MB} MB
            </span>
          </label>
        )}

        {urlMode && docUrl && <p className="text-foreground/40 mt-1 truncate text-xs">{docUrl}</p>}
      </div>

      {/* Notas */}
      <div>
        <label className={labelCls}>
          <StickyNote className="h-3.5 w-3.5" />
          Notas adicionales
        </label>
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

      <div className="border-border flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="border-border text-foreground/70 hover:bg-muted inline-flex cursor-pointer items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || uploading}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-sm shadow-primary/20 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar certificado
        </button>
      </div>
    </form>
  );
}
