-- ============================================================
-- MIGRATION: REVERSE Snapshots and SET NULL (Restore Cascades)
-- Run this in Supabase SQL Editor
-- WARNING: This removes snapshot columns and restores ON DELETE CASCADE
-- ============================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Ripristina la foreign key di interventi -> clienti in ON DELETE CASCADE
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_schema = 'public' AND table_name = 'interventi' AND column_name = 'cliente_id'
    ) LOOP
        EXECUTE 'ALTER TABLE public.interventi DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
    ALTER TABLE public.interventi ADD CONSTRAINT interventi_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clienti(id) ON DELETE CASCADE;

    -- 2. Ripristina la foreign key di intervento_articoli -> articoli in ON DELETE CASCADE
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_schema = 'public' AND table_name = 'intervento_articoli' AND column_name = 'articolo_id'
    ) LOOP
        EXECUTE 'ALTER TABLE public.intervento_articoli DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
    ALTER TABLE public.intervento_articoli ADD CONSTRAINT intervento_articoli_articolo_id_fkey FOREIGN KEY (articolo_id) REFERENCES public.articoli(id) ON DELETE CASCADE;

    -- 3. Ripristina la foreign key di intervento_operai -> usersvivai in ON DELETE CASCADE
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_schema = 'public' AND table_name = 'intervento_operai' AND column_name = 'operaio_id'
    ) LOOP
        EXECUTE 'ALTER TABLE public.intervento_operai DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
    ALTER TABLE public.intervento_operai ADD CONSTRAINT intervento_operai_operaio_id_fkey FOREIGN KEY (operaio_id) REFERENCES public.usersvivai(id) ON DELETE CASCADE;

    -- 4. Opzionale: se si vogliono rimettere i vincoli NOT NULL (fallirà se ci sono record con valori NULL)
    -- ALTER TABLE public.interventi ALTER COLUMN cliente_id SET NOT NULL;
    -- ALTER TABLE public.intervento_articoli ALTER COLUMN articolo_id SET NOT NULL;
    -- ALTER TABLE public.intervento_operai ALTER COLUMN operaio_id SET NOT NULL;

END $$;

-- 5. Elimina le colonne snapshot che erano state create
ALTER TABLE public.interventi DROP COLUMN IF EXISTS cliente_snapshot;
ALTER TABLE public.intervento_operai DROP COLUMN IF EXISTS operaio_snapshot;
ALTER TABLE public.intervento_articoli DROP COLUMN IF EXISTS articolo_snapshot;
