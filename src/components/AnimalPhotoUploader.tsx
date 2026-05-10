"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { ImagePlus, X } from "lucide-react";
import { ACCEPTED_PHOTO_MIME, MAX_PHOTO_BYTES } from "@/lib/supabase/storage";

type Props = {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
};

export default function AnimalPhotoUploader({ value, onChange, disabled }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      setError(null);
      if (rejected.length > 0) {
        const code = rejected[0].errors[0]?.code;
        setError(
          code === "file-too-large"
            ? "La imagen supera 8 MB."
            : "Formato no soportado. Usa JPG, PNG o WebP."
        );
        return;
      }
      if (accepted[0]) onChange(accepted[0]);
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_PHOTO_MIME.reduce<Record<string, string[]>>((acc, m) => {
      acc[m] = [];
      return acc;
    }, {}),
    maxSize: MAX_PHOTO_BYTES,
    multiple: false,
    disabled,
  });

  if (preview) {
    return (
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Vista previa"
          className="border-border h-48 w-full rounded-xl border object-cover"
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="bg-background/80 text-foreground hover:bg-background absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full backdrop-blur"
          aria-label="Quitar foto"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-border hover:border-primary/50 flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : ""
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        <ImagePlus className="text-foreground/50 h-6 w-6" />
        <span className="text-foreground/70">
          {isDragActive ? "Suelta la imagen…" : "Arrastra una foto o haz clic"}
        </span>
        <span className="text-foreground/50 text-xs">JPG, PNG, WebP · máx 8 MB</span>
      </div>
      {error && <p className="text-accent mt-2 text-xs">{error}</p>}
    </div>
  );
}
