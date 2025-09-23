-- 0009_add_lockup_to_properties.sql
-- Add lockup_end_date column to properties table

-- Add the lockup_end_date column to the properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS lockup_end_date date;

-- Add an index for performance
CREATE INDEX IF NOT EXISTS idx_properties_lockup_end_date ON public.properties (lockup_end_date);

COMMENT ON COLUMN public.properties.lockup_end_date IS 'Date until which tokens for this property are locked and cannot be transferred';
