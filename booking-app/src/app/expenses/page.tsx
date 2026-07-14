'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenseStore } from '@/store/expense-store';
import { useAuthStore } from '@/store/auth-store';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  CreditCard,
  Search,
  Filter,
  Plus,
  Calendar,
  TrendingDown,
  FileText,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Download,
  Receipt,
  Building,
  Tag
} from 'lucide-react';
import { Expense, ExpenseCategory } from '@/types/financial';

export default function ExpensesPage() {
  const { user } = useAuthStore();
  const {
    expenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpensesByCategory,
    getExpensesByCategoryTotals,
    getExpensesByDateRange,
    getTotalExpenses,
    getExpenseReport,
    searchExpenses,
    approveExpense
  } = useExpenseStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [dateRange, setDateRange] = useState('30');
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const days = parseInt(dateRange);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    setSelectedPeriod({ startDate, endDate });
  }, [dateRange]);

  useEffect(() => {
    let filtered = expenses;

    if (searchQuery.trim()) {
      filtered = searchExpenses(searchQuery.trim());
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(expense => expense.category === categoryFilter);
    }

    // Filter by date range
    filtered = filtered.filter(expense => {
      return expense.date >= selectedPeriod.startDate && expense.date <= selectedPeriod.endDate;
    });

    setFilteredExpenses(filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [expenses, searchQuery, categoryFilter, selectedPeriod, searchExpenses]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCategoryIcon = (category: ExpenseCategory) => {
    switch (category) {
      case 'supplier_payment':
        return <Building className="w-4 h-4" />;
      case 'marketing':
        return <Tag className="w-4 h-4" />;
      case 'operational':
        return <CreditCard className="w-4 h-4" />;
      case 'commission':
        return <Receipt className="w-4 h-4" />;
      case 'office':
        return <Building className="w-4 h-4" />;
      case 'travel':
        return <Calendar className="w-4 h-4" />;
      case 'technology':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: ExpenseCategory) => {
    const colors = {
      supplier_payment: 'bg-blue-100 text-blue-800',
      marketing: 'bg-purple-100 text-purple-800',
      operational: 'bg-orange-100 text-orange-800',
      commission: 'bg-green-100 text-green-800',
      office: 'bg-gray-100 text-gray-800',
      travel: 'bg-indigo-100 text-indigo-800',
      technology: 'bg-cyan-100 text-cyan-800',
      other: 'bg-slate-100 text-slate-800',
    };
    return colors[category];
  };

  // Calculate statistics
  const totalExpenses = getTotalExpenses(selectedPeriod.startDate, selectedPeriod.endDate);
  const expensesByCategory = getExpensesByCategoryTotals(selectedPeriod.startDate, selectedPeriod.endDate);
  const unapprovedExpenses = filteredExpenses.filter(expense => !expense.approvedBy).length;
  const totalVendors = new Set(expenses.filter(e => e.vendor).map(e => e.vendor)).size;

  const expenseReport = getExpenseReport(selectedPeriod.startDate, selectedPeriod.endDate);

  const categories: Array<{ value: ExpenseCategory; label: string }> = [
    { value: 'supplier_payment', label: 'Supplier Payments' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'operational', label: 'Operational' },
    { value: 'commission', label: 'Commission' },
    { value: 'office', label: 'Office' },
    { value: 'travel', label: 'Travel' },
    { value: 'technology', label: 'Technology' },
    { value: 'other', label: 'Other' },
  ];

  if (!user) {
    return <div>Please log in to view expenses.</div>;
  }

  return (
    <MainLayout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
              <p className="text-gray-600 mt-2">
                Track and manage business expenses
              </p>
            </div>

            <div className="flex gap-2 mt-4 md:mt-0">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalExpenses)}
                </div>
                <p className="text-xs text-gray-500">
                  Last {dateRange} days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <FileText className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredExpenses.length}
                </div>
                <p className="text-xs text-gray-500">
                  {unapprovedExpenses} pending approval
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendors</CardTitle>
                <Building className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalVendors}
                </div>
                <p className="text-xs text-gray-500">
                  Active suppliers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg per Day</CardTitle>
                <Calendar className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalExpenses / parseInt(dateRange))}
                </div>
                <p className="text-xs text-gray-500">
                  Daily average
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Expense Breakdown by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map(({ value, label }) => {
                  const amount = expensesByCategory[value] || 0;
                  const percentage = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0';

                  if (amount === 0) return null;

                  return (
                    <div key={value} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(value)}
                        <div>
                          <div className="font-medium text-sm">{label}</div>
                          <div className="text-xs text-gray-600">{percentage}%</div>
                        </div>
                      </div>
                      <div className="font-semibold text-red-600">
                        {formatCurrency(amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search expenses by description, vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as ExpenseCategory | 'all')}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle>Expenses ({filteredExpenses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
                  <p className="text-gray-600">
                    {searchQuery ? 'Try adjusting your search criteria.' : 'Start tracking expenses to see them here.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Date</th>
                        <th className="text-left py-3 px-4 font-medium">Description</th>
                        <th className="text-left py-3 px-4 font-medium">Category</th>
                        <th className="text-left py-3 px-4 font-medium">Vendor</th>
                        <th className="text-left py-3 px-4 font-medium">Amount</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((expense) => (
                        <tr key={expense.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm">
                            {formatDate(expense.date)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">{expense.description}</div>
                            {expense.subcategory && (
                              <div className="text-sm text-gray-600">{expense.subcategory}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`${getCategoryColor(expense.category)} flex items-center gap-1 w-fit`}>
                              {getCategoryIcon(expense.category)}
                              {expense.category.replace('_', ' ').charAt(0).toUpperCase() + expense.category.replace('_', ' ').slice(1)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              {expense.vendor || 'N/A'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-red-600">
                              {formatCurrency(expense.amount)}
                            </div>
                            <div className="text-xs text-gray-600">
                              {expense.currency}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {expense.approvedBy ? (
                              <Badge variant="success" className="flex items-center gap-1 w-fit">
                                <CheckCircle className="w-3 h-3" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3" />
                                Pending
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {!expense.approvedBy && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => approveExpense(expense.id, user?.name || 'Admin')}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              {expense.receiptUrl && (
                                <Button size="sm" variant="ghost">
                                  <Receipt className="w-4 h-4" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost">
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
    </MainLayout>
  );
}