import Link from "next/link";
import { Mail, Phone, MapPin, Globe, ArrowUpRight, Send } from "lucide-react";

export default function Footer() {
  return (
    <footer className="from-background to-muted/30 border-t bg-gradient-to-b">
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3">
              <img src="/logo.png" alt="Andes Trust" className="h-14 w-auto" />
            </Link>
            <p className="text-foreground/70 max-w-sm text-base leading-relaxed">
              Tecnología blockchain para la ganadería de los Andes. Transformamos la forma de
              registrar y gestionar tu ganado con seguridad y transparencia.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="bg-muted hover:bg-primary hover:text-primary-foreground text-foreground/70 rounded-full p-3 transition-all"
              >
                <Globe className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="bg-muted hover:bg-primary hover:text-primary-foreground text-foreground/70 rounded-full p-3 transition-all"
              >
                <ArrowUpRight className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="bg-muted hover:bg-primary hover:text-primary-foreground text-foreground/70 rounded-full p-3 transition-all"
              >
                <Send className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-foreground text-lg font-bold">Producto</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/servicios"
                  className="text-foreground/60 hover:text-primary transition-colors"
                >
                  Servicios
                </Link>
              </li>
              <li>
                <a href="#" className="text-foreground/60 hover:text-primary transition-colors">
                  Características
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground/60 hover:text-primary transition-colors">
                  Precios
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground/60 hover:text-primary transition-colors">
                  API
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-foreground text-lg font-bold">Empresa</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/nosotros"
                  className="text-foreground/60 hover:text-primary transition-colors"
                >
                  Sobre Nosotros
                </Link>
              </li>
              <li>
                <a href="#" className="text-foreground/60 hover:text-primary transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <Link
                  href="/contacto"
                  className="text-foreground/60 hover:text-primary transition-colors"
                >
                  Contacto
                </Link>
              </li>
              <li>
                <Link
                  href="/seguridad"
                  className="text-foreground/60 hover:text-primary transition-colors"
                >
                  Seguridad
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-foreground text-lg font-bold">Contacto</h4>
            <ul className="space-y-3">
              <li className="text-foreground/60 flex items-center gap-3">
                <MapPin className="text-primary h-5 w-5 flex-shrink-0" />
                <span>Mérida, Venezuela</span>
              </li>
              <li className="text-foreground/60 flex items-center gap-3">
                <Mail className="text-primary h-5 w-5 flex-shrink-0" />
                <span>contacto@andestrust.com</span>
              </li>
              <li className="text-foreground/60 flex items-center gap-3">
                <Phone className="text-primary h-5 w-5 flex-shrink-0" />
                <span>+58 274 123 4567</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-border/50 mt-16 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-foreground/50 text-sm">
              © 2024 Andes Trust. Todos los derechos reservados.
            </p>
            <div className="flex gap-6">
              <a
                href="#"
                className="text-foreground/50 hover:text-primary text-sm transition-colors"
              >
                Privacidad
              </a>
              <a
                href="#"
                className="text-foreground/50 hover:text-primary text-sm transition-colors"
              >
                Términos
              </a>
              <a
                href="#"
                className="text-foreground/50 hover:text-primary text-sm transition-colors"
              >
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
