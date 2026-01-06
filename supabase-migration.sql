-- ============================================
-- SUPABASE MIGRATION: Lynk.id Webhook Support
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add buyer_email column to licenses table
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS buyer_email TEXT;

-- 2. Add index for faster lookup of available licenses
CREATE INDEX IF NOT EXISTS idx_licenses_available 
ON licenses (buyer_email, used_by) 
WHERE buyer_email IS NULL AND used_by IS NULL;

-- 3. Create atomic RPC function to assign license to buyer
-- This uses FOR UPDATE SKIP LOCKED to prevent race conditions
CREATE OR REPLACE FUNCTION assign_license_to_buyer(input_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  license_code TEXT;
BEGIN
  -- Atomically find and update an available license
  UPDATE licenses
  SET 
    buyer_email = input_email, 
    updated_at = NOW()
  WHERE id = (
    SELECT id FROM licenses
    WHERE buyer_email IS NULL AND used_by IS NULL
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING code INTO license_code;
  
  RETURN license_code;
END;
$$;

-- 4. Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION assign_license_to_buyer(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_license_to_buyer(TEXT) TO service_role;

-- ============================================
-- VERIFICATION: Test the function
-- ============================================
-- SELECT assign_license_to_buyer('test@example.com');
-- Check result: SELECT * FROM licenses WHERE buyer_email = 'test@example.com';
