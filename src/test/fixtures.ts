// Typed msw fixtures for M3's tests — a screen/hook test wants a whole
// `SalesOrderDetailOut`/`PaymentDetailOut`/`DeliverableOut`/`MeOut` just to
// exercise one field's effect on the UI, and re-typing every required field
// by hand in every test file (as M2's own tests do — see
// `OrderDetailScreen.test.tsx`'s `baseOrder`) gets old fast once three more
// screens need the same shapes. `over` replaces top-level fields only (no
// deep merge) — a test that needs to change one nested `summary`/`lines`
// entry passes the whole replacement array/object, same as `baseOrder`'s own
// convention.
//
// Existing M2 tests keep their own inline builders (not rewritten here) —
// only new M3 tests are expected to use these.
import type { Schemas } from '@/lib/api/types';

export function orderDetail(over: Partial<Schemas['SalesOrderDetailOut']> = {}): Schemas['SalesOrderDetailOut'] {
  return {
    id: 'o1',
    number: 'POS-26-27-000041',
    customer_id: 'c1',
    customer_name: 'Arjun Mehta',
    customer_gstin: null,
    billing_address: {},
    shipping_address: {},
    place_of_supply_state: 'TN',
    payment_terms_id: null,
    payment_terms_name: null,
    payment_terms_days: null,
    sales_user_id: 'u1',
    sales_user_name: 'Karthik S',
    department_id: null,
    team_id: null,
    warehouse_id: 'w1',
    warehouse_name: 'Main warehouse',
    order_date: '2026-08-12',
    expected_delivery_date: '2026-08-20',
    remarks: null,
    order_discount_pct: '0',
    gross: '99800.00',
    line_discount: '0.00',
    order_discount: '0.00',
    taxable: '99800.00',
    tax: '0.00',
    net: '99800.00',
    phase: 'draft',
    reservation_status: 'not_reserved',
    delivery_status: 'not_delivered',
    invoice_status: 'not_invoiced',
    payment_status: 'unpaid',
    verified_by: null,
    verified_by_name: null,
    verified_at: null,
    cancelled_by: null,
    cancelled_at: null,
    cancel_reason: null,
    closed_by: null,
    closed_at: null,
    close_reason: null,
    created_by: null,
    created_at: '2026-08-12T10:00:00Z',
    summary: {
      order_value: '99800.00',
      advance_received: '0.00',
      delivered_value: '0.00',
      invoiced_value: '0.00',
      paid_amount: '0.00',
      receivable: '99800.00',
      unbilled_delivered_value: '0.00',
      ordered_qty: '40',
      reserved_qty: '0',
      delivered_qty: '0',
      invoiced_qty: '0',
      open_shortage_count: 0,
    },
    lines: [
      {
        id: 'l1',
        line_no: 1,
        variant_id: 'v1',
        product_id: 'p1',
        sku: 'SKU-1',
        product_name: 'Shirt',
        variant_label: 'M / Blue',
        hsn_code: '6109',
        uom: 'PCS',
        qty: '40',
        rate: '2495.00',
        discount_pct: '0',
        discount_amount: '0.00',
        order_discount_amount: '0.00',
        taxable_amount: '99800.00',
        tax_rate: '0',
        tax_amount: '0.00',
        line_total: '99800.00',
        reserved_qty: '0',
        delivered_qty: '0',
        invoiced_qty: '0',
        invoiceable_qty: '0',
        remaining_qty: '40',
        deliverable: '0',
        remarks: null,
      },
    ],
    reservations: [],
    delivery_notes: [],
    invoices: [],
    payments: [],
    shortages: [],
    warnings: [],
    ...over,
  };
}

export function paymentDetail(over: Partial<Schemas['PaymentDetailOut']> = {}): Schemas['PaymentDetailOut'] {
  return {
    id: 'pay1',
    number: 'PMT-26-27-000012',
    status: 'draft',
    customer_id: 'c1',
    customer_name: 'Arjun Mehta',
    sales_order_id: null,
    so_number: null,
    payment_date: '2026-08-27',
    amount: '5000.00',
    allocated: '0.00',
    unallocated: '5000.00',
    currency: 'INR',
    payment_mode_id: 'pm1',
    payment_mode_name: 'Cash',
    reference: null,
    remarks: null,
    submitted_by: null,
    submitted_by_name: null,
    submitted_at: null,
    cancelled_by: null,
    cancelled_at: null,
    cancel_reason: null,
    created_by: 'u1',
    created_by_name: 'Karthik S',
    created_at: '2026-08-27T10:00:00Z',
    allocations: [],
    warnings: [],
    ...over,
  };
}

export function deliverable(over: Partial<Schemas['DeliverableOut']> = {}): Schemas['DeliverableOut'] {
  return {
    so_id: 'o1',
    number: 'POS-26-27-000041',
    phase: 'ready_for_stock_check',
    delivery_status: 'not_delivered',
    warehouse_id: 'w1',
    warehouse_name: 'Main warehouse',
    lines: [
      {
        so_line_id: 'l1',
        variant_id: 'v1',
        sku: 'SKU-1',
        product_name: 'Shirt',
        variant_label: 'M / Blue',
        uom: 'PCS',
        ordered: '40',
        reserved: '40',
        delivered: '0',
        eligible: '40',
        reservations: [
          {
            reservation_line_id: 'rl1',
            reservation_id: 'r1',
            reservation_number: 'RES-26-27-000001',
            reserved_qty: '40',
            released_qty: '0',
            delivered_qty: '0',
            open_dn_qty: '0',
            remaining: '40',
          },
        ],
      },
    ],
    ...over,
  };
}

export function me(
  permissions: Record<string, string>,
  over: Partial<Schemas['MeOut']> = {},
): Schemas['MeOut'] {
  return {
    id: 'u1',
    email: 'k@ace.in',
    name: 'Karthik S',
    is_superadmin: false,
    permissions,
    department_id: null,
    team_id: null,
    roles: [],
    ...over,
  };
}
