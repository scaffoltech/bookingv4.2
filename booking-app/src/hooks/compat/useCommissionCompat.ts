import { Commission, CommissionStatus, PaymentMethod } from '@/types/financial';
import { useCommissionsQuery } from '@/hooks/queries/useCommissionsQuery';
import { useCommissionMutations } from '@/hooks/mutations/useCommissionMutations';

// ponytail: drop-in replacement for the old localStorage commission-store,
// scoped to the methods consumers actually call.
export function useCommissionCompat() {
  const { data: commissions = [] } = useCommissionsQuery();
  const mutations = useCommissionMutations();

  const approveCommission = async (id: string) => {
    await mutations.approve.mutateAsync(id);
  };

  const bulkApproveCommissions = async (ids: string[]) => {
    await mutations.bulkApprove.mutateAsync(ids);
  };

  const markCommissionAsPaid = async (id: string, paymentMethod: PaymentMethod) => {
    await mutations.markAsPaid.mutateAsync({ id, paymentMethod });
  };

  const bulkMarkAsPaid = async (ids: string[], paymentMethod: PaymentMethod) => {
    await mutations.bulkMarkAsPaid.mutateAsync({ ids, paymentMethod });
  };

  const generateCommissionFromBooking = async (bookingData: {
    agentId: string;
    agentName: string;
    bookingId: string;
    quoteId: string;
    invoiceId?: string;
    customerId: string;
    customerName: string;
    bookingAmount: number;
    bookingType?: 'flight' | 'hotel' | 'activity' | 'transfer';
    quoteCommissionRate?: number;
  }) => {
    return mutations.generateCommissionFromBooking.mutateAsync(bookingData);
  };

  const getCommissionsByAgent = (agentId: string) =>
    commissions.filter((c) => c.agentId === agentId);

  const getCommissionsByStatus = (status: CommissionStatus) =>
    commissions.filter((c) => c.status === status);

  const getCommissionsByDateRange = (startDate: string, endDate: string) =>
    commissions.filter((c) => c.earnedDate >= startDate && c.earnedDate <= endDate);

  const getUnpaidCommissions = () =>
    commissions.filter((c) => c.status === 'pending' || c.status === 'approved');

  const getTotalCommissionsEarned = (agentId?: string, startDate?: string, endDate?: string) => {
    let list = agentId ? getCommissionsByAgent(agentId) : commissions;
    if (startDate && endDate) {
      list = list.filter((c) => c.earnedDate >= startDate && c.earnedDate <= endDate);
    }
    return list.reduce((sum, c) => sum + c.commissionAmount, 0);
  };

  const getTotalCommissionsPaid = (agentId?: string, startDate?: string, endDate?: string) => {
    let list = commissions.filter((c) => c.status === 'paid');
    if (agentId) list = list.filter((c) => c.agentId === agentId);
    if (startDate && endDate) {
      list = list.filter((c) => (c.paidDate || c.earnedDate) >= startDate && (c.paidDate || c.earnedDate) <= endDate);
    }
    return list.reduce((sum, c) => sum + c.commissionAmount, 0);
  };

  const getTotalCommissionsPending = (agentId?: string) => {
    let list = getUnpaidCommissions();
    if (agentId) list = list.filter((c) => c.agentId === agentId);
    return list.reduce((sum, c) => sum + c.commissionAmount, 0);
  };

  const getCommissionAnalytics = (agentId?: string, startDate?: string, endDate?: string) => {
    let list = commissions;
    if (agentId) list = list.filter((c) => c.agentId === agentId);
    if (startDate && endDate) {
      list = list.filter((c) => c.earnedDate >= startDate && c.earnedDate <= endDate);
      if (agentId) list = list.filter((c) => c.agentId === agentId);
    }

    const agentGroups = list.reduce((groups: Record<string, Commission[]>, c) => {
      if (!groups[c.agentId]) groups[c.agentId] = [];
      groups[c.agentId].push(c);
      return groups;
    }, {});

    return Object.entries(agentGroups).map(([id, agentCommissions]) => ({
      agentId: id,
      agentName: agentCommissions[0]?.agentName || '',
      totalCommissions: agentCommissions.reduce((sum, c) => sum + c.commissionAmount, 0),
      totalBookings: agentCommissions.length,
      averageCommission: agentCommissions.length > 0
        ? agentCommissions.reduce((sum, c) => sum + c.commissionAmount, 0) / agentCommissions.length
        : 0,
      commissionRate: agentCommissions.length > 0
        ? agentCommissions.reduce((sum, c) => sum + c.commissionRate, 0) / agentCommissions.length
        : 0,
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'all-time',
    }));
  };

  const searchCommissions = (query: string) => {
    const q = query.toLowerCase();
    return commissions.filter(
      (c) =>
        c.agentName.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.bookingId.toLowerCase().includes(q)
    );
  };

  return {
    commissions,
    approveCommission,
    bulkApproveCommissions,
    markCommissionAsPaid,
    bulkMarkAsPaid,
    generateCommissionFromBooking,
    getCommissionsByAgent,
    getCommissionsByStatus,
    getUnpaidCommissions,
    getCommissionAnalytics,
    getTotalCommissionsEarned,
    getTotalCommissionsPaid,
    getTotalCommissionsPending,
    searchCommissions,
  };
}
