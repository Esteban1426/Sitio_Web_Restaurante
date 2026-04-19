
  # Sitio Web Restaurante (Supabase)

  This is a code bundle for Responsive Restaurant Website. The original project is available at https://www.figma.com/design/qSwXzYpGKyWpqLKxTbo80A/Responsive-Restaurant-Website.

  ## Requisitos

  - Node.js + npm
  - Un proyecto de Supabase (ya tienes: `Restaurante DB`, id `faffqwjlzkphqkelksfw`)

  ## Configurar Supabase

  - **Variables de entorno**: crea un archivo `.env` en la raíz (puedes copiar `.env.example`) y completa:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`

  - **Crear tablas/funciones/políticas**: en el SQL editor de Supabase ejecuta el archivo:
    - `supabase/schema.sql`

  - **Auth para Admin**:
    - Crea al menos un usuario en Supabase Auth (Email/Password).
    - Luego inicia sesión desde el panel Admin del sitio.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  