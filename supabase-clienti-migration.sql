-- 1. Make 'nome' nullable since companies often only have 'Denominazione' which we map to 'cognome'
ALTER TABLE public.clienti ALTER COLUMN nome DROP NOT NULL;

-- 2. Add new columns
ALTER TABLE public.clienti ADD COLUMN IF NOT EXISTS cap text;
ALTER TABLE public.clienti ADD COLUMN IF NOT EXISTS citta text;
ALTER TABLE public.clienti ADD COLUMN IF NOT EXISTS provincia text;
ALTER TABLE public.clienti ADD COLUMN IF NOT EXISTS nazione text;
ALTER TABLE public.clienti ADD COLUMN IF NOT EXISTS cellulare text;
ALTER TABLE public.clienti ADD COLUMN IF NOT EXISTS pec text;
ALTER TABLE public.clienti ADD COLUMN IF NOT EXISTS codice_destinatario text;
ALTER TABLE public.clienti ADD COLUMN IF NOT EXISTS referente text;
ALTER TABLE public.clienti ADD COLUMN IF NOT EXISTS extra text;
