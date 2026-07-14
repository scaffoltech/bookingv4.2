'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { DollarSign, FileText, TrendingUp, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { FinancialTransaction } from '@/types/transaction';

interface RecentActivityFeedProps {
  transactions: FinancialTransaction[];
  limit?: number;
}

export function RecentActivityFeed({ transactions, limit = 10 }: RecentActivityFeedProps) {
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }, [transactions, limit]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment_received':
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'invoice_created':
      case 'invoice_paid':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'expense_recorded':
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      case 'commission_created':
      case 'commission_paid':
        return <Users className="h-4 w-4 text-purple-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      payment_received: 'Payment Received',
      invoice_created: 'Invoice Created',
      invoice_paid: 'Invoice Paid',
      expense_recorded: 'Expense Recorded',
      commission_created: 'Commission Created',
      commission_paid: 'Commission Paid',
      refund_issued: 'Refund Issued',
      fund_allocated: 'Funds Allocated',
      supplier_payment: 'Supplier Payment',
    };
    return labels[type] || type;
  };

  const getStatusVariant = (status: string): BadgeProps['variant'] => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (recentTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest financial transactions</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          No recent activity
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest {recentTransactions.length} transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
            >
              <div className="p-2 rounded-lg bg-muted">
                {getIcon(transaction.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {getTypeLabel(transaction.type)}
                  </span>
                  <Badge variant={getStatusVariant(transaction.status)} className="text-xs">
                    {transaction.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {transaction.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {new Date(transaction.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold text-sm ${
                  transaction.type === 'payment_received' ? 'text-green-600' :
                  transaction.type.includes('expense') || transaction.type.includes('payment') ? 'text-red-600' :
                  'text-gray-900'
                }`}>
                  {transaction.type === 'payment_received' ? '+' :
                   transaction.type.includes('expense') || transaction.type === 'supplier_payment' ? '-' : ''}
                  ${transaction.amount.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
