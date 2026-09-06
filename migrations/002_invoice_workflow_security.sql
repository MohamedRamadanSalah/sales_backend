-- ==========================================
-- Migration 002: Invoice Workflow Security
-- Adds proper approval state machine, optimistic
-- locking, and relational financial columns.
-- Run AFTER schema.sql + upgrade.sql
-- ==========================================

-- ─── 1. Approval Status Enum ───
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_approval_status') THEN
        CREATE TYPE invoice_approval_status AS ENUM (
            'draft',                    -- Invoice created, not yet sent to seller
            'pending_seller',           -- Awaiting seller approval
            'seller_approved',          -- Seller approved, now awaiting admin
            'seller_rejected',          -- Seller rejected → voided
            'pending_admin',            -- Awaiting admin final review
            'admin_approved',           -- Admin approved → fully approved
            'admin_rejected',           -- Admin rejected
            'blocked_pending_review',   -- Admin flagged for further review
            'fully_approved',           -- Both parties approved, invoice complete
            'voided'                    -- Cancelled / terminated
        );
    END IF;
END $$;

-- ─── 2. Add Columns to invoices ───
DO $$
BEGIN
    -- Ensure detailed_data exists (may have been added ad-hoc)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'invoices' AND column_name = 'detailed_data') THEN
        ALTER TABLE invoices ADD COLUMN detailed_data JSONB;
    END IF;

    -- Approval status (the single source of truth for workflow state)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'invoices' AND column_name = 'approval_status') THEN
        ALTER TABLE invoices ADD COLUMN approval_status invoice_approval_status DEFAULT 'draft';
    END IF;

    -- Optimistic concurrency version counter
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'invoices' AND column_name = 'version') THEN
        ALTER TABLE invoices ADD COLUMN version INT NOT NULL DEFAULT 1;
    END IF;

    -- True financial total including VAT + fees (mirrors detailed_data but queryable)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'invoices' AND column_name = 'total_with_fees') THEN
        ALTER TABLE invoices ADD COLUMN total_with_fees DECIMAL(15, 2);
    END IF;

    -- Seller approval timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'invoices' AND column_name = 'seller_approved_at') THEN
        ALTER TABLE invoices ADD COLUMN seller_approved_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Admin approval timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'invoices' AND column_name = 'admin_approved_at') THEN
        ALTER TABLE invoices ADD COLUMN admin_approved_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Which admin approved this invoice
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'invoices' AND column_name = 'approved_by_admin_id') THEN
        ALTER TABLE invoices ADD COLUMN approved_by_admin_id INT REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Rejection reason (stored relationally, not buried in JSON)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'invoices' AND column_name = 'rejection_reason') THEN
        ALTER TABLE invoices ADD COLUMN rejection_reason TEXT;
    END IF;

    -- Who rejected it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'invoices' AND column_name = 'rejected_by') THEN
        ALTER TABLE invoices ADD COLUMN rejected_by VARCHAR(10) CHECK (rejected_by IN ('seller', 'admin'));
    END IF;
END $$;

-- ─── 3. Back-fill approval_status from existing detailed_data ───
-- For existing invoices that have detailed_data, derive approval_status
UPDATE invoices
SET approval_status = CASE
    WHEN detailed_data IS NULL THEN 'draft'::invoice_approval_status
    WHEN (detailed_data->>'final_status') = 'APPROVED' THEN 'fully_approved'::invoice_approval_status
    WHEN (detailed_data->>'final_status') = 'REJECTED' THEN 'voided'::invoice_approval_status
    WHEN (detailed_data->'approval_workflow'->'admin_approval'->>'status') = 'APPROVED' THEN 'admin_approved'::invoice_approval_status
    WHEN (detailed_data->'approval_workflow'->'admin_approval'->>'status') = 'REJECTED' THEN 'admin_rejected'::invoice_approval_status
    WHEN (detailed_data->'approval_workflow'->'admin_approval'->>'status') = 'BLOCKED_PENDING_REVIEW' THEN 'blocked_pending_review'::invoice_approval_status
    WHEN (detailed_data->'approval_workflow'->'seller_approval'->>'status') = 'APPROVED' THEN 'pending_admin'::invoice_approval_status
    WHEN (detailed_data->'approval_workflow'->'seller_approval'->>'status') = 'REJECTED' THEN 'seller_rejected'::invoice_approval_status
    ELSE 'pending_seller'::invoice_approval_status
END
WHERE approval_status = 'draft';

-- ─── 4. Back-fill total_with_fees from detailed_data ───
UPDATE invoices
SET total_with_fees = (detailed_data->'financial_breakdown'->>'total_amount_due')::DECIMAL
WHERE detailed_data IS NOT NULL
  AND (detailed_data->'financial_breakdown'->>'total_amount_due') IS NOT NULL
  AND total_with_fees IS NULL;

-- ─── 5. Performance Indexes ───
CREATE INDEX IF NOT EXISTS idx_invoices_approval_status ON invoices(approval_status);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_approved_by_admin ON invoices(approved_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_invoices_version ON invoices(id, version);

-- ─── Done ───
-- Verify with:
-- SELECT id, status, approval_status, version, total_with_fees FROM invoices LIMIT 10;
