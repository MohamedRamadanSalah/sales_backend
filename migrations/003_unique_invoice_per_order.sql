-- ==========================================
-- Migration 003: Enforce one invoice per order
-- Run AFTER 002_invoice_workflow_security.sql
-- ==========================================

-- Step 1: Clean any existing duplicate invoices (keep only the latest per order_id)
-- This is a safety measure — in production, review duplicates manually first.
DELETE FROM invoices
WHERE id NOT IN (
    SELECT MAX(id) FROM invoices GROUP BY order_id
);

-- Step 2: Add unique constraint — prevents future duplicate invoices per order
ALTER TABLE invoices
    ADD CONSTRAINT invoices_order_id_unique UNIQUE (order_id);

-- Step 3: Ensure fast lookup index exists (may already exist from migration 002)
CREATE INDEX IF NOT EXISTS idx_invoices_order_fk ON invoices(order_id);

-- ── Verify ──
-- SELECT order_id, COUNT(*) FROM invoices GROUP BY order_id HAVING COUNT(*) > 1;
-- → Should return 0 rows
