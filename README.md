# Prime & Rare — Sitio web del restaurante

Aplicación web full-stack para un restaurante premium: carta interactiva, carrito y pedidos, seguimiento de pedidos, reservas, panel de administración y un minijuego de puzzle opcional. La interfaz está pensada para producción, con integración a **Supabase** como backend (datos, autenticación y almacenamiento).

---

## Descripción general

El proyecto es una **SPA (Single Page Application)** construida con **React** y **Vite**. El contenido público (inicio, menú, carrito, reservas, seguimiento) vive bajo un layout común con cabecera y pie. El área **admin** está protegida por autenticación Supabase y ofrece gestión de productos, pedidos, facturas y reservas.

Los datos de negocio (productos, pedidos, etc.) se consumen principalmente desde **Supabase** mediante el cliente oficial (`@supabase/supabase-js`). Existe además código de servidor opcional en **`supabase/functions`** (Edge Functions con Hono) para endpoints auxiliares (por ejemplo proxy de imágenes del puzzle).

---

## Funcionalidades principales

| Área | Descripción |
|------|-------------|
| **Sitio público** | Página de inicio, menú con categorías, carrito con extras y personalización de productos. |
| **Pedidos** | Creación de pedidos con totales (subtotal, impuestos, domicilio). |
| **Seguimiento** | Consulta del estado del pedido por ID (`/track`). |
| **Minijuego puzzle** | Ruta dedicada `/puzzle-game`: puzzle por piezas con imágenes de productos o URL externa; proxy para evitar problemas CORS en canvas. |
| **Reservas** | Formulario de reservas para clientes. |
| **Administración** | Login (`/admin/login`), dashboard, productos, pedidos, facturas, reservas (rutas bajo `/admin/*`). |
| **Facturas** | Listado y descarga/gestión relacionada con facturas en el panel admin (`invoiceDownload` y páginas admin). |

---

## Stack tecnológico

### Frontend

- **React 18** · **TypeScript**
- **Vite 6** (bundler y dev server)
- **React Router 7** (enrutamiento con layouts y rutas protegidas)
- **Tailwind CSS 4** (`@tailwindcss/vite`)
- **Motion** (`motion/react`) para animaciones en parte de la UI
- **Radix UI** + componentes propios en `src/app/components/ui`
- **Lucide React** (iconos)
- **Sonner** (notificaciones toast)
- **Supabase JS** (cliente browser)

### Backend / infraestructura

- **Supabase**: base de datos, autenticación, storage según configuración del proyecto.
- **Supabase Edge Functions** (opcional): `supabase/functions/server` — aplicación **Hono** en **Deno** con rutas bajo `/make-server-54897cbc/*` (salud, productos legacy vía KV, pedidos, **proxy de imágenes del puzzle**, etc.). Despliegue y URL dependen de tu proyecto Supabase.

---

## Estructura del proyecto

```
Sitio_Web_Restaurante/
├── index.html                 # Punto de entrada HTML
├── vite.config.ts             # Vite + Tailwind + proxy dev para imágenes del puzzle
├── package.json
├── .env.example               # Plantilla de variables (sin secretos)
├── README.md
├── supabase/
│   ├── functions/server/      # Edge Function (Hono): API auxiliar + image-proxy
│   └── schema.sql             # Referencia SQL (si aplica a tu despliegue)
├── public/                    # Activos estáticos servidos por Vite (opcional)
└── src/
    ├── main.tsx               # createRoot, montaje de la app
    ├── styles/                # CSS global
    └── app/
        ├── App.tsx            # Providers, RouterProvider, Toaster, ErrorBoundary
        ├── routes.tsx         # Definición de rutas públicas y admin
        ├── components/        # Layout, PuzzleGame, modales, UI (shadcn-like)
        ├── context/           # AuthContext, CartContext
        ├── pages/             # Páginas públicas y admin
        └── lib/
            ├── api.ts         # Llamadas a Supabase (productos, pedidos, etc.)
            ├── supabaseClient.ts
            ├── puzzleImage.ts # Carga de imágenes para el puzzle + proxy
            ├── invoiceDownload.ts
            ├── validation.ts
            └── localDB.ts     # Tipos / utilidades locales
```

