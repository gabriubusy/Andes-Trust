export type Variant = "primary" | "secondary" | "accent";

export const variantStyles: Record<
  Variant,
  {
    text: string;
    bg: string;
    bgSoft: string;
    bgHover: string;
    border: string;
    gradient: string;
    shadow: string;
  }
> = {
  primary: {
    text: "text-primary",
    bg: "bg-primary",
    bgSoft: "bg-primary/10",
    bgHover: "group-hover:bg-primary/20",
    border: "border-primary",
    gradient: "from-primary to-primary/80",
    shadow: "shadow-primary/30",
  },
  secondary: {
    text: "text-secondary",
    bg: "bg-secondary",
    bgSoft: "bg-secondary/10",
    bgHover: "group-hover:bg-secondary/20",
    border: "border-secondary",
    gradient: "from-secondary to-secondary/80",
    shadow: "shadow-secondary/30",
  },
  accent: {
    text: "text-accent",
    bg: "bg-accent",
    bgSoft: "bg-accent/10",
    bgHover: "group-hover:bg-accent/20",
    border: "border-accent",
    gradient: "from-accent to-accent/80",
    shadow: "shadow-accent/30",
  },
};
