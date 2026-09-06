'use strict';

// ─── Invoice Approval State Machine ───────────────────────────────────────────
// Defines the valid transitions for invoice_approval_status.
// The workflow enforces: Buyer creates → Seller reviews → Admin validates.

const APPROVAL_TRANSITIONS = {
    draft:                  ['pending_seller'],
    // seller APPROVED goes directly to pending_admin (no intermediate seller_approved state)
    // seller REJECTED goes to seller_rejected → voided
    pending_seller:         ['pending_admin', 'seller_rejected'],
    seller_rejected:        ['voided'],
    // admin APPROVED goes directly to fully_approved (no intermediate admin_approved state)
    pending_admin:          ['fully_approved', 'admin_rejected', 'blocked_pending_review'],
    blocked_pending_review: ['pending_admin', 'admin_rejected'],
    admin_rejected:         ['voided'],
    fully_approved:         [],     // Terminal — cannot be undone without admin voiding
    voided:                 [],     // Terminal
    // Legacy states kept for backward compat with any existing DB rows
    seller_approved:        ['pending_admin'],
    admin_approved:         ['fully_approved'],
};

// ─── Invoice Payment State Machine ────────────────────────────────────────────
// Separate concern: payment status (invoices.status column).
// Payment is only valid after approval_status = fully_approved.

const PAYMENT_TRANSITIONS = {
    unpaid:    ['paid', 'overdue', 'cancelled'],
    overdue:   ['paid', 'cancelled'],
    paid:      [],          // Terminal
    cancelled: [],          // Terminal
};

/**
 * Validates whether an approval status transition is permitted.
 * @param {string} from - Current approval_status
 * @param {string} to   - Desired approval_status
 * @returns {{ valid: boolean, error?: string }}
 */
function canTransitionApproval(from, to) {
    const allowed = APPROVAL_TRANSITIONS[from];
    if (!allowed) {
        return { valid: false, error: `Unknown current approval status: "${from}"` };
    }
    if (!allowed.includes(to)) {
        return {
            valid: false,
            error: `Cannot transition approval status from "${from}" to "${to}". Allowed: [${allowed.join(', ') || 'none — terminal state'}]`,
        };
    }
    return { valid: true };
}

/**
 * Validates whether a payment status transition is permitted.
 * @param {string} from - Current payment status (invoices.status)
 * @param {string} to   - Desired payment status
 * @returns {{ valid: boolean, error?: string }}
 */
function canTransitionPayment(from, to) {
    const allowed = PAYMENT_TRANSITIONS[from];
    if (!allowed) {
        return { valid: false, error: `Unknown current payment status: "${from}"` };
    }
    if (!allowed.includes(to)) {
        return {
            valid: false,
            error: `Cannot transition payment status from "${from}" to "${to}". Allowed: [${allowed.join(', ') || 'none — terminal state'}]`,
        };
    }
    return { valid: true };
}

/**
 * Maps a seller approval action to the next invoice_approval_status.
 * @param {'APPROVED'|'REJECTED'} action
 * @returns {string}
 */
function sellerActionToStatus(action) {
    if (action === 'APPROVED') return 'pending_admin';
    if (action === 'REJECTED') return 'seller_rejected';
    throw new Error(`Invalid seller action: "${action}". Must be APPROVED or REJECTED.`);
}

/**
 * Maps an admin approval action to the next invoice_approval_status.
 * @param {'APPROVED'|'REJECTED'|'BLOCKED_PENDING_REVIEW'} action
 * @returns {string}
 */
function adminActionToStatus(action) {
    if (action === 'APPROVED') return 'fully_approved';
    if (action === 'REJECTED') return 'admin_rejected';
    if (action === 'BLOCKED_PENDING_REVIEW') return 'blocked_pending_review';
    throw new Error(`Invalid admin action: "${action}". Must be APPROVED, REJECTED, or BLOCKED_PENDING_REVIEW.`);
}

/**
 * Returns the human-readable expected state for seller action.
 * The invoice must be in 'pending_seller' for the seller to act.
 */
const SELLER_ACTION_REQUIRED_STATE = 'pending_seller';

/**
 * Returns the human-readable expected states for admin action.
 */
const ADMIN_ACTION_REQUIRED_STATES = ['pending_admin', 'blocked_pending_review'];

module.exports = {
    APPROVAL_TRANSITIONS,
    PAYMENT_TRANSITIONS,
    canTransitionApproval,
    canTransitionPayment,
    sellerActionToStatus,
    adminActionToStatus,
    SELLER_ACTION_REQUIRED_STATE,
    ADMIN_ACTION_REQUIRED_STATES,
};
