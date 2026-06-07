-- ============================================================
--  SOFIA · OC Consultores — Actualización de base de datos
--  Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- 1. Columna drive_proceso_url en procesos
--    (enlace de Drive específico por proceso, lo agrega el admin)
ALTER TABLE public.procesos
  ADD COLUMN IF NOT EXISTS drive_proceso_url TEXT;

-- 2. Columna updated_at en procesos
--    (necesaria para el auto-borrado de descartados a los 30 días)
ALTER TABLE public.procesos
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Índice para búsqueda rápida por estado + updated_at
CREATE INDEX IF NOT EXISTS idx_procesos_estado_updated
  ON public.procesos(estado, updated_at);

-- ✅ LISTO — Verifica en Table Editor que la tabla procesos tiene:
--    • drive_proceso_url (text, nullable)
--    • updated_at (timestamptz)
