-- ====================================================================
-- Loan Items Migration
-- - Adds item and item_description fields to loans table
-- ====================================================================

BEGIN;

-- Add item and item_description columns to loans table
ALTER TABLE loans
  ADD COLUMN item VARCHAR(255),
  ADD COLUMN item_description TEXT;

-- Add comments for the new columns
COMMENT ON COLUMN loans.item IS
'Short identifier for the property address or item associated with the loan (e.g., "123 Main St" or "2022 Honda Civic")';
COMMENT ON COLUMN loans.item_description IS
'Detailed description of the property or item associated with the loan, including relevant details like property features or item specifications';

COMMIT;