Las rutas públicas relevantes incluyen: `/`, `/menu`, `/cart`, `/track`, `/puzzle-game`, `/reservations`. El admin: `/admin/login`, `/admin`, `/admin/products`, `/admin/orders`, `/admin/invoices`, `/admin/reservations`.

---

## Requisitos previos

- **Node.js** 18+ (recomendado LTS)
- **npm**, **pnpm** o **yarn**
- Proyecto **Supabase** con URL y clave anónima (anon key)

---

## Instalación y configuración

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repositorio>
cd Sitio_Web_Restaurante
npm install
```

### 2. Variables de entorno

Copia la plantilla y rellena los valores reales **sin commitear** el archivo `.env`:

```bash
copy .env.example .env
```

En macOS/Linux:

```bash
cp .env.example .env
```

Edita `.env` y define al menos:

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase (`https://<ref>.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | Clave pública anónima (segura para el navegador con RLS bien configurada). |
| `VITE_PUZZLE_IMAGE_PROXY_BASE` | *(Opcional)* URL base de un proxy de imágenes para el puzzle, **sin** el query `?url=`. Si no se define, en producción el cliente puede construir la URL hacia la función Edge `server` (ver `src/app/lib/puzzleImage.ts`). |

**Seguridad:** no subas `.env` al repositorio. La anon key sigue siendo un secreto de aplicación cliente; las políticas **RLS** en Supabase deben restringir lectura/escritura según rol.

### 3. Arranque en desarrollo

```bash
npm run dev
```

Abre la URL que indique Vite (por defecto `http://localhost:5173`).

En desarrollo, **Vite** incluye un middleware que sirve **`/puzzle-image-proxy?url=...`** para cargar imágenes externas en el puzzle sin CORS en canvas.

### 4. Compilación para producción

```bash
npm run build
```

Salida típica en `dist/`. Sirve esa carpeta con cualquier hosting estático (Netlify, Vercel, S3, etc.) configurando las variables `VITE_*` en el panel del proveedor.

---

## Uso

1. **Cliente:** navega por el menú, añade productos al carrito, completa el checkout y obtiene un ID de pedido para seguimiento en `/track`.
2. **Puzzle:** desde seguimiento del pedido puedes enlazar al minijuego; la ruta directa es `/puzzle-game`. Vuelve al seguimiento con el botón de navegación de la página del puzzle.
3. **Admin:** accede a `/admin/login` con un usuario creado en Supabase Auth (según tu configuración). Tras el login, gestiona catálogo, pedidos, facturas y reservas.

---

## Notas técnicas

### Supabase

- El cliente se inicializa en `src/app/lib/supabaseClient.ts` y exige `VITE_SUPABASE_ANON_KEY` en tiempo de build/ejecución.
- Asegúrate de que las tablas (`products`, `orders`, etc.) y políticas RLS coincidan con las consultas en `src/app/lib/api.ts`.

### Minijuego puzzle

- Lógica de piezas y UI: `src/app/components/PuzzleGame.tsx`.
- Rasterizado CORS seguro: `src/app/lib/puzzleImage.ts` (intento directo + proxy).
- En **producción**, el proxy puede apuntar a tu Edge Function desplegada o a `VITE_PUZZLE_IMAGE_PROXY_BASE`.

### Facturas

- Descarga y flujos relacionados: ver `src/app/lib/invoiceDownload.ts` y `src/app/pages/admin/AdminInvoicesPage.tsx`.

### Edge Function `server` (opcional)

- Código en `supabase/functions/server/index.tsx`.
- Requiere despliegue con Supabase CLI y variables de entorno del proyecto (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.).
- La ruta de proxy de imágenes documentada en código usa el prefijo `/make-server-54897cbc/image-proxy`.

### Errores en runtime

- `src/app/components/ErrorBoundary.tsx` envuelve la aplicación y el puzzle para mostrar un fallback en lugar de caídas totales silenciosas.

---

## Scripts npm

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Build de producción |

---

## Licencia y marca

Proyecto privado según `package.json`. La marca **Prime & Rare** y los textos del sitio son parte del producto del restaurante.

---

## Contacto y soporte

Para incidencias de despliegue o base de datos, revisa el panel de Supabase y los logs de la Edge Function. Para fallos de front, usa la consola del navegador y los mensajes del `ErrorBoundary`.
