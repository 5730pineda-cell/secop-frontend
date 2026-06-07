# SECOP Frontend v5 — OC Consultores

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/login` | Login SOFIA para clientes |
| `/cliente/[id]` | Portal cliente (procesos, interés, seguimiento) |
| `/admin` | Panel admin (gestión procesos, Drive, etapas) |
| `/dashboard` | Dashboard interno (métricas, clientes, logs) |
| `/dashboard/processes` | Tabla de procesos |
| `/dashboard/clients` | Vista de clientes |
| `/dashboard/logs` | Logs de ejecución |

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores.

## Deploy Vercel

1. Conecta el repo en Vercel
2. Agrega las variables de entorno en el proyecto
3. Deploy automático en cada push

## Novedades v5

- Portal cliente completo (`/login` + `/cliente/[id]`)
- Panel admin con gestión de etapas y Drive
- Integración directa con Supabase (sin backend para el portal)
- Middleware de autenticación por cookie
- Todos los campos nuevos del schema (`estado`, `etapa_seguimiento`, `drive_url`, `feedback`, etc.)
