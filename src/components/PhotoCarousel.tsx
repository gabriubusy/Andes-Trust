"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Beef } from "lucide-react";

type Props = {
  urls: string[];
  alt?: string;
  height?: string;
};

export default function PhotoCarousel({ urls, alt = "Foto", height = "h-72" }: Props) {
  const [idx, setIdx] = useState(0);

  if (urls.length === 0) {
    return (
      <div className={`bg-muted/40 flex ${height} items-center justify-center`}>
        <Beef className="text-foreground/20 h-20 w-20" />
      </div>
    );
  }

  const prev = () => setIdx((i) => (i - 1 + urls.length) % urls.length);
  const next = () => setIdx((i) => (i + 1) % urls.length);

  return (
    <div className={`relative ${height} w-full overflow-hidden select-none`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={idx}
        src={urls[idx]}
        alt={`${alt} — foto ${idx + 1}`}
        className="h-full w-full object-cover transition-opacity duration-300"
      />

      {urls.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Foto anterior"
            className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Foto siguiente"
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Foto ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-200 ${
                  i === idx ? "w-4 bg-white" : "w-2 bg-white/50"
                }`}
              />
            ))}
          </div>

          {/* Counter */}
          <span className="absolute top-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
            {idx + 1} / {urls.length}
          </span>
        </>
      )}
    </div>
  );
}
