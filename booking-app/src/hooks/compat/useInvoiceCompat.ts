import { Invoice, InvoiceStatus, FinancialSummary } from '@/types/financial';
import { useInvoicesQuery } from '@/hooks/queries/useInvoicesQuery';
import { useInvoiceMutations } from '@/hooks/mutations/useInvoiceMutations';

// ponytail: drop-in replacement for the old localStorage invoice-store,
// scoped to the methods consumers actually call.
export function useInvoiceCompat() {
  const { data: invoices = [] } = useInvoicesQuery();
  const mutations = useInvoiceMutations();

  const createInvoice = async (
    invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'invoiceNumber' | 'paidAmount' | 'remainingAmount'>
  ) => {
    return mutations.createInvoice.mutateAsync({
      ...invoiceData,
      paidAmount: 0,
      remainingAmount: invoiceData.total,
    });
  };

  const updateInvoiceStatus = async (id: string, status: InvoiceStatus) => {
    await mutations.updateInvoice.mutateAsync({ id, updates: { status } });
  };

  const markInvoiceAsSent = async (id: string) => {
    await mutations.markInvoiceAsSent.mutateAsync(id);
  };

  const markInvoiceAsPaid = async (id: string, paymentMethod: string, transactionId?: string) => {
    await mutations.markInvoiceAsPaid.mutateAsync({ id, paymentMethod, transactionId });
  };

  const getInvoicesByDateRange = (startDate: string, endDate: string) =>
    invoices.filter((inv) => inv.createdAt >= startDate && inv.createdAt <= endDate);

  const getInvoicesByStatus = (status: InvoiceStatus) =>
    invoices.filter((inv) => inv.status === status);

  const getOverdueInvoices = () =>
    invoices.filter((inv) => new Date(inv.dueDate) < new Date() && inv.status !== 'paid');

  const getTotalRevenue = (startDate?: string, endDate?: string) => {
    let list = invoices.filter((inv) => inv.status === 'paid');
    if (startDate && endDate) {
      list = list.filter((inv) => inv.createdAt >= startDate && inv.createdAt <= endDate);
    }
    return list.reduce((sum, inv) => sum + inv.total, 0);
  };

  const getTotalOutstanding = () =>
    invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);

  const getOverdueAmount = () =>
    getOverdueInvoices().reduce((sum, inv) => sum + inv.remainingAmount, 0);

  const searchInvoices = (query: string) => {
    const q = query.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerEmail.toLowerCase().includes(q)
    );
  };

  const getFinancialSummary = (startDate: string, endDate: string): FinancialSummary => {
    const list = getInvoicesByDateRange(startDate, endDate);
    const totalInvoiced = list.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = list.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOutstanding = list.reduce((sum, inv) => sum + inv.remainingAmount, 0);
    const overdueInvoices = list.filter(
      (inv) => new Date(inv.dueDate) < new Date() && inv.status !== 'paid'
    );

    return {
      period: { startDate, endDate },
      revenue: {
        totalRevenue: totalPaid,
        totalBookings: list.length,
        averageBookingValue: list.length > 0 ? totalPaid / list.length : 0,
        conversionRate: 0,
      },
      invoices: {
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        overdueAmount: overdueInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0),
        overdueCount: overdueInvoices.length,
      },
      commissions: {
        totalCommissionsEarned: 0,
        totalCommissionsPaid: 0,
        totalCommissionsPending: 0,
      },
      expenses: {
        totalExpenses: 0,
        expensesByCategory: {} as any,
      },
      profitLoss: {
        grossProfit: totalPaid,
        netProfit: totalPaid,
        profitMargin: totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0,
      },
      cashFlow: {
        cashInflow: totalPaid,
        cashOutflow: 0,
        netCashFlow: totalPaid,
      },
    };
  };

  return {
    invoices,
    createInvoice,
    updateInvoiceStatus,
    markInvoiceAsSent,
    markInvoiceAsPaid,
    getInvoicesByStatus,
    getOverdueInvoices,
    getTotalRevenue,
    getTotalOutstanding,
    getOverdueAmount,
    searchInvoices,
    getFinancialSummary,
  };
}
