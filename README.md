<<<<<<< Updated upstream

# Andes-Trust

=======

# Andes Trust

Plataforma de confianza y seguridad para transacciones digitales, construida con Next.js y las mejores prácticas de desarrollo moderno.

## 🚀 Características

### Desarrollo

- **TypeScript** - Tipado estático para mayor seguridad y mantenibilidad
- **ESLint** - Linting automático para mantener código limpio
- **Prettier** - Formateo de código consistente
- **Husky + lint-staged** - Git hooks para validar código antes de commits

### Optimización de Carga

- **Next.js 16** - Framework React con App Router y optimizaciones automáticas
- **@tanstack/react-query** - Data fetching eficiente con caching y revalidación
- **next-themes** - Soporte para temas claro/oscuro
- **Optimización de imágenes** - Carga automática y lazy loading
- **Font optimization** - Carga optimizada de fuentes Geist

### Seguridad

- **Content Security Policy (CSP)** - Protección contra XSS vía middleware
- **HSTS** - HTTPS obligatorio
- **X-Frame-Options** - Prevención de clickjacking
- **X-Content-Type-Options** - Prevención de MIME sniffing
- **Middleware** - Validación de headers en todas las rutas

### UI/UX

- **Tailwind CSS v4** - Estilos utility-first modernos
- **shadcn/ui** - Componentes UI accesibles y personalizables
- **Lucide React** - Iconos modernos y consistentes
- **React Hook Form + Zod** - Formularios eficientes con validación
- **Responsive Design** - Diseño adaptativo para todos los dispositivos
- **Dark Mode** - Soporte para tema oscuro

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📦 Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build para producción
npm run start    # Servidor de producción
npm run lint     # Ejecutar ESLint
```

## 🏗️ Estructura del Proyecto

```
andes-trust/
├── src/
│   ├── app/              # App Router de Next.js
│   │   ├── layout.tsx    # Layout principal con proveedores
│   │   ├── page.tsx      # Página principal
│   │   └── globals.css   # Estilos globales
│   ├── components/       # Componentes reutilizables
│   │   └── ui/          # Componentes shadcn/ui
│   ├── lib/             # Utilidades y configuraciones
│   │   ├── utils.ts     # Utilidades de clases
│   │   └── secure-headers.ts  # Headers de seguridad
│   ├── providers/       # Context providers
│   │   ├── query-provider.tsx   # React Query
│   │   └── theme-provider.tsx   # Temas
│   └── middleware.ts    # Middleware de Next.js
├── public/              # Archivos estáticos
└── package.json         # Dependencias
```

## 🔒 Seguridad

El proyecto implementa múltiples capas de seguridad:

1. **Headers de Seguridad** - Aplicados vía middleware
2. **Content Security Policy** - Previene inyección de scripts
3. **HTTPS forzado** - HSTS con preload
4. **Validación de formularios** - Zod schemas
5. **TypeScript** - Prevención de errores en tiempo de compilación

## 🎨 Temas

El proyecto soporta temas claro y oscuro automáticamente basándose en la preferencia del sistema.

## 🚀 Deploy

La forma más fácil de desplegar es usando [Vercel](https://vercel.com):

```bash
vercel deploy
```

## 📝 Convenciones de Código

- Usar Prettier para formateo (se ejecuta automáticamente en pre-commit)
- Seguir las reglas de ESLint
- Usar TypeScript para todos los archivos nuevos
- Componentes funcionales con Hooks
- Nombres descriptivos para variables y funciones

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y propiedad de Andes Trust.

> > > > > > > Stashed changes
