import { getStripeInstance, calculateStripeFee, calculateSmartDepositAmount } from '@/lib/stripe/config';
import { PaymentType } from '@/types/payment';
import { TravelQuote } from '@/types';
import { createAdminClient } from '@/lib/supabase/server';
import { dbRowToQuote } from '@/lib/quote-mapper';
import { orchestrateBooking } from '@/lib/booking/orchestrator';
import type { Json } from '@/types/database';

export class PaymentVerificationError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'PaymentVerificationError';
  }
}

interface ConfirmResult {
  success: true;
  paymentId: string;
  invoiceId: string | null;
  commissionId: string | null;
  status: 'completed';
  paymentStatus: string;
  totalPaid: number;
  remainingBalance: number;
  receiptUrl?: string;
  idempotent?: boolean;
}

/**
 * Verify caller (an authenticated agent user, or null for the token-gated
 * client portal) is allowed to confirm payment for this quote's org.
 * Throws PaymentVerificationError on failure.
 */
async function assertCallerCanAccessOrg(callerUserId: string | null, orgId: string) {
  if (!callerUserId) return; // client-portal callers are authorized by HMAC token upstream
  const supabase = await createAdminClient();
  const { data: membership } = await supabase
    .from('org_memberships')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', callerUserId)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    throw new PaymentVerificationError('You do not have access to this organization', 403);
  }
}

/**
 * Confirm a Stripe payment and fan out every downstream record (payment,
 * transaction, expense, invoice, booking, commission, supplier expenses,
 * booking orchestration). Loads the quote from the database by the
 * PaymentIntent's own metadata — a client-supplied quote object is never
 * trusted for money math or item contents.
 */
