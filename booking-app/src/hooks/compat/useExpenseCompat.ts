import { Expense, ExpenseCategory } from '@/types/financial';
import { useExpensesQuery } from '@/hooks/queries/useExpensesQuery';
import { useExpenseMutations } from '@/hooks/mutations/useExpenseMutations';

// ponytail: drop-in replacement for the old localStorage expense-store,
// scoped to the methods consumers actually call.
export function useExpenseCompat() {
  const { data: expenses = [] } = useExpensesQuery();
  const mutations = useExpenseMutations();

  const createExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    return mutations.addExpense.mutateAsync(expenseData);
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    await mutations.updateExpense.mutateAsync({ id, updates });
  };

  const deleteExpense = async (id: string) => {
    await mutations.deleteExpense.mutateAsync(id);
  };

  const approveExpense = async (id: string, approvedBy: string) => {
    await mutations.approveExpense.mutateAsync({ id, approvedBy });
  };

  const getExpensesByDateRange = (startDate: string, endDate: string) =>
    expenses.filter((e) => e.date >= startDate && e.date <= endDate);

  const getExpensesByCategory = (category: ExpenseCategory) =>
    expenses.filter((e) => e.category === category);

  const getTotalExpenses = (startDate?: string, endDate?: string) => {
    const list = startDate && endDate ? getExpensesByDateRange(startDate, endDate) : expenses;
    return list.reduce((sum, e) => sum + e.amount, 0);
  };

  const getExpensesByCategoryTotals = (startDate?: string, endDate?: string): Record<ExpenseCategory, number> => {
    const list = startDate && endDate ? getExpensesByDateRange(startDate, endDate) : expenses;
    const totals: Record<ExpenseCategory, number> = {
      supplier_payment: 0,
      marketing: 0,
      operational: 0,
      commission: 0,
      office: 0,
      travel: 0,
      technology: 0,
      other: 0,
    };
    list.forEach((e) => { totals[e.category] += e.amount; });
    return totals;
  };

  const searchExpenses = (query: string) => {
    const q = query.toLowerCase();
    return expenses.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.vendor || '').toLowerCase().includes(q)
    );
  };

  const getExpenseReport = (startDate: string, endDate: string) => {
    const list = getExpensesByDateRange(startDate, endDate);
    const totalExpenses = list.reduce((sum, e) => sum + e.amount, 0);
    const expensesByCategory = getExpensesByCategoryTotals(startDate, endDate);

    const vendorTotals: Record<string, number> = {};
    list.forEach((e) => {
      if (e.vendor) vendorTotals[e.vendor] = (vendorTotals[e.vendor] || 0) + e.amount;
    });
    const topVendors = Object.entries(vendorTotals)
      .map(([vendor, total]) => ({ vendor, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const monthlyTotals: Record<string, number> = {};
    list.forEach((e) => {
      const month = e.date.substring(0, 7);
      monthlyTotals[month] = (monthlyTotals[month] || 0) + e.amount;
    });
    const monthlyTrend = Object.entries(monthlyTotals)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return { totalExpenses, expensesByCategory, topVendors, monthlyTrend };
  };

  return {
    expenses,
    createExpense,
    updateExpense,
    deleteExpense,
    approveExpense,
    getExpensesByDateRange,
    getExpensesByCategory,
    getTotalExpenses,
    getExpensesByCategoryTotals,
    searchExpenses,
    getExpenseReport,
  };
}
