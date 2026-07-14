import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Invoice, Payment } from '@/types';
import type { Json } from '@/types/database';

export function useInvoiceMutations() {
  const queryClient = useQueryClient();
  const { user, org } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const createInvoice = useMutation({
    mutationFn: async (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'invoiceNumber'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!org?.id) throw new Error('No organization');

      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          org_id: org.id,
          invoice_number: invoiceNumber,
          quote_id: invoiceData.quoteId,
          customer_id: invoiceData.customerId,
          customer_name: invoiceData.customerName,
          customer_email: invoiceData.customerEmail,
          customer_address: invoiceData.customerAddress ? JSON.stringify(invoiceData.customerAddress) : null,
          issue_date: invoiceData.issueDate,
          due_date: invoiceData.dueDate,
          status: invoiceData.status,
          items: invoiceData.items as unknown as Json,
          subtotal: invoiceData.subtotal,
          tax_rate: invoiceData.taxRate,
          tax_amount: invoiceData.taxAmount,
          discount_amount: invoiceData.discountAmount || 0,
          total: invoiceData.total,
          paid_amount: invoiceData.paidAmount || 0,
          remaining_amount: invoiceData.remainingAmount || invoiceData.total,
          currency: invoiceData.currency || 'USD',
          notes: invoiceData.notes,
          terms: invoiceData.terms,
          payments: (invoiceData.payments || []) as unknown as Json,
          sent_at: invoiceData.sentAt,
          viewed_at: invoiceData.viewedAt,
          paid_at: invoiceData.paidAt,
          overdue_at: invoiceData.overdueAt,
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', org?.id] });
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Invoice> }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updateData: any = {};
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.items !== undefined) updateData.items = updates.items;
      if (updates.subtotal !== undefined) updateData.subtotal = updates.subtotal;
      if (updates.taxRate !== undefined) updateData.tax_rate = updates.taxRate;
      if (updates.taxAmount !== undefined) updateData.tax_amount = updates.taxAmount;
      if (updates.discountAmount !== undefined) updateData.discount_amount = updates.discountAmount;
      if (updates.total !== undefined) updateData.total = updates.total;
      if (updates.paidAmount !== undefined) updateData.paid_amount = updates.paidAmount;
      if (updates.remainingAmount !== undefined) updateData.remaining_amount = updates.remainingAmount;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.terms !== undefined) updateData.terms = updates.terms;
      if (updates.payments !== undefined) updateData.payments = updates.payments;
      if (updates.sentAt !== undefined) updateData.sent_at = updates.sentAt;
      if (updates.viewedAt !== undefined) updateData.viewed_at = updates.viewedAt;
      if (updates.paidAt !== undefined) updateData.paid_at = updates.paidAt;
      if (updates.overdueAt !== undefined) updateData.overdue_at = updates.overdueAt;

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', org?.id] });
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', org?.id] });
    },
  });

  const markInvoiceAsSent = useMutation({
    mutationFn: async (invoiceId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', org?.id] });
    },
  });

  const markInvoiceAsViewed = useMutation({
    mutationFn: async (invoiceId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('invoices')
        .update({
          viewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', org?.id] });
    },
  });

  const markInvoiceAsPaid = useMutation({
    mutationFn: async ({
      id,
      paymentMethod,
      transactionId
    }: {
      id: string;
      paymentMethod: string;
      transactionId?: string
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const payment: Payment = {
        id: crypto.randomUUID(),
        invoiceId: id,
        amount: invoice.remaining_amount || invoice.total,
        method: paymentMethod as Payment['method'],
        status: 'completed',
        processedDate: new Date().toISOString(),
        transactionId: transactionId || `TXN-${Date.now()}`,
      };

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_amount: invoice.total,
          remaining_amount: 0,
          paid_at: new Date().toISOString(),
          payments: [...((invoice.payments as unknown as Payment[]) || []), payment] as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', org?.id] });
    },
  });

  const addPayment = useMutation({
    mutationFn: async ({
      invoiceId,
      payment
    }: {
      invoiceId: string;
      payment: Omit<Payment, 'id'>
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (fetchError) throw fetchError;

      const newPayment: Payment = { ...payment, id: crypto.randomUUID() };
      const newPaidAmount = (invoice.paid_amount || 0) + payment.amount;
      const newRemainingAmount = invoice.total - newPaidAmount;
      const newStatus = newRemainingAmount <= 0 ? 'paid' : 'partial';

      const { error } = await supabase
        .from('invoices')
        .update({
          payments: [...((invoice.payments as unknown as Payment[]) || []), newPayment] as unknown as Json,
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : invoice.paid_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', org?.id] });
    },
  });

  const voidInvoice = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'void',
          notes: reason ? `VOIDED: ${reason}` : 'VOIDED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', org?.id] });
    },
  });

  const generateInvoiceFromQuote = useMutation({
    mutationFn: async ({
      quoteId,
      customerData,
      terms,
      dueDays = 30
    }: {
      quoteId: string;
      customerData: {
        customerId: string;
        customerName: string;
        customerEmail: string;
        customerAddress?: string;
      };
      terms?: string;
      dueDays?: number;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!org?.id) throw new Error('No organization');

      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('quote_id', quoteId)
        .maybeSingle();

      if (existingInvoice) return existingInvoice.id;

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const issueDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const invoiceItems = ((quote.items as any[]) || []).map((item: any) => ({
        id: crypto.randomUUID(),
        description: item.name || item.description || 'Travel Service',
        quantity: item.quantity || 1,
        unitPrice: item.price,
        total: item.price * (item.quantity || 1),
        taxRate: 0,
        taxAmount: 0,
      }));

      const subtotal = invoiceItems.reduce((sum: number, item: any) => sum + item.total, 0);
      const total = subtotal;

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          org_id: org.id,
          invoice_number: invoiceNumber,
          quote_id: quoteId,
          customer_id: customerData.customerId,
          customer_name: customerData.customerName,
          customer_email: customerData.customerEmail,
          customer_address: customerData.customerAddress,
          issue_date: issueDate,
          due_date: dueDate,
          status: 'draft',
          items: invoiceItems,
          subtotal,
          tax_rate: 0,
          tax_amount: 0,
          discount_amount: 0,
          total,
          paid_amount: 0,
          remaining_amount: total,
          currency: 'USD',
          terms: terms || 'Net 30',
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', org?.id] });
    },
  });

  const approveDraft = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates?: Partial<Invoice> }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updateData: any = {
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (updates?.items !== undefined) updateData.items = updates.items;
      if (updates?.subtotal !== undefined) updateData.subtotal = updates.subtotal;
      if (updates?.total !== undefined) updateData.total = updates.total;
      if (updates?.taxRate !== undefined) updateData.tax_rate = updates.taxRate;
      if (updates?.taxAmount !== undefined) updateData.tax_amount = updates.taxAmount;
      if (updates?.discountAmount !== undefined) updateData.discount_amount = updates.discountAmount;
      if (updates?.remainingAmount !== undefined) updateData.remaining_amount = updates.remainingAmount;
      if (updates?.notes !== undefined) updateData.notes = updates.notes;
      if (updates?.terms !== undefined) updateData.terms = updates.terms;

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .eq('status', 'draft');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', org?.id] });
    },
  });

  const bulkApproveDrafts = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', ids)
        .eq('status', 'draft');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', org?.id] });
    },
  });

  return {
    createInvoice,
    updateInvoice,
    deleteInvoice,
    markInvoiceAsSent,
    markInvoiceAsViewed,
    markInvoiceAsPaid,
    addPayment,
    voidInvoice,
    generateInvoiceFromQuote,
    approveDraft,
    bulkApproveDrafts,
  };
}