export async function confirmPayment(
  paymentIntentId: string,
  callerUserId: string | null,
  expectedQuoteId?: string
): Promise<ConfirmResult> {
  if (!paymentIntentId) {
    throw new PaymentVerificationError('Missing required field: paymentIntentId', 400);
  }

  const supabase = await createAdminClient();

  // === IDEMPOTENCY CHECK ===
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, amount, status, quote_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (existingPayment && existingPayment.quote_id) {
    const quoteId = existingPayment.quote_id;
    const { data: invoice } = await supabase.from('invoices').select('id').eq('quote_id', quoteId).maybeSingle();
    const { data: commission } = await supabase.from('commissions').select('id').eq('quote_id', quoteId).maybeSingle();
    const { data: quoteData } = await supabase
      .from('quotes')
      .select('payment_status, total_paid, remaining_balance')
      .eq('id', quoteId)
      .single();

    return {
      success: true,
      paymentId: existingPayment.id,
      invoiceId: invoice?.id || null,
      commissionId: commission?.id || null,
      status: 'completed',
      paymentStatus: quoteData?.payment_status || existingPayment.status || 'unpaid',
      totalPaid: quoteData?.total_paid || existingPayment.amount,
      remainingBalance: quoteData?.remaining_balance || 0,
      idempotent: true,
    };
  }
  // === END IDEMPOTENCY CHECK ===

  const stripe = getStripeInstance();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge'],
  });

  if (paymentIntent.status !== 'succeeded') {
    throw new PaymentVerificationError(`Payment not completed (status: ${paymentIntent.status})`, 400);
  }

  const quoteId = paymentIntent.metadata.quoteId;
  const paymentType = paymentIntent.metadata.paymentType as PaymentType;
  if (!quoteId || !paymentType) {
    throw new PaymentVerificationError('PaymentIntent is missing quoteId/paymentType metadata', 400);
  }
  if (expectedQuoteId && expectedQuoteId !== quoteId) {
    throw new PaymentVerificationError('PaymentIntent does not belong to this quote', 403);
  }

  const paymentAmount = paymentIntent.amount / 100; // cents -> dollars
  const stripeFee = calculateStripeFee(paymentAmount);
  const receiptUrl =
    typeof paymentIntent.latest_charge === 'object' ? paymentIntent.latest_charge?.receipt_url || undefined : undefined;

  // Load the quote from the DB — never trust a client-supplied quote object.
  const { data: quoteRow, error: quoteError } = await supabase.from('quotes').select('*').eq('id', quoteId).single();
  if (quoteError || !quoteRow) {
    throw new PaymentVerificationError('Quote not found in database', 404);
  }

  const userId: string = quoteRow.user_id;
  const orgId: string = quoteRow.org_id;
  await assertCallerCanAccessOrg(callerUserId, orgId);

  const quote: TravelQuote = dbRowToQuote(quoteRow);

  // Verify the PaymentIntent's org matches the quote's org (defends against
  // a metadata/quoteId mismatch or a PI minted for a different tenant).
  if (paymentIntent.metadata.orgId && paymentIntent.metadata.orgId !== orgId) {
    throw new PaymentVerificationError('PaymentIntent org does not match quote org', 403);
  }

  // Verify the charged amount matches what we'd expect for this payment type,
  // computed server-side from the DB quote (not the client).
  const expectedAmount = paymentType === 'deposit' ? calculateSmartDepositAmount(quote) : quote.totalCost;
  const amountTolerance = 0.5; // 50 cents, covers rounding
  if (Math.abs(paymentAmount - expectedAmount) > amountTolerance) {
    throw new PaymentVerificationError(
      `Charged amount ($${paymentAmount}) does not match expected ${paymentType} amount ($${expectedAmount.toFixed(2)})`,
      400
    );
  }

  // Insert payment record
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      org_id: orgId,
      quote_id: quoteId,
      amount: paymentAmount,
      currency: paymentIntent.currency,
      type: paymentType,
      status: 'succeeded',
      stripe_payment_intent_id: paymentIntentId,
      stripe_customer_id: (paymentIntent.customer as string) ?? null,
      payment_method: 'credit_card',
      payment_date: new Date().toISOString(),
      paid_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (paymentError) {
    // Unique-violation: the webhook and the browser's confirm call raced and
    // the other one won. Fall back to the idempotent-return path.
    if (paymentError.code === '23505') {
      return confirmPayment(paymentIntentId, callerUserId, expectedQuoteId);
    }
    throw paymentError;
  }
  const paymentId = payment.id;

  // Record payment received transaction
  const { data: paymentTxn } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      org_id: orgId,
      type: 'payment_received',
      status: 'completed',
      amount: paymentAmount,
      currency: paymentIntent.currency,
      quote_id: quoteId,
      payment_id: paymentId,
      description: `Payment received: ${paymentType === 'full' ? 'Full payment' : 'Deposit'} for quote ${quoteId}`,
      metadata: {
        paymentType,
        stripePaymentIntentId: paymentIntentId,
        processingFee: stripeFee,
      } as unknown as Json,
    })
    .select('id')
    .single();

  // Record Stripe processing fee as expense
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      user_id: userId,
      org_id: orgId,
      quote_id: quoteId,
      title: `Stripe Fee - Payment ${paymentId}`,
      category: 'technology',
      subcategory: 'payment_processing',
      description: `Stripe processing fee for payment ${paymentId}`,
      amount: stripeFee,
      currency: paymentIntent.currency,
      vendor: 'Stripe',
      date: new Date().toISOString().split('T')[0],
      payment_method: 'auto_deducted',
      receipt_url: receiptUrl,
      status: 'draft',
      notes: 'Auto-generated: Stripe processing fee. Verify amount before approving.',
    })
    .select()
    .single();

  if (expenseError) console.error('[confirmPayment] Failed to create Stripe fee expense:', expenseError);

  await supabase.from('transactions').insert({
    user_id: userId,
    org_id: orgId,
    type: 'expense_recorded',
    status: 'completed',
    amount: stripeFee,
    currency: paymentIntent.currency,
    quote_id: quoteId,
    payment_id: paymentId,
    expense_id: expense?.id,
    description: `Stripe processing fee for payment ${paymentId}`,
    related_transactions: paymentTxn?.id ? [paymentTxn.id] : [],
    metadata: { vendor: 'Stripe', category: 'technology' } as unknown as Json,
  });

  const invoiceId = await generateInvoiceForPayment(supabase, quote, quoteId, userId, paymentId, paymentAmount, orgId);
  const bookingId = await createBookingRecord(supabase, quote, quoteId, userId, paymentAmount, orgId);

  // Calculate payment status and update quote
  const { data: currentQuote } = await supabase.from('quotes').select('total_amount, total_paid').eq('id', quoteId).single();

  const newTotalPaid = (currentQuote?.total_paid || 0) + paymentAmount;
  const remainingBalance = (quote.totalCost || currentQuote?.total_amount || 0) - newTotalPaid;

  let newPaymentStatus: 'unpaid' | 'deposit_paid' | 'partially_paid' | 'paid_in_full' = 'unpaid';
  if (newTotalPaid >= (quote.totalCost || currentQuote?.total_amount || 0)) {
    newPaymentStatus = 'paid_in_full';
  } else if (newTotalPaid > 0) {
    newPaymentStatus = paymentType === 'deposit' ? 'deposit_paid' : 'partially_paid';
  }

  await supabase
    .from('quotes')
    .update({
      status: 'accepted',
      payment_status: newPaymentStatus,
      total_paid: newTotalPaid,
      remaining_balance: remainingBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', quoteId);

  const commissionId = await generateCommissionForBooking(supabase, quote, quoteId, invoiceId, userId, orgId);

  await createSupplierExpenses(supabase, quote, quoteId, userId, orgId);

  // Trigger booking orchestration
  if (bookingId) {
    try {
      if (newPaymentStatus === 'paid_in_full') {
        await supabase
          .from('bookings')
          .update({ orchestration_status: 'pending' })
          .eq('id', bookingId)
          .eq('orchestration_status', 'awaiting_payment');
      }
      await orchestrateBooking(bookingId, quoteId, userId);
    } catch (orchError) {
      console.error('[confirmPayment] Orchestration failed:', orchError);
    }
  }

  return {
    success: true,
    paymentId,
    invoiceId,
    commissionId,
    status: 'completed',
    paymentStatus: newPaymentStatus,
    totalPaid: newTotalPaid,
    remainingBalance,
    receiptUrl,
  };
}

async function generateInvoiceForPayment(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  quote: TravelQuote,
  quoteId: string,
  userId: string,
  paymentId: string,
  paymentAmount: number,
  orgId: string
): Promise<string | null> {
  try {
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('quote_id', quoteId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingInvoice) return existingInvoice.id;

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const { data: contact } = await supabase.from('contacts').select('*').eq('id', quote.contactId).single();

    const total = quote.totalCost;
    const remainingAmount = total - paymentAmount;

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        quote_id: quoteId,
        user_id: userId,
        org_id: orgId,
        contact_id: quote.contactId,
        invoice_number: invoiceNumber,
        total,
        paid_amount: paymentAmount,
        remaining_amount: remainingAmount,
        currency: 'USD',
        status: 'draft',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: quote.items as unknown as Json,
        customer_name: contact ? `${contact.first_name} ${contact.last_name}`.trim() : quote.customerName,
        customer_email: contact?.email,
        notes: 'Auto-generated draft. Review amounts and items before approving.',
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    await supabase.from('payments').update({ invoice_id: invoice.id }).eq('id', paymentId);

    return invoice.id;
  } catch (error) {
    console.error('[confirmPayment] Invoice generation failed:', error);
    return null;
  }
}

async function createBookingRecord(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  quote: TravelQuote,
  quoteId: string,
  userId: string,
  paidAmount: number,
  orgId: string
): Promise<string | null> {
  try {
    const { data: existingBooking } = await supabase.from('bookings').select('id').eq('quote_id', quoteId).maybeSingle();

    if (existingBooking) {
      await supabase
        .from('bookings')
        .update({
          payment_status: paidAmount >= quote.totalCost ? 'paid' : 'partial',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBooking.id);
      return existingBooking.id;
    }

    const bookingReference = `BKG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        org_id: orgId,
        quote_id: quoteId,
        contact_id: quote.contactId,
        booking_reference: bookingReference,
        status: 'pending',
        total_amount: quote.totalCost,
        currency: 'USD',
        payment_status: paidAmount >= quote.totalCost ? 'paid' : 'partial',
        notes: `Automatically created from quote ${quoteId} after payment.`,
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    if (quote.items && quote.items.length > 0) {
      const bookingItems = quote.items.map((item) => ({
        booking_id: booking.id,
        quote_item_id: item.id,
        type: item.type,
        name: item.name,
        start_date: item.startDate,
        end_date: item.endDate || item.startDate,
        price: item.price,
        quantity: item.quantity || 1,
        details: (item.details || {}) as unknown as Json,
        supplier: item.supplier,
        supplier_source: item.supplierSource,
        supplier_cost: item.supplierCost,
        client_price: item.clientPrice || item.price,
        booking_status: 'holding',
      }));

      const { error: itemsError } = await supabase.from('booking_items').insert(bookingItems);
      if (itemsError) console.error('[confirmPayment] Failed to create booking items:', itemsError);
    }

    return booking.id;
  } catch (error) {
    console.error('[confirmPayment] Booking creation failed:', error);
    return null;
  }
}

async function generateCommissionForBooking(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  quote: TravelQuote,
  quoteId: string,
  invoiceId: string | null,
  userId: string,
  orgId: string
): Promise<string | null> {
  try {
    const { data: existingCommission } = await supabase
      .from('commissions')
      .select('id')
      .eq('quote_id', quoteId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingCommission) return existingCommission.id;

    const { data: contact } = await supabase.from('contacts').select('*').eq('id', quote.contactId).single();
    const { data: agentProfile } = await supabase.from('users').select('full_name, email').eq('id', userId).single();
    const agentName = agentProfile?.full_name || agentProfile?.email || 'Agent';

    const defaultRates: Record<string, number> = { hotel: 10, flight: 5, activity: 12, transfer: 8 };

    let commissionRate: number;
    let commissionAmount: number;

    if (quote.commissionRate) {
      commissionRate = quote.commissionRate;
      commissionAmount = (quote.totalCost * commissionRate) / 100;
    } else {
      commissionAmount = quote.items.reduce((total, item) => {
        const itemRate = defaultRates[item.type] || 10;
        return total + (item.price * itemRate) / 100;
      }, 0);
      commissionRate = quote.totalCost > 0 ? (commissionAmount / quote.totalCost) * 100 : 10;
    }

    const { data: commission, error: commissionError } = await supabase
      .from('commissions')
      .insert({
        user_id: userId,
        org_id: orgId,
        agent_id: userId,
        agent_name: agentName,
        customer_id: quote.contactId,
        customer_name: contact ? `${contact.first_name} ${contact.last_name}`.trim() : quote.customerName,
        quote_id: quoteId,
        invoice_id: invoiceId,
        booking_amount: quote.totalCost,
        commission_amount: commissionAmount,
        commission_rate: Math.round(commissionRate * 100) / 100,
        currency: 'USD',
        status: 'draft',
        booking_type: quote.items.length === 1 ? quote.items[0].type : 'package',
        notes: 'Auto-generated draft. Review commission rate and amount before approving.',
      })
      .select()
      .single();

    if (commissionError) throw commissionError;
    return commission.id;
  } catch (error) {
    console.error('[confirmPayment] Commission generation failed:', error);
    return null;
  }
}

async function createSupplierExpenses(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  quote: TravelQuote,
  quoteId: string,
  userId: string,
  orgId: string
) {
  try {
    for (const item of quote.items) {
      const hasSupplierCost = item.supplierCost && item.supplierCost > 0;
      const supplier = item.supplier || 'Unknown Supplier';
      const supplierSource = item.supplierSource || 'offline_agent';

      const { data: existingSupplier } = await supabase
        .from('contacts')
        .select('*')
        .eq('company', supplier)
        .eq('type', 'supplier')
        .eq('org_id', orgId)
        .maybeSingle();

      let supplierId = existingSupplier?.id;

      if (!existingSupplier) {
        const { data: newSupplier } = await supabase
          .from('contacts')
          .insert({
            user_id: userId,
            org_id: orgId,
            first_name: supplier,
            last_name: '(Supplier)',
            email: `supplier-${Date.now()}@example.com`,
            company: supplier,
            type: 'supplier',
            tags: ['supplier'],
          })
          .select()
          .single();
        supplierId = newSupplier?.id;
      }

      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          user_id: userId,
          org_id: orgId,
          title: `${supplier} - ${item.type}: ${item.name}`,
          category: 'supplier_payment',
          subcategory: item.type,
          description: `Supplier cost for ${item.type}: ${item.name}`,
          amount: hasSupplierCost ? item.supplierCost! : 0,
          currency: 'USD',
          vendor: supplier,
          supplier_id: supplierId,
          date: item.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          status: 'draft',
          quote_id: quoteId,
          notes: hasSupplierCost
            ? `Auto-generated draft. Source: ${supplierSource}. Review before approving.`
            : `Auto-generated draft. WARNING: Supplier cost unknown — enter actual cost before approving. Source: ${supplierSource}`,
        })
        .select()
        .single();

      if (expenseError) console.error(`[confirmPayment] Failed to create supplier expense for ${supplier}:`, expenseError);
    }
  } catch (error) {
    console.error('[confirmPayment] Supplier expense creation failed:', error);
  }
}
