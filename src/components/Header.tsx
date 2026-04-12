"use client";

import Link from "next/link";
import { Shield, Sun, Moon, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

interface HeaderProps {
  variant?: "default" | "transparent";
}

export default function Header({ variant = "default" }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isTransparent = variant === "transparent" && !scrolled;

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        isTransparent
          ? "bg-transparent"
          : "bg-background/95 border-border/50 border-b shadow-lg backdrop-blur-xl"
      }`}
    >
      <div className="container mx-auto px-4 py-3">
        <div
          className={`flex items-center justify-between rounded-full border border-transparent px-4 py-2 transition-all duration-300 md:border-white/10 ${
            isTransparent ? "bg-white/5" : "bg-background/50"
          }`}
        >
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Andes Trust" className="h-12 w-auto" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {["Servicios", "Cómo Funciona", "Beneficios", "Contacto"].map((item) => {
              const href =
                item === "Servicios"
                  ? "#servicios"
                  : item === "Cómo Funciona"
                    ? "#como-funciona"
                    : item === "Beneficios"
                      ? "#beneficios"
                      : "#contacto";
              return (
                <Link
                  key={item}
                  href={href}
                  className="text-foreground/70 hover:text-primary hover:bg-primary/10 rounded-full px-4 py-2 text-sm font-medium transition-all"
                >
                  {item}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hover:bg-muted text-foreground rounded-full p-2.5 transition-all"
                aria-label="Cambiar tema"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            )}
            <button className="text-primary hover:bg-primary/10 rounded-full px-5 py-2.5 text-sm font-semibold transition-all">
              Iniciar Sesión
            </button>
            <button className="bg-primary hover:shadow-primary/30 text-primary-foreground hover:bg-primary/90 rounded-full px-5 py-2.5 text-sm font-semibold shadow-md transition-all hover:shadow-lg">
              Registrarse
            </button>
          </div>

          <button
            className="text-foreground hover:bg-muted rounded-full p-2 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-border bg-background/95 absolute top-full right-0 left-0 border-b p-4 shadow-xl backdrop-blur-xl md:hidden">
          <nav className="space-y-2">
            {[
              { label: "Servicios", href: "#servicios" },
              { label: "Cómo Funciona", href: "#como-funciona" },
              { label: "Beneficios", href: "#beneficios" },
              { label: "Contacto", href: "#contacto" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-foreground/70 hover:text-primary hover:bg-muted block rounded-xl px-4 py-3 text-sm font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="space-y-3 pt-4">
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="text-foreground border-border hover:bg-muted flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
                </button>
              )}
              <button className="text-primary border-primary hover:bg-primary/10 w-full rounded-xl border px-4 py-3 text-sm font-semibold">
                Iniciar Sesión
              </button>
              <button className="bg-primary text-primary-foreground w-full rounded-xl px-4 py-3 text-sm font-semibold">
                Registrarse
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
