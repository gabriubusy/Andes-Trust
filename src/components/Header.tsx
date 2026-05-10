"use client";

import Link from "next/link";
import Image from "next/image";
import { Sun, Moon, Menu, X, LogIn, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { usePrivy } from "@privy-io/react-auth";

interface HeaderProps {
  readonly variant?: "default" | "transparent";
}

const navLinks = [
  { label: "Servicios", href: "/servicios" },
  { label: "Cómo Funciona", href: "/como-funciona" },
  { label: "Beneficios", href: "/beneficios" },
  { label: "FAQ", href: "/faq" },
];

export default function Header({ variant = "default" }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isTransparent = variant === "transparent" && !scrolled;
  const isAuthed = mounted && ready && authenticated;

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
            <Image
              src="/logo.png"
              alt="Finca El Progreso"
              width={120}
              height={48}
              priority
              className="h-12 w-auto"
            />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-foreground/70 hover:text-primary hover:bg-primary/10 rounded-full px-4 py-2 text-sm font-medium transition-all"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hover:bg-muted text-foreground rounded-full p-2.5 transition-all"
                aria-label="Cambiar tema"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            )}
            {isAuthed ? (
              <Link
                href="/dashboard"
                className="bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-md transition-all hover:shadow-lg"
              >
                <LayoutDashboard className="h-4 w-4" />
                Mi panel
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-md transition-all hover:shadow-lg"
              >
                <LogIn className="h-4 w-4" />
                Iniciar Sesión
              </Link>
            )}
          </div>

          <button
            type="button"
            className="text-foreground hover:bg-muted rounded-full p-2 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-border bg-background/95 absolute top-full right-0 left-0 border-b p-4 shadow-xl backdrop-blur-xl md:hidden">
          <nav className="space-y-2">
            {navLinks.map((item) => (
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
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="text-foreground border-border hover:bg-muted flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
                </button>
              )}
              {isAuthed ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Mi panel
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                >
                  <LogIn className="h-4 w-4" />
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
