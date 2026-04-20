import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { variantStyles, type Variant } from "@/lib/variants";

interface PageHeroProps {
  readonly title: string;
  readonly description?: string;
  readonly badge?: {
    icon: LucideIcon;
    label: string;
    variant?: Variant;
  };
  readonly titleAccent?: string;
}

export default function PageHero({ title, description, badge, titleAccent }: PageHeroProps) {
  const badgeVariant = variantStyles[badge?.variant ?? "primary"];
  return (
    <section className="relative flex min-h-[60vh] items-center overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0 z-0">
        <Image
          src="/home/hero-home.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="from-background/95 via-background/80 to-background absolute inset-0 bg-linear-to-b" />
        <div className="bg-primary/10 absolute top-1/3 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        {badge && (
          <div
            className={`${badgeVariant.bgSoft} ${badgeVariant.text} mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium`}
          >
            <badge.icon className="h-4 w-4" />
            <span>{badge.label}</span>
          </div>
        )}
        <h1 className="text-foreground mb-6 text-4xl leading-[1.1] font-bold tracking-tight md:text-5xl lg:text-6xl">
          {title}
          {titleAccent && (
            <>
              <br />
              <span className="from-primary to-secondary bg-linear-to-r bg-clip-text text-transparent">
                {titleAccent}
              </span>
            </>
          )}
        </h1>
        {description && (
          <p className="text-foreground/70 mx-auto max-w-2xl text-lg md:text-xl">{description}</p>
        )}
      </div>
    </section>
  );
}
