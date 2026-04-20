import Image from "next/image";
import { ArrowRight } from "lucide-react";

interface CTASectionProps {
  readonly title: string;
  readonly description: string;
  readonly primaryLabel?: string;
  readonly secondaryLabel?: string;
}

export default function CTASection({
  title,
  description,
  primaryLabel = "Solicitar Demo",
  secondaryLabel,
}: CTASectionProps) {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0">
        <Image src="/home/cta.png" alt="" fill sizes="100vw" className="object-cover" />
        <div className="from-primary/95 to-primary/85 absolute inset-0 bg-linear-to-br" />
      </div>

      <div className="relative container mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white/10 p-8 text-center backdrop-blur-md md:p-14">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-5xl">{title}</h2>
          <p className="mb-10 text-lg text-white/90 md:text-xl">{description}</p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button className="group text-primary rounded-xl bg-white px-8 py-4 text-base font-semibold shadow-lg transition-all hover:shadow-xl">
              <span className="flex items-center justify-center gap-2">
                {primaryLabel}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
            {secondaryLabel && (
              <button className="rounded-xl border border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/20">
                {secondaryLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
