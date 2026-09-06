'use strict';

// ─── Financial Constants ──────────────────────────────────────────────────────
// Centralized here to prevent drift between createOrder and previewInvoice.
const FINANCIAL = {
    VAT_PERCENTAGE: 14,             // 14% VAT
    BROKERAGE_PERCENTAGE: 2.5,     // 2.5% agent commission
    REGISTRATION_FEES: 5000,       // Fixed EGP registration fee
};

/**
 * Computes the full financial breakdown for a property transaction.
 * @param {number} basePrice - The property's base price in EGP
 * @param {number} areaSqm   - Property area in square meters
 * @param {number} downPayment - Down payment amount
 * @param {string} paymentMethod - Payment method string
 * @param {number} installmentYears - Number of installment years (0 = no installments)
 * @returns {Object} financial_breakdown section
 */
function buildFinancialBreakdown(basePrice, areaSqm, downPayment, paymentMethod, installmentYears) {
    const vat = basePrice * (FINANCIAL.VAT_PERCENTAGE / 100);
    const brokerage = basePrice * (FINANCIAL.BROKERAGE_PERCENTAGE / 100);
    const totalWithFees = basePrice + vat + brokerage + FINANCIAL.REGISTRATION_FEES;
    const remaining = totalWithFees - (downPayment || 0);

    return {
        base_price: basePrice,
        price_per_sqm: areaSqm > 0 ? basePrice / areaSqm : null,
        negotiated_discount: { amount: 0, reason: null },
        platform_commission: { percentage: 0, amount: 0 },
        agent_commission: { percentage: FINANCIAL.BROKERAGE_PERCENTAGE, amount: brokerage },
        legal_documentation_fees: 0,
        registration_fees: FINANCIAL.REGISTRATION_FEES,
        notarization_fees: 0,
        vat: { percentage: FINANCIAL.VAT_PERCENTAGE, amount: vat },
        other_fees: [],
        total_amount_due: totalWithFees,
        deposit_required: { amount: downPayment || 0, deadline: null },
        remaining_balance: remaining,
    };
}

/**
 * Builds the payment plan section.
 * @param {string} paymentMethod
 * @param {number} basePrice
 * @param {number} installmentYears
 * @returns {Object} payment_plan section
 */
function buildPaymentPlan(paymentMethod, basePrice, installmentYears) {
    let installmentSchedule = null;
    if (installmentYears > 0) {
        const monthlyAmount = basePrice / (installmentYears * 12);
        installmentSchedule = [
            {
                payment_number: 1,
                amount: monthlyAmount,
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'PENDING',
            },
        ];
    }
    return {
        payment_method: paymentMethod || 'CASH',
        installment_schedule: installmentSchedule,
        mortgage_details: null,
    };
}

/**
 * Builds the full 10-section detailed invoice JSON.
 *
 * @param {Object} opts
 * @param {number}  opts.invoiceDbId     - Actual DB invoice ID (null for preview)
 * @param {Object}  opts.order           - Order DB row
 * @param {Object}  opts.property        - Property DB row (with loc_ar, loc_en)
 * @param {Object}  opts.buyer           - { first_name, last_name, email, phone_number }
 * @param {Object}  opts.seller          - { first_name, last_name, email, phone_number }
 * @param {string|null} opts.nationalId  - Buyer's provided national ID
 * @param {string|null} opts.address     - Buyer's provided address
 * @param {string|null} opts.paymentMethod
 * @param {boolean} opts.isPreview       - If true, omit sensitive IDs
 * @returns {{ detailedData: Object, totalWithFees: number }}
 */
