'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInvoiceCompat } from '@/hooks/compat/useInvoiceCompat';
import { useAuth } from '@/components/auth/AuthProvider';
import { MainLayout } from '@/components/layout/MainLayout';
import { InvoiceModal } from '@/components/invoices/InvoiceModal';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Send,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  MoreHorizontal
} from 'lucide-react';
import { Invoice, InvoiceStatus } from '@/types/financial';

export default function InvoicesPage() {
  const { profile: user } = useAuth();
  const {
    invoices,
    getInvoicesByStatus,
    getOverdueInvoices,
    searchInvoices,
    markInvoiceAsSent,
    markInvoiceAsPaid,
    updateInvoiceStatus,
    getTotalRevenue,
    getTotalOutstanding,
    getOverdueAmount
  } = useInvoiceCompat();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  useEffect(() => {
    let filtered = invoices;

    if (searchQuery.trim()) {
      filtered = searchInvoices(searchQuery.trim());
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    setFilteredInvoices(filtered);
  }, [invoices, searchQuery, statusFilter, searchInvoices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Action handlers
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceModalOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    // Navigate to edit page or show edit modal
    alert(`Edit functionality for invoice ${invoice.invoiceNumber} - Coming soon!`);
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      await generateInvoicePDF(invoice);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleInvoiceMenu = (invoice: Invoice) => {
    const actions = [];

    if (invoice.status === 'draft') {
      actions.push('Send Invoice');
    }
    if (invoice.status === 'sent' || invoice.status === 'partial') {
      actions.push('Mark as Paid');
    }
    if (invoice.status !== 'cancelled') {
      actions.push('Cancel Invoice');
    }
    actions.push('Duplicate Invoice', 'Delete Invoice');

    const choice = prompt(`Choose action for ${invoice.invoiceNumber}:\n${actions.map((action, i) => `${i + 1}. ${action}`).join('\n')}`);

    if (choice) {
      const actionIndex = parseInt(choice) - 1;
      const selectedAction = actions[actionIndex];

      switch (selectedAction) {
        case 'Send Invoice':
          markInvoiceAsSent(invoice.id);
          alert('Invoice marked as sent!');
          break;
        case 'Mark as Paid':
          markInvoiceAsPaid(invoice.id, 'bank_transfer', `TXN-${Date.now()}`);
          alert('Invoice marked as paid!');
          break;
        case 'Cancel Invoice':
          updateInvoiceStatus(invoice.id, 'cancelled');
          alert('Invoice cancelled!');
          break;
        case 'Duplicate Invoice':
          alert('Duplicate functionality - Coming soon!');
          break;
        case 'Delete Invoice':
          if (confirm('Are you sure you want to delete this invoice?')) {
            alert('Delete functionality - Coming soon!');
          }
          break;
      }
    }
  };

  const handleCreateInvoice = () => {
    alert('Create Invoice functionality - Coming soon!\n\nFor now, you can create invoices from accepted quotes in the Finances page.');
  };

  const handleCloseInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setSelectedInvoice(null);
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft':
        return <Edit className="w-4 h-4" />;
      case 'sent':
        return <Send className="w-4 h-4" />;
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'partial':
        return <Clock className="w-4 h-4" />;
      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  const getStatusVariant = (status: InvoiceStatus): BadgeProps['variant'] => {
    switch (status) {
      case 'sent':
        return 'default';
      case 'paid':
        return 'success';
      case 'overdue':
        return 'destructive';
      case 'partial':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const isOverdue = (invoice: Invoice) => {
    return new Date(invoice.dueDate) < new Date() &&
           invoice.status !== 'paid' &&
           invoice.status !== 'cancelled';
  };

  // Summary statistics
  const totalInvoices = invoices.length;
  const draftInvoices = getInvoicesByStatus('draft').length;
  const paidInvoices = getInvoicesByStatus('paid').length;
  const overdueInvoices = getOverdueInvoices().length;

  const totalRevenue = getTotalRevenue();
  const totalOutstanding = getTotalOutstanding();
  const overdueAmount = getOverdueAmount();

  if (!user) {
    return <div>Please log in to view invoices.</div>;
  }

  return (
    <MainLayout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
              <p className="text-gray-600 mt-2">
                Manage your invoices and track payments
              </p>
            </div>

            <Button className="mt-4 md:mt-0" onClick={handleCreateInvoice}>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <Receipt className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalInvoices}</div>
                <p className="text-xs text-gray-500">
                  {draftInvoices} drafts, {paidInvoices} paid
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalRevenue)}
                </div>
                <p className="text-xs text-gray-500">
                  From paid invoices
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <Clock className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(totalOutstanding)}
                </div>
                <p className="text-xs text-gray-500">
                  Awaiting payment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(overdueAmount)}
                </div>
                <p className="text-xs text-gray-500">
                  {overdueInvoices} invoices
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search invoices by customer, invoice number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as InvoiceStatus | 'all')}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoices Table */}
          <Card>
            <CardHeader>
              <CardTitle>Invoices ({filteredInvoices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                  <p className="text-gray-600">
                    {searchQuery ? 'Try adjusting your search criteria.' : 'Create your first invoice to get started.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Invoice #</th>
                        <th className="text-left py-3 px-4 font-medium">Customer</th>
                        <th className="text-left py-3 px-4 font-medium">Issue Date</th>
                        <th className="text-left py-3 px-4 font-medium">Due Date</th>
                        <th className="text-left py-3 px-4 font-medium">Amount</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium">{invoice.invoiceNumber}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">{invoice.customerName}</div>
                            <div className="text-sm text-gray-600">{invoice.customerEmail}</div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {formatDate(invoice.issueDate)}
                          </td>
                          <td className="py-3 px-4">
                            <div className={`text-sm ${isOverdue(invoice) ? 'text-red-600 font-medium' : ''}`}>
                              {formatDate(invoice.dueDate)}
                              {isOverdue(invoice) && (
                                <div className="text-xs text-red-600">Overdue</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">{formatCurrency(invoice.total)}</div>
                            {invoice.paidAmount > 0 && (
                              <div className="text-xs text-green-600">
                                {formatCurrency(invoice.paidAmount)} paid
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={getStatusVariant(invoice.status)} className="flex items-center gap-1 w-fit">
                              {getStatusIcon(invoice.status)}
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewInvoice(invoice)}
                                title="View Invoice"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditInvoice(invoice)}
                                title="Edit Invoice"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownloadInvoice(invoice)}
                                title="Download Invoice"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleInvoiceMenu(invoice)}
                                title="More Actions"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invoice Modal */}
        <InvoiceModal
          invoice={selectedInvoice}
          isOpen={isInvoiceModalOpen}
          onClose={handleCloseInvoiceModal}
        />
    </MainLayout>
  );
}