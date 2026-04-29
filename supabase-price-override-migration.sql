-- ============================================================
-- MIGRATION: Add price override columns to intervento_articoli
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.intervento_articoli
  ADD COLUMN IF NOT EXISTS costo_override numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS aliquota_iva_override numeric DEFAULT NULL;

-- costo_override:       if set, use this price instead of articoli.costo for this intervention
-- aliquota_iva_override: if set, use this IVA % instead of articoli.aliquota_iva for this intervention
-- Both default to NULL = "use catalog price"