function buildDetailedInvoice({
    invoiceDbId,
    order,
    property,
    buyer,
    seller,
    nationalId,
    address,
    paymentMethod,
    isPreview = false,
}) {
    const now = new Date();
    const basePrice = parseFloat(property.price);
    const areaSqm = parseFloat(property.area_sqm || 1);
    const downPayment = parseFloat(property.down_payment || 0);
    const installmentYears = property.installment_years || 0;

    const financial = buildFinancialBreakdown(basePrice, areaSqm, downPayment, paymentMethod, installmentYears);
    const payment = buildPaymentPlan(paymentMethod, basePrice, installmentYears);

    // Generate human-readable invoice ID
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const invoiceId = isPreview
        ? 'DRAFT-PREVIEW'
        : `INV-${year}${month}${day}-${String(invoiceDbId).padStart(4, '0')}`;

    const detailedData = {
        invoice_metadata: {
            invoice_id: invoiceId,
            issue_date: now.toISOString(),
            expiry_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'PENDING_APPROVAL',
            transaction_type: property.listing_type === 'sale' ? 'BUY' : 'RENT',
            currency: 'EGP',
        },

        // ── PARTIES: full data stored internally ──
        // The getDetailedInvoice controller applies role-based scoping before returning.
        parties: {
            buyer: {
                full_name: `${buyer.first_name} ${buyer.last_name}`,
                contact_email: buyer.email,
                contact_phone: buyer.phone_number,
                national_id: nationalId || null,
                address: address || null,
            },
            seller: {
                full_name: `${seller.first_name} ${seller.last_name}`,
                contact_email: seller.email,
                contact_phone: seller.phone_number,
                national_id: null,
                address: null,
            },
            agent: null,
            platform_admin: {
                assigned_admin_id: null,  // Assigned when admin takes action
                review_status: 'AWAITING_REVIEW',
            },
        },

        property_details: {
            property_id: property.id,
            title: property.title_en || property.title_ar,
            title_ar: property.title_ar,
            type: property.listing_type || 'apartment',
            location: {
                country: 'Egypt',
                city: property.loc_en || null,
                city_ar: property.loc_ar || null,
                district: null,
                street: null,
                building_number: null,
                floor: null,
                unit_number: null,
            },
            area_sqm: areaSqm,
            legal_status: property.legal_status === 'registered' ? 'clean title' : 'under review',
            registration_number: null,
            deed_number: null,
            year_built: null,
            furnishing_status: property.finishing_type || null,
            condition: null,
        },

        financial_breakdown: financial,

        payment_plan: payment,

        legal_compliance_flags: {
            is_title_clear: property.legal_status === 'registered',
            outstanding_debts: false,
            outstanding_debts_details: [],
            liens_or_encumbrances: false,
            requires_noc: false,
            anti_money_laundering_check: 'pending',  // Default pending until admin reviews
            compliance_notes: null,
        },

        approval_workflow: {
            seller_approval: { status: 'PENDING', approved_at: null, signature: null },
            admin_approval: { status: 'PENDING', approved_at: null, admin_id: null, notes: '' },
            final_status: 'PENDING',
            rejection_reason: null,
        },

        attached_documents_checklist: [
            { document: 'buyer_id', status: nationalId ? 'provided' : 'missing' },
            { document: 'seller_id', status: 'missing' },
            { document: 'property_deed', status: 'provided' },
        ],

        terms_and_conditions: {
            cancellation_policy: {
                before_admin_approval: 'Standard real estate cancellation policy applies.',
                after_admin_approval_before_signing: '10% penalty on total amount if cancelled after seller approval.',
                after_contract_signing: 'No refund — governing law applies.',
            },
            dispute_resolution: 'Arbitration in Cairo',
            governing_law: 'Egyptian Law',
            validity_clause: 'Valid for 30 days from issue date',
        },

        audit_trail: {
            creation_timestamp: now.toISOString(),
            last_modified_at: now.toISOString(),
            created_by: order ? `Buyer ID: ${order.client_id}` : 'SYSTEM-PREVIEW',
            modification_history: [],
        },

        final_status: 'DRAFT',
    };

    return {
        detailedData,
        totalWithFees: financial.total_amount_due,
    };
}

/**
 * Applies role-based scoping to a detailed invoice before returning to the client.
 * Only the admin receives the full, unredacted data.
 *
 * @param {Object} detailedData  - The full internal detailed_data JSON
 * @param {'buyer'|'seller'|'admin'} viewerRole - The calling user's role relative to this invoice
 * @returns {Object} Scoped copy safe to send to the caller
 */
function scopeInvoiceForViewer(detailedData, viewerRole) {
    if (!detailedData) return null;

    // Admin always gets everything
    if (viewerRole === 'admin') {
        return { ...detailedData, _viewer_role: 'admin' };
    }

    // Deep-clone to avoid mutating the cached data
    const scoped = JSON.parse(JSON.stringify(detailedData));

    if (viewerRole === 'buyer') {
        // Buyer sees: their own info, property, financials, payment plan, their approval step
        // Buyer does NOT see: seller PII, admin notes, AML flags, platform audit trail, platform commission
        if (scoped.parties && scoped.parties.seller) {
            scoped.parties.seller.contact_email = null;
            scoped.parties.seller.contact_phone = null;
            scoped.parties.seller.national_id = null;
            scoped.parties.seller.address = null;
        }
        if (scoped.parties) {
            scoped.parties.platform_admin = null;
        }
        if (scoped.financial_breakdown) {
            scoped.financial_breakdown.platform_commission = null;
        }
        if (scoped.legal_compliance_flags) {
            scoped.legal_compliance_flags.anti_money_laundering_check = null;
            scoped.legal_compliance_flags.compliance_notes = null;
        }
        // Strip internal audit trail and admin notes
        scoped.audit_trail = null;
        if (scoped.approval_workflow && scoped.approval_workflow.admin_approval) {
            scoped.approval_workflow.admin_approval.notes = null;
            scoped.approval_workflow.admin_approval.admin_id = null;
        }

    } else if (viewerRole === 'seller') {
        // Seller sees: their own info, property, their approval action
        // Seller does NOT see: buyer PII, admin notes, AML flags, platform commission, audit trail
        if (scoped.parties && scoped.parties.buyer) {
            scoped.parties.buyer.national_id = null;
            scoped.parties.buyer.contact_email = null;
            scoped.parties.buyer.contact_phone = null;
            scoped.parties.buyer.address = null;
        }
        if (scoped.parties) {
            scoped.parties.platform_admin = null;
        }
        if (scoped.financial_breakdown) {
            scoped.financial_breakdown.platform_commission = null;
        }
        if (scoped.legal_compliance_flags) {
            scoped.legal_compliance_flags.anti_money_laundering_check = null;
            scoped.legal_compliance_flags.compliance_notes = null;
        }
        // Strip audit trail and admin decision detail
        scoped.audit_trail = null;
        if (scoped.approval_workflow && scoped.approval_workflow.admin_approval) {
            scoped.approval_workflow.admin_approval.notes = null;
            scoped.approval_workflow.admin_approval.admin_id = null;
        }
    }

    scoped._viewer_role = viewerRole;
    return scoped;
}

module.exports = {
    FINANCIAL,
    buildDetailedInvoice,
    scopeInvoiceForViewer,
    buildFinancialBreakdown,
    buildPaymentPlan,
};
