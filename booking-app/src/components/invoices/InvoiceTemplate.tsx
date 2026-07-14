'use client';

import React from 'react';
import { Invoice } from '@/types/financial';
import { badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface InvoiceTemplateProps {
  invoice: Invoice;
  companyInfo?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
    website?: string;
    taxId?: string;
  };
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({
  invoice,
  companyInfo = {
    name: 'Your Travel Company',
    address: '123 Business St',
    city: 'Business City',
    state: 'BC',
    zip: '12345',
    phone: '(555) 123-4567',
    email: 'invoices@travelcompany.com',
    website: 'www.travelcompany.com',
    taxId: '12-3456789'
  }
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg" id="invoice-template">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{companyInfo.name}</h1>
          <div className="text-gray-600 mt-2">
            <p>{companyInfo.address}</p>
            <p>{companyInfo.city}, {companyInfo.state} {companyInfo.zip}</p>
            <p>Phone: {companyInfo.phone}</p>
            <p>Email: {companyInfo.email}</p>
            {companyInfo.website && <p>Web: {companyInfo.website}</p>}
            {companyInfo.taxId && <p>Tax ID: {companyInfo.taxId}</p>}
          </div>
        </div>

        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">INVOICE</h2>
          <div className="text-gray-600">
            <p><span className="font-semibold">Invoice #:</span> {invoice.invoiceNumber}</p>
            <p><span className="font-semibold">Issue Date:</span> {formatDate(invoice.issueDate)}</p>
            <p><span className="font-semibold">Due Date:</span> {formatDate(invoice.dueDate)}</p>
            <p><span className="font-semibold">Status:</span>
              {/* span (not Badge) — Badge renders a div, invalid inside <p> */}
              <span className={cn(badgeVariants({
                variant:
                  invoice.status === 'paid' ? 'success' :
                  invoice.status === 'sent' ? 'default' :
                  invoice.status === 'overdue' ? 'destructive' :
                  'secondary'
              }), 'ml-1')}>
                {invoice.status.toUpperCase()}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
        <div className="text-gray-700">
          <p className="font-semibold">{invoice.customerName}</p>
          <p>{invoice.customerEmail}</p>
          {invoice.customerAddress && (
            <>
              <p>{invoice.customerAddress.street}</p>
              <p>{invoice.customerAddress.city}, {invoice.customerAddress.state} {invoice.customerAddress.zip}</p>
              {invoice.customerAddress.country && <p>{invoice.customerAddress.country}</p>}
            </>
          )}
        </div>
      </div>

      {/* Invoice Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Description</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Qty</th>
              <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Unit Price</th>
              <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={item.id || index}>
                <td className="border border-gray-300 px-4 py-3">
                  <div className="font-medium">{item.description}</div>
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">{item.quantity}</td>
                <td className="border border-gray-300 px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="border border-gray-300 px-4 py-3 text-right font-semibold">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="font-medium">Subtotal:</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>

          {invoice.discountAmount && invoice.discountAmount > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="font-medium">Discount:</span>
              <span>-{formatCurrency(invoice.discountAmount)}</span>
            </div>
          )}

          {invoice.taxRate > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="font-medium">Tax ({invoice.taxRate}%):</span>
              <span>{formatCurrency(invoice.taxAmount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center py-3 border-b-2 border-gray-400 text-lg font-bold">
            <span>Total:</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>

          {invoice.paidAmount > 0 && (
            <>
              <div className="flex justify-between items-center py-2 text-green-600">
                <span className="font-medium">Amount Paid:</span>
                <span>-{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-gray-200 text-lg font-bold">
                <span>Balance Due:</span>
                <span className={invoice.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(invoice.remainingAmount)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment Information */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment History:</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Date</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Method</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Reference</th>
                <th className="border border-gray-300 px-4 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((payment, index) => (
                <tr key={payment.id || index}>
                  <td className="border border-gray-300 px-4 py-2">
                    {new Date(payment.processedDate).toLocaleDateString()}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 capitalize">
                    {payment.method.replace('_', ' ')}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">{payment.transactionId || 'N/A'}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Terms and Notes */}
      <div className="border-t border-gray-200 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {invoice.terms && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Terms:</h3>
              <p className="text-gray-700 text-sm">{invoice.terms}</p>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes:</h3>
            <p className="text-gray-700 text-sm">
              Thank you for your business! Please remit payment by the due date to avoid late fees.
              For questions about this invoice, please contact us at {companyInfo.email} or {companyInfo.phone}.
            </p>
          </div>
        </div>
      </div>

      {/* Footer - GAAP Compliance */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p><strong>Accounting Basis:</strong> Accrual Method</p>
            <p><strong>Revenue Recognition:</strong> GAAP ASC 606</p>
          </div>
          <div>
            <p><strong>Document Type:</strong> Commercial Invoice</p>
            <p><strong>Currency:</strong> USD</p>
          </div>
          <div>
            <p><strong>Generated:</strong> {new Date().toLocaleDateString()}</p>
            {companyInfo.taxId && <p><strong>Tax ID:</strong> {companyInfo.taxId}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;