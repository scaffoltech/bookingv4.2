import { Invoice, InvoiceItem, Payment, InvoiceStatus } from '@/types/financial';

// Shared DB row (snake_case) → Invoice (camelCase) mapper — parallel to
// quote-mapper.ts. `customer_address` is a plain text column holding a
// JSON-stringified Address (see useInvoiceMutations.createInvoice).
export function dbRowToInvoice(row: any): Invoice {
  let customerAddress: Invoice['customerAddress'];
  if (row.customer_address) {
    try {
      customerAddress = JSON.parse(row.customer_address);
    } catch {
      customerAddress = undefined;
    }
  }

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    quoteId: row.quote_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerAddress,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    status: row.status as InvoiceStatus,
    currency: row.currency ?? undefined,
    items: (row.items as InvoiceItem[]) || [],
    subtotal: row.subtotal ?? 0,
    taxRate: row.tax_rate ?? 0,
    taxAmount: row.tax_amount ?? 0,
    discountAmount: row.discount_amount ?? undefined,
    total: row.total,
    payments: (row.payments as Payment[]) || [],
    paidAmount: row.paid_amount ?? 0,
    remainingAmount: row.remaining_amount,
    sentAt: row.sent_at ?? undefined,
    viewedAt: row.viewed_at ?? undefined,
    paidAt: row.paid_at ?? undefined,
    overdueAt: row.overdue_at ?? undefined,
    terms: row.terms ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
