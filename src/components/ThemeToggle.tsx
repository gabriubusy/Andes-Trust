"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Cambiar tema"
      className={`border-border text-foreground/70 hover:border-primary/40 hover:text-foreground relative inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${className}`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
