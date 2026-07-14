'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useInvoiceCompat } from '@/hooks/compat/useInvoiceCompat';
import { useExpenseCompat } from '@/hooks/compat/useExpenseCompat';
import { useCommissionCompat } from '@/hooks/compat/useCommissionCompat';
import { useTransactionCompat } from '@/hooks/compat/useTransactionCompat';
import { DollarSign, FileText, TrendingUp, Users, TrendingDown, Percent, CreditCard } from 'lucide-react';
import { RevenueTrendChart } from './RevenueTrendChart';
import { ExpenseCategoryChart } from './ExpenseCategoryChart';
import { RecentActivityFeed } from './RecentActivityFeed';
import { ActionItemsCard } from './ActionItemsCard';

export function FinancialOverview() {
  // Select base state arrays
  const { invoices } = useInvoiceCompat();
  const { expenses } = useExpenseCompat();
  const { commissions } = useCommissionCompat();
  const { transactions } = useTransactionCompat();

  // Compute derived values with useMemo
  const totalRevenue = useMemo(
    () => invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
    [invoices]
  );

  const totalOutstanding = useMemo(
    () => invoices
      .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + inv.remainingAmount, 0),
    [invoices]
  );

  const overdueInvoices = useMemo(() => {
    const now = new Date();
    return invoices.filter((invoice) => {
      const dueDate = new Date(invoice.dueDate);
      return dueDate < now && invoice.status !== 'paid' && invoice.status !== 'cancelled';
    });
  }, [invoices]);

  const overdueAmount = useMemo(
    () => overdueInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0),
    [overdueInvoices]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );

  const totalCommissionsPending = useMemo(() => {
    return commissions
      .filter(c => c.status === 'pending' || c.status === 'approved')
      .reduce((sum, c) => sum + c.commissionAmount, 0);
  }, [commissions]);

  const overdueCount = overdueInvoices.length;
  const overdueTotal = overdueAmount;

  // Calculate additional metrics
  const netProfit = useMemo(
    () => totalRevenue - totalExpenses - totalCommissionsPending,
    [totalRevenue, totalExpenses, totalCommissionsPending]
  );

  const profitMargin = useMemo(
    () => (totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0),
    [netProfit, totalRevenue]
  );

  const cashFlow = useMemo(
    () => totalRevenue - totalExpenses,
    [totalRevenue, totalExpenses]
  );

  const collectionRate = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
    return totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0;
  }, [invoices, totalRevenue]);

  const avgTransaction = useMemo(() => {
    const paidInvoicesCount = invoices.filter(inv => inv.status === 'paid').length;
    return paidInvoicesCount > 0 ? totalRevenue / paidInvoicesCount : 0;
  }, [invoices, totalRevenue]);

  return (
    <div className="space-y-6">
      {/* Primary Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From paid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOutstanding.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {overdueCount > 0 && (
                <span className="text-red-600">{overdueCount} overdue</span>
              )}
              {overdueCount === 0 && 'All invoices current'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              All time expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCommissionsPending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval/payment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calculated Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Net profit: ${netProfit.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(cashFlow).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {cashFlow >= 0 ? 'Positive' : 'Negative'} cash flow
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collectionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Invoices collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgTransaction.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per paid invoice
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <RevenueTrendChart invoices={invoices} expenses={expenses} />
        <ExpenseCategoryChart expenses={expenses} />
      </div>

      {/* Bottom Row: Activity Feed + Action Items */}
      <div className="grid gap-4 md:grid-cols-2">
        <RecentActivityFeed transactions={transactions} limit={8} />
        <ActionItemsCard
          invoices={invoices}
          expenses={expenses}
          commissions={commissions}
        />
      </div>

      {/* Overdue Warning Banner */}
      {overdueTotal > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">⚠️ Overdue Invoices Alert</CardTitle>
            <CardDescription className="text-red-700">
              {overdueCount} invoice{overdueCount !== 1 ? 's' : ''} past due date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900">${overdueTotal.toFixed(2)}</div>
            <p className="text-sm text-red-700 mt-2">
              Immediate action required - follow up with customers for payment
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
