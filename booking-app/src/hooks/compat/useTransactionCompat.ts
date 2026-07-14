import { useTransactionsQuery } from '@/hooks/queries/useTransactionsQuery';

// ponytail: only `transactions` is read by any consumer today — extend as
// other FinancialOverview computations move off the old transaction-store.
export function useTransactionCompat() {
  const { data: transactions = [] } = useTransactionsQuery();
  return { transactions };
}
