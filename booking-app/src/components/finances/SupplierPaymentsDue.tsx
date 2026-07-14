'use client';

import { useExpenseStore } from '@/store/expense-store';
import { useContactStore } from '@/store/contact-store';
import { useQuoteStore } from '@/store/quote-store';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, Calendar, User, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function SupplierPaymentsDue() {
  const { expenses, updateExpense } = useExpenseStore();
  const { getContactById } = useContactStore();
  const { getQuoteById } = useQuoteStore();

  // Filter pending supplier payments
  const pendingPayments = expenses.filter(
    (expense) =>
      expense.category === 'supplier_payment' &&
      expense.status === 'pending'
  );

  // Group by supplier
  const paymentsBySupplier = pendingPayments.reduce((acc, expense) => {
    const supplier = expense.vendor || 'Unknown Supplier';
    if (!acc[supplier]) {
      acc[supplier] = {
        supplierId: expense.supplierId,
        expenses: [],
        total: 0,
      };
    }
    acc[supplier].expenses.push(expense);
    acc[supplier].total += expense.amount;
    return acc;
  }, {} as Record<string, { supplierId?: string; expenses: typeof expenses; total: number }>);

  const totalDue = pendingPayments.reduce((sum, exp) => sum + exp.amount, 0);
  const supplierCount = Object.keys(paymentsBySupplier).length;

  const markAsPaid = (expenseId: string) => {
    updateExpense(expenseId, {
      status: 'paid',
      paymentMethod: 'bank_transfer',
    });
  };

  if (pendingPayments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Supplier Payments Due
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No pending supplier payments</p>
            <p className="text-sm text-gray-400 mt-1">
              Supplier expenses will appear here when bookings are confirmed
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Supplier Payments Due
          </div>
          <div className="text-right">
            <div className="text-sm font-normal text-gray-500">
              {pendingPayments.length} payment{pendingPayments.length > 1 ? 's' : ''} to {supplierCount} supplier{supplierCount > 1 ? 's' : ''}
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalDue)}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(paymentsBySupplier).map(([supplier, { supplierId, expenses, total }]) => {
            const contact = supplierId ? getContactById(supplierId) : null;

            return (
              <div
                key={supplier}
                className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{supplier}</h3>
                      <p className="text-sm text-gray-500">
                        {expenses.length} payment{expenses.length > 1 ? 's' : ''} pending
                      </p>
                      {contact?.email && (
                        <p className="text-xs text-gray-400">{contact.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-orange-600">
                      {formatCurrency(total)}
                    </div>
                  </div>
                </div>

                {/* Expense items */}
                <div className="space-y-2 mb-3">
                  {expenses.map((expense) => {
                    const quote = expense.bookingId ? getQuoteById(expense.bookingId) : null;
                    const customerContact = quote ? getContactById(quote.contactId) : null;

                    return (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {expense.description}
                            </span>
                          </div>
                          {quote && customerContact && (
                            <div className="text-xs text-gray-500 mt-1 ml-6">
                              Booking for: {customerContact.firstName} {customerContact.lastName}
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 ml-6">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due: {expense.date}
                            </span>
                            {expense.subcategory && (
                              <Badge variant="secondary">
                                {expense.subcategory}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(expense.amount)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsPaid(expense.id)}
                            className="text-green-600 hover:bg-green-50 hover:text-green-700"
                          >
                            Mark Paid
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
