# Andes Trust

Plataforma de confianza y seguridad para transacciones digitales, construida con Next.js y las mejores prácticas de desarrollo moderno.

## Características

### Desarrollo

- **TypeScript** — Tipado estático para mayor seguridad y mantenibilidad
- **ESLint** — Linting automático para mantener código limpio
- **Prettier** — Formateo de código consistente
- **Husky + lint-staged** — Git hooks para validar código antes de commits

### Optimización de Carga

- **Next.js 16** — Framework React con App Router y optimizaciones automáticas
- **@tanstack/react-query** — Data fetching eficiente con caching y revalidación
- **next-themes** — Soporte para temas claro/oscuro
- **Optimización de imágenes** — Carga automática y lazy loading
- **Font optimization** — Carga optimizada de fuentes Geist

### Seguridad

- **Content Security Policy (CSP)** — Protección contra XSS vía middleware
- **HSTS** — HTTPS obligatorio
- **X-Frame-Options** — Prevención de clickjacking
- **X-Content-Type-Options** — Prevención de MIME sniffing
- **Middleware** — Validación de headers en todas las rutas

### UI/UX

- **Tailwind CSS v4** — Estilos utility-first modernos
- **shadcn/ui** — Componentes UI accesibles y personalizables
- **Lucide React** — Iconos modernos y consistentes
- **React Hook Form + Zod** — Formularios eficientes con validación
- **Responsive Design** — Diseño adaptativo para todos los dispositivos
- **Dark Mode** — Soporte para tema oscuro

## Instalación

```bash
npm install
cp .env.local.example .env.local   # luego edita .env.local con tus claves
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Configuración de autenticación (Privy)

El login usa [Privy](https://privy.io) (embedded wallets + email/Google + MetaMask).

1. Crea una cuenta y una app en [dashboard.privy.io](https://dashboard.privy.io)
2. Copia el **App ID** a `.env.local`:
   ```
   NEXT_PUBLIC_PRIVY_APP_ID=cmxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. En el dashboard de Privy habilita los métodos de login: Email, Google, Wallet
4. Agrega `http://localhost:3000` a los dominios permitidos

Sin `NEXT_PUBLIC_PRIVY_APP_ID`, la app arranca pero el login no funciona (verás un warning en consola).

## Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build para producción
npm run start    # Servidor de producción
npm run lint     # Ejecutar ESLint
```

## Estructura del Proyecto

```
andes-trust/
├── src/
│   ├── app/              # App Router de Next.js
│   ├── components/       # Componentes reutilizables
│   ├── lib/              # Utilidades y configuraciones
│   ├── providers/        # Context providers
│   └── proxy.ts          # Middleware de Next.js
├── public/               # Archivos estáticos
└── package.json
```

## Licencia

Este proyecto es privado y propiedad de Andes Trust.
